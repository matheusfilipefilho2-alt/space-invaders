package blockchain

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"

	"github.com/yourusername/space-invaders/pkg/config"
)

type SolanaAdapter struct {
	client      *rpc.Client
	treasuryKey solana.PrivateKey
	tokenMint   solana.PublicKey
	network     string
}

func NewSolanaAdapter(cfg *config.SolanaConfig) (*SolanaAdapter, error) {
	client := rpc.New(cfg.RpcURL)

	var treasuryKey solana.PrivateKey
	if cfg.TreasuryPrivKey != "" {
		key, err := solana.PrivateKeyFromBase58(cfg.TreasuryPrivKey)
		if err != nil {
			return nil, fmt.Errorf("invalid treasury private key: %w", err)
		}
		treasuryKey = key
	}

	tokenMint, err := solana.PublicKeyFromBase58(cfg.TokenMintPubkey)
	if err != nil {
		return nil, fmt.Errorf("invalid token mint pubkey: %w", err)
	}

	return &SolanaAdapter{
		client:      client,
		treasuryKey: treasuryKey,
		tokenMint:   tokenMint,
		network:     cfg.Network,
	}, nil
}

func (a *SolanaAdapter) MintTokens(ctx context.Context, recipientWallet string, amount uint64) (string, error) {
	if len(a.treasuryKey) == 0 {
		return "", errors.New("treasury private key not configured")
	}

	recipient, err := solana.PublicKeyFromBase58(recipientWallet)
	if err != nil {
		return "", fmt.Errorf("invalid recipient wallet: %w", err)
	}

	// Get recipient's associated token account (ATA)
	recipientATA, _, err := solana.FindAssociatedTokenAddress(recipient, a.tokenMint)
	if err != nil {
		return "", fmt.Errorf("failed to find ATA: %w", err)
	}

	// Build MintTo instruction
	mintIx := token.NewMintToInstruction(
		amount,
		a.tokenMint,
		recipientATA,
		a.treasuryKey.PublicKey(),
		[]solana.PublicKey{}, // No multisig
	).Build()

	// Get recent blockhash
	recent, err := a.client.GetRecentBlockhash(ctx, rpc.CommitmentFinalized)
	if err != nil {
		return "", fmt.Errorf("failed to get recent blockhash: %w", err)
	}

	// Build transaction
	tx, err := solana.NewTransaction(
		[]solana.Instruction{mintIx},
		recent.Value.Blockhash,
		solana.TransactionPayer(a.treasuryKey.PublicKey()),
	)
	if err != nil {
		return "", fmt.Errorf("failed to build transaction: %w", err)
	}

	// Sign transaction
	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(a.treasuryKey.PublicKey()) {
			return &a.treasuryKey
		}
		return nil
	})
	if err != nil {
		return "", fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Send transaction
	sig, err := a.client.SendTransactionWithOpts(ctx, tx, rpc.TransactionOpts{
		SkipPreflight:       false,
		PreflightCommitment: rpc.CommitmentFinalized,
	})
	if err != nil {
		return "", fmt.Errorf("failed to send transaction: %w", err)
	}

	return sig.String(), nil
}

func (a *SolanaAdapter) TransferTokens(ctx context.Context, fromWallet, toWallet string, amount uint64) (string, error) {
	// Similar to MintTokens but uses Transfer instruction instead
	// TODO: Implement when needed for P2P transfers
	return "", errors.New("not implemented")
}

func (a *SolanaAdapter) GetBalance(ctx context.Context, wallet string) (uint64, error) {
	walletPubkey, err := solana.PublicKeyFromBase58(wallet)
	if err != nil {
		return 0, fmt.Errorf("invalid wallet address: %w", err)
	}

	// Get associated token account
	ata, _, err := solana.FindAssociatedTokenAddress(walletPubkey, a.tokenMint)
	if err != nil {
		return 0, fmt.Errorf("failed to find ATA: %w", err)
	}

	// Get token account balance
	balance, err := a.client.GetTokenAccountBalance(ctx, ata, rpc.CommitmentFinalized)
	if err != nil {
		return 0, fmt.Errorf("failed to get balance: %w", err)
	}

	// Convert string amount to uint64
	amount, err := strconv.ParseUint(balance.Value.Amount, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse balance amount: %w", err)
	}

	return amount, nil
}

func (a *SolanaAdapter) GetNetwork() string {
	return a.network
}

package blockchain_test

import (
	"context"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/yourusername/space-invaders/internal/infra/blockchain"
	"github.com/yourusername/space-invaders/pkg/config"
)

func TestSolanaAdapter_MintTokens(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	// Use devnet for testing
	cfg := &config.SolanaConfig{
		RpcURL:          "https://api.devnet.solana.com",
		TreasuryPrivKey: os.Getenv("SOLANA_TREASURY_PRIVKEY"), // base58 encoded
		TokenMintPubkey: os.Getenv("SOLANA_TOKEN_MINT"),       // SPACE token mint address
		Network:         "devnet",
	}

	if cfg.TreasuryPrivKey == "" || cfg.TokenMintPubkey == "" {
		t.Skip("Skipping test: SOLANA_TREASURY_PRIVKEY or SOLANA_TOKEN_MINT not set")
	}

	adapter, err := blockchain.NewSolanaAdapter(cfg)
	require.NoError(t, err)

	ctx := context.Background()

	// Mint 10 SPACE to test wallet
	recipientWallet := "GTest1111111111111111111111111111111111111" // Test wallet
	amount := uint64(10_000_000_000)                               // 10 SPACE

	txHash, err := adapter.MintTokens(ctx, recipientWallet, amount)

	require.NoError(t, err)
	assert.NotEmpty(t, txHash)
	assert.Len(t, txHash, 88) // Solana signature length (base58)

	t.Logf("Mint tx: %s", txHash)
}

func TestSolanaAdapter_GetBalance(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	cfg := &config.SolanaConfig{
		RpcURL:          "https://api.devnet.solana.com",
		TokenMintPubkey: os.Getenv("SOLANA_TOKEN_MINT"),
		Network:         "devnet",
	}

	if cfg.TokenMintPubkey == "" {
		t.Skip("Skipping test: SOLANA_TOKEN_MINT not set")
	}

	adapter, err := blockchain.NewSolanaAdapter(cfg)
	require.NoError(t, err)

	ctx := context.Background()
	wallet := "GTest1111111111111111111111111111111111111"

	balance, err := adapter.GetBalance(ctx, wallet)

	require.NoError(t, err)
	assert.GreaterOrEqual(t, balance, uint64(0))

	t.Logf("Balance: %d lamports", balance)
}

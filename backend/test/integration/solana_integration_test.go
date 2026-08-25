package integration_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/yourusername/space-invaders/configs"
	"github.com/yourusername/space-invaders/internal/infra/blockchain"
)

// TestSolanaIntegration_MintTokens validates minting SPACE tokens to a wallet
func TestSolanaIntegration_MintTokens(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Load Solana configuration
	solanaConfig := configs.GetSolanaConfig()

	// Skip if not configured for devnet
	if solanaConfig.Network != "devnet" {
		t.Skip("Skipping test: Not configured for devnet")
	}

	if solanaConfig.TreasuryPrivKey == "" || solanaConfig.TokenMintPubkey == "" {
		t.Skip("Skipping test: SOLANA_TREASURY_PRIVKEY or SOLANA_TOKEN_MINT not configured")
	}

	// Initialize Solana adapter
	adapter, err := blockchain.NewSolanaAdapter(&solanaConfig)
	require.NoError(t, err, "Failed to initialize Solana adapter")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Test wallet (replace with a valid devnet wallet for testing)
	// In real tests, this should be a test wallet you control
	testWallet := os.Getenv("SOLANA_TEST_WALLET")
	if testWallet == "" {
		t.Skip("Skipping test: SOLANA_TEST_WALLET not set")
	}

	// Mint 1 SPACE token (1,000,000,000 lamports)
	amount := uint64(1_000_000_000)

	t.Logf("Minting %d lamports (1 SPACE) to wallet %s", amount, testWallet)

	txHash, err := adapter.MintTokens(ctx, testWallet, amount)
	require.NoError(t, err, "Failed to mint tokens")
	assert.NotEmpty(t, txHash, "Transaction hash should not be empty")
	assert.Len(t, txHash, 88, "Solana signature should be 88 characters (base58)")

	t.Logf("✅ Mint successful! Transaction: %s", txHash)
	t.Logf("   View on Solana Explorer: https://explorer.solana.com/tx/%s?cluster=devnet", txHash)

	// Wait for transaction confirmation
	time.Sleep(2 * time.Second)

	// Verify balance increased
	balance, err := adapter.GetBalance(ctx, testWallet)
	require.NoError(t, err, "Failed to get balance")
	assert.GreaterOrEqual(t, balance, amount, "Balance should be at least the minted amount")

	t.Logf("✅ Balance verified: %d lamports (%d SPACE tokens)", balance, balance/1_000_000_000)
}

// TestSolanaIntegration_GetBalance validates fetching token balance
func TestSolanaIntegration_GetBalance(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	solanaConfig := configs.GetSolanaConfig()

	if solanaConfig.Network != "devnet" {
		t.Skip("Skipping test: Not configured for devnet")
	}

	if solanaConfig.TokenMintPubkey == "" {
		t.Skip("Skipping test: SOLANA_TOKEN_MINT not configured")
	}

	// Initialize Solana adapter (read-only, no private key needed for balance check)
	readOnlyConfig := solanaConfig
	readOnlyConfig.TreasuryPrivKey = "" // No private key needed for read-only operations

	adapter, err := blockchain.NewSolanaAdapter(&readOnlyConfig)
	require.NoError(t, err, "Failed to initialize Solana adapter")

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	testWallet := os.Getenv("SOLANA_TEST_WALLET")
	if testWallet == "" {
		t.Skip("Skipping test: SOLANA_TEST_WALLET not set")
	}

	t.Logf("Fetching balance for wallet: %s", testWallet)

	balance, err := adapter.GetBalance(ctx, testWallet)
	require.NoError(t, err, "Failed to get balance")
	assert.GreaterOrEqual(t, balance, uint64(0), "Balance should be >= 0")

	spaceTokens := float64(balance) / 1_000_000_000
	t.Logf("✅ Balance: %d lamports (%.9f SPACE tokens)", balance, spaceTokens)
}

// TestSolanaIntegration_TransferTokens validates token transfer between wallets
func TestSolanaIntegration_TransferTokens(t *testing.T) {
	t.Skip("Transfer not yet implemented - see Task 3 Step 5 TODO")

	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	solanaConfig := configs.GetSolanaConfig()

	if solanaConfig.Network != "devnet" {
		t.Skip("Skipping test: Not configured for devnet")
	}

	// This test would validate the TransferTokens method
	// Currently not implemented as it's not needed for Fase 2
	// Will be needed for P2P transfers in future phases
}

// TestSolanaIntegration_InvalidWallet validates error handling for invalid wallets
func TestSolanaIntegration_InvalidWallet(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	solanaConfig := configs.GetSolanaConfig()

	readOnlyConfig := solanaConfig
	readOnlyConfig.TreasuryPrivKey = "" // No private key

	adapter, err := blockchain.NewSolanaAdapter(&readOnlyConfig)
	require.NoError(t, err)

	ctx := context.Background()

	// Test with invalid wallet address
	invalidWallet := "invalid-wallet-address"

	_, err = adapter.GetBalance(ctx, invalidWallet)
	assert.Error(t, err, "Should fail with invalid wallet address")
	assert.Contains(t, err.Error(), "invalid", "Error should mention invalid address")

	t.Logf("✅ Error handling verified for invalid wallet")
}

// TestSolanaIntegration_NetworkConnectivity validates RPC connection
func TestSolanaIntegration_NetworkConnectivity(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	solanaConfig := configs.GetSolanaConfig()

	t.Logf("Testing connectivity to: %s (%s)", solanaConfig.RpcURL, solanaConfig.Network)

	readOnlyConfig := solanaConfig
	readOnlyConfig.TreasuryPrivKey = ""

	adapter, err := blockchain.NewSolanaAdapter(&readOnlyConfig)
	require.NoError(t, err, "Failed to create adapter")

	// Test connectivity by attempting to get balance for a known wallet
	// Using Solana's well-known system program as a test
	systemProgram := "11111111111111111111111111111111"

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// This will likely fail since system program doesn't have a token account,
	// but it validates network connectivity
	_, err = adapter.GetBalance(ctx, systemProgram)

	// We expect an error (no token account), but not a network error
	if err != nil {
		// Check if it's a connectivity error vs expected account error
		errMsg := err.Error()
		if !assert.NotContains(t, errMsg, "connection refused") &&
			!assert.NotContains(t, errMsg, "timeout") &&
			!assert.NotContains(t, errMsg, "dial") {
			t.Logf("✅ Network connectivity OK (got expected account error)")
		} else {
			t.Fatalf("❌ Network connectivity issue: %v", err)
		}
	}

	t.Logf("✅ Network connectivity verified")
}

// TestSolanaIntegration_MintLargeAmount validates minting larger amounts
func TestSolanaIntegration_MintLargeAmount(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	solanaConfig := configs.GetSolanaConfig()

	if solanaConfig.Network != "devnet" {
		t.Skip("Skipping test: Not configured for devnet")
	}

	if solanaConfig.TreasuryPrivKey == "" {
		t.Skip("Skipping test: SOLANA_TREASURY_PRIVKEY not configured")
	}

	testWallet := os.Getenv("SOLANA_TEST_WALLET")
	if testWallet == "" {
		t.Skip("Skipping test: SOLANA_TEST_WALLET not set")
	}

	adapter, err := blockchain.NewSolanaAdapter(&solanaConfig)
	require.NoError(t, err)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Mint 100 SPACE tokens (typical daily emission amount)
	amount := uint64(100_000_000_000) // 100 SPACE

	t.Logf("Minting %d lamports (100 SPACE) to wallet %s", amount, testWallet)

	txHash, err := adapter.MintTokens(ctx, testWallet, amount)
	require.NoError(t, err, "Failed to mint large amount")
	assert.NotEmpty(t, txHash)

	t.Logf("✅ Large mint successful! Transaction: %s", txHash)
	t.Logf("   View on Solana Explorer: https://explorer.solana.com/tx/%s?cluster=devnet", txHash)
}

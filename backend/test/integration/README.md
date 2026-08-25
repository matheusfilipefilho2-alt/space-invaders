# Integration Tests

This directory contains integration tests that interact with external services (Solana blockchain, databases, etc.).

## Solana Integration Tests

The Solana integration tests validate blockchain operations on Solana devnet.

### Prerequisites

1. **Solana Devnet Wallet**: You need a wallet with SOL for transaction fees
2. **SPACE Token Mint**: A SPL token mint address on devnet
3. **Environment Variables**: Configure the following in your `.env` file

### Environment Variables

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
SOLANA_TREASURY_PRIVKEY=<your-base58-private-key>
SOLANA_TOKEN_MINT=<your-token-mint-address>

# Test Wallet (for receiving tokens in tests)
SOLANA_TEST_WALLET=<test-wallet-public-key>
```

### Setup Instructions

#### 1. Install Solana CLI (if not already installed)

```bash
# macOS/Linux
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Verify installation
solana --version
```

#### 2. Configure Solana CLI for Devnet

```bash
solana config set --url https://api.devnet.solana.com
```

#### 3. Create Treasury Wallet

```bash
# Generate new keypair
solana-keygen new --outfile ~/.config/solana/treasury-devnet.json

# Get wallet address
solana address -k ~/.config/solana/treasury-devnet.json

# Get private key (base58 format for .env)
cat ~/.config/solana/treasury-devnet.json | jq -r '.'
# Convert to base58 using: solana-keygen pubkey ~/.config/solana/treasury-devnet.json
```

#### 4. Airdrop SOL for Transaction Fees

```bash
# Airdrop 2 SOL to treasury wallet
solana airdrop 2 <treasury-wallet-address>

# Verify balance
solana balance <treasury-wallet-address>
```

#### 5. Create SPACE SPL Token

```bash
# Create token mint
spl-token create-token --decimals 9

# Save the mint address to SOLANA_TOKEN_MINT in .env
# Example output: Creating token AbC123...

# Create associated token account for treasury
spl-token create-account <mint-address>

# Mint some initial tokens for testing
spl-token mint <mint-address> 1000
```

#### 6. Create Test Wallet

```bash
# Generate test wallet
solana-keygen new --outfile ~/.config/solana/test-wallet-devnet.json

# Get address
solana address -k ~/.config/solana/test-wallet-devnet.json

# Save to SOLANA_TEST_WALLET in .env

# Airdrop SOL for transaction fees
solana airdrop 1 <test-wallet-address>

# Create associated token account for test wallet
spl-token create-account <mint-address> --owner <test-wallet-address>
```

### Running the Tests

#### Run all integration tests

```bash
cd backend
go test ./test/integration -v
```

#### Run specific test

```bash
go test ./test/integration -v -run TestSolanaIntegration_MintTokens
```

#### Skip integration tests (run only unit tests)

```bash
go test ./... -short
```

### Test Coverage

The integration tests cover:

1. **MintTokens**: Validates minting SPACE tokens to a wallet
   - Mints tokens via Treasury wallet
   - Verifies transaction hash format
   - Confirms balance increase

2. **GetBalance**: Validates fetching token balance
   - Tests read-only operations (no private key needed)
   - Verifies balance format

3. **TransferTokens**: Validates token transfers (not yet implemented)
   - Skipped - will be implemented when P2P transfers are needed

4. **InvalidWallet**: Validates error handling
   - Tests error handling for invalid addresses

5. **NetworkConnectivity**: Validates RPC connection
   - Tests Solana devnet connectivity
   - Distinguishes network errors from expected errors

6. **MintLargeAmount**: Validates minting large amounts
   - Tests minting 100 SPACE (typical daily emission)
   - Validates no overflow issues

### Troubleshooting

#### "insufficient funds" Error

```bash
# Check SOL balance
solana balance <wallet-address>

# Airdrop more SOL
solana airdrop 2 <wallet-address>
```

#### "account not found" Error

```bash
# Create associated token account
spl-token create-account <token-mint-address> --owner <wallet-address>
```

#### "invalid signature" Error

- Verify `SOLANA_TREASURY_PRIVKEY` is base58-encoded private key
- Ensure private key matches the mint authority

#### Connection Timeout

- Verify devnet is accessible: `solana cluster-version`
- Try alternative RPC: `https://devnet.helius-rpc.com`

### Expected Output

Successful test run:

```
=== RUN   TestSolanaIntegration_MintTokens
    solana_integration_test.go:50: Minting 1000000000 lamports (1 SPACE) to wallet AbC123...
    solana_integration_test.go:57: ✅ Mint successful! Transaction: 5Xyz789...
    solana_integration_test.go:58:    View on Solana Explorer: https://explorer.solana.com/tx/5Xyz789...?cluster=devnet
    solana_integration_test.go:67: ✅ Balance verified: 1000000000 lamports (1 SPACE tokens)
--- PASS: TestSolanaIntegration_MintTokens (5.23s)
PASS
```

### CI/CD Integration

For CI/CD pipelines:

1. **Skip in CI** (recommended): Integration tests require live devnet access

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: go test ./... -short  # Skips integration tests
```

2. **Run in CI** (advanced): Use secrets for credentials

```yaml
- name: Run integration tests
  env:
    SOLANA_RPC_URL: ${{ secrets.SOLANA_RPC_URL }}
    SOLANA_TREASURY_PRIVKEY: ${{ secrets.SOLANA_TREASURY_PRIVKEY }}
    SOLANA_TOKEN_MINT: ${{ secrets.SOLANA_TOKEN_MINT }}
    SOLANA_TEST_WALLET: ${{ secrets.SOLANA_TEST_WALLET }}
  run: go test ./test/integration -v
```

### Production Considerations

⚠️ **Never use devnet credentials in production!**

For production (mainnet-beta):
1. Use hardware wallet or multisig for treasury
2. Use separate RPC provider (e.g., QuickNode, Helius)
3. Implement rate limiting for minting operations
4. Monitor transaction failures and retry logic
5. Set up alerts for failed mints

### References

- [Solana CLI Documentation](https://docs.solana.com/cli)
- [SPL Token Documentation](https://spl.solana.com/token)
- [Solana Devnet Faucet](https://solfaucet.com/)
- [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet)

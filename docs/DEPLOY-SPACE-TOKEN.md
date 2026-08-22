# SPACE Token Deployment Guide

## Overview

This document provides step-by-step instructions for deploying the SPACE token to Solana Devnet. This is a **manual process** that requires running Solana CLI commands on your local machine.

**Important:** You cannot automate this task with code. Follow each step carefully and copy the required addresses into the configuration file.

---

## Prerequisites

Before starting the deployment, ensure you have:

- macOS, Linux, or Windows Subsystem for Linux (WSL)
- Curl installed (usually pre-installed on macOS/Linux)
- Internet connection for downloading tools and connecting to Solana Devnet
- A terminal/command line interface
- A text editor for updating configuration files

---

## Installation: Solana CLI

### Step 1: Install Solana CLI

Run the following command to install Solana CLI version 1.17.0:

```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"
```

This command will download and install the Solana command-line tools to your machine.

### Verify Installation

Check that the installation was successful:

```bash
solana --version
```

**Expected output:** `solana-cli 1.17.0` or later

---

## Configuration: Solana Wallet & Network

### Step 2: Create Devnet Wallet

Create a new wallet for use on Devnet:

```bash
solana-keygen new --outfile ~/.config/solana/devnet-wallet.json
```

**⚠️ IMPORTANT:** This command will display a seed phrase. Save this phrase securely! You will need it if you ever need to recover your wallet.

### Step 3: Configure Solana CLI for Devnet

Set the Solana CLI to use Devnet and your new wallet:

```bash
solana config set --url devnet
solana config set --keypair ~/.config/solana/devnet-wallet.json
```

Verify your configuration:

```bash
solana config get
```

You should see:
- RPC URL: `https://api.devnet.solana.com`
- WebSocket URL: `wss://api.devnet.solana.com/`
- Keypair Path: `/Users/[YOUR_USERNAME]/.config/solana/devnet-wallet.json`

---

## Funding: Get SOL for Gas Fees

### Step 4: Airdrop SOL

Request a 2 SOL airdrop from Solana's Devnet faucet:

```bash
solana airdrop 2
```

Check your wallet balance:

```bash
solana balance
```

**Expected output:** Approximately `2 SOL`

If the airdrop fails, you can try again after a few minutes. Devnet airdrops are sometimes rate-limited.

---

## Deployment: Create SPACE Token

### Step 5: Create Token Mint

Create a new SPL token with 9 decimal places:

```bash
spl-token create-token --decimals 9
```

**Important:** The output will display:

```
Creating token [MINT_ADDRESS]
```

**Copy the MINT_ADDRESS!** You will need this in the next steps and to update the configuration file.

Example output:
```
Creating token 7v8F7Q3Kz8nQp5Jm2vH9bR4tL1sD6cX2yK0pM8wN3
```

In this example, `7v8F7Q3Kz8nQp5Jm2vH9bR4tL1sD6cX2yK0pM8wN3` is your MINT_ADDRESS.

### Step 6: Create Token Account

Create an associated token account for your wallet to hold the SPACE token:

```bash
spl-token create-account [MINT_ADDRESS]
```

Replace `[MINT_ADDRESS]` with the address from Step 5. For example:

```bash
spl-token create-account 7v8F7Q3Kz8nQp5Jm2vH9bR4tL1sD6cX2yK0pM8wN3
```

---

## Configuration: Update Application Config

### Step 7: Get Your Wallet Address

First, retrieve your wallet address:

```bash
solana address
```

**Copy this address!** You will need it to update the configuration file.

### Step 8: Update solana-config.js

Edit the file `src/config/solana-config.js` and update the following values:

```javascript
// Replace the null values with your actual addresses
spaceTokenMint: NETWORK === 'devnet'
    ? '[YOUR_DEVNET_MINT_ADDRESS]'  // Paste the MINT_ADDRESS from Step 5
    : null,

creatorWallet: NETWORK === 'devnet'
    ? '[YOUR_DEVNET_WALLET_ADDRESS]'  // Paste the wallet address from Step 7
    : null,

marketplaceFeeWallet: NETWORK === 'devnet'
    ? '[YOUR_DEVNET_WALLET_ADDRESS]'  // Same as creator wallet for now
    : null,
```

**Example after updating:**

```javascript
spaceTokenMint: NETWORK === 'devnet'
    ? '7v8F7Q3Kz8nQp5Jm2vH9bR4tL1sD6cX2yK0pM8wN3'
    : null,

creatorWallet: NETWORK === 'devnet'
    ? '9wV1K6bR2tL8xH0bN5sD3cM1pQ7jF4aY6vZ9nK2mL0'
    : null,

marketplaceFeeWallet: NETWORK === 'devnet'
    ? '9wV1K6bR2tL8xH0bN5sD3cM1pQ7jF4aY6vZ9nK2mL0'
    : null,
```

---

## Verification: Confirm Token Creation

### Step 9: Verify Token Supply

Verify that your token was created successfully and has zero supply (no tokens minted yet):

```bash
spl-token supply [MINT_ADDRESS]
```

Replace `[MINT_ADDRESS]` with your token's mint address. For example:

```bash
spl-token supply 7v8F7Q3Kz8nQp5Jm2vH9bR4tL1sD6cX2yK0pM8wN3
```

**Expected output:**

```
0 SPACE
```

This confirms that the token has been created but no tokens have been minted yet.

---

## Git Commit: Record Deployment

### Step 10: Commit Configuration Changes

Once you have successfully updated the configuration file, commit the changes:

```bash
git add src/config/solana-config.js
git commit -m "feat(token): deploy SPACE token on Devnet

- Create SPL token with 9 decimals
- Update config with token mint address
- Update config with creator wallet address
- Ready for minting operations

Token Mint: [MINT_ADDRESS]
Creator: [WALLET_ADDRESS]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Replace `[MINT_ADDRESS]` and `[WALLET_ADDRESS]` with your actual addresses.

---

## Troubleshooting

### Airdrop Failed

If the `solana airdrop 2` command fails:
- Wait a few minutes and try again
- Check your internet connection
- Verify Devnet is currently operational

### spl-token Command Not Found

If you get "command not found" for `spl-token`:
- The Solana CLI may not be in your PATH
- Try restarting your terminal
- Run: `export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"`

### Wallet Not Found

If you get "wallet not found" errors:
- Verify the file exists: `ls ~/.config/solana/devnet-wallet.json`
- Check your config: `solana config get`
- Make sure you're using the correct keypair path

### Transaction Failed

If a spl-token command fails with a transaction error:
- Check your SOL balance: `solana balance`
- Request another airdrop if balance is too low
- Check that you're on the correct network: `solana config get`

---

## Summary

After completing all steps, you will have:

1. Installed the Solana CLI (v1.17.0+)
2. Created a Devnet wallet
3. Funded the wallet with SOL
4. Created the SPACE token on Devnet
5. Created a token account
6. Updated your application configuration with the token mint address
7. Verified the token was created successfully
8. Committed the changes to git

Your application is now ready to use the SPACE token on Solana Devnet!

---

## Additional Resources

- [Solana Documentation](https://docs.solana.com/)
- [SPL Token Documentation](https://spl.solana.com/token)
- [Solana CLI Reference](https://docs.solana.com/cli)
- [Solana Devnet Faucet](https://solfaucet.com/)

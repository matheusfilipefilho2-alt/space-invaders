# NFT Collection Deployment Guide

This guide walks through creating and deploying the Space Invaders Skins NFT Collection on Solana Devnet using Metaplex Sugar CLI.

## Overview

- **Collection Name:** Space Invaders Skins
- **Symbol:** SPACESKIN
- **Royalty Fee:** 5% (500 basis points)
- **Network:** Solana Devnet (testing)
- **Deployment Tool:** Metaplex Sugar CLI

## Prerequisites

Before starting, ensure you have:

1. **Solana CLI** installed and configured
2. **Node.js** (v14+) installed
3. A **Solana wallet** with funds on Devnet (request from airdrop faucet)
4. **curl** installed (for Sugar CLI installation)

### Check Solana CLI Installation

```bash
solana --version
solana address  # Shows your current wallet address
```

### Fund Your Devnet Wallet

If you need SOL on Devnet:

```bash
solana airdrop 5  # Request 5 SOL (may take a few moments)
solana balance    # Check your balance
```

## Step 1: Install Metaplex Sugar CLI

Sugar CLI is the official tool for deploying NFT collections with Metaplex.

### Installation Command

```bash
bash <(curl -sSf https://sugar.metaplex.com/install.sh)
```

### Verify Installation

```bash
sugar --version
```

Expected output: `sugar-cli 2.x.x` or later

### Troubleshooting Installation

If installation fails:

```bash
# Try manual installation via Cargo (Rust package manager)
# First install Rust if not already installed:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Then install Sugar CLI
cargo install sugar-cli
```

## Step 2: Create Collection Directory and Configuration

### Create Directory Structure

```bash
mkdir -p nft-collection/{.cache}
cd nft-collection
```

### Create config.json

Create `nft-collection/config.json` with your wallet address (obtained from `solana address`):

```json
{
  "number": 1,
  "symbol": "SPACESKIN",
  "sellerFeeBasisPoints": 500,
  "isMutable": true,
  "isSequential": false,
  "creators": [
    {
      "address": "[YOUR_CREATOR_WALLET]",
      "share": 100
    }
  ],
  "uploadMethod": "bundlr",
  "awsS3Bucket": null,
  "nftStorageAuthToken": null,
  "shdwStorageAccount": null,
  "pinataJwt": null,
  "pinataGateway": null,
  "awsConfig": null,
  "shdwStorageConfig": null,
  "hiddenSettings": null
}
```

**Important:** Replace `[YOUR_CREATOR_WALLET]` with your actual wallet address:

```bash
solana address
```

### Configuration Details

| Field | Value | Purpose |
|-------|-------|---------|
| `number` | 1 | Number of NFTs in collection |
| `symbol` | SPACESKIN | Short token symbol |
| `sellerFeeBasisPoints` | 500 | 5% royalty fee (100 = 1%) |
| `isMutable` | true | Allow metadata updates later |
| `isSequential` | false | NFTs don't need sequential IDs |
| `uploadMethod` | bundlr | Use Bundlr for storage |
| `creators` | Array | Creator wallet and royalty share |

## Step 3: Create Collection Metadata

### Create collection.json

Create `nft-collection/collection.json`:

```json
{
  "name": "Space Invaders Skins",
  "symbol": "SPACESKIN",
  "description": "Exclusive skins for Space Invaders game",
  "seller_fee_basis_points": 500,
  "image": "collection.png",
  "attributes": [],
  "properties": {
    "files": [
      {
        "uri": "collection.png",
        "type": "image/png"
      }
    ],
    "category": "image"
  }
}
```

### Metadata Field Descriptions

- **name:** Display name for the collection
- **symbol:** Short identifier (appears on NFT explorers)
- **description:** Collection description (visible on marketplaces)
- **seller_fee_basis_points:** Royalty percentage in basis points (500 = 5%)
- **image:** Path to collection image file
- **properties.files:** List of associated media files
- **properties.category:** Content category (image, audio, video, etc.)

## Step 4: Prepare Collection Image

### Image Requirements

- **Format:** PNG
- **Dimensions:** 1000x1000 pixels (square)
- **File Size:** < 5 MB
- **Filename:** `collection.png`
- **Location:** `nft-collection/collection.png`

### Creating a Collection Image

#### Option A: Use an Existing Image

If you have an image ready:

```bash
cp /path/to/your/image.png nft-collection/collection.png
```

#### Option B: Generate a Placeholder

For testing purposes, you can create a simple placeholder using ImageMagick:

```bash
# Install ImageMagick if needed
brew install imagemagick  # macOS
# or: sudo apt-get install imagemagick  # Linux

# Create a 1000x1000px placeholder image
convert -size 1000x1000 xc:blue -fill white -pointsize 80 \
  -gravity center -annotate +0+0 "SPACE INVADERS SKINS" \
  nft-collection/collection.png
```

#### Option C: Download from Design Tool

Create your collection image using:
- Canva (free tier available)
- Photoshop / GIMP
- Figma
- Any online design tool

Then save as PNG and move to `nft-collection/collection.png`.

### Verify Image

```bash
file nft-collection/collection.png  # Should show PNG image
du -h nft-collection/collection.png  # Should be < 5 MB
```

## Step 5: Configure Solana to Use Devnet

Before deployment, ensure Solana CLI points to Devnet:

```bash
solana config set --url https://api.devnet.solana.com

# Verify configuration
solana config get
```

Expected output should show:
```
RPC URL: https://api.devnet.solana.com
WebSocket URL: wss://api.devnet.solana.com/ (computed)
Keypair Path: /Users/[username]/.config/solana/id.json
```

## Step 6: Deploy Collection

### Initialize Configuration

```bash
cd nft-collection
sugar create-config
```

This creates `sugar.json` with interactive prompts. You can accept defaults and update later if needed.

### Upload Assets

```bash
sugar upload
```

This uploads your collection image to Bundlr storage.

**Expected output:**
```
[1/1] 🍬 collection.png
Upload successful ✓
```

### Deploy Collection

```bash
sugar deploy
```

This creates the NFT collection on-chain.

**Expected output (IMPORTANT - SAVE THIS):**
```
Collection mint: [COLLECTION_MINT_ADDRESS]
```

**Save the COLLECTION_MINT_ADDRESS** - you'll need this in the next steps.

## Step 7: Verify Collection Deployment

### Run Verification

```bash
sugar verify
```

Expected output:
```
✅ Verification complete
```

### Manual Verification on Devnet

Use the Solana CLI to verify your collection:

```bash
# View collection details
solana address -k nft-collection/.cache/load-cache.json

# Or check on Solana Explorer
# Go to: https://explorer.solana.com/?cluster=devnet
# Search for your COLLECTION_MINT_ADDRESS
```

### Check Collection on Marketplaces

View your collection on Devnet NFT explorers:
- **Magic Eden Devnet:** https://devnet.magiceden.io/
- **Solana Explorer:** https://explorer.solana.com/?cluster=devnet

## Step 8: Update solana-config.js

### Edit Configuration File

Update `src/config/solana-config.js` with your collection mint address:

```javascript
collectionMint: NETWORK === 'devnet'
    ? '[YOUR_COLLECTION_MINT_ADDRESS]'  // Paste address from Step 6
    : null, // Create collection first
```

**Example:**
```javascript
collectionMint: NETWORK === 'devnet'
    ? 'HnZ7CGbDQYDJxeKCDPr6wMFtfwBEtmXVhfNnqhQ5RTGL'
    : null,
```

### Verify Configuration

```bash
# Check if the address is valid
solana address -k nft-collection/.cache/load-cache.json

# Or test with a simple curl
curl https://api.devnet.solana.com -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["YOUR_COLLECTION_MINT_ADDRESS"]}' \
  | jq '.result.value.data'
```

## Step 9: Commit Changes

### Stage Files

```bash
git add nft-collection/ src/config/solana-config.js
```

### Create Commit

```bash
git commit -m "feat(nft): create NFT collection on Devnet

- Deploy Space Invaders Skins collection
- Configure 5% royalty for creators
- Add collection metadata and image
- Update config with collection mint address

Collection Mint: [YOUR_COLLECTION_MINT_ADDRESS]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Replace `[YOUR_COLLECTION_MINT_ADDRESS]` with the actual address from Step 6.

## Complete Workflow Summary

```bash
# 1. Ensure devnet is configured
solana config set --url https://api.devnet.solana.com

# 2. Create directory and files
mkdir -p nft-collection/{.cache}
cd nft-collection

# 3. Create config.json (with YOUR_CREATOR_WALLET)
# 4. Create collection.json
# 5. Add collection.png image

# 6. Deploy
sugar create-config
sugar upload
sugar deploy
# ^^^ Save the Collection mint address!

# 7. Verify
sugar verify

# 8. Update src/config/solana-config.js with collection mint

# 9. Commit
git add nft-collection/ src/config/solana-config.js
git commit -m "feat(nft): create NFT collection on Devnet..."
```

## Troubleshooting

### Issue: "insufficient funds"

**Solution:** Request more SOL on Devnet
```bash
solana airdrop 5
solana balance
```

### Issue: "connection error" or "timeout"

**Solution:** Check Devnet RPC status and retry
```bash
# Verify endpoint
solana config get

# Try different endpoint if api.devnet.solana.com is down
solana config set --url https://devnet.genesysgo.net/
```

### Issue: "sugar: command not found"

**Solution:** Reinstall Sugar CLI
```bash
bash <(curl -sSf https://sugar.metaplex.com/install.sh)

# Or verify installation path
which sugar
echo $PATH
```

### Issue: "image file not found"

**Solution:** Ensure collection.png exists in the correct location
```bash
ls -la nft-collection/
file nft-collection/collection.png
```

### Issue: "invalid wallet address"

**Solution:** Use valid Solana address from
```bash
solana address  # Your current wallet

# Or import specific keypair
solana address -k /path/to/keypair.json
```

## Next Steps

After successful deployment:

1. **Frontend Integration:** Use the collection mint address to query NFTs
2. **Minting:** Implement NFT minting logic in the application
3. **Marketplace:** List NFTs on Magic Eden or other Solana marketplaces
4. **Metadata Updates:** Update collection metadata using Sugar CLI if needed

## Additional Resources

- **Metaplex Documentation:** https://docs.metaplex.com/
- **Sugar CLI Guide:** https://docs.metaplex.com/sugar/guide/
- **Solana Devnet Faucet:** https://faucet.solana.com/
- **Solana Explorer:** https://explorer.solana.com/?cluster=devnet
- **Magic Eden Devnet:** https://devnet.magiceden.io/

## Support

For issues with:
- **Solana CLI:** https://github.com/solana-labs/solana/issues
- **Metaplex Sugar:** https://github.com/metaplex-foundation/sugar/issues
- **This Project:** Check project documentation or create an issue

---

**Last Updated:** 2026-08-22
**Status:** This is a MANUAL deployment step requiring user action

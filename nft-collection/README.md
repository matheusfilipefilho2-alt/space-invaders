# NFT Collection Directory

This directory contains the Space Invaders Skins NFT collection configuration and assets for Metaplex Sugar CLI deployment.

## Files

- **config.json** - Sugar CLI configuration (update with your creator wallet address)
- **collection.json** - Collection metadata
- **collection.png** - Collection image (1000x1000px PNG, to be added)
- **.cache/** - Sugar CLI cache directory (created during deployment)

## Setup Instructions

1. Update `config.json` with your creator wallet address:
   ```bash
   solana address
   ```
   Replace `[YOUR_CREATOR_WALLET]` with the output above.

2. Add your collection image:
   - Create or download a 1000x1000px PNG image
   - Save as `collection.png` in this directory

3. Deploy using Sugar CLI:
   ```bash
   sugar create-config
   sugar upload
   sugar deploy
   ```

4. Copy the Collection mint address from the deploy output

5. Update `src/config/solana-config.js` with the collection mint address

See `/docs/DEPLOY-NFT-COLLECTION.md` for detailed deployment instructions.

## Collection Details

- **Name:** Space Invaders Skins
- **Symbol:** SPACESKIN
- **Royalty Fee:** 5% (500 basis points)
- **Network:** Solana Devnet
- **Status:** Ready for deployment

## Next Steps

Follow the deployment guide to create the NFT collection on Solana Devnet.

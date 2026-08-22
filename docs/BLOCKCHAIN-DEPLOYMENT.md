# Blockchain Integration Deployment Guide

## Prerequisites

- [x] Solana CLI installed
- [x] Phantom Wallet installed
- [x] Devnet SOL airdropped
- [x] Supabase project configured
- [x] All migrations run

## Step 1: Deploy SPACE Token

```bash
solana config set --url devnet
solana airdrop 2
spl-token create-token --decimals 9
```

Copy the token mint address and update `src/config/solana-config.js`:

```javascript
spaceTokenMint: '[YOUR_TOKEN_MINT]'
```

## Step 2: Create NFT Collection

```bash
cd nft-collection
sugar create-config
sugar upload
sugar deploy
```

Copy the collection mint and update `src/config/solana-config.js`:

```javascript
collectionMint: '[YOUR_COLLECTION_MINT]'
```

## Step 3: Database Setup

Run these SQL migrations in Supabase:

1. `migrations/001_blockchain_tables.sql`
2. `migrations/002_blockchain_rpcs.sql`

Verify tables exist:
- player_wallets
- token_transactions
- nft_metadata
- marketplace_listings
- marketplace_sales
- rate_limits

## Step 4: Configure CDN Scripts

Verify all HTML files have these scripts:

```html
<!-- Solana -->
<script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js"></script>
<script src="https://unpkg.com/@solana/spl-token@latest/lib/index.iife.js"></script>

<!-- Metaplex -->
<script src="https://unpkg.com/@metaplex-foundation/js@latest/dist/index.umd.js"></script>
```

## Step 5: Update NFT Metadata

Upload skin images to CDN (e.g., Cloudflare R2, AWS S3, IPFS).

Update `src/data/nft-metadata.json` with actual image URLs:

```json
{
  "skin_01": {
    "image": "https://your-cdn.com/skins/skin_01.png",
    ...
  }
}
```

## Step 6: Test on Devnet

1. Open `token-bridge.html`
2. Connect Phantom wallet (Devnet)
3. Run test suite:
```javascript
await BlockchainTests.runAll()
```

4. Manually test:
   - Withdraw coins → SPACE tokens
   - Deposit tokens → coins
   - Mint NFT from shop item
   - List NFT on marketplace
   - Buy NFT from listing
   - Burn NFT to restore item

## Step 7: Switch to Mainnet (Production)

**⚠️ WARNING: Real money involved!**

1. Change `src/config/solana-config.js`:
```javascript
const NETWORK = 'mainnet-beta';
```

2. Deploy new SPACE token on Mainnet:
```bash
solana config set --url mainnet-beta
spl-token create-token --decimals 9
```

3. Deploy new NFT collection on Mainnet:
```bash
cd nft-collection
sugar deploy
```

4. Update config with Mainnet addresses

5. Thoroughly test with small amounts first!

## Monitoring

Check transaction logs:
```sql
SELECT * FROM token_transactions
ORDER BY created_at DESC
LIMIT 50;

SELECT * FROM marketplace_sales
ORDER BY created_at DESC
LIMIT 20;
```

Check rate limits:
```sql
SELECT player_id, action, COUNT(*) as count
FROM rate_limits
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY player_id, action
ORDER BY count DESC;
```

## Troubleshooting

### Issue: "Wallet not connected"
- Check if Phantom is installed
- Check if wallet has SOL for gas
- Try disconnecting and reconnecting

### Issue: "Rate limit exceeded"
- Check rate_limits table
- Wait for time window to expire
- Adjust limits in solana-config.js if needed

### Issue: "Transaction failed"
- Check Solana Explorer: https://explorer.solana.com
- Paste transaction signature
- Look for error messages

### Issue: "NFT mint failed"
- Verify collection exists: `sugar verify`
- Check wallet has enough SOL
- Verify Metaplex script loaded

## Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] Rate limits configured correctly
- [ ] Withdraw/deposit amounts capped
- [ ] RPC functions use SECURITY DEFINER
- [ ] No sensitive keys in frontend code
- [ ] Transaction replay protection active
- [ ] Wallet signatures required for critical operations

## Next Steps

1. **Add Real Marketplace**: Deploy custom Anchor program
2. **Add Staking**: Let players stake SPACE for rewards
3. **Add Governance**: DAO voting with SPACE tokens
4. **Add Trading**: P2P trades with escrow
5. **Add Leaderboard Rewards**: Top players get SPACE airdrops

## Support

Questions? Check:
- Solana Docs: https://docs.solana.com
- Metaplex Docs: https://docs.metaplex.com
- Phantom Docs: https://docs.phantom.app

---

**Status**: ✅ Deployment guide complete

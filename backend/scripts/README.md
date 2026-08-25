# Database Seed Scripts

Scripts for initializing and seeding the Space Invaders database.

## Available Scripts

### `seed_treasury.sql`
Initializes treasury configuration with production-ready defaults.

**What it does:**
- Sets conversion ratio to 100:1 (100 Gold = 1 SPACE)
- Sets revenue share to 30% for daily emission calculation
- Sets max daily emission to 1,000 SPACE
- Creates or updates the treasury config (singleton table)

**Usage:**
```bash
# Using psql
psql -U postgres -d space_invaders -f scripts/seed_treasury.sql

# Or using Docker
docker exec -i postgres_container psql -U postgres -d space_invaders < scripts/seed_treasury.sql
```

**Environment Variables Required:**
- `TREASURY_WALLET_PUBKEY` - Solana wallet address for treasury (set in .env)

### `seed_test_data.sql`
Creates test data for development and testing.

**What it does:**
- Creates test players with Gold balances
- Creates sample conversion history
- Creates sample daily emission records
- Creates test PIX orders

**Usage:**
```bash
psql -U postgres -d space_invaders -f scripts/seed_test_data.sql
```

⚠️ **Warning:** Only run this in development environments!

## Running All Seeds

To initialize a fresh database:

```bash
# 1. Run migrations (GORM auto-migrate)
go run cmd/http/main.go  # Will auto-migrate on startup

# 2. Seed treasury config
psql -U postgres -d space_invaders -f scripts/seed_treasury.sql

# 3. (Optional) Seed test data for development
psql -U postgres -d space_invaders -f scripts/seed_test_data.sql
```

## Production Deployment

For production, only run `seed_treasury.sql` and ensure these environment variables are set:

```bash
TREASURY_WALLET_PUBKEY=<your-solana-treasury-wallet>
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta
ABACATEPAY_API_KEY=<your-production-api-key>
```

## Backup Before Seeding

Always backup production data before running seed scripts:

```bash
pg_dump -U postgres space_invaders > backup_$(date +%Y%m%d_%H%M%S).sql
```

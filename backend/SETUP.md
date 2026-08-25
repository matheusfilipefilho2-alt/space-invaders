# Backend Setup Guide

Quick guide to set up the Space Invaders backend for development.

## Prerequisites

- Go 1.21+
- PostgreSQL 16+
- Redis 7+
- (Optional) RabbitMQ 3.12+

## Quick Start

### 1. Copy Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values (see below).

### 2. Start Dependencies (Docker)

```bash
# PostgreSQL
docker run -d \
  --name space-invaders-postgres \
  -e POSTGRES_USER=spaceinvaders \
  -e POSTGRES_PASSWORD=dev_password_change_in_prod \
  -e POSTGRES_DB=spaceinvaders \
  -p 5432:5432 \
  postgres:16-alpine

# Redis
docker run -d \
  --name space-invaders-redis \
  -p 6379:6379 \
  redis:7-alpine

# (Optional) RabbitMQ
docker run -d \
  --name space-invaders-rabbitmq \
  -e RABBITMQ_DEFAULT_USER=spaceinvaders \
  -e RABBITMQ_DEFAULT_PASS=dev_password_change_in_prod \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3.12-management-alpine
```

### 3. Install Dependencies

```bash
go mod download
```

### 4. Run Database Migrations

The application auto-migrates on startup using GORM, but you can also run migrations manually:

```bash
# Start the server (it will auto-migrate)
go run cmd/http/main.go
```

### 5. Seed Treasury Configuration

```bash
# Connect to PostgreSQL
psql -U spaceinvaders -d spaceinvaders

# Run seed script
\i scripts/seed_treasury.sql
```

### 6. (Optional) Seed Test Data

For development, you can seed test players and sample data:

```bash
psql -U spaceinvaders -d spaceinvaders -f scripts/seed_test_data.sql
```

### 7. Start the Server

```bash
go run cmd/http/main.go
```

The API will be available at `http://localhost:3000`

## Required Environment Variables

### Minimal Setup (Development)

```bash
# Database
DATABASE_URL=postgres://spaceinvaders:dev_password_change_in_prod@localhost:5432/spaceinvaders?sslmode=disable

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-min-32-chars-change-this

# Solana (Devnet)
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Full Economy System Setup

To enable the full dual economy (Gold + SPACE):

1. **Create a Solana Devnet Wallet:**
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate a new keypair
solana-keygen new --outfile ~/.config/solana/treasury.json

# Get public key
solana-keygen pubkey ~/.config/solana/treasury.json

# Airdrop devnet SOL
solana airdrop 2 <YOUR_PUBKEY> --url devnet
```

2. **Create SPACE Token:**
```bash
# Create SPL token
spl-token create-token --decimals 9

# Get mint address (save this as SOLANA_SPACE_MINT)
# Create token account for treasury
spl-token create-account <MINT_ADDRESS>
```

3. **Set Environment Variables:**
```bash
SOLANA_TREASURY_PRIVATE_KEY=<base58-encoded-private-key>
SOLANA_SPACE_MINT=<token-mint-address>
TREASURY_WALLET_PUBKEY=<treasury-public-key>
```

4. **Configure AbacatePay (Optional - for PIX payments):**
```bash
# Sign up at https://abacatepay.com and get API key
ABACATEPAY_API_KEY=abc_dev_your_key_here
ABACATEPAY_WEBHOOK_SECRET=your_webhook_secret
```

## Testing the API

### Health Check
```bash
curl http://localhost:3000/health
```

### Register a Player
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "email": "player1@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player1@example.com",
    "password": "password123"
  }'
# Save the returned token
```

### Get Shop Packages
```bash
curl http://localhost:3000/api/v1/shop/packages
```

### Convert Gold to SPACE (requires auth)
```bash
curl -X POST http://localhost:3000/api/v1/conversions \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "goldAmount": 1000
  }'
```

### Get Treasury Config (admin)
```bash
curl http://localhost:3000/api/v1/admin/treasury/config \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

## Running Workers

### Conversion Worker (processes pending conversions)
```bash
go run cmd/workers/conversion_worker.go
```

### Emission Cron Job (calculates daily emissions)
```bash
go run cmd/workers/emission_cron.go
```

## Development Tips

### Hot Reload
Use `air` for hot reloading during development:

```bash
# Install air
go install github.com/cosmtrek/air@latest

# Run with hot reload
air
```

### Database Console
```bash
# Connect to PostgreSQL
docker exec -it space-invaders-postgres psql -U spaceinvaders -d spaceinvaders

# View tables
\dt

# View treasury config
SELECT * FROM treasury_configs;

# View recent conversions
SELECT * FROM gold_space_conversions ORDER BY created_at DESC LIMIT 10;
```

### Redis Console
```bash
# Connect to Redis
docker exec -it space-invaders-redis redis-cli

# Check cached price
GET space_price

# View all keys
KEYS *
```

## Troubleshooting

### "Failed to connect to database"
- Ensure PostgreSQL is running: `docker ps | grep postgres`
- Check DATABASE_URL in .env
- Verify database exists: `psql -U spaceinvaders -l`

### "Failed to connect to Redis"
- Ensure Redis is running: `docker ps | grep redis`
- Check REDIS_URL in .env
- Test connection: `redis-cli ping`

### "Failed to mint tokens"
- Ensure treasury wallet has SOL: `solana balance <PUBKEY> --url devnet`
- Verify SOLANA_TREASURY_PRIVATE_KEY is correct
- Check Solana network status: https://status.solana.com

### "Order webhook not working"
- Ensure ABACATEPAY_WEBHOOK_SECRET matches AbacatePay dashboard
- Check server is accessible from internet (use ngrok for local testing)
- Verify webhook URL is registered in AbacatePay dashboard

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment guide.

## API Documentation

Once running, view API documentation at:
- Swagger UI: `http://localhost:3000/swagger/index.html` (if enabled)
- OpenAPI spec: `http://localhost:3000/swagger/doc.json`

## Need Help?

- Backend API issues → Check logs: `docker logs space-invaders-api`
- Database issues → Check PostgreSQL logs: `docker logs space-invaders-postgres`
- Economy system → Check emission history: `SELECT * FROM daily_emissions ORDER BY date DESC;`

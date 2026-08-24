# Space Invaders - Go + Vue.js

Migração completa do Space Invaders para arquitetura moderna com economia dual Gold/SPACE.

## Stack

- **Backend:** Go 1.21+ (Clean Architecture/go-scaffold)
- **Frontend:** Vue 3 + TypeScript + Vite + Pinia
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Queue:** RabbitMQ 3.12
- **Blockchain:** Solana (Devnet/Mainnet)

## Quick Start

```bash
# Start infrastructure
make dev

# Backend (terminal 1)
cd backend
make run

# Frontend (terminal 2)
cd frontend
npm run dev
```

## Structure

```
space-invaders/
├── backend/          # Go backend (go-scaffold architecture)
├── frontend/         # Vue 3 + TypeScript frontend
├── contracts/        # Solana smart contracts
├── docs/            # Documentation and specs
│   └── superpowers/ # Implementation plans and design specs
└── docker-compose.yml
```

## Documentation

- **Design Spec:** `docs/superpowers/specs/2026-08-24-space-invaders-go-migration-design.md`
- **Implementation Plan:** `docs/superpowers/plans/README.md`
- **Fase 0:** `docs/superpowers/plans/fase-0-migracao.md` (Data Migration)
- **Fase 1:** `docs/superpowers/plans/fase-1-base.md` (Backend Base)
- **Fase 2:** `docs/superpowers/plans/fase-2-economia.md` (Economy System)
- **Fase 3:** `docs/superpowers/plans/fase-3-progressao.md` (Progression)
- **Fase 4:** `docs/superpowers/plans/fase-4-social-pvp.md` (Social & PvP)
- **Fase 5+6:** `docs/superpowers/plans/fase-5-6-admin-polish.md` (Admin & Polish)

## Development

### Backend

```bash
cd backend
make run              # Run server
make test             # Run tests
make migration-up     # Run migrations
```

### Frontend

```bash
cd frontend
npm run dev           # Development server
npm run build         # Production build
npm run test          # Run tests
```

## Migration

To migrate data from Supabase to PostgreSQL:

```bash
make migrate-dry-run  # Test migration
make migrate          # Run migration
```

## Environment Variables

Copy `.env.example` files in backend/ and frontend/ to `.env` and configure:

### Backend (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `RABBITMQ_URL` - RabbitMQ connection string
- `JWT_SECRET` - JWT signing secret
- `SOLANA_RPC_URL` - Solana RPC endpoint
- `SOLANA_TREASURY_PRIVATE_KEY` - Treasury wallet private key
- `ABACATEPAY_API_KEY` - AbacatePay API key for PIX payments

### Frontend (.env)
- `VITE_API_URL` - Backend API URL
- `VITE_SOLANA_NETWORK` - Solana network (devnet/mainnet-beta)
- `VITE_SOLANA_RPC_URL` - Solana RPC endpoint

## License

Proprietary

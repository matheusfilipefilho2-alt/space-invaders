# Space Invaders: Supabase to Go/PostgreSQL Migration Guide

> **Complete guide for migrating from Supabase to Go backend with PostgreSQL**

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Migration Pipeline](#migration-pipeline)
5. [Step-by-Step Execution](#step-by-step-execution)
6. [Validation](#validation)
7. [Rollback Plan](#rollback-plan)
8. [Troubleshooting](#troubleshooting)
9. [Post-Migration Tasks](#post-migration-tasks)

---

## Overview

### What This Migration Does

This migration transforms Space Invaders from a Supabase-based architecture to a modern Go backend with PostgreSQL, while preserving all player data and game state.

**Before**: Supabase (PostgreSQL + Edge Functions) + JavaScript frontend
**After**: Go backend (Clean Architecture) + PostgreSQL + Vue 3 frontend

### Migration Scope

**Data Migrated:**
- ✅ Players (coins → gold balance, wallet addresses preserved)
- ✅ Leagues (6 competitive tiers)
- ✅ Player Items (with NFT tracking)
- ✅ Achievements (with seed data)
- ✅ Player Achievement Progress
- ✅ Gold/SPACE conversions
- ✅ Daily emissions (Treasury tracking)
- ✅ Reward history (audit log)
- ✅ Orders (PIX payment tracking)

**Key Changes:**
- UUID primary keys → Auto-increment integers (with compensation table)
- `coins` field → `gold_balance` (dual currency system)
- Supabase Edge Functions → Go HTTP handlers
- JavaScript → Go + Vue 3

---

## Prerequisites

### Required Software

```bash
# Backend
Go 1.21+
PostgreSQL 16
Redis 7
RabbitMQ 3.12

# Frontend
Node.js 22+
npm 10+

# Database Tools
psql (PostgreSQL client)
pg_dump (for backups)
```

### Environment Variables

Create `backend/.env`:

```env
# Supabase (source - for migration only)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# PostgreSQL (target)
DATABASE_URL=postgres://spaceinvaders:password@localhost:5432/spaceinvaders?sslmode=disable

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://spaceinvaders:password@localhost:5672/

# Server
PORT=3000
JWT_SECRET=your-jwt-secret-min-32-chars

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# AbacatePay
ABACATEPAY_API_KEY=your-api-key
```

### Infrastructure Setup

```bash
# Start infrastructure services
docker-compose up -d

# Verify services
docker-compose ps

# Expected output:
# postgresql   Up   5432/tcp
# redis        Up   6379/tcp
# rabbitmq     Up   5672/tcp, 15672/tcp
```

---

## Architecture

### Migration Pipeline (ETLV)

```
┌─────────────┐
│   Supabase  │ (Source)
│  PostgreSQL │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Phase 1: EXTRACT                       │
│  • Connect to Supabase REST API         │
│  • Fetch all 9 entity types             │
│  • Store as ExtractedData structs       │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Phase 2: TRANSFORM                     │
│  • Convert UUIDs → auto-increment IDs   │
│  • coins → gold_balance                 │
│  • Merge player_wallets into players   │
│  • Map enums (status, types, etc.)     │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Phase 3: LOAD                          │
│  • Connect to PostgreSQL                │
│  • Auto-migrate tables                  │
│  • Batch insert (100 records/batch)    │
│  • Respect dependency order             │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Phase 4: VALIDATE                      │
│  • Compare record counts                │
│  • Supabase vs PostgreSQL               │
│  • Generate validation report           │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Phase 5: SAVE UUID MAPPINGS            │
│  • Persist UUID → ID mappings           │
│  • Store in uuid_mappings table         │
│  • Enable rollback/debugging            │
└──────────┬──────────────────────────────┘
           │
           ▼
┌──────────────┐
│  PostgreSQL  │ (Target)
│   + Go API   │
└──────────────┘
```

### Dependency Order

Entities are loaded in this order to satisfy foreign key constraints:

1. **Leagues** (no dependencies)
2. **Players** (→ Leagues)
3. **PlayerItems** (→ Players)
4. **Achievements** (no dependencies)
5. **PlayerAchievements** (→ Players, Achievements)
6. **GoldSpaceConversions** (→ Players)
7. **DailyEmissions** (no dependencies)
8. **RewardHistory** (→ Players)
9. **Orders** (→ Players)

---

## Migration Pipeline

### Scripts Location

```
backend/scripts/
├── migrate-from-supabase/
│   ├── main.go              # ETL orchestration
│   ├── extract.go           # Phase 1: Extract
│   ├── transform.go         # Phase 2: Transform
│   ├── load.go              # Phase 3: Load
│   ├── validate.go          # Phase 4: Validate
│   ├── save_uuid_mapping.go # Phase 5: Save mappings
│   ├── types.go             # Supabase type definitions
│   └── README.md            # Script documentation
└── seed/
    ├── seed.go              # Seed orchestration
    ├── leagues.go           # Seed 6 leagues
    ├── achievements.go      # Seed 7 achievements
    └── README.md            # Seed documentation
```

### Key Features

- **Idempotent**: Safe to run multiple times (checks for existing data)
- **Batch Processing**: 100 records per batch for performance
- **Error Handling**: Graceful failures with clear messages
- **Progress Logging**: Real-time progress indicators
- **Dry Run Mode**: Test without loading data (`--dry-run` flag)
- **Validation**: Automatic count matching after load

---

## Step-by-Step Execution

### Step 1: Pre-Migration Backup

**CRITICAL**: Always backup Supabase before migration.

```bash
# Get Supabase connection string
# Dashboard → Settings → Database → Connection String

# Create backup
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" \
  --no-owner --no-acl \
  > supabase_backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip supabase_backup_*.sql

# Upload to safe storage (S3, Google Drive, etc.)
```

### Step 2: Verify Prerequisites

```bash
# Check Go version
go version  # Should be 1.21+

# Check PostgreSQL
psql --version  # Should be 16+

# Verify infrastructure is running
docker-compose ps

# Test PostgreSQL connection
psql "$DATABASE_URL" -c "SELECT version();"
```

### Step 3: Build Migration Script

```bash
cd backend/scripts/migrate-from-supabase

# Build binary
go build -o migrate .

# Verify build
./migrate --help
```

### Step 4: Dry Run (Test Without Loading)

```bash
# Test extraction and transformation only
./migrate --dry-run

# Expected output:
# ==========================================
# SPACE INVADERS MIGRATION
# Supabase → PostgreSQL
# ==========================================
#
# 📥 Phase 1: Extracting from Supabase...
# ✅ Extracted 156 players
# ✅ Extracted 423 player_items
# [...]
#
# 🔄 Phase 2: Transforming data...
# ✅ Transformed 156 players
# [...]
#
# ⚠️  DRY RUN MODE - Skipping database load
```

### Step 5: Execute Full Migration

```bash
# Run complete migration
./migrate

# Monitor progress
# Phase 1: Extract (1-2 minutes)
# Phase 2: Transform (< 1 minute)
# Phase 3: Load (2-5 minutes depending on data size)
# Phase 4: Validate (< 1 minute)
# Phase 5: Save UUID mappings (< 1 minute)
```

### Step 6: Review Validation Report

```bash
# Example output:
# ======================================================================
# VALIDATION REPORT
# ======================================================================
#
# Table                     Supabase        PostgreSQL      Status
# ----------------------------------------------------------------------
# Players                   156             156             ✅ MATCH
# Leagues                   6               6               ✅ MATCH
# PlayerItems              423             423             ✅ MATCH
# Achievements             12              12              ✅ MATCH
# PlayerAchievements       89              89              ✅ MATCH
# GoldSpaceConversions     234             234             ✅ MATCH
# DailyEmissions           45              45              ✅ MATCH
# RewardHistory            178             178             ✅ MATCH
# Orders                   67              67              ✅ MATCH
# ----------------------------------------------------------------------
#
# ✅ VALIDATION SUCCESSFUL: All record counts match!
```

### Step 7: Seed Reference Data

```bash
cd backend/scripts/seed

# Build seed script
go build -o seed .

# Run seeding
./seed

# Expected output:
# 🌱 Seeding database...
# ✅ Seeded 6 leagues
# ✅ Seeded 7 achievements
# ✅ Database seeding complete!
```

### Step 8: Verify Data Integrity

```bash
# Connect to PostgreSQL
psql "$DATABASE_URL"

# Check table counts
SELECT
  'players' as table_name, COUNT(*) as count FROM players
UNION ALL
SELECT 'leagues', COUNT(*) FROM leagues
UNION ALL
SELECT 'player_items', COUNT(*) FROM player_items
UNION ALL
SELECT 'achievements', COUNT(*) FROM achievements;

# Sample player data
SELECT id, username, gold_balance, space_balance, wallet_address
FROM players
LIMIT 5;

# Check UUID mappings
SELECT COUNT(*) as total_mappings
FROM uuid_mappings;

# Exit
\q
```

---

## Validation

### Automated Validation

The migration script automatically validates:

1. **Record Counts**: Supabase count = PostgreSQL count for each entity
2. **Data Types**: All fields properly typed
3. **Foreign Keys**: All relationships preserved
4. **UUID Mappings**: All UUIDs have corresponding uint IDs

### Manual Validation Checklist

- [ ] All players migrated with correct balances
- [ ] Wallet addresses preserved (or NULL if not set)
- [ ] Leagues created with correct point ranges
- [ ] Achievements seeded correctly
- [ ] Player achievements linked correctly
- [ ] Items preserved with NFT tracking intact
- [ ] Conversion history complete
- [ ] Order history preserved
- [ ] UUID mapping table populated

### Query Examples

```sql
-- Check for NULL wallet addresses
SELECT COUNT(*) as without_wallet
FROM players
WHERE wallet_address IS NULL;

-- Verify gold balances (should be > 0 for active players)
SELECT AVG(gold_balance) as avg_gold,
       MAX(gold_balance) as max_gold,
       MIN(gold_balance) as min_gold
FROM players;

-- Check achievement completion rates
SELECT a.name, COUNT(pa.id) as unlocked_by
FROM achievements a
LEFT JOIN player_achievements pa ON a.id = pa.achievement_id
GROUP BY a.id, a.name
ORDER BY unlocked_by DESC;

-- Verify UUID mappings
SELECT entity_type, COUNT(*) as count
FROM uuid_mappings
GROUP BY entity_type;
```

---

## Rollback Plan

### If Migration Fails

1. **Stop immediately**: `Ctrl+C` to cancel migration
2. **Check error message**: Review logs for specific failure
3. **Fix issue**: Address the root cause
4. **Clear PostgreSQL**: Drop and recreate database
5. **Retry**: Run migration again

```bash
# Drop all tables
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Or drop and recreate database
dropdb spaceinvaders
createdb spaceinvaders

# Retry migration
./migrate
```

### If Migration Succeeds But Data Is Wrong

1. **Restore Supabase backup**:
```bash
gunzip supabase_backup_20260824.sql.gz
psql "$DATABASE_URL" < supabase_backup_20260824.sql
```

2. **Debug with UUID mappings**:
```sql
-- Find new ID for specific UUID
SELECT new_id
FROM uuid_mappings
WHERE old_uuid = 'abc-123-def-456';
```

3. **Re-run migration** with fixes applied

---

## Troubleshooting

### Common Issues

#### 1. "SUPABASE_URL not set"

**Cause**: Missing environment variables

**Fix**:
```bash
# Copy example env
cp backend/.env.example backend/.env

# Edit with your values
nano backend/.env
```

#### 2. "Connection refused" (PostgreSQL)

**Cause**: PostgreSQL not running or wrong port

**Fix**:
```bash
# Check if running
docker-compose ps

# Restart if needed
docker-compose restart postgresql

# Verify connection
psql "$DATABASE_URL" -c "SELECT 1;"
```

#### 3. "Validation failed: counts don't match"

**Cause**: Data loss during migration or extraction failure

**Fix**:
```bash
# Check specific table counts
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM players;"

# Compare with Supabase
# Supabase Dashboard → Table Editor → Check row count

# If mismatch, check logs for errors during load
# Re-run migration with --verbose flag (if implemented)
```

#### 4. "Foreign key constraint violation"

**Cause**: Loading entities out of dependency order

**Fix**: This should not happen (load order is hardcoded), but if it does:
```bash
# Manually load in correct order:
# 1. Leagues
# 2. Players
# 3. Everything else
```

#### 5. "UUID mapping failed"

**Cause**: Duplicate UUIDs or ID collision

**Fix**:
```bash
# Check for duplicates
psql "$DATABASE_URL" -c "
SELECT old_uuid, COUNT(*)
FROM uuid_mappings
GROUP BY old_uuid
HAVING COUNT(*) > 1;
"

# If found, investigate and fix transform.go
```

---

## Post-Migration Tasks

### 1. Update Application Code

- [ ] Point frontend to new Go backend (update `VITE_API_URL`)
- [ ] Test authentication flow
- [ ] Test game endpoints
- [ ] Verify wallet connection

### 2. Deploy Go Backend

```bash
cd backend

# Build production binary
go build -o bin/space-invaders cmd/http/main.go

# Run
./bin/space-invaders
```

### 3. Monitor Initial Usage

- [ ] Check error logs
- [ ] Monitor database performance
- [ ] Verify WebSocket connections (PvP)
- [ ] Test payment webhooks (AbacatePay)

### 4. Performance Tuning

```sql
-- Add indexes if needed
CREATE INDEX idx_players_wallet ON players(wallet_address) WHERE wallet_address IS NOT NULL;
CREATE INDEX idx_player_items_player ON player_items(player_id);
CREATE INDEX idx_player_achievements_player ON player_achievements(player_id);

-- Analyze tables for query planning
ANALYZE players;
ANALYZE player_items;
ANALYZE achievements;
```

### 5. Archive Supabase

**Do NOT delete Supabase immediately**. Keep it running for:
- 7 days: Monitor new backend stability
- 30 days: Emergency rollback capability
- 90 days: Long-term archive before deletion

---

## Migration Metrics

### Expected Durations

| Phase | Duration | Size |
|-------|----------|------|
| Extract | 1-3 min | 1,000 players |
| Transform | <1 min | Any size |
| Load | 2-10 min | 1,000 players |
| Validate | <1 min | Any size |
| Total | ~5-15 min | 1,000 players |

### Performance Tips

- Run on production-grade hardware
- Ensure low latency to Supabase
- Use fast PostgreSQL storage (SSD)
- Increase batch size for large datasets (edit `load.go`)

---

## Support

### Documentation

- **Migration Scripts**: `backend/scripts/migrate-from-supabase/README.md`
- **Seed Scripts**: `backend/scripts/seed/README.md`
- **API Docs**: `docs/api/` (after Fase 1)
- **Architecture**: `docs/architecture/` (after Fase 1)

### Getting Help

1. **Check logs**: Migration script outputs detailed errors
2. **Review code**: All scripts are well-commented
3. **Test queries**: Use psql to inspect data
4. **Create issue**: GitHub issues for bugs

---

## Success Criteria

Migration is successful when:

- ✅ All validation checks pass (100% count matching)
- ✅ No data loss (Supabase count = PostgreSQL count)
- ✅ Foreign keys intact (no orphaned records)
- ✅ UUID mappings saved (for debugging)
- ✅ Seed data loaded (leagues, achievements)
- ✅ Go backend accepts API requests
- ✅ Frontend connects successfully
- ✅ Authentication works
- ✅ Game saves scores correctly
- ✅ Payments process (if tested)

---

## Next Steps

After successful migration:

1. **Fase 1**: Implement Go backend base (Auth, Game service, etc.)
2. **Fase 2**: Economy system (Gold/SPACE conversions, Treasury)
3. **Fase 3**: Progression (Battle Pass, Achievements)
4. **Fase 4**: Social & PvP (Guilds, Tournaments, Matchmaking)
5. **Fase 5-6**: Admin panel & Polish

See `docs/superpowers/plans/` for detailed implementation plans.

---

**Migration Guide Version**: 1.0
**Last Updated**: 2026-08-24
**Author**: Space Invaders Migration Team
**Status**: Production Ready ✅

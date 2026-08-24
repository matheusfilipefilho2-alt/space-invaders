# Database Seeding

This script populates initial reference data required for the Space Invaders system.

## What Gets Seeded

### 1. Leagues (6 tiers)

The competitive ranking system with progressive point requirements:

| League | Min Points | Max Points | Icon | Color |
|--------|-----------|-----------|------|-------|
| Bronze | 0 | 999 | 🥉 | #CD7F32 |
| Silver | 1,000 | 2,499 | 🥈 | #C0C0C0 |
| Gold | 2,500 | 4,999 | 🥇 | #FFD700 |
| Platinum | 5,000 | 9,999 | ⭐ | #E5E4E2 |
| Diamond | 10,000 | 19,999 | 💎 | #B9F2FF |
| Master | 20,000+ | 999,999 | 👑 | #FF6B6B |

### 2. Achievements (7 initial achievements)

Player progression milestones with gold rewards:

| Achievement | ID | Description | Rarity | Reward |
|------------|-----|-------------|--------|--------|
| First Blood | `first_kill` | Destroy your first alien | COMMON | 10 gold |
| Score Master | `score_10k` | Reach 10,000 points | RARE | 50 gold |
| Score Legend | `score_100k` | Reach 100,000 points | EPIC | 200 gold |
| Century Player | `games_100` | Play 100 games | RARE | 100 gold |
| NFT Collector | `nft_mint_first` | Mint your first NFT | EPIC | 0 gold |
| Guild Master | `guild_founder` | Create a guild | LEGENDARY | 500 gold |
| Champion | `tournament_win` | Win a tournament | LEGENDARY | 1,000 gold |

## Usage

### Prerequisites

- Database must be migrated (run migrations first)
- `.env` file configured with `DATABASE_URL`
- Go 1.24+ installed

### Running the Seeder

```bash
cd backend/scripts/seed
go run .
```

Or from the backend root:

```bash
cd backend
go run ./scripts/seed
```

### Expected Output

```
🌱 Starting database seeding...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Seeding Leagues...
   ✓ Bronze (0 - 999 points) 🥉
   ✓ Silver (1000 - 2499 points) 🥈
   ✓ Gold (2500 - 4999 points) 🥇
   ✓ Platinum (5000 - 9999 points) ⭐
   ✓ Diamond (10000 - 19999 points) 💎
   ✓ Master (20000 - 999999 points) 👑
   ✅ Successfully seeded 6 leagues

🏆 Seeding Achievements...
   ✓ First Blood [COMMON] - 10 gold 🎯
   ✓ Score Master [RARE] - 50 gold ⭐
   ✓ Score Legend [EPIC] - 200 gold 🌟
   ✓ Century Player [RARE] - 100 gold 🎮
   ✓ NFT Collector [EPIC] - 0 gold 🖼️
   ✓ Guild Master [LEGENDARY] - 500 gold 🏛️
   ✓ Champion [LEGENDARY] - 1000 gold 🏆
   ✅ Successfully seeded 7 achievements

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Database seeding complete!
```

## Safety Features

- **Idempotent**: Safe to run multiple times without duplicating data
- **Existence Check**: Verifies if data already exists before inserting
- **Atomic Operations**: Each seed function handles its own transaction
- **Clear Logging**: Reports what was inserted or skipped

## Environment Variables

The seeder uses the following environment variables:

- `DATABASE_URL` - PostgreSQL connection string (required)

Example `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/space_invaders
```

## Adding New Seed Data

To add new seed data:

1. Create a new seed function in a separate file (e.g., `treasury.go`)
2. Follow the pattern:
   ```go
   func SeedTreasury(ctx context.Context, db *gorm.DB) error {
       // Check if already seeded
       var count int64
       db.Model(&entity.Treasury{}).Count(&count)
       if count > 0 {
           log.Printf("Treasury already seeded, skipping...")
           return nil
       }
       
       // Insert data
       // ...
       
       return nil
   }
   ```
3. Call the function in `seed.go` main function
4. Update this README

## Troubleshooting

### Database Connection Error
```
Failed to connect to database: connection refused
```
**Solution**: Ensure PostgreSQL is running and `DATABASE_URL` is correct

### Already Seeded
```
⏭️  Leagues already seeded (6 records), skipping...
```
**This is normal**: The seeder detected existing data and skipped re-insertion

### Migration Not Run
```
ERROR: relation "leagues" does not exist
```
**Solution**: Run database migrations first:
```bash
cd backend
go run cmd/migrate/main.go
```

## Related Files

- Seed data definitions: `internal/domain/entity/league.go`, `internal/domain/entity/achievement.go`
- Database migrations: `database/migrations/`
- Database infrastructure: `internal/infra/database/db_client.go`

## Development Notes

- Seed data is defined in entity files (`SeedLeagues()`, `SeedAchievements()`)
- This keeps business logic close to domain models
- The seeder script is just infrastructure that calls these functions
- Add new seed data to entity files, not here

# Supabase Data Extraction Script

This script extracts data from the old Supabase database and saves it to JSON files for migration to the new Go backend.

## Prerequisites

- Go 1.21 or later
- Access to the Supabase database (SUPABASE_URL and SUPABASE_KEY)

## Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

## Usage

### Dry Run (Default)

Extract data and save to JSON files without connecting to the new database:

```bash
cd backend/scripts/migrate-from-supabase
go run . --dry-run
```

### Verbose Mode

Enable detailed logging:

```bash
go run . --dry-run --verbose
```

### Build and Run

Build the executable:

```bash
go build -o extract-data .
./extract-data --dry-run
```

## Extracted Data

The script extracts data from the following tables:

1. **Players** (with merged player_wallets data via LEFT JOIN)
2. **Achievements**
3. **Player Achievements**
4. **Items**
5. **Player Items**
6. **Gold/SPACE Conversions**
7. **Daily Emissions**
8. **Reward History**
9. **Orders**
10. **Leagues**
11. **Guilds**
12. **Guild Members**
13. **Tournament Participants**
14. **PvP Matches**
15. **Battle Pass Seasons**
16. **Battle Pass Progress**
17. **Special Events** (last 30 days + future events only)

All data is saved to JSON files in the `extracted/` directory.

## Output Files

```
extracted/
├── players.json
├── achievements.json
├── player_achievements.json
├── items.json
├── player_items.json
├── gold_space_conversions.json
├── daily_emissions.json
├── reward_history.json
├── orders.json
├── leagues.json
├── guilds.json
├── guild_members.json
├── tournament_participants.json
├── pvp_matches.json
├── battle_pass_seasons.json
├── battle_pass_progress.json
└── special_events.json
```

## Error Handling

- If a table doesn't exist in Supabase, the script will log a warning and continue
- All errors are logged with descriptive messages
- The script will exit with an error code if a critical operation fails

## Next Steps

After extraction:

1. Review the JSON files in the `extracted/` directory
2. Run the transformation script: `go run transform.go`
3. Run the load script: `go run load.go`

## Architecture

The script follows Clean Architecture principles:

- **types.go**: Data structure definitions matching Supabase schema
- **extract.go**: Extraction logic for each table
- **main.go**: Orchestration and CLI interface

## Notes

- Players are extracted with LEFT JOIN to player_wallets to merge wallet data
- Special events are filtered to last 30 days + future events to reduce data size
- All extraction operations log progress and record counts
- JSON files are formatted with indentation for easy review

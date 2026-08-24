# Migration Execution Guide

## Prerequisites

1. **Environment Variables**
   Create a `.env` file in `backend/` directory:
   ```bash
   # Supabase (source)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-service-role-key
   
   # PostgreSQL (target)
   DATABASE_URL=postgresql://user:password@localhost:5432/space_invaders
   ```

2. **Database Setup**
   Ensure PostgreSQL is running and database exists:
   ```bash
   createdb space_invaders
   ```

3. **Build the Binary**
   ```bash
   cd backend/scripts/migrate-from-supabase
   go build
   ```

## Migration Steps

### Step 1: Dry Run (Recommended First)

Test extraction and transformation without touching the database:

```bash
./migrate-from-supabase --dry-run
```

**Expected Output:**
- Extract data from Supabase
- Transform to Go entities
- Print summaries
- Stop before database load

**What to Check:**
- ✅ All tables extracted successfully
- ✅ Entity counts match expectations
- ✅ No transformation errors
- ✅ UUID mappings created correctly

### Step 2: Review Extracted Data

Check the JSON files in `extracted/` directory:

```bash
ls -lh extracted/
cat extracted/players.json | jq '.[0]'  # View first player
```

### Step 3: Full Migration

Run the complete ETL pipeline:

```bash
./migrate-from-supabase
```

**Expected Output:**
```
╔══════════════════════════════════════════════════════════════╗
║        SPACE INVADERS - SUPABASE TO POSTGRESQL MIGRATION     ║
╚══════════════════════════════════════════════════════════════╝

============================================================
PHASE 1: EXTRACT DATA FROM SUPABASE
============================================================
Extracting players...
✓ Extracted 150 players
...

============================================================
PHASE 2: TRANSFORM DATA
============================================================
✓ Transformed 150 players
...

============================================================
PHASE 3: LOAD DATA INTO POSTGRESQL
============================================================
✓ Connected to PostgreSQL
✓ All tables created/updated successfully
Loading 150 players...
  Progress: 100/150 players loaded
  Progress: 150/150 players loaded
✓ Loaded 150 players
...

============================================================
MIGRATION COMPLETED SUCCESSFULLY
============================================================
```

### Step 4: Validation (Coming in Task 9)

After migration, run validation:

```bash
# To be implemented
go run validate.go
```

## Troubleshooting

### Error: "SUPABASE_URL and SUPABASE_KEY environment variables are required"

**Solution:**
```bash
# Check .env file exists
cat ../../.env

# Or set manually
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_KEY=your-key
```

### Error: "DATABASE_URL environment variable is required"

**Solution:**
```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/space_invaders
```

### Error: "failed to connect to database"

**Possible causes:**
1. PostgreSQL not running: `brew services start postgresql@16`
2. Database doesn't exist: `createdb space_invaders`
3. Wrong credentials in DATABASE_URL
4. Wrong host/port

**Debug:**
```bash
# Test connection manually
psql $DATABASE_URL
```

### Error: "failed to insert players batch"

**Possible causes:**
1. Foreign key violation (Leagues not loaded first)
2. Duplicate primary key
3. Data type mismatch

**Solution:**
- Check loading order (should be automatic)
- Drop and recreate database if needed:
  ```bash
  dropdb space_invaders
  createdb space_invaders
  ```

### Error: "request failed with status 401"

**Cause:** Invalid Supabase credentials

**Solution:**
- Verify SUPABASE_KEY is the **service role key** (not anon key)
- Get from Supabase Dashboard → Settings → API

## Data Verification Checklist

After migration, verify:

- [ ] Player count matches Supabase
- [ ] League data exists (at least 5 leagues)
- [ ] PlayerItems linked correctly
- [ ] Achievements loaded (seed data or from Supabase)
- [ ] PlayerAchievements reference valid achievements
- [ ] GoldSpaceConversions have valid player IDs
- [ ] Orders have valid player IDs
- [ ] All timestamps preserved
- [ ] Gold balances match Supabase coins

## Performance Expectations

| Entity Type | Typical Count | Time (est.) |
|-------------|--------------|-------------|
| Leagues | 5 | <1s |
| Players | 100-1000 | 1-10s |
| PlayerItems | 500-5000 | 5-50s |
| Achievements | 20-50 | <1s |
| PlayerAchievements | 100-500 | 1-5s |
| Conversions | 10-100 | <5s |
| DailyEmissions | 30-365 | <5s |
| RewardHistory | 500-5000 | 5-50s |
| Orders | 50-500 | 1-5s |

**Total estimated time:** 1-3 minutes for typical production data

## Rollback Plan

If migration fails:

1. **Before migration:** Backup PostgreSQL (if has existing data)
   ```bash
   pg_dump space_invaders > backup_before_migration.sql
   ```

2. **After failed migration:** Drop and recreate
   ```bash
   dropdb space_invaders
   createdb space_invaders
   
   # Restore backup if needed
   psql space_invaders < backup_before_migration.sql
   ```

3. **Supabase data remains unchanged** - This is a one-way migration

## Migration Flags

```bash
./migrate-from-supabase [flags]

Flags:
  --dry-run    Extract and transform only, do not load data
  --help       Show this help message
```

## Next Steps After Migration

1. **Run validation script** (Task 9)
2. **Implement SPACE compensation** (Task 10)
3. **Update application config** to use PostgreSQL
4. **Test application** with new database
5. **Monitor performance** and optimize if needed
6. **Keep Supabase** as backup during transition period

## Support

If you encounter issues:

1. Check logs for detailed error messages
2. Review extracted JSON files in `extracted/` directory
3. Verify environment variables are set correctly
4. Test database connection manually
5. Check Supabase dashboard for API limits/status

---

**Migration Status Tracking:**

- [ ] Prerequisites configured
- [ ] Dry run successful
- [ ] Extracted data reviewed
- [ ] Full migration executed
- [ ] Data validation passed
- [ ] Application tested with PostgreSQL
- [ ] Production cutover planned

Good luck with your migration! 🚀

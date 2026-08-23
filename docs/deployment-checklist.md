# PvP Deployment Checklist

## Pre-Deployment
- [ ] All Edge Functions deployed:
  - pvp-signaling
  - pvp-matchmaking
  - pvp-validate-match
  - pvp-challenge-friend
  - pvp-challenge-respond

- [ ] Database migration applied:
  - supabase/migrations/20260823000001_pvp_schema.sql

- [ ] Environment variables set:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY

## Scheduling
- [ ] Setup matchmaking scheduler (every 2 seconds):
  - Option 1: pg_cron (recommended for production)
  - Option 2: External scheduler (GitHub Actions, Vercel Cron)
  - Option 3: Client-side polling (development only)

## Performance
- [ ] Test signaling server instance affinity
- [ ] Monitor WebRTC connection success rate
- [ ] Check database query performance on pvp_queue
- [ ] Verify ELO calculation performance
- [ ] Test with simulated high latency (100ms+)

## Security
- [ ] Rate limits tested (20 matches/hour)
- [ ] Challenge spam limits tested (10/hour)
- [ ] Bet amount validation enforced
- [ ] Match result conflict detection working
- [ ] RLS policies enabled on all tables

## Monitoring
- [ ] Setup Edge Function logs monitoring
- [ ] Track match completion rate
- [ ] Monitor desync frequency
- [ ] Track average match duration
- [ ] Monitor coin distribution accuracy

## Known Issues
- Signaling server in-memory storage may fail with multiple instances
- No auto-cleanup for old pvp_matches (manual cleanup needed)
- Matchmaking requires scheduler setup

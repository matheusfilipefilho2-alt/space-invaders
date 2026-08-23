# PvP Matchmaking Function

Matches players in queue based on:
- Same bet amount
- Similar ELO (±50, expanding with wait time)
- FIFO within ELO range

## Deployment

```bash
supabase functions deploy pvp-matchmaking
```

## Scheduling

This function should be called every 2 seconds. Options:

1. **Development**: Client-side interval
2. **Production**: Use pg_cron or external scheduler (e.g., GitHub Actions, Vercel Cron)

Example pg_cron setup:
```sql
SELECT cron.schedule(
  'pvp-matchmaking',
  '*/2 * * * * *',  -- Every 2 seconds
  $$SELECT net.http_post(
    url:='https://apbbhuhtdqfwfmlzxnwv.supabase.co/functions/v1/pvp-matchmaking',
    headers:='{"Content-Type": "application/json"}'::jsonb
  )$$
);
```

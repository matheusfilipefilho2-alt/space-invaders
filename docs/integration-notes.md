# PvP Integration Notes

## Navigation
Add PvP button to main menu linking to `pvp.html`

## Required Integrations:
1. Main menu → PvP lobby link
2. PvPGame → PvPResultsScreen integration
3. Error handling for all Edge Functions
4. Loading states throughout
5. Supabase environment variables check

## Testing Checklist:
- [ ] Queue join/leave flow
- [ ] Match found notification
- [ ] WebRTC connection establishment
- [ ] Game synchronization
- [ ] Match result submission
- [ ] ELO updates
- [ ] Coin distribution
- [ ] Friend challenge flow
- [ ] Challenge accept/decline
- [ ] Rate limits
- [ ] Auto-expiration of challenges
- [ ] Reconnection scenarios

## Known Limitations:
- Signaling server uses in-memory storage (test instance affinity)
- No database cleanup for old matches (manual cleanup needed)
- Matchmaking requires manual trigger (no auto-scheduler yet)

# PvP Security Considerations

## Anti-Cheat Measures
1. **Lockstep synchronization** - Both clients run identical physics
2. **Checksum validation** - State verified every second
3. **Match result validation** - Both players must agree on outcome
4. **Conflict flagging** - Mismatched results flagged for review

## Rate Limiting
- 20 matches per hour per player
- 10 friend challenges per hour per player
- Enforced at database level

## Bet Validation
- Only allowed amounts: 10, 50, 100, 500
- Enforced in Edge Functions
- Database constraints as backup

## Coin Security
- Coins escrowed at match start
- Distribution only after result validation
- Uses RPC function with transaction safety

## RLS (Row Level Security)
- All pvp_* tables should have RLS enabled
- Players can only read their own matches
- Service role bypasses RLS for Edge Functions

## Potential Vulnerabilities
1. **Signaling server** - No authentication, could be DOS target
2. **WebRTC** - Peer IP addresses exposed
3. **Desync attacks** - Intentional desyncs to force draws
4. **Result submission** - Race conditions if both submit simultaneously

## Recommendations
1. Add authentication to signaling server
2. Implement IP-based rate limiting
3. Add desync pattern detection
4. Add match duration bounds (min 30s, max 10min)

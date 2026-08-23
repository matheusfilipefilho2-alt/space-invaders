# PvP 1v1 Battle Mode - Design Specification

**Date:** 2026-08-23
**Status:** Approved for Implementation
**Author:** Design Session with User

---

## 1. Overview

### 1.1 Goal

Implement a real-time PvP (Player vs Player) 1v1 battle mode where two players compete in a Space Invaders arena with shared physics, meteors, and aliens. First player to destroy the opponent's ship 3 times wins the match and takes the pot of coins wagered.

### 1.2 Core Features

- **Matchmaking:** Automatic queue-based matchmaking + direct friend challenges
- **Real-time Combat:** WebRTC peer-to-peer connection for low latency (20-50ms)
- **Betting System:** Fixed bet amounts (10, 50, 100, 500 coins), winner takes all
- **ELO Ranking:** Competitive ranking system with tiers (Bronze → Grandmaster)
- **Shared Environment:** Meteors and aliens spawn at same positions, can be destroyed by either player
- **Progressive Difficulty:** Power-ups appear over time, sudden death after 5 minutes
- **Match History:** Track last 20 matches with detailed stats

### 1.3 User Experience Requirements

- Each player sees their ship at the bottom (familiar perspective from single-player)
- Opponent's ship appears at top (rotated 180°)
- Skins are cosmetic only (no gameplay advantages in PvP)
- No chat (avoid toxicity, maintain focus)
- Automatic victory on disconnect (prevent abuse)

---

## 2. Architecture

### 2.1 High-Level Components

**Frontend (JavaScript):**
- `PvPLobby.js` - Main PvP menu UI
- `PvPMatchmaker.js` - Matchmaking queue and friend challenges
- `PvPGame.js` - Game engine (extends existing `game.js`)
- `WebRTCConnection.js` - Peer-to-peer connection management
- `PvPPhysicsSync.js` - Deterministic physics synchronization
- `PvPPlayer.js` - PvP player entity (extends `player.js`)
- `SeededRandom.js` - Deterministic RNG for shared state

**Backend (Supabase Edge Functions - Deno):**
- `pvp-signaling` - WebRTC signaling server (ICE candidates, SDP offers/answers)
- `pvp-matchmaking` - Queue management and player pairing
- `pvp-validate-match` - Server-side result validation and anti-cheat
- `pvp-challenge-friend` - Direct challenge creation and notifications

**Database (PostgreSQL):**
- `pvp_matches` - Match records (active and completed)
- `pvp_queue` - Real-time matchmaking queue
- `pvp_elo_rankings` - Player ELO ratings and stats
- `pvp_match_history` - Last 20 matches per player
- `pvp_challenges` - Pending friend challenges

### 2.2 Communication Flow

```
[Client A] <----WebRTC P2P----> [Client B]
     |                              |
     | (matchmaking, validation)    |
     v                              v
[Supabase Edge Functions] <--> [PostgreSQL]
```

**WebRTC Usage:**
- Player inputs (movement, shooting) every frame
- Physics state synchronization every second
- Critical events (kills, power-ups collected)
- Heartbeat/ping for connection monitoring

**Supabase Usage:**
- Matchmaking and queue management
- WebRTC signaling (offers, answers, ICE)
- Match result validation
- Coin escrow and distribution
- ELO calculation and persistence
- Match history storage

### 2.3 Synchronization Model

**Deterministic Lockstep with Reconciliation:**

1. Both clients run identical physics engines locally
2. Share only **inputs** via WebRTC (not positions)
3. Use shared **seed** for meteor/alien RNG (ensures identical spawns)
4. Validate state with checksums every second
5. Reconcile divergences (lower latency client is authoritative)
6. Declare draw if 3+ consecutive desync failures

**Example Frame Processing:**
```javascript
// Each client at 60 FPS:
1. Capture local input (keys pressed)
2. Send input via WebRTC to opponent
3. Wait for opponent's input (with 3-frame buffer)
4. Execute physics with BOTH inputs
5. Update positions, collisions, projectiles
6. Render result
7. Every 60 frames: send checksum for validation
```

---

## 3. Matchmaking System

### 3.1 Quick Match (Auto Queue)

**Flow:**

1. **Join Queue:**
   - Player selects bet amount (10, 50, 100, 500 coins)
   - System validates sufficient balance
   - Insert into `pvp_queue` table
   - UI shows "Searching for opponent..." status

2. **Matchmaking (Edge Function - runs every 2s):**
   - Query players in same bet tier
   - Pair players with similar ELO (±200 points initially)
   - Expand range to ±400 after 30 seconds waiting
   - Create `pvp_match` record with `status: 'preparing'`

3. **WebRTC Signaling:**
   - Both players notified via Supabase Realtime
   - Player A (offerer) creates SDP offer, sends to signaling server
   - Player B (answerer) receives offer, creates answer
   - Exchange ICE candidates until P2P connection established

4. **Match Start:**
   - Deduct bet amount from both players (escrow in match record)
   - Generate shared game seed
   - Initialize `PvPGame` with synchronized state
   - 3-second countdown, then game starts

**Cancellation:**
- Player can cancel queue anytime before match found
- Auto-remove from queue after 5 minutes timeout

### 3.2 Friend Challenge

**Flow:**

1. **Send Challenge:**
   - Player A enters friend's username
   - Selects bet amount
   - Edge Function validates: user exists, sufficient coins, not spamming
   - Insert into `pvp_challenges` table
   - Notify Player B via Supabase Realtime push

2. **Challenge UI (Player B sees):**
   ```
   ┌─────────────────────────────┐
   │ 🎮 PvP Challenge!           │
   │ matheus_carmo challenged you│
   │ Bet: 50 coins               │
   │ [Accept] [Decline]          │
   └─────────────────────────────┘
   ```

3. **Response:**
   - **Accept:** Proceeds to WebRTC signaling (same as quick match)
   - **Decline:** Notify Player A, delete challenge
   - **Timeout:** Auto-decline after 60 seconds

**Rate Limits:**
- Maximum 3 challenges to same player within 5 minutes
- Maximum 20 total challenges per hour

---

## 4. Game Mechanics

### 4.1 Win Condition

- **Primary:** First player to destroy opponent 3 times wins
- **Sudden Death:** After 5 minutes, arena shrinks progressively until forced confrontation
- **Disconnect:** If player disconnects, opponent wins automatically (10s grace period for reconnect)
- **Draw:** Critical desync that can't be resolved = draw, both refunded

### 4.2 Shared Environment

**Meteors and Aliens:**
- Spawn using `SeededRandom(game_seed)` for identical positions on both clients
- Can be destroyed by either player
- Destroying them doesn't count toward kills, but clears obstacles
- Competition for resources (power-ups from alien destruction)

**Deterministic Spawning:**
```javascript
class SeededRandom {
  constructor(seed) {
    this.seed = this.hashCode(seed);
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// Usage:
const rng = new SeededRandom(`${matchId}_${timestamp}`);
const meteorX = rng.next() * canvasWidth;
const meteorY = rng.next() * canvasHeight;
```

### 4.3 Progressive Power-ups

Power-ups spawn at fixed intervals:

| Time | Power-up | Effect | Duration |
|------|----------|--------|----------|
| 2:00 | Shield | Absorbs 1 hit | Until used or hit |
| 3:00 | Speed Boost | +50% movement speed | 15 seconds |
| 4:00 | Triple Shot | Fires 3 projectiles | 20 seconds |
| 4:30 | Rapid Fire | 2x fire rate | 15 seconds |

- Power-ups appear at random positions (using seeded RNG)
- First player to collect gets the benefit
- Visual indicator shows who has which power-up

### 4.4 Sudden Death Mechanics

**Triggered:** Exactly 5:00 after match start

**Effects:**
1. **Warning:** Both players see "⚠️ SUDDEN DEATH!" overlay
2. **Arena Shrinking:** Red death boundaries advance at 2 pixels/second from edges
3. **Touching boundaries = instant kill**
4. **Increased spawns:**
   - Meteors: 2x spawn rate
   - Aliens: 1.5x spawn rate
   - Power-ups: 3x spawn rate
5. **Forces close combat within ~60 seconds**

**Implementation:**
```javascript
activateSuddenDeath() {
  this.suddenDeathActive = true;
  this.shrinkingBounds = {
    top: 50,
    bottom: canvas.height - 50,
    left: 50,
    right: canvas.width - 50,
    shrinkRate: 2 // pixels per second
  };

  this.meteorSpawnRate *= 2;
  this.alienSpawnRate *= 1.5;
  this.powerUpSpawnRate *= 3;
}
```

### 4.5 Perspective and Rendering

**Local Player View:**
- Always sees own ship at bottom (y = canvas.height - 100)
- Sees opponent at top (y = 100), rotated 180°
- Meteors/aliens not rotated (absolute positions)

**Rendering Logic:**
```javascript
render() {
  // Always render local player at bottom
  this.renderShip(this.localPlayer, this.localPlayer.position, 0);

  // Render remote player at top, flipped
  const flippedY = canvas.height - this.remotePlayer.position.y;
  this.renderShip(this.remotePlayer, {
    x: this.remotePlayer.position.x,
    y: flippedY
  }, 180);

  // Meteors and aliens at absolute positions (not flipped)
  this.meteors.forEach(m => this.renderMeteor(m));
  this.aliens.forEach(a => this.renderAlien(a));
}
```

### 4.6 Skins and Cosmetics

- Player skins (from shop) appear visually in PvP
- **NO gameplay advantages** - purely cosmetic
- Rainbow trail, golden ship, custom sprites all display
- Ensures competitive balance (pay-for-cosmetics, not pay-to-win)

---

## 5. Betting and Economy

### 5.1 Bet Tiers

Four fixed bet amounts available:

| Tier | Bet Amount | Typical ELO Range | Color |
|------|------------|-------------------|-------|
| Bronze | 10 coins | 0-999 | #CD7F32 |
| Silver | 50 coins | 1000-1499 | #C0C0C0 |
| Gold | 100 coins | 1500-1999 | #FFD700 |
| Diamond | 500 coins | 2000+ | #B9F2FF |

**Matchmaking:** Players in same bet tier are matched together

### 5.2 Escrow System

**On Match Start:**
```sql
BEGIN;
  -- Deduct from both players
  UPDATE players SET coins = coins - 100 WHERE id IN (player1_id, player2_id);

  -- Escrow in match record
  UPDATE pvp_matches SET escrowed_coins = 200, status = 'in_progress';
COMMIT;
```

**On Match End:**
```sql
BEGIN;
  -- Winner gets full pot
  UPDATE players SET coins = coins + 200 WHERE id = winner_id;

  -- Update match record
  UPDATE pvp_matches SET
    status = 'completed',
    winner_id = winner_id,
    ended_at = NOW();
COMMIT;
```

**On Draw/Error:**
```sql
-- Refund both players
UPDATE players SET coins = coins + 100 WHERE id IN (player1_id, player2_id);
UPDATE pvp_matches SET status = 'cancelled';
```

### 5.3 Additional Rewards

**Bonus Rewards:**
- **First Win of Day:** +20 coins
- **3 Win Streak:** +10 coins bonus
- **5 Win Streak:** +25 coins bonus
- **Tier Promotion:** Special reward (50-200 coins depending on tier)

**Implementation:**
```javascript
async calculateRewards(winner, matchData) {
  let bonusCoins = 0;

  // Check first win today
  const lastWin = await getLastWinTimestamp(winner.id);
  if (!isToday(lastWin)) {
    bonusCoins += 20;
    await recordAchievement(winner.id, 'first_win_today');
  }

  // Check win streak
  const streak = await getCurrentWinStreak(winner.id);
  if (streak === 3) bonusCoins += 10;
  if (streak === 5) bonusCoins += 25;

  // Check tier promotion
  const oldTier = getTier(winner.elo_rating);
  const newTier = getTier(winner.elo_rating + eloChange);
  if (newTier.min > oldTier.min) {
    bonusCoins += newTier.promotionBonus;
  }

  if (bonusCoins > 0) {
    await updateCoins(winner.id, bonusCoins);
    await logBonus(winner.id, bonusCoins, 'pvp_bonus');
  }
}
```

---

## 6. ELO Ranking System

### 6.1 Tier Structure

```javascript
const PVP_TIERS = [
  { name: 'Bronze', min: 0, max: 999, color: '#CD7F32', promotionBonus: 50 },
  { name: 'Silver', min: 1000, max: 1499, color: '#C0C0C0', promotionBonus: 75 },
  { name: 'Gold', min: 1500, max: 1999, color: '#FFD700', promotionBonus: 100 },
  { name: 'Platinum', min: 2000, max: 2499, color: '#E5E4E2', promotionBonus: 150 },
  { name: 'Diamond', min: 2500, max: 2999, color: '#B9F2FF', promotionBonus: 200 },
  { name: 'Master', min: 3000, max: 3499, color: '#FF6B6B', promotionBonus: 250 },
  { name: 'Grandmaster', min: 3500, max: Infinity, color: '#9B59B6', promotionBonus: 300 }
];
```

### 6.2 ELO Calculation

Standard ELO formula with K-factor of 32:

```javascript
function calculateEloChange(winnerElo, loserElo) {
  const K = 32; // How much ELO changes per match

  // Expected win probability
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

  // Actual result: 1 = win, 0 = loss
  const winnerChange = Math.round(K * (1 - expectedWinner));
  const loserChange = Math.round(K * (0 - expectedLoser));

  return { winnerChange, loserChange };
}
```

**Examples:**
- 1500 ELO beats 1500 ELO: +16/-16
- 1200 ELO beats 1800 ELO (upset): +29/-29
- 2000 ELO beats 1000 ELO (expected): +2/-2

### 6.3 Ranking Features

**Player Profile Shows:**
- Current ELO rating
- Current tier with visual badge
- Peak ELO (all-time highest)
- Total matches played
- Wins / Losses
- Win rate percentage
- Current win streak
- Best win streak (all-time)
- Total coins won/lost in PvP

**Global Leaderboard:**
- Top 100 players by ELO
- Filterable by tier
- Shows: rank, username, ELO, tier, wins, win rate
- Updates in real-time

---

## 7. Database Schema

### 7.1 pvp_matches

```sql
CREATE TABLE pvp_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Players
  player1_id UUID REFERENCES players(id) NOT NULL,
  player2_id UUID REFERENCES players(id) NOT NULL,

  -- Betting
  bet_amount INTEGER NOT NULL CHECK (bet_amount IN (10, 50, 100, 500)),
  escrowed_coins INTEGER NOT NULL,

  -- Match state
  status TEXT NOT NULL CHECK (status IN ('preparing', 'in_progress', 'completed', 'cancelled')),
  winner_id UUID REFERENCES players(id),

  -- Stats
  player1_kills INTEGER DEFAULT 0 CHECK (player1_kills >= 0 AND player1_kills <= 3),
  player2_kills INTEGER DEFAULT 0 CHECK (player2_kills >= 0 AND player2_kills <= 3),
  duration_seconds INTEGER CHECK (duration_seconds > 0),

  -- WebRTC
  room_id TEXT UNIQUE NOT NULL,
  game_seed TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  -- Validation
  player1_reported_result JSONB,
  player2_reported_result JSONB,
  validated BOOLEAN DEFAULT FALSE,

  CONSTRAINT valid_winner CHECK (
    (status = 'completed' AND winner_id IS NOT NULL) OR
    (status != 'completed' AND winner_id IS NULL)
  )
);

CREATE INDEX idx_pvp_matches_status ON pvp_matches(status);
CREATE INDEX idx_pvp_matches_players ON pvp_matches(player1_id, player2_id);
CREATE INDEX idx_pvp_matches_created ON pvp_matches(created_at DESC);
```

### 7.2 pvp_queue

```sql
CREATE TABLE pvp_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) NOT NULL UNIQUE,

  bet_amount INTEGER NOT NULL CHECK (bet_amount IN (10, 50, 100, 500)),
  elo_rating INTEGER NOT NULL,
  status TEXT DEFAULT 'searching' CHECK (status IN ('searching', 'matched', 'cancelled')),

  joined_at TIMESTAMPTZ DEFAULT NOW(),
  matched_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',

  CONSTRAINT unique_active_player UNIQUE (player_id) WHERE status = 'searching'
);

CREATE INDEX idx_pvp_queue_matchmaking
  ON pvp_queue(bet_amount, elo_rating, joined_at)
  WHERE status = 'searching';

-- Auto-cleanup expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_queue()
RETURNS void AS $$
BEGIN
  UPDATE pvp_queue SET status = 'cancelled'
  WHERE status = 'searching' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

### 7.3 pvp_elo_rankings

```sql
CREATE TABLE pvp_elo_rankings (
  player_id UUID PRIMARY KEY REFERENCES players(id),

  -- ELO
  elo_rating INTEGER DEFAULT 1000 CHECK (elo_rating >= 0),
  peak_elo INTEGER DEFAULT 1000 CHECK (peak_elo >= elo_rating),
  current_tier TEXT DEFAULT 'Bronze',

  -- Stats
  total_matches INTEGER DEFAULT 0 CHECK (total_matches >= 0),
  wins INTEGER DEFAULT 0 CHECK (wins >= 0 AND wins <= total_matches),
  losses INTEGER DEFAULT 0 CHECK (losses >= 0 AND losses <= total_matches),
  win_streak INTEGER DEFAULT 0 CHECK (win_streak >= 0),
  best_win_streak INTEGER DEFAULT 0 CHECK (best_win_streak >= win_streak),

  -- Economy
  total_coins_won INTEGER DEFAULT 0 CHECK (total_coins_won >= 0),
  total_coins_lost INTEGER DEFAULT 0 CHECK (total_coins_lost >= 0),

  -- Timestamps
  first_match_at TIMESTAMPTZ,
  last_match_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_match_counts CHECK (wins + losses = total_matches)
);

CREATE INDEX idx_pvp_elo_leaderboard ON pvp_elo_rankings(elo_rating DESC);
CREATE INDEX idx_pvp_elo_tier ON pvp_elo_rankings(current_tier, elo_rating DESC);
```

### 7.4 pvp_match_history

```sql
CREATE TABLE pvp_match_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES pvp_matches(id) NOT NULL,
  player_id UUID REFERENCES players(id) NOT NULL,

  -- Opponent (denormalized for performance)
  opponent_id UUID REFERENCES players(id) NOT NULL,
  opponent_username TEXT NOT NULL,

  -- Result
  won BOOLEAN NOT NULL,
  kills INTEGER NOT NULL CHECK (kills >= 0 AND kills <= 3),
  deaths INTEGER NOT NULL CHECK (deaths >= 0 AND deaths <= 3),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),

  -- Rewards
  coins_change INTEGER NOT NULL,
  elo_change INTEGER NOT NULL,

  played_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pvp_history_player ON pvp_match_history(player_id, played_at DESC);

-- Keep only last 20 matches per player
CREATE OR REPLACE FUNCTION cleanup_old_match_history()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM pvp_match_history
  WHERE id IN (
    SELECT id FROM pvp_match_history
    WHERE player_id = NEW.player_id
    ORDER BY played_at DESC
    OFFSET 20
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_history
AFTER INSERT ON pvp_match_history
FOR EACH ROW EXECUTE FUNCTION cleanup_old_match_history();
```

### 7.5 pvp_challenges

```sql
CREATE TABLE pvp_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  challenger_id UUID REFERENCES players(id) NOT NULL,
  challenged_id UUID REFERENCES players(id) NOT NULL,
  bet_amount INTEGER NOT NULL CHECK (bet_amount IN (10, 50, 100, 500)),

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  match_id UUID REFERENCES pvp_matches(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '60 seconds',

  CONSTRAINT no_self_challenge CHECK (challenger_id != challenged_id),
  CONSTRAINT match_on_accept CHECK (
    (status = 'accepted' AND match_id IS NOT NULL) OR
    (status != 'accepted' AND match_id IS NULL)
  )
);

CREATE INDEX idx_pvp_challenges_pending ON pvp_challenges(challenged_id, status, created_at DESC);

-- Auto-expire challenges
CREATE OR REPLACE FUNCTION expire_old_challenges()
RETURNS void AS $$
BEGIN
  UPDATE pvp_challenges SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

### 7.6 RPC Functions

**get_pvp_leaderboard:**
```sql
CREATE OR REPLACE FUNCTION get_pvp_leaderboard(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  rank INTEGER,
  player_id UUID,
  username TEXT,
  elo_rating INTEGER,
  current_tier TEXT,
  wins INTEGER,
  losses INTEGER,
  win_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY e.elo_rating DESC)::INTEGER as rank,
    e.player_id,
    p.username,
    e.elo_rating,
    e.current_tier,
    e.wins,
    e.losses,
    CASE WHEN e.total_matches > 0
      THEN ROUND((e.wins::NUMERIC / e.total_matches) * 100, 1)
      ELSE 0
    END as win_rate
  FROM pvp_elo_rankings e
  JOIN players p ON p.id = e.player_id
  WHERE e.total_matches > 0
  ORDER BY e.elo_rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

**check_pvp_rate_limit:**
```sql
CREATE OR REPLACE FUNCTION check_pvp_rate_limit(p_player_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  match_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO match_count
  FROM pvp_matches
  WHERE (player1_id = p_player_id OR player2_id = p_player_id)
    AND created_at > NOW() - INTERVAL '1 hour'
    AND status != 'cancelled';

  RETURN match_count < 20; -- Max 20 matches per hour
END;
$$ LANGUAGE plpgsql;
```

**check_challenge_spam:**
```sql
CREATE OR REPLACE FUNCTION check_challenge_spam(
  p_challenger_id UUID,
  p_challenged_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  recent_challenges INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_challenges
  FROM pvp_challenges
  WHERE challenger_id = p_challenger_id
    AND challenged_id = p_challenged_id
    AND created_at > NOW() - INTERVAL '5 minutes';

  RETURN recent_challenges < 3; -- Max 3 challenges to same player in 5 min
END;
$$ LANGUAGE plpgsql;
```

---

## 8. WebRTC Implementation

### 8.1 Connection Setup

**STUN/TURN Servers:**
```javascript
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Add TURN servers for NAT traversal in restrictive networks
];

const peerConnection = new RTCPeerConnection({
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10
});
```

**Data Channel Configuration:**
```javascript
const dataChannel = peerConnection.createDataChannel('game-sync', {
  ordered: false, // Allow out-of-order for lower latency
  maxRetransmits: 0 // Don't retransmit (old data is useless)
});
```

### 8.2 Message Protocol

**Input Message (sent every frame, ~60 FPS):**
```javascript
{
  type: 'input',
  frame: 1234,
  keys: {
    left: boolean,
    right: boolean,
    space: boolean
  },
  timestamp: number // Date.now()
}
```

**Sync Message (sent every 1 second):**
```javascript
{
  type: 'sync',
  frame: 1234,
  checksum: string, // Hash of game state
  gameState: {
    player1: { x, y, lives },
    player2: { x, y, lives },
    meteors: [...],
    aliens: [...],
    powerUps: [...]
  }
}
```

**Event Message (important state changes):**
```javascript
{
  type: 'event',
  event: 'kill' | 'powerup_collected' | 'sudden_death_start',
  data: {
    killer?: 'player1' | 'player2',
    killed?: 'player1' | 'player2',
    powerup?: 'shield' | 'speed' | 'triple_shot',
    collector?: 'player1' | 'player2'
  },
  frame: number,
  timestamp: number
}
```

**Ping Message (heartbeat every 1 second):**
```javascript
{
  type: 'ping',
  timestamp: number
}
```

### 8.3 Latency Management

**Input Buffering:**
```javascript
class InputBuffer {
  constructor() {
    this.buffer = [];
    this.bufferSize = 3; // ~50ms buffer at 60fps
  }

  addInput(frame, input) {
    this.buffer.push({ frame, input });
    this.buffer.sort((a, b) => a.frame - b.frame);
  }

  getInputForFrame(frame) {
    // Wait up to 3 frames for opponent input
    const input = this.buffer.find(i => i.frame === frame);

    if (!input && this.buffer.length > this.bufferSize) {
      // Opponent is lagging, use their last known input
      return this.buffer[this.buffer.length - 1].input;
    }

    return input?.input || null;
  }
}
```

**Latency Monitoring:**
```javascript
class LatencyMonitor {
  constructor() {
    this.pingTimes = [];
    this.avgLatency = 0;
  }

  sendPing() {
    this.connection.send({
      type: 'ping',
      timestamp: Date.now()
    });
  }

  onPingReceived(remotePingData) {
    const latency = Date.now() - remotePingData.timestamp;
    this.pingTimes.push(latency);

    if (this.pingTimes.length > 10) {
      this.pingTimes.shift();
    }

    this.avgLatency = this.pingTimes.reduce((a, b) => a + b) / this.pingTimes.length;

    // Show warnings
    if (this.avgLatency > 200) {
      this.showLatencyWarning('high');
    } else if (this.avgLatency > 500) {
      this.showLatencyWarning('critical');
    }
  }
}
```

---

## 9. Error Handling

### 9.1 Connection Failures

**WebRTC Connection Fails to Establish:**
```javascript
async initialize() {
  const MAX_RETRY = 3;
  const TIMEOUT = 10000; // 10s per attempt

  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      await this.establishConnection(TIMEOUT);
      return; // Success
    } catch (error) {
      if (attempt === MAX_RETRY) {
        await this.cancelMatchAndRefund();
        throw new Error('Connection failed after 3 attempts');
      }
      await this.sleep(1000 * attempt); // Exponential backoff
    }
  }
}

async cancelMatchAndRefund() {
  await fetch('/functions/v1/pvp-cancel-match', {
    method: 'POST',
    body: JSON.stringify({
      matchId: this.matchId,
      reason: 'webrtc_connection_failed'
    })
  });

  showError('Connection failed. Bet refunded.');
}
```

**Disconnect During Match:**
```javascript
handleDisconnect() {
  this.pauseGame();
  showReconnectingUI();

  this.disconnectTimer = setTimeout(() => {
    // 10 seconds without reconnect = automatic loss
    this.declareDisconnectVictory();
  }, 10000);

  // Attempt reconnect
  this.connection.reconnect();
}

onReconnected() {
  clearTimeout(this.disconnectTimer);
  this.sync.fullResync(); // Re-sync state
  this.resumeGame();
  hideReconnectingUI();
}
```

### 9.2 Desync Handling

**Detection:**
```javascript
onSyncReceived(data) {
  if (data.checksum !== this.lastChecksum) {
    this.desyncCount++;

    if (this.desyncCount >= 3) {
      this.handleCriticalDesync(data.gameState);
    } else {
      this.attemptReconciliation(data.gameState);
    }
  } else {
    this.desyncCount = 0;
  }
}
```

**Reconciliation:**
```javascript
attemptReconciliation(remoteState) {
  // Client with lower latency is authoritative
  if (this.avgLatency < remoteState.avgLatency) {
    this.connection.send({
      type: 'full_sync',
      gameState: this.serializeState(),
      authoritative: true
    });
  } else {
    this.applyRemoteState(remoteState);
  }
}
```

**Critical Desync:**
```javascript
handleCriticalDesync() {
  console.error('Critical desync - declaring draw');
  this.endMatch('draw', 'critical_desync');
  // Both players refunded
}
```

### 9.3 Server-Side Validation

**Match Result Validation:**
```typescript
// Edge Function: pvp-validate-match
async function validateMatch(matchId: string, results: any) {
  const match = await getMatch(matchId);

  if (!match || match.status !== 'in_progress') {
    return { valid: false, reason: 'Invalid match state' };
  }

  const p1 = results.player1;
  const p2 = results.player2;

  // Check agreement
  if (p1.winner !== p2.winner) {
    return handleConflict(p1, p2, match);
  }

  // Validate kills
  if (p1.kills > 3 || p2.kills > 3 || p1.kills + p2.deaths !== p2.kills) {
    await cancelMatchAndRefund(matchId);
    await flagForReview(matchId, 'Invalid kill counts');
    return { valid: false, reason: 'Invalid kill counts' };
  }

  // Validate duration
  if (p1.duration < 10 || p1.duration > 600) {
    await flagForReview(matchId, 'Suspicious duration');
  }

  // Process result
  const winner = p1.winner === 'player1' ? match.player1_id : match.player2_id;
  const loser = winner === match.player1_id ? match.player2_id : match.player1_id;

  await updateCoinsAndElo(winner, loser, match.bet_amount);
  await insertMatchHistory(match, p1, p2);

  return { valid: true };
}
```

### 9.4 Rate Limiting

**Per-Player Limits:**
- Maximum 20 matches per hour
- Maximum 3 challenges to same player within 5 minutes
- Maximum 100 total challenges per day

**Implementation:**
```sql
-- Checked before queue join or challenge creation
SELECT check_pvp_rate_limit(player_id);
SELECT check_challenge_spam(challenger_id, challenged_id);
```

---

## 10. Frontend Components

### 10.1 File Structure

```
src/
├── pvp/
│   ├── PvPLobby.js              # Main PvP UI
│   ├── PvPMatchmaker.js         # Queue and matchmaking
│   ├── PvPGame.js               # Game engine
│   ├── WebRTCConnection.js      # P2P connection
│   ├── PvPPhysicsSync.js        # State synchronization
│   ├── PvPPlayer.js             # Player entity
│   └── SeededRandom.js          # Deterministic RNG
│
├── components/pvp/
│   ├── MatchHistory.js          # Match history list
│   ├── EloRankingCard.js        # ELO/tier display
│   ├── BetSelector.js           # Bet amount selector
│   ├── QueueStatus.js           # Queue UI indicator
│   ├── ChallengeModal.js        # Challenge friend modal
│   └── ResultsScreen.js         # Post-match results
│
├── pvp.html                     # PvP mode page
└── pvp.css                      # PvP styles
```

### 10.2 Key Classes

**PvPLobby.js:**
```javascript
class PvPLobby {
  constructor() {
    this.matchmaker = new PvPMatchmaker();
    this.currentView = 'menu'; // menu | queue | challenge | history
    this.initializeUI();
  }

  showQuickMatch() {
    this.currentView = 'queue';
    this.renderBetSelector();
  }

  async joinQueue(betAmount) {
    await this.matchmaker.joinQueue(betAmount);
  }

  showChallengeScreen() {
    this.currentView = 'challenge';
    this.renderChallengeInput();
  }

  showHistory() {
    this.currentView = 'history';
    this.renderMatchHistory();
  }

  showLeaderboard() {
    this.renderLeaderboard();
  }
}
```

**PvPGame.js:**
```javascript
class PvPGame {
  constructor(matchData, connection, physicsSync) {
    this.matchData = matchData;
    this.connection = connection;
    this.sync = physicsSync;

    this.localPlayer = new PvPPlayer(/*...*/);
    this.remotePlayer = new PvPPlayer(/*...*/);

    this.kills = { local: 0, remote: 0 };
    this.startTime = Date.now();
    this.suddenDeathActive = false;

    this.meteors = [];
    this.aliens = [];
    this.powerUps = [];

    this.initializeEntities();
    this.startGameLoop();
  }

  gameLoop() {
    // 1. Capture inputs
    const localKeys = this.getKeys();

    // 2. Send via WebRTC
    this.sync.sendInput(localKeys);

    // 3. Get both inputs
    const { localKeys, remoteKeys } = this.sync.processFrame(localKeys);

    // 4. Update physics
    this.updatePhysics(localKeys, remoteKeys);

    // 5. Check collisions/kills
    this.checkCollisions();

    // 6. Validate sync
    this.sync.validateSync(this.getGameState());

    // 7. Check win condition
    this.checkWinCondition();

    // 8. Sudden death check
    if (Date.now() - this.startTime > 300000 && !this.suddenDeathActive) {
      this.activateSuddenDeath();
    }

    // 9. Render
    this.render();
  }

  async endMatch(winner, reason = 'kills') {
    const result = await fetch('/functions/v1/pvp-validate-match', {
      method: 'POST',
      body: JSON.stringify({
        matchId: this.matchData.id,
        winner,
        kills: this.kills,
        duration: (Date.now() - this.startTime) / 1000,
        reason
      })
    });

    this.showResults(result);
  }
}
```

---

## 11. Backend Edge Functions

### 11.1 pvp-signaling

**Purpose:** WebRTC signaling server (exchange offers, answers, ICE candidates)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const rooms = new Map(); // room_id -> { offer, answer, candidates }

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { action, roomId, data } = await req.json();

  switch (action) {
    case 'offer':
      rooms.set(roomId, { offer: data, candidates: [] });
      await notifyPeer(roomId, 'offer_ready');
      return success();

    case 'answer':
      const room = rooms.get(roomId);
      room.answer = data;
      await notifyPeer(roomId, 'answer_ready');
      return success();

    case 'ice_candidate':
      const r = rooms.get(roomId);
      r.candidates.push(data);
      await notifyPeer(roomId, 'ice_candidate', data);
      return success();

    case 'get_offer':
      return json(rooms.get(roomId)?.offer);

    case 'get_answer':
      return json(rooms.get(roomId)?.answer);
  }
});
```

### 11.2 pvp-matchmaking

**Purpose:** Pair players from queue

```typescript
import { createClient } from '@supabase/supabase-js';

// Runs every 2 seconds via cron
async function matchPlayers() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get all waiting players grouped by bet amount
  const betAmounts = [10, 50, 100, 500];

  for (const bet of betAmounts) {
    const { data: players } = await supabase
      .from('pvp_queue')
      .select('*')
      .eq('status', 'searching')
      .eq('bet_amount', bet)
      .order('joined_at', { ascending: true })
      .limit(2);

    if (players.length < 2) continue;

    const [p1, p2] = players;

    // Check ELO compatibility
    const eloDiff = Math.abs(p1.elo_rating - p2.elo_rating);
    const waitTime = Date.now() - new Date(p1.joined_at).getTime();
    const maxEloDiff = waitTime > 30000 ? 400 : 200; // Expand after 30s

    if (eloDiff > maxEloDiff) continue;

    // Create match
    const roomId = generateRoomId();
    const gameSeed = `${roomId}_${Date.now()}`;

    const { data: match } = await supabase
      .from('pvp_matches')
      .insert({
        player1_id: p1.player_id,
        player2_id: p2.player_id,
        bet_amount: bet,
        escrowed_coins: bet * 2,
        room_id: roomId,
        game_seed: gameSeed,
        status: 'preparing'
      })
      .select()
      .single();

    // Update queue
    await supabase
      .from('pvp_queue')
      .update({ status: 'matched', matched_at: new Date() })
      .in('player_id', [p1.player_id, p2.player_id]);

    // Notify both players
    await notifyMatchFound(p1.player_id, match);
    await notifyMatchFound(p2.player_id, match);
  }
}
```

### 11.3 pvp-validate-match

**Purpose:** Validate match results, update coins/ELO, prevent cheating

```typescript
async function validateMatch(req) {
  const { matchId, winner, kills, duration, playerId } = await req.json();

  // Get match
  const { data: match } = await supabase
    .from('pvp_matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (!match || match.status !== 'in_progress') {
    return error('Invalid match');
  }

  // Store reported result
  const field = match.player1_id === playerId
    ? 'player1_reported_result'
    : 'player2_reported_result';

  await supabase
    .from('pvp_matches')
    .update({ [field]: { winner, kills, duration } })
    .eq('id', matchId);

  // Wait for both reports
  const { data: updated } = await supabase
    .from('pvp_matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (!updated.player1_reported_result || !updated.player2_reported_result) {
    return success({ waiting: true });
  }

  // Both reported, validate
  const p1 = updated.player1_reported_result;
  const p2 = updated.player2_reported_result;

  if (p1.winner !== p2.winner) {
    return handleConflict(updated, p1, p2);
  }

  // Calculate ELO
  const { data: rankings } = await supabase
    .from('pvp_elo_rankings')
    .select('*')
    .in('player_id', [match.player1_id, match.player2_id]);

  const p1Rating = rankings.find(r => r.player_id === match.player1_id);
  const p2Rating = rankings.find(r => r.player_id === match.player2_id);

  const { winnerChange, loserChange } = calculateEloChange(
    p1Rating.elo_rating,
    p2Rating.elo_rating
  );

  const winnerId = p1.winner === 'player1' ? match.player1_id : match.player2_id;
  const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;

  // Update database (transaction)
  await supabase.rpc('finalize_pvp_match', {
    p_match_id: matchId,
    p_winner_id: winnerId,
    p_loser_id: loserId,
    p_winner_elo_change: winnerChange,
    p_loser_elo_change: loserChange,
    p_bet_amount: match.bet_amount,
    p_duration: duration
  });

  return success({ winnerId, eloChange: winnerChange });
}
```

### 11.4 pvp-challenge-friend

**Purpose:** Create friend challenge

```typescript
async function createChallenge(req) {
  const { challengerId, username, betAmount } = await req.json();

  // Find challenged player
  const { data: challenged } = await supabase
    .from('players')
    .select('id, username')
    .eq('username', username)
    .single();

  if (!challenged) {
    return error('Player not found');
  }

  // Check spam
  const canChallenge = await supabase.rpc('check_challenge_spam', {
    p_challenger_id: challengerId,
    p_challenged_id: challenged.id
  });

  if (!canChallenge) {
    return error('Too many challenges to this player');
  }

  // Create challenge
  const { data: challenge } = await supabase
    .from('pvp_challenges')
    .insert({
      challenger_id: challengerId,
      challenged_id: challenged.id,
      bet_amount: betAmount
    })
    .select()
    .single();

  // Notify via Realtime
  await notifyChallenge(challenged.id, challenge);

  return success(challenge);
}
```

---

## 12. Testing Strategy

### 12.1 Unit Tests

**Physics Sync:**
- Deterministic RNG produces same results with same seed
- Checksum calculation consistency
- Input buffer handling edge cases

**ELO Calculation:**
- Standard scenarios (equal ratings, upsets, expected wins)
- Edge cases (minimum/maximum ELO)

**Validation:**
- Invalid kill counts rejected
- Conflicting results handled
- Duration validation

### 12.2 Integration Tests

**Matchmaking:**
- Two players queue, get matched
- ELO filtering works correctly
- Timeout expansion works
- Queue cleanup on disconnect

**WebRTC:**
- Connection establishment succeeds
- ICE candidate exchange works
- Data channel messages arrive
- Reconnection handling

**Database:**
- Transaction integrity (escrow, refunds)
- Match history cleanup (keeps only 20)
- Challenge expiration
- Rate limiting enforcement

### 12.3 Load Testing

- 100 concurrent matches
- 500 players in queue
- Database query performance under load
- Supabase Realtime channel limits

---

## 13. Deployment Checklist

### 13.1 Database Setup

- [ ] Create all tables with indexes
- [ ] Set up RPC functions
- [ ] Configure row-level security policies
- [ ] Test constraint enforcement
- [ ] Set up database triggers
- [ ] Schedule cleanup jobs (queue, challenges)

### 13.2 Edge Functions

- [ ] Deploy pvp-signaling function
- [ ] Deploy pvp-matchmaking function (with cron)
- [ ] Deploy pvp-validate-match function
- [ ] Deploy pvp-challenge-friend function
- [ ] Set environment variables
- [ ] Test CORS configuration
- [ ] Monitor function logs

### 13.3 Frontend

- [ ] Implement all UI components
- [ ] Test WebRTC on different networks
- [ ] Test on mobile browsers
- [ ] Optimize bundle size
- [ ] Add loading states
- [ ] Error message localization
- [ ] Analytics tracking

### 13.4 Security

- [ ] Rate limiting enforced
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens where needed
- [ ] Secure WebRTC configuration
- [ ] Anti-cheat validation active

---

## 14. Future Enhancements (Out of Scope)

- Replay system (record and watch past matches)
- Tournaments with brackets
- Team battles (2v2)
- Seasonal rankings with rewards
- Spectator mode
- Custom game modes (no meteors, no aliens, etc.)
- Voice chat
- Emote system
- Daily/weekly challenges
- Achievement integration with PvP stats

---

## 15. Success Metrics

**Launch (Week 1):**
- 50+ matches played
- <5% connection failure rate
- Average match duration 2-4 minutes
- No critical bugs reported

**Growth (Month 1):**
- 500+ total matches
- 100+ active PvP players
- Healthy ELO distribution across tiers
- <1% matches flagged for review

**Retention:**
- 30% of players return for 2nd match
- 10% play 10+ matches
- Positive player feedback on forums/Discord

---

**End of Specification**

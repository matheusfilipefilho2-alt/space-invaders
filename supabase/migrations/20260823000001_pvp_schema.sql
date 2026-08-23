-- ============================================================================
-- PvP 1v1 Battle Mode - Database Schema
-- ============================================================================

-- Table: pvp_matches
CREATE TABLE IF NOT EXISTS pvp_matches (
  id BIGSERIAL PRIMARY KEY,

  -- Players
  player1_id BIGINT REFERENCES players(id) NOT NULL,
  player2_id BIGINT REFERENCES players(id) NOT NULL,

  -- Betting
  bet_amount INTEGER NOT NULL CHECK (bet_amount IN (10, 50, 100, 500)),
  escrowed_coins INTEGER NOT NULL,

  -- Match state
  status TEXT NOT NULL CHECK (status IN ('matched', 'in_progress', 'completed', 'cancelled', 'conflict')),
  winner_id BIGINT REFERENCES players(id),

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
  player1_result JSONB,
  player2_result JSONB,
  conflict_reason TEXT,

  CONSTRAINT valid_winner CHECK (
    (status = 'completed' AND winner_id IS NOT NULL) OR
    (status != 'completed')
  ),
  CONSTRAINT valid_players CHECK (player1_id != player2_id)
);

CREATE INDEX IF NOT EXISTS idx_pvp_matches_status ON pvp_matches(status);
CREATE INDEX IF NOT EXISTS idx_pvp_matches_players ON pvp_matches(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_pvp_matches_created ON pvp_matches(created_at DESC);

-- Table: pvp_queue
CREATE TABLE IF NOT EXISTS pvp_queue (
  id BIGSERIAL PRIMARY KEY,
  player_id BIGINT REFERENCES players(id) NOT NULL,

  bet_amount INTEGER NOT NULL CHECK (bet_amount IN (10, 50, 100, 500)),
  status TEXT DEFAULT 'searching' CHECK (status IN ('searching', 'matched', 'cancelled')),
  match_id BIGINT REFERENCES pvp_matches(id),

  joined_at TIMESTAMPTZ DEFAULT NOW(),
  matched_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes'
);

-- Índice único parcial: apenas um jogador em busca por vez
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_player
  ON pvp_queue(player_id)
  WHERE status = 'searching';

CREATE INDEX IF NOT EXISTS idx_pvp_queue_matchmaking
  ON pvp_queue(bet_amount, joined_at)
  WHERE status = 'searching';

-- Table: pvp_rankings
CREATE TABLE IF NOT EXISTS pvp_rankings (
  player_id BIGINT PRIMARY KEY REFERENCES players(id),

  -- ELO
  elo INTEGER DEFAULT 1000 CHECK (elo >= 0),
  peak_elo INTEGER DEFAULT 1000,

  -- Stats
  total_matches INTEGER DEFAULT 0 CHECK (total_matches >= 0),
  wins INTEGER DEFAULT 0 CHECK (wins >= 0 AND wins <= total_matches),
  losses INTEGER DEFAULT 0 CHECK (losses >= 0 AND losses <= total_matches),

  -- Timestamps
  last_match_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_match_counts CHECK (wins + losses <= total_matches)
);

CREATE INDEX IF NOT EXISTS idx_pvp_rankings_elo ON pvp_rankings(elo DESC);

-- Table: pvp_match_history
CREATE TABLE IF NOT EXISTS pvp_match_history (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES pvp_matches(id) NOT NULL,
  player_id BIGINT REFERENCES players(id) NOT NULL,

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

CREATE INDEX IF NOT EXISTS idx_pvp_history_player ON pvp_match_history(player_id, played_at DESC);

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

DROP TRIGGER IF EXISTS trigger_cleanup_history ON pvp_match_history;
CREATE TRIGGER trigger_cleanup_history
AFTER INSERT ON pvp_match_history
FOR EACH ROW EXECUTE FUNCTION cleanup_old_match_history();

-- Table: pvp_challenges
CREATE TABLE IF NOT EXISTS pvp_challenges (
  id BIGSERIAL PRIMARY KEY,

  challenger_id BIGINT REFERENCES players(id) NOT NULL,
  challenged_id BIGINT REFERENCES players(id) NOT NULL,
  bet_amount INTEGER NOT NULL CHECK (bet_amount IN (10, 50, 100, 500)),

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  match_id BIGINT REFERENCES pvp_matches(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '2 minutes',

  CONSTRAINT no_self_challenge CHECK (challenger_id != challenged_id)
);

CREATE INDEX IF NOT EXISTS idx_pvp_challenges_pending ON pvp_challenges(challenged_id, status, created_at DESC);

-- RPC: Finalize match (update coins, ELO, history)
CREATE OR REPLACE FUNCTION finalize_pvp_match(
  p_match_id BIGINT,
  p_winner_id BIGINT,
  p_loser_id BIGINT,
  p_winner_elo_change INTEGER,
  p_loser_elo_change INTEGER,
  p_bet_amount INTEGER,
  p_duration INTEGER
)
RETURNS void AS $$
DECLARE
  v_match RECORD;
BEGIN
  -- Validate match exists
  SELECT * INTO v_match FROM pvp_matches WHERE id = p_match_id;

  IF v_match IS NULL THEN
    RAISE EXCEPTION 'Match % does not exist', p_match_id;
  END IF;

  -- Transfer escrowed coins to winner
  UPDATE players SET coins = coins + v_match.escrowed_coins WHERE id = p_winner_id;

  -- Update/create ELO rankings for winner
  INSERT INTO pvp_rankings (player_id, elo, peak_elo, total_matches, wins, last_match_at)
  VALUES (p_winner_id, 1000 + p_winner_elo_change, 1000 + p_winner_elo_change, 1, 1, NOW())
  ON CONFLICT (player_id) DO UPDATE SET
    elo = pvp_rankings.elo + p_winner_elo_change,
    peak_elo = GREATEST(pvp_rankings.peak_elo, pvp_rankings.elo + p_winner_elo_change),
    total_matches = pvp_rankings.total_matches + 1,
    wins = pvp_rankings.wins + 1,
    last_match_at = NOW(),
    updated_at = NOW();

  -- Update/create ELO rankings for loser
  INSERT INTO pvp_rankings (player_id, elo, peak_elo, total_matches, losses, last_match_at)
  VALUES (p_loser_id, GREATEST(0, 1000 + p_loser_elo_change), 1000, 1, 1, NOW())
  ON CONFLICT (player_id) DO UPDATE SET
    elo = GREATEST(0, pvp_rankings.elo + p_loser_elo_change),
    total_matches = pvp_rankings.total_matches + 1,
    losses = pvp_rankings.losses + 1,
    last_match_at = NOW(),
    updated_at = NOW();

  -- Insert match history for both players
  INSERT INTO pvp_match_history (match_id, player_id, won, kills, deaths, duration_seconds, coins_change, elo_change)
  VALUES 
    (p_match_id, p_winner_id, TRUE, v_match.player1_kills, v_match.player2_kills, p_duration, v_match.escrowed_coins / 2, p_winner_elo_change),
    (p_match_id, p_loser_id, FALSE, v_match.player2_kills, v_match.player1_kills, p_duration, -(v_match.escrowed_coins / 2), p_loser_elo_change);

  -- Update match status
  UPDATE pvp_matches SET
    status = 'completed',
    winner_id = p_winner_id,
    ended_at = NOW(),
    duration_seconds = p_duration
  WHERE id = p_match_id;

END;
$$ LANGUAGE plpgsql;

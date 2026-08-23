-- ============================================================================
-- PvP 1v1 Battle Mode - Database Schema
-- ============================================================================

-- Table: pvp_matches
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
  ),
  CONSTRAINT valid_players CHECK (player1_id != player2_id)
);

CREATE INDEX idx_pvp_matches_status ON pvp_matches(status);
CREATE INDEX idx_pvp_matches_players ON pvp_matches(player1_id, player2_id);
CREATE INDEX idx_pvp_matches_created ON pvp_matches(created_at DESC);

-- Table: pvp_queue
CREATE TABLE pvp_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) NOT NULL,

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

-- Table: pvp_elo_rankings
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

-- Table: pvp_match_history
CREATE TABLE pvp_match_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES pvp_matches(id) NOT NULL,
  player_id UUID REFERENCES players(id) NOT NULL,

  -- Opponent (denormalized)
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

-- Table: pvp_challenges
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

-- RPC: Get PvP leaderboard
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

-- RPC: Check rate limit (max 20 matches/hour)
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

  RETURN match_count < 20;
END;
$$ LANGUAGE plpgsql;

-- RPC: Check challenge spam (max 3 to same player in 5 min)
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

  RETURN recent_challenges < 3;
END;
$$ LANGUAGE plpgsql;

-- RPC: Finalize match (update coins, ELO, history)
CREATE OR REPLACE FUNCTION finalize_pvp_match(
  p_match_id UUID,
  p_winner_id UUID,
  p_loser_id UUID,
  p_winner_elo_change INTEGER,
  p_loser_elo_change INTEGER,
  p_bet_amount INTEGER,
  p_duration INTEGER
)
RETURNS void AS $$
DECLARE
  v_match RECORD;
  v_winner_username TEXT;
  v_loser_username TEXT;
  v_winner_kills INTEGER;
  v_loser_kills INTEGER;
BEGIN
  -- Start transaction with exception handling
  BEGIN
    -- Validate match exists and is in progress
    SELECT * INTO v_match FROM pvp_matches WHERE id = p_match_id;

    IF v_match IS NULL THEN
      RAISE EXCEPTION 'Match % does not exist', p_match_id;
    END IF;

    IF v_match.status != 'in_progress' THEN
      RAISE EXCEPTION 'Match % is not in progress (status: %)', p_match_id, v_match.status;
    END IF;

    -- Validate participants
    IF NOT ((v_match.player1_id = p_winner_id AND v_match.player2_id = p_loser_id) OR
            (v_match.player1_id = p_loser_id AND v_match.player2_id = p_winner_id)) THEN
      RAISE EXCEPTION 'Winner % and loser % are not participants of match %', p_winner_id, p_loser_id, p_match_id;
    END IF;

    -- Validate bet amount matches
    IF v_match.bet_amount != p_bet_amount THEN
      RAISE EXCEPTION 'Bet amount % does not match match bet amount %', p_bet_amount, v_match.bet_amount;
    END IF;

    -- Get usernames
    SELECT username INTO v_winner_username FROM players WHERE id = p_winner_id;
    SELECT username INTO v_loser_username FROM players WHERE id = p_loser_id;

    -- Get kills
    IF v_match.player1_id = p_winner_id THEN
      v_winner_kills := v_match.player1_kills;
      v_loser_kills := v_match.player2_kills;
    ELSE
      v_winner_kills := v_match.player2_kills;
      v_loser_kills := v_match.player1_kills;
    END IF;

    -- Transfer escrowed coins to winner (coins already deducted at match start)
    UPDATE players SET coins = coins + v_match.escrowed_coins WHERE id = p_winner_id;

  -- Update/create ELO rankings for winner
  INSERT INTO pvp_elo_rankings (player_id, elo_rating, peak_elo, total_matches, wins, win_streak, best_win_streak, total_coins_won, first_match_at, last_match_at)
  VALUES (p_winner_id, 1000 + p_winner_elo_change, 1000 + p_winner_elo_change, 1, 1, 1, 1, p_bet_amount, NOW(), NOW())
  ON CONFLICT (player_id) DO UPDATE SET
    elo_rating = pvp_elo_rankings.elo_rating + p_winner_elo_change,
    peak_elo = GREATEST(pvp_elo_rankings.peak_elo, pvp_elo_rankings.elo_rating + p_winner_elo_change),
    total_matches = pvp_elo_rankings.total_matches + 1,
    wins = pvp_elo_rankings.wins + 1,
    win_streak = pvp_elo_rankings.win_streak + 1,
    best_win_streak = GREATEST(pvp_elo_rankings.best_win_streak, pvp_elo_rankings.win_streak + 1),
    total_coins_won = pvp_elo_rankings.total_coins_won + p_bet_amount,
    last_match_at = NOW(),
    updated_at = NOW();

  -- Update/create ELO rankings for loser
  INSERT INTO pvp_elo_rankings (player_id, elo_rating, peak_elo, total_matches, losses, win_streak, total_coins_lost, first_match_at, last_match_at)
  VALUES (p_loser_id, 1000 + p_loser_elo_change, 1000, 1, 1, 0, p_bet_amount, NOW(), NOW())
  ON CONFLICT (player_id) DO UPDATE SET
    elo_rating = pvp_elo_rankings.elo_rating + p_loser_elo_change,
    total_matches = pvp_elo_rankings.total_matches + 1,
    losses = pvp_elo_rankings.losses + 1,
    win_streak = 0,
    total_coins_lost = pvp_elo_rankings.total_coins_lost + p_bet_amount,
    last_match_at = NOW(),
    updated_at = NOW();

  -- Insert match history for winner
  INSERT INTO pvp_match_history (match_id, player_id, opponent_id, opponent_username, won, kills, deaths, duration_seconds, coins_change, elo_change)
  VALUES (p_match_id, p_winner_id, p_loser_id, v_loser_username, TRUE, v_winner_kills, v_loser_kills, p_duration, p_bet_amount, p_winner_elo_change);

  -- Insert match history for loser
  INSERT INTO pvp_match_history (match_id, player_id, opponent_id, opponent_username, won, kills, deaths, duration_seconds, coins_change, elo_change)
  VALUES (p_match_id, p_loser_id, p_winner_id, v_winner_username, FALSE, v_loser_kills, v_winner_kills, p_duration, -p_bet_amount, p_loser_elo_change);

    -- Update match status
    UPDATE pvp_matches SET
      status = 'completed',
      winner_id = p_winner_id,
      ended_at = NOW(),
      validated = TRUE,
      duration_seconds = p_duration
    WHERE id = p_match_id;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;

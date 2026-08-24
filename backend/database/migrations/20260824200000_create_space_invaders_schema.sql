-- +goose Up
-- +goose StatementBegin

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Table: players (main player table)
CREATE TABLE IF NOT EXISTS players (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    email_verified BOOLEAN DEFAULT false,
    
    -- Game progress
    coins BIGINT DEFAULT 0 CHECK (coins >= 0),
    high_score INTEGER DEFAULT 0 CHECK (high_score >= 0),
    current_level INTEGER DEFAULT 1 CHECK (current_level >= 1),
    
    -- Player stats
    total_kills INTEGER DEFAULT 0 CHECK (total_kills >= 0),
    total_deaths INTEGER DEFAULT 0 CHECK (total_deaths >= 0),
    total_playtime_seconds INTEGER DEFAULT 0 CHECK (total_playtime_seconds >= 0),
    
    -- Notification preferences
    notifications_offers BOOLEAN DEFAULT true,
    notifications_achievements BOOLEAN DEFAULT true,
    notifications_shop BOOLEAN DEFAULT false,
    
    -- Metadata
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_username ON players(username);
CREATE INDEX idx_players_email ON players(email);
CREATE INDEX idx_players_high_score ON players(high_score DESC);
CREATE INDEX idx_players_created_at ON players(created_at DESC);

-- Table: security_logs
CREATE TABLE IF NOT EXISTS security_logs (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_logs_player ON security_logs(player_id, created_at DESC);
CREATE INDEX idx_security_logs_action ON security_logs(action, created_at DESC);

-- Table: reward_history
CREATE TABLE IF NOT EXISTS reward_history (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reward_history_player ON reward_history(player_id, created_at DESC);

-- Table: achievements
CREATE TABLE IF NOT EXISTS achievements (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    reward_coins INTEGER DEFAULT 0,
    requirement_type TEXT NOT NULL,
    requirement_value INTEGER NOT NULL,
    tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_achievements_tier ON achievements(tier);

-- Table: player_achievements
CREATE TABLE IF NOT EXISTS player_achievements (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    achievement_id BIGINT REFERENCES achievements(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(player_id, achievement_id)
);

CREATE INDEX idx_player_achievements_player ON player_achievements(player_id);
CREATE INDEX idx_player_achievements_completed ON player_achievements(completed, completed_at DESC);

-- Table: player_items
CREATE TABLE IF NOT EXISTS player_items (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('skin', 'weapon', 'powerup', 'consumable')),
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
    equipped BOOLEAN DEFAULT false,
    
    -- NFT fields
    nft_mint_address TEXT,
    is_on_chain BOOLEAN DEFAULT false,
    minted_at TIMESTAMPTZ,
    burned_at TIMESTAMPTZ,
    
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(player_id, item_id)
);

CREATE INDEX idx_player_items_player ON player_items(player_id);
CREATE INDEX idx_player_items_type ON player_items(item_type);
CREATE INDEX idx_player_items_nft ON player_items(nft_mint_address);
CREATE INDEX idx_player_items_on_chain ON player_items(is_on_chain);

-- Table: player_active_effects
CREATE TABLE IF NOT EXISTS player_active_effects (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    effect_type TEXT NOT NULL,
    effect_value NUMERIC NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_player_effects_player ON player_active_effects(player_id, expires_at);

-- Table: analytics_events
CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_events_player ON analytics_events(player_id, created_at DESC);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);

-- Table: player_backups
CREATE TABLE IF NOT EXISTS player_backups (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    backup_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_player_backups_player ON player_backups(player_id, created_at DESC);

-- Table: system_config
CREATE TABLE IF NOT EXISTS system_config (
    id BIGSERIAL PRIMARY KEY,
    config_key TEXT UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_player ON notifications(player_id, read, created_at DESC);

-- Table: game_sessions
CREATE TABLE IF NOT EXISTS game_sessions (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    session_id TEXT UNIQUE NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    score INTEGER DEFAULT 0,
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,
    level_reached INTEGER DEFAULT 1
);

CREATE INDEX idx_game_sessions_player ON game_sessions(player_id, started_at DESC);
CREATE INDEX idx_game_sessions_session_id ON game_sessions(session_id);

-- Table: daily_metrics
CREATE TABLE IF NOT EXISTS daily_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_date DATE UNIQUE NOT NULL,
    total_players INTEGER DEFAULT 0,
    new_players INTEGER DEFAULT 0,
    active_players INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    total_playtime_seconds BIGINT DEFAULT 0,
    total_coins_earned BIGINT DEFAULT 0,
    total_coins_spent BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_metrics_date ON daily_metrics(metric_date DESC);

-- Table: player_feedback
CREATE TABLE IF NOT EXISTS player_feedback (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE SET NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'suggestion', 'praise', 'complaint', 'other')),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'closed')),
    admin_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_player_feedback_player ON player_feedback(player_id);
CREATE INDEX idx_player_feedback_status ON player_feedback(status, created_at DESC);

-- Table: special_events
CREATE TABLE IF NOT EXISTS special_events (
    id BIGSERIAL PRIMARY KEY,
    event_name TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    description TEXT,
    reward_multiplier NUMERIC DEFAULT 1.0,
    active BOOLEAN DEFAULT false,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_special_events_active ON special_events(active, starts_at, ends_at);

-- ============================================================================
-- BLOCKCHAIN/WALLET TABLES
-- ============================================================================

-- Table: player_wallets
CREATE TABLE IF NOT EXISTS player_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    wallet_address TEXT UNIQUE NOT NULL,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    is_primary BOOLEAN DEFAULT true,
    
    UNIQUE(player_id, wallet_address)
);

CREATE INDEX idx_player_wallets_player ON player_wallets(player_id);
CREATE INDEX idx_player_wallets_address ON player_wallets(wallet_address);

-- Table: token_transactions
CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('WITHDRAW', 'DEPOSIT')),
    amount BIGINT NOT NULL CHECK (amount > 0),
    tx_signature TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_token_tx_player ON token_transactions(player_id);
CREATE INDEX idx_token_tx_signature ON token_transactions(tx_signature);
CREATE INDEX idx_token_tx_status ON token_transactions(status);

-- Table: nft_metadata
CREATE TABLE IF NOT EXISTS nft_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mint_address TEXT UNIQUE NOT NULL,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    name TEXT,
    image_url TEXT,
    metadata_uri TEXT,
    rarity TEXT,
    minted_at TIMESTAMPTZ DEFAULT NOW(),
    burned_at TIMESTAMPTZ
);

CREATE INDEX idx_nft_mint ON nft_metadata(mint_address);
CREATE INDEX idx_nft_player ON nft_metadata(player_id);
CREATE INDEX idx_nft_burned ON nft_metadata(burned_at) WHERE burned_at IS NOT NULL;

-- Table: marketplace_listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_address TEXT UNIQUE NOT NULL,
    seller_wallet TEXT NOT NULL,
    nft_mint TEXT NOT NULL,
    price BIGINT NOT NULL CHECK (price > 0),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SOLD', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sold_at TIMESTAMPTZ,
    buyer_wallet TEXT,
    
    CHECK (
        (status != 'SOLD' AND buyer_wallet IS NULL) OR
        (status = 'SOLD' AND buyer_wallet IS NOT NULL)
    )
);

CREATE INDEX idx_listings_status ON marketplace_listings(status);
CREATE INDEX idx_listings_seller ON marketplace_listings(seller_wallet);
CREATE INDEX idx_listings_nft ON marketplace_listings(nft_mint);
CREATE INDEX idx_listings_price ON marketplace_listings(price) WHERE status = 'ACTIVE';

-- Table: marketplace_sales
CREATE TABLE IF NOT EXISTS marketplace_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_address TEXT NOT NULL,
    seller TEXT NOT NULL,
    buyer TEXT NOT NULL,
    nft_mint TEXT NOT NULL,
    price BIGINT NOT NULL,
    royalty BIGINT NOT NULL,
    marketplace_fee BIGINT NOT NULL,
    tx_signature TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_nft ON marketplace_sales(nft_mint);
CREATE INDEX idx_sales_seller ON marketplace_sales(seller);
CREATE INDEX idx_sales_buyer ON marketplace_sales(buyer);

-- Table: rate_limits
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_player_action ON rate_limits(player_id, action, created_at);

-- ============================================================================
-- PVP TABLES
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

CREATE INDEX idx_pvp_matches_status ON pvp_matches(status);
CREATE INDEX idx_pvp_matches_players ON pvp_matches(player1_id, player2_id);
CREATE INDEX idx_pvp_matches_created ON pvp_matches(created_at DESC);

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

CREATE UNIQUE INDEX unique_active_player ON pvp_queue(player_id) WHERE status = 'searching';
CREATE INDEX idx_pvp_queue_matchmaking ON pvp_queue(bet_amount, joined_at) WHERE status = 'searching';

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

CREATE INDEX idx_pvp_rankings_elo ON pvp_rankings(elo DESC);

-- Table: pvp_match_history
CREATE TABLE IF NOT EXISTS pvp_match_history (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT REFERENCES pvp_matches(id) NOT NULL,
    player_id BIGINT REFERENCES players(id) NOT NULL,
    
    -- Opponent info (denormalized for history)
    opponent_id BIGINT,
    opponent_username TEXT,
    
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
    
    CONSTRAINT no_self_challenge CHECK (challenger_id != challenged_id),
    CONSTRAINT match_on_accept CHECK (
        (status = 'accepted' AND match_id IS NOT NULL) OR
        (status != 'accepted')
    )
);

CREATE INDEX idx_pvp_challenges_pending ON pvp_challenges(challenged_id, status, created_at DESC);

-- Table: pvp_signaling (for WebRTC signaling)
CREATE TABLE IF NOT EXISTS pvp_signaling (
    id BIGSERIAL PRIMARY KEY,
    room_id TEXT NOT NULL,
    player_id BIGINT REFERENCES players(id) NOT NULL,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
    signal_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Auto-cleanup old signals
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes'
);

CREATE INDEX idx_pvp_signaling_room ON pvp_signaling(room_id, created_at DESC);
CREATE INDEX idx_pvp_signaling_expires ON pvp_signaling(expires_at);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function: Update player updated_at timestamp
CREATE OR REPLACE FUNCTION update_player_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_player_timestamp
BEFORE UPDATE ON players
FOR EACH ROW EXECUTE FUNCTION update_player_timestamp();

-- Function: Cleanup old match history (keep only last 20 per player)
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

-- Function: Cleanup expired signaling messages
CREATE OR REPLACE FUNCTION cleanup_expired_signaling()
RETURNS void AS $$
BEGIN
    DELETE FROM pvp_signaling WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function: Finalize PvP match
CREATE OR REPLACE FUNCTION finalize_pvp_match(
    p_match_id BIGINT,
    p_winner_id BIGINT,
    p_loser_id BIGINT,
    p_winner_elo_change INTEGER,
    p_loser_elo_change INTEGER,
    p_bet_amount INTEGER,
    p_duration INTEGER,
    p_winner_kills INTEGER DEFAULT 3,
    p_loser_kills INTEGER DEFAULT 0
)
RETURNS void AS $$
DECLARE
    v_match RECORD;
    v_winner_username TEXT;
    v_loser_username TEXT;
BEGIN
    -- Validate match exists
    SELECT * INTO v_match FROM pvp_matches WHERE id = p_match_id;
    
    IF v_match IS NULL THEN
        RAISE EXCEPTION 'Match % does not exist', p_match_id;
    END IF;
    
    -- Get usernames
    SELECT username INTO v_winner_username FROM players WHERE id = p_winner_id;
    SELECT username INTO v_loser_username FROM players WHERE id = p_loser_id;
    
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
    INSERT INTO pvp_match_history (match_id, player_id, opponent_id, opponent_username, won, kills, deaths, duration_seconds, coins_change, elo_change)
    VALUES 
        (p_match_id, p_winner_id, p_loser_id, v_loser_username, TRUE, p_winner_kills, p_loser_kills, p_duration, v_match.escrowed_coins / 2, p_winner_elo_change),
        (p_match_id, p_loser_id, p_winner_id, v_winner_username, FALSE, p_loser_kills, p_winner_kills, p_duration, -(v_match.escrowed_coins / 2), p_loser_elo_change);
    
    -- Update match status
    UPDATE pvp_matches SET
        status = 'completed',
        winner_id = p_winner_id,
        ended_at = NOW(),
        duration_seconds = p_duration,
        player1_kills = CASE WHEN player1_id = p_winner_id THEN p_winner_kills ELSE p_loser_kills END,
        player2_kills = CASE WHEN player2_id = p_winner_id THEN p_winner_kills ELSE p_loser_kills END
    WHERE id = p_match_id;
    
END;
$$ LANGUAGE plpgsql;

-- Function: Get PvP leaderboard
CREATE OR REPLACE FUNCTION get_pvp_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    rank BIGINT,
    player_id BIGINT,
    username TEXT,
    elo INTEGER,
    total_matches INTEGER,
    wins INTEGER,
    losses INTEGER,
    win_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY r.elo DESC) as rank,
        r.player_id,
        p.username,
        r.elo,
        r.total_matches,
        r.wins,
        r.losses,
        CASE 
            WHEN r.total_matches > 0 THEN ROUND((r.wins::NUMERIC / r.total_matches::NUMERIC) * 100, 2)
            ELSE 0
        END as win_rate
    FROM pvp_rankings r
    JOIN players p ON p.id = r.player_id
    ORDER BY r.elo DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Check PvP rate limit
CREATE OR REPLACE FUNCTION check_pvp_rate_limit(p_player_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pvp_matches
    WHERE (player1_id = p_player_id OR player2_id = p_player_id)
    AND created_at > NOW() - INTERVAL '1 minute';
    
    RETURN v_count < 5;
END;
$$ LANGUAGE plpgsql;

-- Function: Check challenge spam
CREATE OR REPLACE FUNCTION check_challenge_spam(p_challenger_id BIGINT, p_challenged_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pvp_challenges
    WHERE challenger_id = p_challenger_id
    AND challenged_id = p_challenged_id
    AND created_at > NOW() - INTERVAL '5 minutes';
    
    RETURN v_count < 3;
END;
$$ LANGUAGE plpgsql;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Drop functions
DROP FUNCTION IF EXISTS check_challenge_spam(BIGINT, BIGINT);
DROP FUNCTION IF EXISTS check_pvp_rate_limit(BIGINT);
DROP FUNCTION IF EXISTS get_pvp_leaderboard(INTEGER);
DROP FUNCTION IF EXISTS finalize_pvp_match(BIGINT, BIGINT, BIGINT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS cleanup_expired_signaling();
DROP FUNCTION IF EXISTS cleanup_old_match_history();
DROP FUNCTION IF EXISTS update_player_timestamp();

-- Drop PvP tables
DROP TABLE IF EXISTS pvp_signaling CASCADE;
DROP TABLE IF EXISTS pvp_challenges CASCADE;
DROP TABLE IF EXISTS pvp_match_history CASCADE;
DROP TABLE IF EXISTS pvp_rankings CASCADE;
DROP TABLE IF EXISTS pvp_queue CASCADE;
DROP TABLE IF EXISTS pvp_matches CASCADE;

-- Drop blockchain/wallet tables
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS marketplace_sales CASCADE;
DROP TABLE IF EXISTS marketplace_listings CASCADE;
DROP TABLE IF EXISTS nft_metadata CASCADE;
DROP TABLE IF EXISTS token_transactions CASCADE;
DROP TABLE IF EXISTS player_wallets CASCADE;

-- Drop core tables
DROP TABLE IF EXISTS special_events CASCADE;
DROP TABLE IF EXISTS player_feedback CASCADE;
DROP TABLE IF EXISTS daily_metrics CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS player_backups CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS player_active_effects CASCADE;
DROP TABLE IF EXISTS player_items CASCADE;
DROP TABLE IF EXISTS player_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS reward_history CASCADE;
DROP TABLE IF EXISTS security_logs CASCADE;
DROP TABLE IF EXISTS players CASCADE;

-- +goose StatementEnd

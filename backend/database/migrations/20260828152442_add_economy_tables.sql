-- +goose Up
-- +goose StatementBegin

-- ============================================================================
-- ECONOMY TABLES
-- ============================================================================

-- Table: leagues
CREATE TABLE IF NOT EXISTS leagues (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    min_points BIGINT NOT NULL,
    max_points BIGINT NOT NULL,
    icon TEXT,
    color TEXT
);

CREATE INDEX idx_leagues_points ON leagues(min_points, max_points);

-- Drop and recreate achievements table with correct structure
DROP TABLE IF EXISTS player_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;

-- Table: achievements (recreated with correct schema)
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    rarity TEXT NOT NULL DEFAULT 'COMMON' CHECK (rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),
    reward_gold BIGINT DEFAULT 0,
    requirement_type TEXT NOT NULL,
    requirement_value BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_achievements_rarity ON achievements(rarity);
CREATE INDEX idx_achievements_requirement ON achievements(requirement_type);

-- Table: player_achievements (recreated)
CREATE TABLE IF NOT EXISTS player_achievements (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES achievements(id) ON DELETE CASCADE,
    progress BIGINT DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(player_id, achievement_id)
);

CREATE INDEX idx_player_achievements_player ON player_achievements(player_id);
CREATE INDEX idx_player_achievements_completed ON player_achievements(completed, completed_at DESC);

-- Table: treasury_config
CREATE TABLE IF NOT EXISTS treasury_config (
    id BIGSERIAL PRIMARY KEY,
    conversion_ratio BIGINT NOT NULL DEFAULT 100,
    revenue_share_percent DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    min_emission_per_day BIGINT NOT NULL DEFAULT 0,
    max_emission_per_day BIGINT NOT NULL DEFAULT 1000000000000,
    treasury_wallet_pubkey TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: gold_space_conversions
CREATE TABLE IF NOT EXISTS gold_space_conversions (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('GOLD_TO_SPACE', 'SPACE_TO_GOLD')),
    gold_amount BIGINT NOT NULL,
    space_amount BIGINT NOT NULL,
    exchange_rate BIGINT NOT NULL DEFAULT 100,
    tx_signature TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_conversions_player ON gold_space_conversions(player_id);
CREATE INDEX idx_conversions_status ON gold_space_conversions(status);
CREATE INDEX idx_conversions_tx ON gold_space_conversions(tx_signature);

-- Table: orders
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL,
    amount BIGINT NOT NULL,
    gold_amount BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
    external_id TEXT UNIQUE NOT NULL,
    pix_code TEXT,
    qr_code_url TEXT,
    payment_url TEXT,
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_player ON orders(player_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_external ON orders(external_id);

-- Table: daily_emissions
CREATE TABLE IF NOT EXISTS daily_emissions (
    id BIGSERIAL PRIMARY KEY,
    date TIMESTAMPTZ UNIQUE NOT NULL,
    pix_revenue24h BIGINT NOT NULL DEFAULT 0,
    space_price BIGINT NOT NULL DEFAULT 100,
    gameplay_rewards BIGINT NOT NULL DEFAULT 0,
    emission_limit BIGINT NOT NULL DEFAULT 0,
    emission_used BIGINT NOT NULL DEFAULT 0,
    emission_available BIGINT NOT NULL DEFAULT 0,
    executed BOOLEAN DEFAULT false,
    tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_emissions_date ON daily_emissions(date);
CREATE INDEX idx_emissions_executed ON daily_emissions(executed);

-- Table: battle_pass_seasons
CREATE TABLE IF NOT EXISTS battle_pass_seasons (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    active BOOLEAN DEFAULT false,
    max_tier BIGINT NOT NULL DEFAULT 50,
    xp_per_tier BIGINT NOT NULL DEFAULT 100,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_bp_seasons_active ON battle_pass_seasons(active);
CREATE INDEX idx_bp_seasons_dates ON battle_pass_seasons(start_date, end_date);

-- Table: battle_pass_progress
CREATE TABLE IF NOT EXISTS battle_pass_progress (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    season_id BIGINT REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
    xp BIGINT NOT NULL DEFAULT 0,
    current_tier BIGINT NOT NULL DEFAULT 0,
    is_premium BOOLEAN DEFAULT false,
    claimed_free_tiers TEXT,
    claimed_premium_tiers TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_bp_progress_player ON battle_pass_progress(player_id);
CREATE INDEX idx_bp_progress_season ON battle_pass_progress(season_id);
CREATE UNIQUE INDEX idx_bp_progress_player_season ON battle_pass_progress(player_id, season_id) WHERE deleted_at IS NULL;

-- Table: battle_pass_rewards
CREATE TABLE IF NOT EXISTS battle_pass_rewards (
    id BIGSERIAL PRIMARY KEY,
    season_id BIGINT REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
    tier BIGINT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('free', 'premium')),
    reward_type TEXT NOT NULL,
    gold_amount BIGINT DEFAULT 0,
    space_amount BIGINT DEFAULT 0,
    item_id BIGINT,
    nft_collection_id BIGINT,
    nft_metadata_uri TEXT,
    name TEXT,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_bp_rewards_season ON battle_pass_rewards(season_id);
CREATE INDEX idx_bp_rewards_tier ON battle_pass_rewards(tier);
CREATE INDEX idx_bp_rewards_season_tier ON battle_pass_rewards(season_id, tier);

-- Table: battle_pass_purchases
CREATE TABLE IF NOT EXISTS battle_pass_purchases (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    season_id BIGINT REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    payment_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    order_id TEXT,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_bp_purchases_player ON battle_pass_purchases(player_id);
CREATE INDEX idx_bp_purchases_season ON battle_pass_purchases(season_id);
CREATE INDEX idx_bp_purchases_status ON battle_pass_purchases(status);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS battle_pass_purchases CASCADE;
DROP TABLE IF EXISTS battle_pass_rewards CASCADE;
DROP TABLE IF EXISTS battle_pass_progress CASCADE;
DROP TABLE IF EXISTS battle_pass_seasons CASCADE;
DROP TABLE IF EXISTS daily_emissions CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS gold_space_conversions CASCADE;
DROP TABLE IF EXISTS treasury_config CASCADE;
DROP TABLE IF EXISTS player_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS leagues CASCADE;

-- +goose StatementEnd

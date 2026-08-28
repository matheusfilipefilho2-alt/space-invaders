-- +goose Up
-- +goose StatementBegin

-- Add missing columns to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS wallet_address TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS gold_balance BIGINT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS space_balance BIGINT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS solana_wallet TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS league_id BIGINT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS rank_points BIGINT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS total_games BIGINT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_played TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN IF NOT EXISTS notify_offers BOOLEAN DEFAULT true;
ALTER TABLE players ADD COLUMN IF NOT EXISTS notify_achievements BOOLEAN DEFAULT true;
ALTER TABLE players ADD COLUMN IF NOT EXISTS notify_shop BOOLEAN DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS guild_id BIGINT;

-- Update existing columns to match entity (rename)
ALTER TABLE players RENAME COLUMN notifications_offers TO notifications_offers_old;
ALTER TABLE players RENAME COLUMN notifications_achievements TO notifications_achievements_old;
ALTER TABLE players RENAME COLUMN notifications_shop TO notifications_shop_old;

-- Copy data if columns existed
UPDATE players SET notify_offers = COALESCE(notifications_offers_old, true) WHERE notify_offers IS NULL;
UPDATE players SET notify_achievements = COALESCE(notifications_achievements_old, true) WHERE notify_achievements IS NULL;
UPDATE players SET notify_shop = COALESCE(notifications_shop_old, false) WHERE notify_shop IS NULL;

-- Drop old columns
ALTER TABLE players DROP COLUMN IF EXISTS notifications_offers_old;
ALTER TABLE players DROP COLUMN IF EXISTS notifications_achievements_old;
ALTER TABLE players DROP COLUMN IF EXISTS notifications_shop_old;

-- Migrate coins to gold_balance
UPDATE players SET gold_balance = COALESCE(coins, 0) WHERE gold_balance = 0;

-- Add indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_wallet ON players(wallet_address) WHERE wallet_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_solana_wallet ON players(solana_wallet) WHERE solana_wallet IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_league ON players(league_id);

-- Add foreign key
ALTER TABLE players ADD CONSTRAINT fk_players_league FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE SET NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Remove foreign key
ALTER TABLE players DROP CONSTRAINT IF EXISTS fk_players_league;

-- Remove indexes
DROP INDEX IF EXISTS idx_players_wallet;
DROP INDEX IF EXISTS idx_players_solana_wallet;
DROP INDEX IF EXISTS idx_players_league;

-- Remove added columns
ALTER TABLE players DROP COLUMN IF EXISTS password_hash;
ALTER TABLE players DROP COLUMN IF EXISTS wallet_address;
ALTER TABLE players DROP COLUMN IF EXISTS gold_balance;
ALTER TABLE players DROP COLUMN IF EXISTS space_balance;
ALTER TABLE players DROP COLUMN IF EXISTS solana_wallet;
ALTER TABLE players DROP COLUMN IF EXISTS league_id;
ALTER TABLE players DROP COLUMN IF EXISTS rank_points;
ALTER TABLE players DROP COLUMN IF EXISTS total_games;
ALTER TABLE players DROP COLUMN IF EXISTS last_played;
ALTER TABLE players DROP COLUMN IF EXISTS notify_offers;
ALTER TABLE players DROP COLUMN IF EXISTS notify_achievements;
ALTER TABLE players DROP COLUMN IF EXISTS notify_shop;
ALTER TABLE players DROP COLUMN IF EXISTS guild_id;

-- +goose StatementEnd

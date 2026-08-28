-- +goose Up
-- +goose StatementBegin

-- Add deleted_at column to player_achievements for soft deletes (gorm.Model)
ALTER TABLE player_achievements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_player_achievements_deleted_at ON player_achievements(deleted_at);

-- Add deleted_at to other tables that use gorm.Model
ALTER TABLE player_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_player_items_deleted_at ON player_items(deleted_at);

ALTER TABLE nft_metadata ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_nft_metadata_deleted_at ON nft_metadata(deleted_at);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Remove deleted_at columns
ALTER TABLE player_achievements DROP COLUMN IF EXISTS deleted_at;
DROP INDEX IF EXISTS idx_player_achievements_deleted_at;

ALTER TABLE player_items DROP COLUMN IF EXISTS deleted_at;
DROP INDEX IF EXISTS idx_player_items_deleted_at;

ALTER TABLE nft_metadata DROP COLUMN IF EXISTS deleted_at;
DROP INDEX IF EXISTS idx_nft_metadata_deleted_at;

-- +goose StatementEnd

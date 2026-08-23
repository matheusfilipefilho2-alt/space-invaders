-- Add email and notification preferences to players table
-- This enables email/password change functionality and user preferences

ALTER TABLE players
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notifications_offers BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_achievements BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_shop BOOLEAN DEFAULT false;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_players_email ON players(email);

-- Add comment for documentation
COMMENT ON COLUMN players.email IS 'User email address for PIX payments and account recovery';
COMMENT ON COLUMN players.email_verified IS 'Whether the email has been verified';
COMMENT ON COLUMN players.notifications_offers IS 'Whether user wants to receive offer notifications';
COMMENT ON COLUMN players.notifications_achievements IS 'Whether user wants to receive achievement notifications';
COMMENT ON COLUMN players.notifications_shop IS 'Whether user wants to receive shop notifications';

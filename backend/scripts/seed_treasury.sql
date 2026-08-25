-- Seed Treasury Configuration
-- This script initializes the treasury configuration with production-ready values

-- Insert default treasury configuration (singleton table)
INSERT INTO treasury_configs (
    id,
    conversion_ratio,
    revenue_share_percent,
    treasury_wallet_pubkey,
    min_emission_per_day,
    max_emission_per_day,
    created_at,
    updated_at
) VALUES (
    1,
    100,                        -- 100 Gold = 1 SPACE
    0.30,                       -- 30% of revenue goes to emission
    '',                         -- Will be set via environment variable
    0,                          -- No minimum emission
    1000000000000,              -- 1,000 SPACE maximum per day (in lamports: 1000 * 10^9)
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    conversion_ratio = EXCLUDED.conversion_ratio,
    revenue_share_percent = EXCLUDED.revenue_share_percent,
    min_emission_per_day = EXCLUDED.min_emission_per_day,
    max_emission_per_day = EXCLUDED.max_emission_per_day,
    updated_at = NOW();

-- Note: treasury_wallet_pubkey should be set via environment variable (TREASURY_WALLET_PUBKEY)
-- It will be loaded by the TreasuryConfig entity when the application starts

-- Verify insertion
SELECT
    id,
    conversion_ratio as "Gold:SPACE Ratio",
    revenue_share_percent as "Revenue Share %",
    treasury_wallet_pubkey as "Treasury Wallet",
    min_emission_per_day / 1000000000 as "Min Daily Emission (SPACE)",
    max_emission_per_day / 1000000000 as "Max Daily Emission (SPACE)",
    created_at,
    updated_at
FROM treasury_configs
WHERE id = 1;

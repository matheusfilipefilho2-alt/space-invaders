-- Test Data Seed Script
-- ⚠️ WARNING: Only run this in development/testing environments!
-- This script creates sample data for testing the economy system

-- Clean up existing test data (optional - comment out if you want to keep existing data)
-- DELETE FROM gold_space_conversions WHERE player_id IN (SELECT id FROM players WHERE email LIKE 'test%@example.com');
-- DELETE FROM orders WHERE player_id IN (SELECT id FROM players WHERE email LIKE 'test%@example.com');
-- DELETE FROM players WHERE email LIKE 'test%@example.com';
-- DELETE FROM daily_emissions WHERE id > 0;

BEGIN;

-- Create test players with Gold balances
INSERT INTO players (username, email, password_hash, gold_balance, space_balance, solana_wallet, created_at, updated_at)
VALUES
    ('test_player_1', 'test1@example.com', '$2a$10$dummyhash1', 5000, 0, 'TestWallet111111111111111111111111111111', NOW(), NOW()),
    ('test_player_2', 'test2@example.com', '$2a$10$dummyhash2', 10000, 50000000000, 'TestWallet222222222222222222222222222222', NOW(), NOW()),
    ('test_player_3', 'test3@example.com', '$2a$10$dummyhash3', 1000, 0, NULL, NOW(), NOW()),
    ('whale_player', 'whale@example.com', '$2a$10$dummyhash4', 100000, 1000000000000, 'WhaleWallet111111111111111111111111111111', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Get player IDs for test data
DO $$
DECLARE
    player1_id INT;
    player2_id INT;
    player3_id INT;
    whale_id INT;
BEGIN
    -- Get test player IDs
    SELECT id INTO player1_id FROM players WHERE email = 'test1@example.com';
    SELECT id INTO player2_id FROM players WHERE email = 'test2@example.com';
    SELECT id INTO player3_id FROM players WHERE email = 'test3@example.com';
    SELECT id INTO whale_id FROM players WHERE email = 'whale@example.com';

    -- Create sample conversion history
    INSERT INTO gold_space_conversions (player_id, gold_amount, space_amount, exchange_rate, status, tx_hash, created_at, updated_at, completed_at)
    VALUES
        (player2_id, 1000, 10000000000, 100, 'completed', 'tx_completed_001', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
        (player2_id, 3000, 30000000000, 100, 'completed', 'tx_completed_002', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
        (whale_id, 10000, 100000000000, 100, 'completed', 'tx_completed_003', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
        (player1_id, 500, 5000000000, 100, 'pending', NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', NULL)
    ON CONFLICT DO NOTHING;

    -- Create sample daily emission records
    INSERT INTO daily_emissions (
        date,
        gameplay_rewards,
        pix_revenue24h,
        space_price,
        emission_limit,
        emission_used,
        emission_available,
        executed,
        tx_hash,
        created_at,
        updated_at
    )
    VALUES
        (DATE_TRUNC('day', NOW() - INTERVAL '7 days'), 50000000000, 10000, 100, 30000000000, 30000000000, 0, true, 'emission_tx_001', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
        (DATE_TRUNC('day', NOW() - INTERVAL '6 days'), 80000000000, 15000, 100, 45000000000, 45000000000, 0, true, 'emission_tx_002', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
        (DATE_TRUNC('day', NOW() - INTERVAL '5 days'), 120000000000, 20000, 100, 60000000000, 60000000000, 0, true, 'emission_tx_003', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
        (DATE_TRUNC('day', NOW() - INTERVAL '4 days'), 95000000000, 18000, 100, 54000000000, 54000000000, 0, true, 'emission_tx_004', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
        (DATE_TRUNC('day', NOW() - INTERVAL '3 days'), 110000000000, 22000, 100, 66000000000, 66000000000, 0, true, 'emission_tx_005', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
        (DATE_TRUNC('day', NOW() - INTERVAL '2 days'), 85000000000, 16000, 100, 48000000000, 48000000000, 0, true, 'emission_tx_006', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
        (DATE_TRUNC('day', NOW() - INTERVAL '1 day'), 100000000000, 25000, 100, 75000000000, 75000000000, 0, true, 'emission_tx_007', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
        (DATE_TRUNC('day', NOW()), 120000000000, 30000, 100, 90000000000, 0, 90000000000, false, NULL, NOW(), NOW())
    ON CONFLICT (date) DO NOTHING;

    -- Create sample PIX orders
    INSERT INTO orders (
        player_id,
        package_id,
        amount,
        gold_amount,
        status,
        external_id,
        pix_code,
        qr_code_url,
        payment_url,
        created_at,
        updated_at,
        completed_at,
        expires_at
    )
    VALUES
        (player1_id, 'gold_100', 500, 100, 'completed', 'order_test_001', 'PIX_CODE_001', 'https://qr.code/001', 'https://pay.abacate/001', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 minutes'),
        (player2_id, 'gold_500', 2000, 500, 'completed', 'order_test_002', 'PIX_CODE_002', 'https://qr.code/002', 'https://pay.abacate/002', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() + INTERVAL '20 minutes'),
        (whale_id, 'gold_1000', 3500, 1000, 'completed', 'order_test_003', 'PIX_CODE_003', 'https://qr.code/003', 'https://pay.abacate/003', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() + INTERVAL '20 minutes'),
        (player3_id, 'gold_100', 500, 100, 'pending', 'order_test_004', 'PIX_CODE_004', 'https://qr.code/004', 'https://pay.abacate/004', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', NULL, NOW() + INTERVAL '29 minutes'),
        (player1_id, 'gold_500', 2000, 500, 'expired', 'order_test_005', 'PIX_CODE_005', 'https://qr.code/005', 'https://pay.abacate/005', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NULL, NOW() - INTERVAL '2 days' + INTERVAL '30 minutes')
    ON CONFLICT (external_id) DO NOTHING;

END;
$$;

COMMIT;

-- Display summary of test data
SELECT '=== Test Players ===' as summary;
SELECT id, username, email, gold_balance, space_balance / 1000000000.0 as space_balance_tokens, solana_wallet
FROM players
WHERE email LIKE 'test%@example.com' OR email = 'whale@example.com'
ORDER BY id;

SELECT '=== Test Conversions ===' as summary;
SELECT c.id, p.username, c.gold_amount, c.space_amount / 1000000000.0 as space_tokens, c.status, c.created_at
FROM gold_space_conversions c
JOIN players p ON c.player_id = p.id
WHERE p.email LIKE 'test%@example.com' OR p.email = 'whale@example.com'
ORDER BY c.created_at DESC;

SELECT '=== Daily Emissions (Last 7 Days) ===' as summary;
SELECT
    date::date,
    gameplay_rewards / 1000000000.0 as gameplay_space,
    pix_revenue24h / 100.0 as revenue_reais,
    emission_limit / 1000000000.0 as limit_space,
    emission_used / 1000000000.0 as used_space,
    executed,
    tx_hash
FROM daily_emissions
WHERE date >= NOW() - INTERVAL '7 days'
ORDER BY date DESC;

SELECT '=== Test Orders ===' as summary;
SELECT o.id, p.username, o.package_id, o.amount / 100.0 as amount_reais, o.gold_amount, o.status, o.created_at
FROM orders o
JOIN players p ON o.player_id = p.id
WHERE p.email LIKE 'test%@example.com' OR p.email = 'whale@example.com'
ORDER BY o.created_at DESC;

-- Summary stats
SELECT '=== Summary Statistics ===' as summary;
SELECT
    COUNT(DISTINCT p.id) as total_test_players,
    SUM(p.gold_balance) as total_gold,
    SUM(p.space_balance) / 1000000000.0 as total_space_tokens,
    COUNT(DISTINCT c.id) as total_conversions,
    COUNT(DISTINCT o.id) as total_orders
FROM players p
LEFT JOIN gold_space_conversions c ON p.id = c.player_id
LEFT JOIN orders o ON p.id = o.player_id
WHERE p.email LIKE 'test%@example.com' OR p.email = 'whale@example.com';

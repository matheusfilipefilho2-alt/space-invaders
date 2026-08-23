-- Verificação do Banco de Dados Blockchain
-- Cole este SQL no Supabase SQL Editor para verificar a instalação

-- 1. Verificar se todas as tabelas existem
SELECT
    'player_wallets' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'player_wallets'
UNION ALL
SELECT 'token_transactions', COUNT(*)
FROM information_schema.columns
WHERE table_name = 'token_transactions'
UNION ALL
SELECT 'nft_metadata', COUNT(*)
FROM information_schema.columns
WHERE table_name = 'nft_metadata'
UNION ALL
SELECT 'marketplace_listings', COUNT(*)
FROM information_schema.columns
WHERE table_name = 'marketplace_listings'
UNION ALL
SELECT 'marketplace_sales', COUNT(*)
FROM information_schema.columns
WHERE table_name = 'marketplace_sales'
UNION ALL
SELECT 'rate_limits', COUNT(*)
FROM information_schema.columns
WHERE table_name = 'rate_limits';

-- 2. Verificar se as funções RPC existem
SELECT
    routine_name as function_name,
    routine_type as type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'check_rate_limit',
        'withdraw_coins',
        'deposit_coins',
        'restore_item_from_nft',
        'cleanup_rate_limits'
    )
ORDER BY routine_name;

-- 3. Verificar RLS (Row Level Security)
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'player_wallets',
        'token_transactions',
        'nft_metadata',
        'marketplace_listings',
        'marketplace_sales'
    )
ORDER BY tablename;

-- 4. Verificar tipos de dados (player_id deve ser BIGINT)
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN (
    'player_wallets',
    'token_transactions',
    'nft_metadata',
    'rate_limits'
)
AND column_name = 'player_id'
ORDER BY table_name;

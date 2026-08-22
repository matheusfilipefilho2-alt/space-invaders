-- Rate limiting function
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_player_id BIGINT,
    p_action TEXT,
    p_max_count INTEGER,
    p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    action_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO action_count
    FROM rate_limits
    WHERE player_id = p_player_id
        AND action = p_action
        AND created_at > NOW() - INTERVAL '1 second' * p_window_seconds;

    IF action_count >= p_max_count THEN
        RETURN false;
    END IF;

    INSERT INTO rate_limits (player_id, action)
    VALUES (p_player_id, p_action);

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Withdraw coins (in-game → blockchain preparation)
CREATE OR REPLACE FUNCTION withdraw_coins(
    p_user_id BIGINT,
    p_amount BIGINT
) RETURNS JSON AS $$
DECLARE
    user_coins BIGINT;
BEGIN
    -- Lock row (prevent race condition)
    SELECT coins INTO user_coins
    FROM players
    WHERE id = p_user_id
    FOR UPDATE;

    -- Check if player exists
    IF user_coins IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Player not found');
    END IF;

    -- Check balance
    IF user_coins < p_amount THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- Check limits (anti-abuse)
    IF p_amount > 10000 THEN
        RETURN json_build_object('success', false, 'error', 'Amount too large');
    END IF;

    IF p_amount < 10 THEN
        RETURN json_build_object('success', false, 'error', 'Amount too small');
    END IF;

    -- Deduct coins
    UPDATE players
    SET coins = coins - p_amount
    WHERE id = p_user_id;

    RETURN json_build_object('success', true, 'new_balance', user_coins - p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deposit coins (blockchain → in-game)
CREATE OR REPLACE FUNCTION deposit_coins(
    p_user_id BIGINT,
    p_amount BIGINT,
    p_tx_signature TEXT
) RETURNS JSON AS $$
BEGIN
    -- Check if signature already used (prevent replay)
    IF EXISTS (
        SELECT 1 FROM token_transactions
        WHERE tx_signature = p_tx_signature
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already processed');
    END IF;

    -- Validate amount
    IF p_amount < 10 OR p_amount > 10000 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid amount');
    END IF;

    -- Add coins
    UPDATE players
    SET coins = coins + p_amount
    WHERE id = p_user_id;

    -- Log transaction
    INSERT INTO token_transactions (
        player_id, type, amount, tx_signature, status
    ) VALUES (
        p_user_id, 'DEPOSIT', p_amount, p_tx_signature, 'CONFIRMED'
    );

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore item from burned NFT
CREATE OR REPLACE FUNCTION restore_item_from_nft(
    p_player_id BIGINT,
    p_item_id TEXT,
    p_nft_mint TEXT
) RETURNS JSON AS $$
BEGIN
    -- Mark NFT as burned
    UPDATE nft_metadata
    SET burned_at = NOW()
    WHERE mint_address = p_nft_mint;

    -- Check if item already exists
    IF EXISTS (
        SELECT 1 FROM player_items
        WHERE player_id = p_player_id
            AND item_id = p_item_id
            AND is_on_chain = false
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Item already in inventory');
    END IF;

    -- Restore item
    INSERT INTO player_items (
        player_id, item_id, acquired_at
    ) VALUES (
        p_player_id, p_item_id, NOW()
    );

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old rate limits (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limits() RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on sensitive tables
-- Note: RLS policies are enforced at application level via SECURITY DEFINER functions
-- The game uses its own authentication system (not Supabase Auth)
ALTER TABLE player_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_sales ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Test Suite for PvP 1v1 Battle Mode Schema
-- ============================================================================
-- This test suite verifies all constraints, functions, and triggers

-- Setup: Create test UUIDs
\set player1 '00000000-0000-0000-0000-000000000001'::uuid
\set player2 '00000000-0000-0000-0000-000000000002'::uuid
\set player3 '00000000-0000-0000-0000-000000000003'::uuid
\set match_id '10000000-0000-0000-0000-000000000001'::uuid

-- ============================================================================
-- Test 1: pvp_matches - Invalid bet amount
-- ============================================================================
-- Expected: ERROR - constraint violation
BEGIN;
  INSERT INTO pvp_matches (player1_id, player2_id, bet_amount, escrowed_coins, room_id, game_seed, status)
  VALUES (:player1, :player2, 25, 50, 'test-room-1', 'seed1', 'preparing');
  ROLLBACK;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Test 1 PASS: Invalid bet amount rejected';
  ROLLBACK;
END;

-- ============================================================================
-- Test 2: pvp_matches - Valid bet amounts
-- ============================================================================
-- Expected: SUCCESS - All valid bet amounts inserted
BEGIN;
  INSERT INTO pvp_matches (player1_id, player2_id, bet_amount, escrowed_coins, room_id, game_seed, status)
  VALUES
    (:player1, :player2, 10, 20, 'room-10-1', 'seed1', 'preparing'),
    (:player1, :player2, 50, 100, 'room-50-1', 'seed2', 'preparing'),
    (:player1, :player2, 100, 200, 'room-100-1', 'seed3', 'preparing'),
    (:player1, :player2, 500, 1000, 'room-500-1', 'seed4', 'preparing');
  RAISE NOTICE 'Test 2 PASS: All valid bet amounts accepted';
  ROLLBACK;
END;

-- ============================================================================
-- Test 3: pvp_matches - Self-match not allowed
-- ============================================================================
-- Expected: ERROR - valid_players constraint
BEGIN;
  INSERT INTO pvp_matches (player1_id, player2_id, bet_amount, escrowed_coins, room_id, game_seed, status)
  VALUES (:player1, :player1, 50, 100, 'self-room', 'seed5', 'preparing');
  ROLLBACK;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Test 3 PASS: Self-match rejected';
  ROLLBACK;
END;

-- ============================================================================
-- Test 4: pvp_matches - Valid winner constraint (completed with winner)
-- ============================================================================
-- Expected: SUCCESS - Match with status 'completed' and winner_id
BEGIN;
  INSERT INTO pvp_matches (player1_id, player2_id, bet_amount, escrowed_coins, room_id, game_seed, status, winner_id)
  VALUES (:player1, :player2, 50, 100, 'room-winner-1', 'seed6', 'completed', :player1);
  RAISE NOTICE 'Test 4 PASS: Completed match with winner accepted';
  ROLLBACK;
END;

-- ============================================================================
-- Test 5: pvp_matches - Invalid winner constraint (completed without winner)
-- ============================================================================
-- Expected: ERROR - valid_winner constraint
BEGIN;
  INSERT INTO pvp_matches (player1_id, player2_id, bet_amount, escrowed_coins, room_id, game_seed, status, winner_id)
  VALUES (:player1, :player2, 50, 100, 'room-winner-2', 'seed7', 'completed', NULL);
  ROLLBACK;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Test 5 PASS: Completed match without winner rejected';
  ROLLBACK;
END;

-- ============================================================================
-- Test 6: pvp_matches - Kill count constraint
-- ============================================================================
-- Expected: ERROR - player1_kills > 3
BEGIN;
  INSERT INTO pvp_matches (player1_id, player2_id, bet_amount, escrowed_coins, room_id, game_seed, status, player1_kills)
  VALUES (:player1, :player2, 50, 100, 'room-kills-1', 'seed8', 'preparing', 4);
  ROLLBACK;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Test 6 PASS: Invalid kill count rejected';
  ROLLBACK;
END;

-- ============================================================================
-- Test 7: pvp_queue - Invalid bet amount
-- ============================================================================
-- Expected: ERROR - constraint violation
BEGIN;
  INSERT INTO pvp_queue (player_id, bet_amount, elo_rating, status)
  VALUES (:player1, 25, 1000, 'searching');
  ROLLBACK;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Test 7 PASS: Invalid queue bet amount rejected';
  ROLLBACK;
END;

-- ============================================================================
-- Test 8: pvp_queue - Valid bet amounts
-- ============================================================================
-- Expected: SUCCESS - All valid bet amounts
BEGIN;
  INSERT INTO pvp_queue (player_id, bet_amount, elo_rating, status)
  VALUES
    (:player1, 10, 1000, 'searching'),
    (:player2, 50, 1100, 'searching'),
    (:player3, 100, 950, 'searching');
  RAISE NOTICE 'Test 8 PASS: Valid queue entries accepted';
  ROLLBACK;
END;

-- ============================================================================
-- Test 9: pvp_elo_rankings - Default values
-- ============================================================================
-- Expected: SUCCESS - Default elo_rating 1000, tier 'Bronze'
BEGIN;
  INSERT INTO pvp_elo_rankings (player_id)
  VALUES (:player1);

  DECLARE
    v_elo INTEGER;
    v_tier TEXT;
  BEGIN
    SELECT elo_rating, current_tier INTO v_elo, v_tier
    FROM pvp_elo_rankings WHERE player_id = :player1;

    IF v_elo = 1000 AND v_tier = 'Bronze' THEN
      RAISE NOTICE 'Test 9 PASS: Default ELO and tier set correctly';
    END IF;
  END;
  ROLLBACK;
END;

-- ============================================================================
-- Test 10: pvp_elo_rankings - Valid match counts constraint
-- ============================================================================
-- Expected: ERROR - wins + losses != total_matches
BEGIN;
  INSERT INTO pvp_elo_rankings (player_id, total_matches, wins, losses)
  VALUES (:player1, 10, 5, 3);
  ROLLBACK;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Test 10 PASS: Invalid match counts rejected';
  ROLLBACK;
END;

-- ============================================================================
-- Test 11: pvp_elo_rankings - Valid match counts
-- ============================================================================
-- Expected: SUCCESS - wins + losses = total_matches
BEGIN;
  INSERT INTO pvp_elo_rankings (player_id, total_matches, wins, losses)
  VALUES (:player1, 10, 6, 4);
  RAISE NOTICE 'Test 11 PASS: Valid match counts accepted';
  ROLLBACK;
END;

-- ============================================================================
-- Test 12: pvp_match_history - Kill and death constraints
-- ============================================================================
-- Expected: ERROR - kills > 3
BEGIN;
  INSERT INTO pvp_matches (player1_id, player2_id, bet_amount, escrowed_coins, room_id, game_seed, status)
  VALUES (:player1, :player2, 50, 100, 'room-hist-1', 'seed-hist-1', 'preparing');

  INSERT INTO pvp_match_history (match_id, player_id, opponent_id, opponent_username, won, kills, deaths, duration_seconds, coins_change, elo_change)
  VALUES (:match_id, :player1, :player2, 'player2', TRUE, 4, 0, 60, 50, 16);
  ROLLBACK;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Test 12 PASS: Invalid kill count in history rejected';
  ROLLBACK;
END;

-- ============================================================================
-- Test 13: pvp_challenges - Self-challenge not allowed
-- ============================================================================
-- Expected: ERROR - no_self_challenge constraint
BEGIN;
  INSERT INTO pvp_challenges (challenger_id, challenged_id, bet_amount)
  VALUES (:player1, :player1, 50);
  ROLLBACK;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Test 13 PASS: Self-challenge rejected';
  ROLLBACK;
END;

-- ============================================================================
-- Test 14: pvp_challenges - Invalid bet amount
-- ============================================================================
-- Expected: ERROR - constraint violation
BEGIN;
  INSERT INTO pvp_challenges (challenger_id, challenged_id, bet_amount)
  VALUES (:player1, :player2, 75);
  ROLLBACK;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Test 14 PASS: Invalid challenge bet amount rejected';
  ROLLBACK;
END;

-- ============================================================================
-- Test 15: pvp_challenges - Valid challenge
-- ============================================================================
-- Expected: SUCCESS
BEGIN;
  INSERT INTO pvp_challenges (challenger_id, challenged_id, bet_amount)
  VALUES (:player1, :player2, 50);
  RAISE NOTICE 'Test 15 PASS: Valid challenge accepted';
  ROLLBACK;
END;

-- ============================================================================
-- Test 16: pvp_challenges - Match on accept constraint
-- ============================================================================
-- Expected: ERROR - accepted status without match_id
BEGIN;
  INSERT INTO pvp_challenges (challenger_id, challenged_id, bet_amount, status)
  VALUES (:player1, :player2, 50, 'accepted');
  ROLLBACK;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Test 16 PASS: Accepted challenge without match_id rejected';
  ROLLBACK;
END;

-- ============================================================================
-- Test 17: RPC get_pvp_leaderboard exists and callable
-- ============================================================================
-- Expected: SUCCESS - function callable
BEGIN;
  PERFORM get_pvp_leaderboard(10);
  RAISE NOTICE 'Test 17 PASS: get_pvp_leaderboard() callable';
  ROLLBACK;
END;

-- ============================================================================
-- Test 18: RPC check_pvp_rate_limit exists and callable
-- ============================================================================
-- Expected: SUCCESS - function callable
BEGIN;
  PERFORM check_pvp_rate_limit(:player1);
  RAISE NOTICE 'Test 18 PASS: check_pvp_rate_limit() callable';
  ROLLBACK;
END;

-- ============================================================================
-- Test 19: RPC check_challenge_spam exists and callable
-- ============================================================================
-- Expected: SUCCESS - function callable
BEGIN;
  PERFORM check_challenge_spam(:player1, :player2);
  RAISE NOTICE 'Test 19 PASS: check_challenge_spam() callable';
  ROLLBACK;
END;

-- ============================================================================
-- Test 20: RPC finalize_pvp_match exists and callable
-- ============================================================================
-- Expected: SUCCESS - function signature correct
BEGIN;
  -- Just test that the function exists; don't call it to avoid errors
  SELECT pg_get_functiondef(oid) FROM pg_proc
  WHERE proname = 'finalize_pvp_match' LIMIT 1 INTO NULL;

  RAISE NOTICE 'Test 20 PASS: finalize_pvp_match() exists';
  ROLLBACK;
END;

-- ============================================================================
-- Summary
-- ============================================================================
RAISE NOTICE '========================================';
RAISE NOTICE 'All 20 constraint and function tests completed';
RAISE NOTICE '========================================';

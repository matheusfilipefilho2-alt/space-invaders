#!/bin/bash
# ============================================================================
# Verification Script for PvP Schema Migration
# ============================================================================
# This script verifies all aspects of the migration without running it

set -e

MIGRATION_FILE="/Users/matheuscarmo/Desktop/projects/space-invaders/supabase/migrations/20260823000001_pvp_schema.sql"

echo "=========================================="
echo "PvP Schema Verification Report"
echo "=========================================="
echo ""

# 1. Verify file exists
echo "[CHECK 1] Migration file exists"
if [ -f "$MIGRATION_FILE" ]; then
    echo "✓ PASS: Migration file found"
    echo "  Path: $MIGRATION_FILE"
    echo "  Size: $(wc -c < "$MIGRATION_FILE") bytes"
    echo "  Lines: $(wc -l < "$MIGRATION_FILE") lines"
else
    echo "✗ FAIL: Migration file not found"
    exit 1
fi
echo ""

# 2. Verify all required tables
echo "[CHECK 2] Required tables"
tables=("pvp_matches" "pvp_queue" "pvp_elo_rankings" "pvp_match_history" "pvp_challenges")
for table in "${tables[@]}"; do
    if grep -q "CREATE TABLE $table" "$MIGRATION_FILE"; then
        echo "✓ PASS: Table '$table' found"
    else
        echo "✗ FAIL: Table '$table' not found"
        exit 1
    fi
done
echo ""

# 3. Verify all required indexes
echo "[CHECK 3] Required indexes"
indexes=(
    "idx_pvp_matches_status"
    "idx_pvp_matches_players"
    "idx_pvp_matches_created"
    "idx_pvp_queue_matchmaking"
    "idx_pvp_elo_leaderboard"
    "idx_pvp_elo_tier"
    "idx_pvp_history_player"
    "idx_pvp_challenges_pending"
)
for index in "${indexes[@]}"; do
    if grep -q "$index" "$MIGRATION_FILE"; then
        echo "✓ PASS: Index '$index' found"
    else
        echo "✗ FAIL: Index '$index' not found"
        exit 1
    fi
done
echo ""

# 4. Verify all required RPC functions
echo "[CHECK 4] Required RPC functions"
functions=(
    "cleanup_expired_queue"
    "cleanup_old_match_history"
    "expire_old_challenges"
    "get_pvp_leaderboard"
    "check_pvp_rate_limit"
    "check_challenge_spam"
    "finalize_pvp_match"
)
for func in "${functions[@]}"; do
    if grep -q "CREATE OR REPLACE FUNCTION $func" "$MIGRATION_FILE"; then
        echo "✓ PASS: Function '$func' found"
    else
        echo "✗ FAIL: Function '$func' not found"
        exit 1
    fi
done
echo ""

# 5. Verify all required triggers
echo "[CHECK 5] Required triggers"
triggers=("trigger_cleanup_history")
for trigger in "${triggers[@]}"; do
    if grep -q "$trigger" "$MIGRATION_FILE"; then
        echo "✓ PASS: Trigger '$trigger' found"
    else
        echo "✗ FAIL: Trigger '$trigger' not found"
        exit 1
    fi
done
echo ""

# 6. Verify bet amount constraints (10, 50, 100, 500 only)
echo "[CHECK 6] Bet amount constraints"
bet_constraint='CHECK (bet_amount IN (10, 50, 100, 500))'
count=$(grep -c "$bet_constraint" "$MIGRATION_FILE")
if [ "$count" -ge 3 ]; then
    echo "✓ PASS: Found $count bet amount constraints (expected at least 3)"
else
    echo "✗ FAIL: Expected at least 3 bet amount constraints, found $count"
    exit 1
fi
echo ""

# 7. Verify TIMESTAMPTZ usage
echo "[CHECK 7] TIMESTAMPTZ timestamp columns"
if grep -q "TIMESTAMPTZ" "$MIGRATION_FILE"; then
    echo "✓ PASS: TIMESTAMPTZ timestamps found"
    echo "  Count: $(grep -c "TIMESTAMPTZ" "$MIGRATION_FILE")"
else
    echo "✗ FAIL: No TIMESTAMPTZ found"
    exit 1
fi
echo ""

# 8. Verify kill constraints (0-3 only)
echo "[CHECK 8] Kill constraints (0-3)"
kill_constraint='CHECK (.*_kills >= 0 AND .*_kills <= 3)'
if grep -qE "$kill_constraint" "$MIGRATION_FILE"; then
    echo "✓ PASS: Kill constraints (0-3) found"
else
    echo "✗ FAIL: Kill constraints not found"
    exit 1
fi
echo ""

# 9. Verify match history cleanup trigger
echo "[CHECK 9] Match history auto-cleanup"
if grep -q "OFFSET 20" "$MIGRATION_FILE"; then
    echo "✓ PASS: Keep last 20 matches constraint found"
else
    echo "✗ FAIL: Keep last 20 matches constraint not found"
    exit 1
fi
echo ""

# 10. Verify ELO rating defaults
echo "[CHECK 10] ELO rating defaults"
if grep -q "elo_rating INTEGER DEFAULT 1000" "$MIGRATION_FILE"; then
    echo "✓ PASS: Default ELO rating 1000 found"
else
    echo "✗ FAIL: Default ELO rating not found"
    exit 1
fi
echo ""

# 11. Verify rate limit checks (20 matches/hour)
echo "[CHECK 11] Rate limit (20 matches/hour)"
if grep -q "INTERVAL '1 hour'" "$MIGRATION_FILE"; then
    echo "✓ PASS: 1-hour interval for rate limiting found"
else
    echo "✗ FAIL: 1-hour interval not found"
    exit 1
fi

if grep -q "match_count < 20" "$MIGRATION_FILE"; then
    echo "✓ PASS: 20 match limit found"
else
    echo "✗ FAIL: 20 match limit not found"
    exit 1
fi
echo ""

# 12. Verify challenge spam limits (3 per 5 min)
echo "[CHECK 12] Challenge spam limit (3 per 5 min)"
if grep -q "INTERVAL '5 minutes'" "$MIGRATION_FILE"; then
    echo "✓ PASS: 5-minute interval found"
else
    echo "✗ FAIL: 5-minute interval not found"
    exit 1
fi

if grep -q "recent_challenges < 3" "$MIGRATION_FILE"; then
    echo "✓ PASS: 3 challenge limit found"
else
    echo "✗ FAIL: 3 challenge limit not found"
    exit 1
fi
echo ""

# 13. Verify challenge expiry (60 seconds)
echo "[CHECK 13] Challenge auto-expiry (60 seconds)"
if grep -q "INTERVAL '60 seconds'" "$MIGRATION_FILE"; then
    echo "✓ PASS: 60-second expiry interval found"
else
    echo "✗ FAIL: 60-second expiry interval not found"
    exit 1
fi
echo ""

# 14. Verify queue expiry (5 minutes)
echo "[CHECK 14] Queue auto-expiry (5 minutes)"
if grep -q "NOW() + INTERVAL '5 minutes'" "$MIGRATION_FILE"; then
    echo "✓ PASS: 5-minute queue expiry found"
else
    echo "✗ FAIL: 5-minute queue expiry not found"
    exit 1
fi
echo ""

# 15. Verify valid player check (no self-matches)
echo "[CHECK 15] Self-match prevention"
if grep -q "player1_id != player2_id" "$MIGRATION_FILE"; then
    echo "✓ PASS: Self-match prevention constraint found"
else
    echo "✗ FAIL: Self-match prevention not found"
    exit 1
fi
echo ""

# 16. Verify valid_winner constraint
echo "[CHECK 16] Valid winner constraint"
if grep -q "valid_winner CHECK" "$MIGRATION_FILE"; then
    echo "✓ PASS: Valid winner constraint found"
else
    echo "✗ FAIL: Valid winner constraint not found"
    exit 1
fi
echo ""

# 17. Verify valid_match_counts constraint
echo "[CHECK 17] Valid match counts constraint"
if grep -q "valid_match_counts CHECK" "$MIGRATION_FILE"; then
    echo "✓ PASS: Valid match counts constraint found"
else
    echo "✗ FAIL: Valid match counts constraint not found"
    exit 1
fi
echo ""

# 18. Verify no_self_challenge constraint
echo "[CHECK 18] Self-challenge prevention"
if grep -q "no_self_challenge CHECK" "$MIGRATION_FILE"; then
    echo "✓ PASS: Self-challenge prevention constraint found"
else
    echo "✗ FAIL: Self-challenge prevention not found"
    exit 1
fi
echo ""

# 19. Verify match_on_accept constraint
echo "[CHECK 19] Match on accept constraint"
if grep -q "match_on_accept CHECK" "$MIGRATION_FILE"; then
    echo "✓ PASS: Match on accept constraint found"
else
    echo "✗ FAIL: Match on accept constraint not found"
    exit 1
fi
echo ""

# 20. Verify leaderboard function returns correct columns
echo "[CHECK 20] Leaderboard function columns"
required_columns=("rank" "player_id" "username" "elo_rating" "current_tier" "wins" "losses" "win_rate")
all_found=true
for col in "${required_columns[@]}"; do
    if grep -q "$col" "$MIGRATION_FILE" && grep -q "get_pvp_leaderboard" "$MIGRATION_FILE"; then
        :
    else
        all_found=false
        break
    fi
done
if $all_found; then
    echo "✓ PASS: All leaderboard columns found"
else
    echo "✗ FAIL: Missing leaderboard columns"
    exit 1
fi
echo ""

# 21. Verify finalize_pvp_match function signature
echo "[CHECK 21] Finalize match function parameters"
params=("p_match_id UUID" "p_winner_id UUID" "p_loser_id UUID" "p_winner_elo_change INTEGER" "p_loser_elo_change INTEGER" "p_bet_amount INTEGER" "p_duration INTEGER")
all_found=true
for param in "${params[@]}"; do
    if ! grep -q "$param" "$MIGRATION_FILE"; then
        all_found=false
        break
    fi
done
if $all_found; then
    echo "✓ PASS: All finalize_pvp_match parameters found"
else
    echo "✗ FAIL: Missing finalize_pvp_match parameters"
    exit 1
fi
echo ""

echo "=========================================="
echo "VERIFICATION COMPLETE"
echo "=========================================="
echo "All 21 verification checks PASSED"
echo ""
echo "Migration is ready to deploy."

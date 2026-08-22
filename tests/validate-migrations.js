/**
 * Migration Validation Test
 * Validates SQL migration files for syntax and consistency
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Colors for terminal output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function readMigration(filename) {
    const path = join(projectRoot, 'migrations', filename);
    return readFileSync(path, 'utf-8');
}

// Test 1: Check for UUID/BIGINT consistency
function testPlayerIdConsistency() {
    log('\n🧪 Test 1: Player ID Type Consistency', 'blue');

    const migration001 = readMigration('001_blockchain_tables.sql');
    const migration002 = readMigration('002_blockchain_rpcs.sql');

    const issues = [];

    // Check migration 001 - should use BIGINT for player_id
    if (migration001.includes('player_id UUID')) {
        issues.push('❌ Migration 001 has player_id UUID (should be BIGINT)');
    }

    // Check migration 002 - should NOT use auth.uid()
    if (migration002.includes('auth.uid()')) {
        issues.push('❌ Migration 002 uses auth.uid() (incompatible with BIGINT player_id)');
    }

    // Check for proper foreign key references
    const fkPattern = /player_id\s+BIGINT\s+REFERENCES\s+players\(id\)/gi;
    const fkMatches = (migration001.match(fkPattern) || []).length;

    if (fkMatches < 4) {
        issues.push(`⚠️ Expected at least 4 player_id foreign keys, found ${fkMatches}`);
    }

    if (issues.length === 0) {
        log('✅ All player_id types are consistent (BIGINT)', 'green');
        return true;
    } else {
        issues.forEach(issue => log(issue, 'red'));
        return false;
    }
}

// Test 2: Check function signatures
function testFunctionSignatures() {
    log('\n🧪 Test 2: RPC Function Signatures', 'blue');

    const migration002 = readMigration('002_blockchain_rpcs.sql');

    const expectedFunctions = [
        'check_rate_limit',
        'withdraw_coins',
        'deposit_coins',
        'restore_item_from_nft',
        'cleanup_rate_limits'
    ];

    const issues = [];

    expectedFunctions.forEach(funcName => {
        const pattern = new RegExp(`CREATE OR REPLACE FUNCTION ${funcName}`, 'i');
        if (!pattern.test(migration002)) {
            issues.push(`❌ Function ${funcName} not found`);
        }
    });

    // Check that functions use BIGINT parameters
    const bigintFunctions = [
        'check_rate_limit.*p_player_id BIGINT',
        'withdraw_coins.*p_user_id BIGINT',
        'deposit_coins.*p_user_id BIGINT',
        'restore_item_from_nft.*p_player_id BIGINT'
    ];

    bigintFunctions.forEach(pattern => {
        const regex = new RegExp(pattern, 'is');
        if (!regex.test(migration002)) {
            issues.push(`❌ Function parameter not using BIGINT: ${pattern.split('.*')[0]}`);
        }
    });

    if (issues.length === 0) {
        log(`✅ All ${expectedFunctions.length} functions present with correct signatures`, 'green');
        return true;
    } else {
        issues.forEach(issue => log(issue, 'red'));
        return false;
    }
}

// Test 3: Check table definitions
function testTableDefinitions() {
    log('\n🧪 Test 3: Table Definitions', 'blue');

    const migration001 = readMigration('001_blockchain_tables.sql');

    const expectedTables = [
        'player_wallets',
        'token_transactions',
        'nft_metadata',
        'marketplace_listings',
        'marketplace_sales',
        'rate_limits'
    ];

    const issues = [];

    expectedTables.forEach(tableName => {
        const pattern = new RegExp(`CREATE TABLE\\s+${tableName}`, 'i');
        if (!pattern.test(migration001)) {
            issues.push(`❌ Table ${tableName} not found`);
        }
    });

    if (issues.length === 0) {
        log(`✅ All ${expectedTables.length} tables defined`, 'green');
        return true;
    } else {
        issues.forEach(issue => log(issue, 'red'));
        return false;
    }
}

// Test 4: Check for security features
function testSecurityFeatures() {
    log('\n🧪 Test 4: Security Features', 'blue');

    const migration002 = readMigration('002_blockchain_rpcs.sql');

    const issues = [];

    // Check for SECURITY DEFINER
    const securityDefinerCount = (migration002.match(/SECURITY DEFINER/gi) || []).length;
    if (securityDefinerCount < 4) {
        issues.push(`⚠️ Expected at least 4 SECURITY DEFINER functions, found ${securityDefinerCount}`);
    }

    // Check for RLS enablement
    if (!migration002.includes('ENABLE ROW LEVEL SECURITY')) {
        issues.push('❌ Row Level Security not enabled');
    }

    // Check for FOR UPDATE locks
    if (!migration002.includes('FOR UPDATE')) {
        issues.push('⚠️ No row locks found (FOR UPDATE)');
    }

    if (issues.length === 0) {
        log('✅ Security features properly configured', 'green');
        return true;
    } else {
        issues.forEach(issue => log(issue, 'yellow'));
        return true; // Warnings, not failures
    }
}

// Test 5: Check for syntax errors (basic)
function testBasicSyntax() {
    log('\n🧪 Test 5: Basic SQL Syntax', 'blue');

    const migration001 = readMigration('001_blockchain_tables.sql');
    const migration002 = readMigration('002_blockchain_rpcs.sql');

    const issues = [];

    // Check for unbalanced parentheses
    const checkParens = (sql, name) => {
        const open = (sql.match(/\(/g) || []).length;
        const close = (sql.match(/\)/g) || []).length;
        if (open !== close) {
            issues.push(`❌ ${name}: Unbalanced parentheses (${open} open, ${close} close)`);
        }
    };

    checkParens(migration001, 'Migration 001');
    checkParens(migration002, 'Migration 002');

    // Check for common typos
    if (migration001.includes('REFERNCES')) {
        issues.push('❌ Migration 001: Typo "REFERNCES" (should be REFERENCES)');
    }

    if (migration002.includes('RETRUN')) {
        issues.push('❌ Migration 002: Typo "RETRUN" (should be RETURN)');
    }

    if (issues.length === 0) {
        log('✅ No obvious syntax errors detected', 'green');
        return true;
    } else {
        issues.forEach(issue => log(issue, 'red'));
        return false;
    }
}

// Run all tests
async function runTests() {
    log('='.repeat(60), 'blue');
    log('BLOCKCHAIN MIGRATION VALIDATION', 'blue');
    log('='.repeat(60), 'blue');

    const results = [
        testPlayerIdConsistency(),
        testFunctionSignatures(),
        testTableDefinitions(),
        testSecurityFeatures(),
        testBasicSyntax()
    ];

    const passed = results.filter(r => r).length;
    const total = results.length;

    log('\n' + '='.repeat(60), 'blue');
    if (passed === total) {
        log(`✅ ALL TESTS PASSED (${passed}/${total})`, 'green');
        log('\n✨ Migrations are ready to run in Supabase!', 'green');
        log('\nNext steps:', 'blue');
        log('1. Open Supabase Dashboard → SQL Editor');
        log('2. Run migrations/001_blockchain_tables.sql');
        log('3. Run migrations/002_blockchain_rpcs.sql');
        log('4. Verify tables exist in Table Editor');
        process.exit(0);
    } else {
        log(`❌ SOME TESTS FAILED (${passed}/${total})`, 'red');
        log('\n⚠️ Fix issues before running migrations in Supabase', 'yellow');
        process.exit(1);
    }
}

// Execute
runTests().catch(err => {
    log(`\n❌ Test runner error: ${err.message}`, 'red');
    process.exit(1);
});

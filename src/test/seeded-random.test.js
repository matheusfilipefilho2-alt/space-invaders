/**
 * SeededRandom Tests
 * Tests deterministic random number generation for PvP synchronization
 */

// Import SeededRandom class
import SeededRandom from '../pvp/SeededRandom.js';

// Test suite
console.log('Testing SeededRandom...\n');

// Test 1: Same seed produces same sequence
console.log('Test 1: Same seed produces same sequence');
try {
    const rng1 = new SeededRandom('test_seed_123');
    const rng2 = new SeededRandom('test_seed_123');

    const sequence1 = [];
    const sequence2 = [];

    for (let i = 0; i < 10; i++) {
        sequence1.push(rng1.next());
        sequence2.push(rng2.next());
    }

    // Check all values match
    let allMatch = true;
    for (let i = 0; i < sequence1.length; i++) {
        if (sequence1[i] !== sequence2[i]) {
            allMatch = false;
            break;
        }
    }

    console.assert(allMatch, 'Sequences should be identical');
    console.log('✓ PASS: Same seed produces same sequence\n');
} catch (error) {
    console.error('✗ FAIL: Same seed produces same sequence', error.message, '\n');
}

// Test 2: Different seeds produce different sequences
console.log('Test 2: Different seeds produce different sequences');
try {
    const rng1 = new SeededRandom('seed_a');
    const rng2 = new SeededRandom('seed_b');

    const val1 = rng1.next();
    const val2 = rng2.next();

    console.assert(val1 !== val2, 'Different seeds should produce different values');
    console.log('✓ PASS: Different seeds produce different sequences\n');
} catch (error) {
    console.error('✗ FAIL: Different seeds produce different sequences', error.message, '\n');
}

// Test 3: next() returns values between 0 and 1
console.log('Test 3: next() returns values between 0 and 1');
try {
    const rng = new SeededRandom('test');
    let allInRange = true;

    for (let i = 0; i < 100; i++) {
        const val = rng.next();
        if (val < 0 || val >= 1) {
            allInRange = false;
            break;
        }
    }

    console.assert(allInRange, 'All values should be between 0 and 1');
    console.log('✓ PASS: next() returns values between 0 and 1\n');
} catch (error) {
    console.error('✗ FAIL: next() returns values between 0 and 1', error.message, '\n');
}

// Test 4: nextInt() returns integers in range
console.log('Test 4: nextInt() returns integers in range');
try {
    const rng = new SeededRandom('test');
    let allInRange = true;
    let allIntegers = true;

    for (let i = 0; i < 100; i++) {
        const val = rng.nextInt(10, 20);
        if (val < 10 || val >= 20 || !Number.isInteger(val)) {
            allInRange = false;
            allIntegers = false;
            break;
        }
    }

    console.assert(allInRange, 'All values should be between 10 and 20');
    console.assert(allIntegers, 'All values should be integers');
    console.log('✓ PASS: nextInt() returns integers in range\n');
} catch (error) {
    console.error('✗ FAIL: nextInt() returns integers in range', error.message, '\n');
}

// Test 5: reset() restarts sequence
console.log('Test 5: reset() restarts sequence');
try {
    const rng = new SeededRandom('test');

    const first1 = rng.next();
    const second1 = rng.next();

    rng.reset();

    const first2 = rng.next();
    const second2 = rng.next();

    console.assert(first1 === first2, 'First value after reset should match');
    console.assert(second1 === second2, 'Second value after reset should match');
    console.log('✓ PASS: reset() restarts sequence\n');
} catch (error) {
    console.error('✗ FAIL: reset() restarts sequence', error.message, '\n');
}

// Test 6: nextFloat() returns floats in range
console.log('Test 6: nextFloat() returns floats in range');
try {
    const rng = new SeededRandom('test');
    let allInRange = true;

    for (let i = 0; i < 100; i++) {
        const val = rng.nextFloat(5.5, 10.5);
        if (val < 5.5 || val >= 10.5) {
            allInRange = false;
            break;
        }
    }

    console.assert(allInRange, 'All float values should be in range [5.5, 10.5)');
    console.log('✓ PASS: nextFloat() returns floats in range\n');
} catch (error) {
    console.error('✗ FAIL: nextFloat() returns floats in range', error.message, '\n');
}

console.log('All SeededRandom tests completed!');

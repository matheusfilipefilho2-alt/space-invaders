/**
 * PvPPlayer Tests
 * Tests PvP player behavior, power-ups, and kill tracking
 */

import PvPPlayer from '../pvp/PvPPlayer.js';

// Mock canvas
global.Image = class {
  constructor() {
    this.src = '';
  }
};

console.log('Testing PvPPlayer...\n');

// Test 1: Player initialization
console.log('Test 1: Player initialization');
try {
  const player = new PvPPlayer(800, 600, true, false);

  console.assert(player.lives === 3, 'Should start with 3 lives');
  console.assert(player.kills === 0, 'Should start with 0 kills');
  console.assert(player.deaths === 0, 'Should start with 0 deaths');
  console.assert(player.isLocal === true, 'Should be local player');
  console.assert(player.isTop === false, 'Should not be top player');
  console.assert(player.currentSkin === 'default', 'Should use default skin');

  console.log('✓ PASS: Player initialization\n');
} catch (error) {
  console.error('✗ FAIL: Player initialization', error.message, '\n');
}

// Test 2: Power-up activation
console.log('Test 2: Power-up activation');
try {
  const player = new PvPPlayer(800, 600, true, false);

  player.activatePowerUp('shield', 5000);
  console.assert(player.hasPowerUp('shield') === true, 'Shield should be active');

  player.activatePowerUp('speed', 5000);
  console.assert(player.hasPowerUp('speed') === true, 'Speed should be active');

  console.log('✓ PASS: Power-up activation\n');
} catch (error) {
  console.error('✗ FAIL: Power-up activation', error.message, '\n');
}

// Test 3: Shield absorbs hit
console.log('Test 3: Shield absorbs hit');
try {
  const player = new PvPPlayer(800, 600, true, false);

  player.activatePowerUp('shield', 5000);
  const died = player.hit();

  console.assert(died === false, 'Player should not die with shield');
  console.assert(player.lives === 3, 'Lives should remain 3');
  console.assert(player.hasPowerUp('shield') === false, 'Shield should be consumed');

  console.log('✓ PASS: Shield absorbs hit\n');
} catch (error) {
  console.error('✗ FAIL: Shield absorbs hit', error.message, '\n');
}

// Test 4: Hit reduces lives
console.log('Test 4: Hit reduces lives');
try {
  const player = new PvPPlayer(800, 600, true, false);

  const died = player.hit();
  console.assert(died === false, 'Player should not die on first hit');
  console.assert(player.lives === 2, 'Lives should be 2 after hit');
  console.assert(player.invulnerable === true, 'Should be invulnerable after hit');

  console.log('✓ PASS: Hit reduces lives\n');
} catch (error) {
  console.error('✗ FAIL: Hit reduces lives', error.message, '\n');
}

// Test 5: Three hits eliminate player
console.log('Test 5: Three hits eliminate player');
try {
  const player = new PvPPlayer(800, 600, true, false);

  player.hit(); // Lives: 2
  player.invulnerable = false; // Disable invulnerability for testing
  player.hit(); // Lives: 1
  player.invulnerable = false;
  const died = player.hit(); // Lives: 0

  console.assert(died === true, 'Player should die on third hit');
  console.assert(player.isEliminated() === true, 'Player should be eliminated');
  console.assert(player.lives === 0, 'Lives should be 0');

  console.log('✓ PASS: Three hits eliminate player\n');
} catch (error) {
  console.error('✗ FAIL: Three hits eliminate player', error.message, '\n');
}

// Test 6: Kill tracking
console.log('Test 6: Kill tracking');
try {
  const player = new PvPPlayer(800, 600, true, false);

  player.addKill();
  player.addKill();

  const stats = player.getStats();
  console.assert(stats.kills === 2, 'Should have 2 kills');

  console.log('✓ PASS: Kill tracking\n');
} catch (error) {
  console.error('✗ FAIL: Kill tracking', error.message, '\n');
}

// Test 7: Reset clears state
console.log('Test 7: Reset clears state');
try {
  const player = new PvPPlayer(800, 600, true, false);

  player.hit();
  player.addKill();
  player.activatePowerUp('shield', 5000);

  player.reset();

  console.assert(player.lives === 3, 'Lives should reset to 3');
  console.assert(player.kills === 0, 'Kills should reset to 0');
  console.assert(player.deaths === 0, 'Deaths should reset to 0');
  console.assert(player.hasPowerUp('shield') === false, 'Power-ups should be cleared');
  console.assert(player.invulnerable === false, 'Should not be invulnerable');

  console.log('✓ PASS: Reset clears state\n');
} catch (error) {
  console.error('✗ FAIL: Reset clears state', error.message, '\n');
}

console.log('All PvPPlayer tests completed!');

/**
 * PvPPhysicsSync Tests
 * Tests lockstep synchronization and checksum validation
 */

import PvPPhysicsSync from '../pvp/PvPPhysicsSync.js';

// Mock WebRTC connection
class MockConnection {
  constructor() {
    this.sentMessages = [];
    this.messageHandler = null;
  }

  send(message) {
    this.sentMessages.push(message);
  }

  onMessage(callback) {
    this.messageHandler = callback;
  }

  simulateReceive(message) {
    if (this.messageHandler) {
      this.messageHandler(message);
    }
  }
}

console.log('Testing PvPPhysicsSync...\n');

// Test 1: Input buffering
console.log('Test 1: Queue and retrieve inputs');
try {
  const conn = new MockConnection();
  const sync = new PvPPhysicsSync(conn);

  // Queue local input for frame 0
  sync.queueLocalInput({ left: false, right: true, up: false, down: false, space: false });

  // Simulate remote input for frame 0
  conn.simulateReceive({
    type: 'input',
    data: { left: true, right: false, up: false, down: false, space: false, frame: 0 }
  });

  // Should be able to get inputs for frame 0
  const inputs = sync.getInputsForFrame();
  console.assert(inputs !== null, 'Should have inputs for frame 0');
  console.assert(inputs.local.right === true, 'Local input should have right=true');
  console.assert(inputs.remote.left === true, 'Remote input should have left=true');

  console.log('✓ PASS: Input buffering works\n');
} catch (error) {
  console.error('✗ FAIL: Input buffering', error.message, '\n');
}

// Test 2: Waiting for remote input
console.log('Test 2: Wait for remote input');
try {
  const conn = new MockConnection();
  const sync = new PvPPhysicsSync(conn);

  sync.queueLocalInput({ left: false, right: true, up: false, down: false, space: false });

  // Try to get inputs without remote input available
  const inputs = sync.getInputsForFrame();
  console.assert(inputs === null, 'Should return null when waiting for remote');

  console.log('✓ PASS: Correctly waits for remote input\n');
} catch (error) {
  console.error('✗ FAIL: Waiting for remote input', error.message, '\n');
}

// Test 3: Checksum calculation
console.log('Test 3: Checksum calculation is deterministic');
try {
  const conn = new MockConnection();
  const sync = new PvPPhysicsSync(conn);

  const state = {
    player1: { x: 100, y: 200, lives: 3 },
    player2: { x: 300, y: 400, lives: 3 },
    projectiles: [1, 2, 3],
    meteors: [1],
    aliens: []
  };

  const checksum1 = sync.calculateChecksum(state);
  const checksum2 = sync.calculateChecksum(state);

  console.assert(checksum1 === checksum2, 'Same state should produce same checksum');

  // Different state should produce different checksum
  state.player1.x = 101;
  const checksum3 = sync.calculateChecksum(state);
  console.assert(checksum1 !== checksum3, 'Different state should produce different checksum');

  console.log('✓ PASS: Checksum calculation is deterministic\n');
} catch (error) {
  console.error('✗ FAIL: Checksum calculation', error.message, '\n');
}

// Test 4: Desync detection
console.log('Test 4: Desync detection and counting');
try {
  const conn = new MockConnection();
  const sync = new PvPPhysicsSync(conn);

  let desyncCount = 0;
  sync.onDesync((reason) => {
    desyncCount++;
  });

  // Simulate receiving different checksum
  conn.simulateReceive({
    type: 'checksum',
    data: { frame: 60, checksum: 'abc123' }
  });

  // Check with different local checksum
  const matches = sync.checksumMatches('xyz789');
  console.assert(!matches, 'Should detect checksum mismatch');
  console.assert(desyncCount === 1, 'Should trigger desync callback');
  console.assert(sync.consecutiveDesyncs === 1, 'Should increment desync counter');

  console.log('✓ PASS: Desync detection works\n');
} catch (error) {
  console.error('✗ FAIL: Desync detection', error.message, '\n');
}

// Test 5: Frame advancement
console.log('Test 5: Frame advancement');
try {
  const conn = new MockConnection();
  const sync = new PvPPhysicsSync(conn);

  console.assert(sync.currentFrame === 0, 'Should start at frame 0');
  sync.advanceFrame();
  console.assert(sync.currentFrame === 1, 'Should advance to frame 1');

  console.log('✓ PASS: Frame advancement works\n');
} catch (error) {
  console.error('✗ FAIL: Frame advancement', error.message, '\n');
}

console.log('All PvPPhysicsSync tests completed!');

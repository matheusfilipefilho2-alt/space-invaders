/**
 * PvPPhysicsSync - Deterministic Lockstep Synchronization
 *
 * Manages input buffering and checksum validation for synchronized PvP gameplay.
 *
 * Architecture:
 * - Sends only inputs via WebRTC (not positions/state)
 * - Buffers inputs for 3 frames to handle network jitter
 * - Validates state checksums every 60 frames (1 second at 60 FPS)
 * - Reconciles divergences when detected
 */

const INPUT_BUFFER_SIZE = 3; // Frames to buffer
const CHECKSUM_INTERVAL = 60; // Frames between checksums
const MAX_CONSECUTIVE_DESYNCS = 3;

class PvPPhysicsSync {
  /**
   * @param {WebRTCConnection} connection - WebRTC connection for P2P communication
   */
  constructor(connection) {
    this.connection = connection;

    // Input buffering
    this.localInputBuffer = [];
    this.remoteInputBuffer = [];
    this.currentFrame = 0;

    // Checksum validation
    this.checksumCounter = 0;
    this.consecutiveDesyncs = 0;
    this.lastReceivedChecksum = null;

    // Callbacks
    this.onDesyncCallback = null;
    this.onResyncCallback = null;

    // Setup message handler
    this.connection.onMessage((message) => {
      this.handleMessage(message);
    });
  }

  /**
   * Queue local player input for next frame
   * @param {object} input - Input state { left, right, up, down, space, frame }
   */
  queueLocalInput(input) {
    const inputWithFrame = {
      ...input,
      frame: this.currentFrame
    };

    this.localInputBuffer.push(inputWithFrame);

    // Send to remote peer
    console.log('[PhysicsSync] Sending input for frame', this.currentFrame);
    this.connection.send({
      type: 'input',
      data: inputWithFrame
    });
  }

  /**
   * Get synchronized inputs for current frame
   * Waits for both local and remote inputs to be available
   * @returns {object|null} { local, remote } or null if waiting
   */
  getInputsForFrame() {
    // Check if we have both inputs for current frame
    const localInput = this.localInputBuffer.find(i => i.frame === this.currentFrame);
    const remoteInput = this.remoteInputBuffer.find(i => i.frame === this.currentFrame);

    if (!localInput || !remoteInput) {
      // Still waiting for inputs
      console.log(`[PhysicsSync] Waiting for frame ${this.currentFrame}: local=${!!localInput}, remote=${!!remoteInput}`);
      console.log(`[PhysicsSync] Buffer status:`, this.getBufferStatus());
      return null;
    }

    // Remove consumed inputs
    this.localInputBuffer = this.localInputBuffer.filter(i => i.frame > this.currentFrame);
    this.remoteInputBuffer = this.remoteInputBuffer.filter(i => i.frame > this.currentFrame);

    return { local: localInput, remote: remoteInput };
  }

  /**
   * Advance to next frame
   */
  advanceFrame() {
    this.currentFrame++;
    this.checksumCounter++;
  }

  /**
   * Send state checksum for validation
   * Call every 60 frames (1 second)
   * @param {object} state - Game state to checksum
   */
  sendChecksum(state) {
    if (this.checksumCounter < CHECKSUM_INTERVAL) {
      return; // Not time yet
    }

    const checksum = this.calculateChecksum(state);

    this.connection.send({
      type: 'checksum',
      data: {
        frame: this.currentFrame,
        checksum
      }
    });

    this.checksumCounter = 0;
  }

  /**
   * Calculate checksum from game state
   * @param {object} state - Game state with player positions, projectiles, etc.
   * @returns {string} Checksum string
   */
  calculateChecksum(state) {
    // Simple checksum: concatenate key values and hash
    const values = [
      Math.floor(state.player1.x * 100),
      Math.floor(state.player1.y * 100),
      Math.floor(state.player2.x * 100),
      Math.floor(state.player2.y * 100),
      state.player1.lives,
      state.player2.lives,
      state.projectiles.length,
      state.meteors.length,
      state.aliens.length
    ];

    return this.hashValues(values);
  }

  /**
   * Simple hash function for checksums
   * @param {array} values - Array of numbers to hash
   * @returns {string} Hash string
   */
  hashValues(values) {
    let hash = 0;
    const str = values.join(',');

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Handle incoming messages from remote peer
   * @param {object} message - Message from WebRTC
   */
  handleMessage(message) {
    console.log('[PhysicsSync] Received message:', message.type, message.data);
    switch (message.type) {
      case 'input':
        this.remoteInputBuffer.push(message.data);
        console.log('[PhysicsSync] Remote input buffered, buffer size:', this.remoteInputBuffer.length);
        break;

      case 'checksum':
        this.validateChecksum(message.data);
        break;

      case 'resync':
        this.handleResync(message.data);
        break;

      default:
        console.log('[PhysicsSync] Unknown message type:', message.type);
    }
  }

  /**
   * Validate received checksum against local state
   * @param {object} data - { frame, checksum }
   */
  validateChecksum(data) {
    this.lastReceivedChecksum = data;

    // Note: Actual validation happens in game engine when it has the state
    // This just stores the received checksum for later validation
  }

  /**
   * Check if checksum matches
   * @param {string} localChecksum - Locally calculated checksum
   * @returns {boolean} True if checksums match
   */
  checksumMatches(localChecksum) {
    if (!this.lastReceivedChecksum) {
      return true; // No remote checksum yet
    }

    const matches = localChecksum === this.lastReceivedChecksum.checksum;

    if (!matches) {
      this.consecutiveDesyncs++;
      console.warn(`[PhysicsSync] Desync detected! (${this.consecutiveDesyncs}/${MAX_CONSECUTIVE_DESYNCS})`);

      if (this.consecutiveDesyncs >= MAX_CONSECUTIVE_DESYNCS) {
        console.error('[PhysicsSync] Too many consecutive desyncs - declaring draw');
        if (this.onDesyncCallback) {
          this.onDesyncCallback('too_many_desyncs');
        }
      } else {
        // Trigger reconciliation
        if (this.onDesyncCallback) {
          this.onDesyncCallback('checksum_mismatch');
        }
      }
    } else {
      // Reset desync counter on successful match
      this.consecutiveDesyncs = 0;
    }

    return matches;
  }

  /**
   * Handle resync request from peer
   * @param {object} data - Resync data from peer
   */
  handleResync(data) {
    console.log('[PhysicsSync] Received resync request');
    if (this.onResyncCallback) {
      this.onResyncCallback(data);
    }
  }

  /**
   * Request resynchronization
   * @param {object} state - Current game state
   */
  requestResync(state) {
    console.log('[PhysicsSync] Requesting resync');
    this.connection.send({
      type: 'resync',
      data: {
        frame: this.currentFrame,
        state: state
      }
    });
  }

  /**
   * Register callback for desync events
   * @param {function} callback - Callback(reason)
   */
  onDesync(callback) {
    this.onDesyncCallback = callback;
  }

  /**
   * Register callback for resync events
   * @param {function} callback - Callback(data)
   */
  onResync(callback) {
    this.onResyncCallback = callback;
  }

  /**
   * Reset synchronization state
   */
  reset() {
    this.localInputBuffer = [];
    this.remoteInputBuffer = [];
    this.currentFrame = 0;
    this.checksumCounter = 0;
    this.consecutiveDesyncs = 0;
    this.lastReceivedChecksum = null;
  }

  /**
   * Get buffer status for debugging
   * @returns {object} Buffer sizes
   */
  getBufferStatus() {
    return {
      localInputs: this.localInputBuffer.length,
      remoteInputs: this.remoteInputBuffer.length,
      currentFrame: this.currentFrame,
      consecutiveDesyncs: this.consecutiveDesyncs
    };
  }
}

export default PvPPhysicsSync;

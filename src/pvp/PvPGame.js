import WebRTCConnection from './WebRTCConnection.js';
import PvPPhysicsSync from './PvPPhysicsSync.js';
import SeededRandom from './SeededRandom.js';
import PvPPlayer from './PvPPlayer.js';

/**
 * PvPGame - Main PvP Game Engine
 *
 * Manages the complete PvP match:
 * - Deterministic lockstep game loop at 60 FPS
 * - Meteor/alien spawning with shared RNG seed
 * - Power-up spawning every 10 seconds
 * - Sudden death after 5 minutes
 * - Kill detection and win condition (3 kills)
 * - Dual perspective rendering (local bottom, remote top)
 */

const FPS = 60;
const FRAME_TIME = 1000 / FPS;
const SUDDEN_DEATH_TIME = 5 * 60 * 1000; // 5 minutes
const POWER_UP_SPAWN_INTERVAL = 10 * 1000; // 10 seconds

class PvPGame {
  /**
   * @param {string} matchId - Match/room ID for WebRTC
   * @param {boolean} isOfferer - True if this client creates WebRTC offer
   * @param {string} gameSeed - Shared RNG seed for determinism
   * @param {string} canvasId - Canvas element ID
   */
  constructor(matchId, isOfferer, gameSeed, canvasId) {
    this.matchId = matchId;
    this.isOfferer = isOfferer;

    // Initialize canvas
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    // Initialize components
    this.connection = null;
    this.physicsSync = null;
    this.rng = new SeededRandom(gameSeed);

    // Initialize players
    this.localPlayer = new PvPPlayer(this.canvas.width, this.canvas.height, true, false);
    this.remotePlayer = new PvPPlayer(this.canvas.width, this.canvas.height, false, true);

    // Game state
    this.running = false;
    this.gameStartTime = 0;
    this.lastFrameTime = 0;
    this.lastPowerUpSpawn = 0;
    this.suddenDeathActive = false;

    // Entities
    this.meteors = [];
    this.aliens = [];
    this.powerUps = [];
    this.projectiles = [];

    // Input state
    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false,
      space: false
    };

    // Match result
    this.winner = null;
    this.matchEndReason = null;

    // Setup input listeners
    this.setupInputListeners();
  }

  /**
   * Initialize and start the match
   */
  async start() {
    console.log('[PvPGame] Starting match...');

    // Initialize WebRTC connection
    this.connection = new WebRTCConnection(this.matchId, this.isOfferer);

    try {
      await this.connection.initialize();
      console.log('[PvPGame] WebRTC connected');
    } catch (error) {
      console.error('[PvPGame] WebRTC connection failed:', error);
      this.endMatch('connection_failed', null);
      return;
    }

    // Initialize physics sync
    this.physicsSync = new PvPPhysicsSync(this.connection);

    // Handle connection loss
    this.connection.onDisconnect(() => {
      console.log('[PvPGame] Connection lost');
      this.endMatch('disconnected', null);
    });

    // Handle desyncs
    this.physicsSync.onDesync((reason) => {
      if (reason === 'too_many_desyncs') {
        this.endMatch('desync', null);
      }
    });

    // Wait for both players to be ready
    await this.waitForStart();

    // Start game loop
    this.running = true;
    this.gameStartTime = Date.now();
    this.lastFrameTime = this.gameStartTime;
    this.lastPowerUpSpawn = this.gameStartTime;

    this.gameLoop();
  }

  /**
   * Wait for both players to signal ready
   */
  async waitForStart() {
    return new Promise((resolve) => {
      // Send ready signal
      this.connection.send({ type: 'ready' });

      let remoteReady = false;

      const checkReady = () => {
        if (remoteReady) {
          resolve();
        }
      };

      // Listen for remote ready
      this.connection.onMessage((message) => {
        if (message.type === 'ready') {
          remoteReady = true;
          checkReady();
        }
      });

      checkReady();
    });
  }

  /**
   * Main game loop (60 FPS lockstep)
   */
  gameLoop() {
    if (!this.running) return;

    const now = Date.now();
    const deltaTime = now - this.lastFrameTime;

    // Maintain 60 FPS
    if (deltaTime >= FRAME_TIME) {
      this.update(deltaTime);
      this.render();
      this.lastFrameTime = now;
    }

    requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * Update game state
   */
  update(deltaTime) {
    // Queue local input
    this.physicsSync.queueLocalInput(this.keys);

    // Get synchronized inputs
    const inputs = this.physicsSync.getInputsForFrame();
    if (!inputs) {
      // Waiting for remote input
      return;
    }

    // Update players with synchronized inputs
    this.updatePlayer(this.localPlayer, inputs.local, deltaTime);
    this.updatePlayer(this.remotePlayer, inputs.remote, deltaTime);

    // Update entities
    this.updateMeteors(deltaTime);
    this.updateAliens(deltaTime);
    this.updateProjectiles(deltaTime);
    this.updatePowerUps(deltaTime);

    // Spawn entities (deterministic)
    this.spawnEntities();

    // Spawn power-ups (timed)
    this.spawnPowerUps();

    // Check collisions
    this.checkCollisions();

    // Check win condition
    this.checkWinCondition();

    // Check sudden death
    this.checkSuddenDeath();

    // Send checksum
    this.physicsSync.sendChecksum(this.getGameState());

    // Advance frame
    this.physicsSync.advanceFrame();
  }

  /**
   * Update player with input
   */
  updatePlayer(player, input, deltaTime) {
    if (input.left) player.moveLeft();
    if (input.right) player.moveRight();

    player.update(deltaTime);
  }

  /**
   * Spawn meteors and aliens (deterministic)
   */
  spawnEntities() {
    // Spawn meteor every 2 seconds (120 frames)
    if (this.physicsSync.currentFrame % 120 === 0) {
      const x = this.rng.nextInt(0, this.canvas.width);
      this.meteors.push({ x, y: -50, speed: 2 });
    }

    // Spawn alien every 3 seconds (180 frames)
    if (this.physicsSync.currentFrame % 180 === 0) {
      const x = this.rng.nextInt(0, this.canvas.width);
      this.aliens.push({ x, y: -50, speed: 1.5 });
    }
  }

  /**
   * Spawn power-ups (time-based)
   */
  spawnPowerUps() {
    const now = Date.now();
    if (now - this.lastPowerUpSpawn >= POWER_UP_SPAWN_INTERVAL) {
      const types = ['shield', 'speed', 'tripleShot'];
      const type = types[this.rng.nextInt(0, types.length)];
      const x = this.rng.nextInt(50, this.canvas.width - 50);

      this.powerUps.push({ type, x, y: this.canvas.height / 2, collected: false });
      this.lastPowerUpSpawn = now;
    }
  }

  /**
   * Update meteors
   */
  updateMeteors(deltaTime) {
    this.meteors.forEach(meteor => {
      meteor.y += meteor.speed;
    });

    // Remove off-screen meteors
    this.meteors = this.meteors.filter(m => m.y < this.canvas.height + 50);
  }

  /**
   * Update aliens
   */
  updateAliens(deltaTime) {
    this.aliens.forEach(alien => {
      alien.y += alien.speed;
    });

    // Remove off-screen aliens
    this.aliens = this.aliens.filter(a => a.y < this.canvas.height + 50);
  }

  /**
   * Update projectiles
   */
  updateProjectiles(deltaTime) {
    this.projectiles.forEach(proj => {
      proj.y += proj.speed;
    });

    // Remove off-screen projectiles
    this.projectiles = this.projectiles.filter(p => p.y > -50 && p.y < this.canvas.height + 50);
  }

  /**
   * Update power-ups
   */
  updatePowerUps(deltaTime) {
    // Power-ups just exist at fixed positions
    // Remove after 10 seconds
    this.powerUps = this.powerUps.filter(p => !p.collected);
  }

  /**
   * Check all collisions
   */
  checkCollisions() {
    // TODO: Implement collision detection between:
    // - Players and meteors
    // - Players and aliens
    // - Players and power-ups
    // - Projectiles and players
    // - Projectiles and meteors
    // - Projectiles and aliens
  }

  /**
   * Check win condition (3 kills)
   */
  checkWinCondition() {
    if (this.localPlayer.kills >= 3) {
      this.endMatch('victory', 'local');
    } else if (this.remotePlayer.kills >= 3) {
      this.endMatch('victory', 'remote');
    } else if (this.localPlayer.isEliminated()) {
      this.endMatch('elimination', 'remote');
    } else if (this.remotePlayer.isEliminated()) {
      this.endMatch('elimination', 'local');
    }
  }

  /**
   * Check sudden death (5 minutes)
   */
  checkSuddenDeath() {
    const elapsed = Date.now() - this.gameStartTime;
    if (elapsed >= SUDDEN_DEATH_TIME && !this.suddenDeathActive) {
      this.suddenDeathActive = true;
      console.log('[PvPGame] Sudden death activated!');
      // Increase spawn rates
    }
  }

  /**
   * Get current game state for checksum
   */
  getGameState() {
    return {
      player1: { x: this.localPlayer.position.x, y: this.localPlayer.position.y, lives: this.localPlayer.lives },
      player2: { x: this.remotePlayer.position.x, y: this.remotePlayer.position.y, lives: this.remotePlayer.lives },
      projectiles: this.projectiles,
      meteors: this.meteors,
      aliens: this.aliens
    };
  }

  /**
   * Render game
   */
  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw local player (bottom)
    this.localPlayer.draw(this.ctx);

    // Draw remote player (top, rotated)
    this.remotePlayer.draw(this.ctx);

    // Draw entities
    this.meteors.forEach(m => {
      this.ctx.fillStyle = '#888';
      this.ctx.fillRect(m.x, m.y, 30, 30);
    });

    this.aliens.forEach(a => {
      this.ctx.fillStyle = '#0F0';
      this.ctx.fillRect(a.x, a.y, 40, 40);
    });

    this.powerUps.forEach(p => {
      this.ctx.fillStyle = '#FF0';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // Draw UI
    this.drawUI();
  }

  /**
   * Draw UI elements
   */
  drawUI() {
    this.ctx.fillStyle = '#FFF';
    this.ctx.font = '20px Arial';
    this.ctx.fillText(`Lives: ${this.localPlayer.lives}`, 10, 30);
    this.ctx.fillText(`Kills: ${this.localPlayer.kills}`, 10, 60);
    this.ctx.fillText(`Enemy Lives: ${this.remotePlayer.lives}`, 10, this.canvas.height - 40);

    if (this.suddenDeathActive) {
      this.ctx.fillStyle = '#F00';
      this.ctx.font = '30px Arial';
      this.ctx.fillText('SUDDEN DEATH', this.canvas.width / 2 - 100, 50);
    }
  }

  /**
   * Setup keyboard input listeners
   */
  setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.keys.left = true;
      if (e.key === 'ArrowRight') this.keys.right = true;
      if (e.key === 'ArrowUp') this.keys.up = true;
      if (e.key === 'ArrowDown') this.keys.down = true;
      if (e.key === ' ') this.keys.space = true;
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft') this.keys.left = false;
      if (e.key === 'ArrowRight') this.keys.right = false;
      if (e.key === 'ArrowUp') this.keys.up = false;
      if (e.key === 'ArrowDown') this.keys.down = false;
      if (e.key === ' ') this.keys.space = false;
    });
  }

  /**
   * End match
   */
  endMatch(reason, winner) {
    this.running = false;
    this.matchEndReason = reason;
    this.winner = winner;

    console.log(`[PvPGame] Match ended: ${reason}, winner: ${winner}`);

    // Close connections
    if (this.connection) {
      this.connection.close();
    }

    // TODO: Report result to backend
  }

  /**
   * Stop game
   */
  stop() {
    this.running = false;
    if (this.connection) {
      this.connection.close();
    }
  }
}

export default PvPGame;

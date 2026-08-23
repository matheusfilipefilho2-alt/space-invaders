import Player from '../classes/player.js';

/**
 * PvPPlayer - Player entity for PvP matches
 *
 * Extends base Player class with PvP-specific features:
 * - Lives system (3 lives per player)
 * - Kill tracking
 * - Power-up system (shield, speed, triple-shot)
 * - Respawn mechanics with invulnerability
 * - Removes single-player features (skins, rainbow trail)
 */

class PvPPlayer extends Player {
  /**
   * @param {number} canvasWidth - Canvas width
   * @param {number} canvasHeight - Canvas height
   * @param {boolean} isLocal - True if this is the local player
   * @param {boolean} isTop - True if player is positioned at top (remote player)
   */
  constructor(canvasWidth, canvasHeight, isLocal, isTop = false) {
    super(canvasWidth, canvasHeight);

    // PvP specific properties
    this.isLocal = isLocal;
    this.isTop = isTop;
    this.kills = 0;
    this.deaths = 0;

    // Override lives for PvP (3 lives per player)
    this.lives = 3;
    this.maxLives = 3;

    // Power-ups
    this.powerUps = {
      shield: { active: false, duration: 0 },
      speed: { active: false, duration: 0, multiplier: 1.5 },
      tripleShot: { active: false, duration: 0 }
    };

    // Position player
    if (isTop) {
      // Remote player at top (rotated 180 degrees)
      this.position.y = 30;
      this.rotation = Math.PI; // 180 degrees
    } else {
      // Local player at bottom (normal orientation)
      this.position.y = canvasHeight - this.height - 30;
      this.rotation = 0;
    }

    // Disable single-player features
    this.trailEnabled = false;
    this.rainbowTrail.setActive(false);
    this.goldenShipEnabled = false;
    this.currentSkin = 'default'; // Force default skin in PvP
  }

  /**
   * Update player state (called every frame)
   * @param {number} deltaTime - Time since last frame in ms
   */
  update(deltaTime) {
    // Update invulnerability
    if (this.invulnerable) {
      this.invulnerabilityTime -= deltaTime;
      if (this.invulnerabilityTime <= 0) {
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
      }
    }

    // Update power-ups
    this.updatePowerUps(deltaTime);
  }

  /**
   * Update power-up durations
   * @param {number} deltaTime - Time since last frame in ms
   */
  updatePowerUps(deltaTime) {
    for (const powerUpType in this.powerUps) {
      const powerUp = this.powerUps[powerUpType];
      if (powerUp.active) {
        powerUp.duration -= deltaTime;
        if (powerUp.duration <= 0) {
          this.deactivatePowerUp(powerUpType);
        }
      }
    }
  }

  /**
   * Activate a power-up
   * @param {string} type - Power-up type ('shield', 'speed', 'tripleShot')
   * @param {number} duration - Duration in milliseconds
   */
  activatePowerUp(type, duration = 5000) {
    if (!this.powerUps[type]) {
      console.warn(`Unknown power-up type: ${type}`);
      return;
    }

    this.powerUps[type].active = true;
    this.powerUps[type].duration = duration;

    // Apply power-up effects
    if (type === 'speed') {
      this.velocity *= this.powerUps.speed.multiplier;
    }

    console.log(`[PvPPlayer] Activated power-up: ${type} for ${duration}ms`);
  }

  /**
   * Deactivate a power-up
   * @param {string} type - Power-up type
   */
  deactivatePowerUp(type) {
    if (!this.powerUps[type] || !this.powerUps[type].active) {
      return;
    }

    this.powerUps[type].active = false;
    this.powerUps[type].duration = 0;

    // Remove power-up effects
    if (type === 'speed') {
      this.velocity /= this.powerUps.speed.multiplier;
    }

    console.log(`[PvPPlayer] Deactivated power-up: ${type}`);
  }

  /**
   * Check if player has active power-up
   * @param {string} type - Power-up type
   * @returns {boolean} True if power-up is active
   */
  hasPowerUp(type) {
    return this.powerUps[type]?.active || false;
  }

  /**
   * Handle being hit (by projectile or meteor)
   * @returns {boolean} True if player died
   */
  hit() {
    // Check invulnerability
    if (this.invulnerable) {
      return false;
    }

    // Check shield power-up
    if (this.hasPowerUp('shield')) {
      this.deactivatePowerUp('shield');
      console.log('[PvPPlayer] Shield absorbed hit!');
      return false;
    }

    // Take damage
    this.lives--;
    this.deaths++;

    if (this.lives <= 0) {
      this.alive = false;
      console.log('[PvPPlayer] Player eliminated!');
      return true; // Player died
    }

    // Trigger invulnerability
    this.respawn();
    return false; // Player survived
  }

  /**
   * Respawn player after being hit
   */
  respawn() {
    this.invulnerable = true;
    this.invulnerabilityTime = this.invulnerabilityDuration;
    console.log('[PvPPlayer] Respawned with invulnerability');
  }

  /**
   * Register a kill
   */
  addKill() {
    this.kills++;
    console.log(`[PvPPlayer] Kill count: ${this.kills}`);
  }

  /**
   * Get kill/death stats
   * @returns {object} { kills, deaths }
   */
  getStats() {
    return {
      kills: this.kills,
      deaths: this.deaths,
      lives: this.lives
    };
  }

  /**
   * Check if player is eliminated (out of lives)
   * @returns {boolean} True if eliminated
   */
  isEliminated() {
    return !this.alive || this.lives <= 0;
  }

  /**
   * Reset player state for new match
   */
  reset() {
    this.alive = true;
    this.lives = this.maxLives;
    this.kills = 0;
    this.deaths = 0;
    this.invulnerable = false;
    this.invulnerabilityTime = 0;

    // Clear all power-ups
    for (const type in this.powerUps) {
      this.deactivatePowerUp(type);
    }
  }

  /**
   * Draw player on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  draw(ctx) {
    ctx.save();

    // Apply rotation for top player
    if (this.isTop) {
      ctx.translate(this.position.x + this.width / 2, this.position.y + this.height / 2);
      ctx.rotate(this.rotation);
      ctx.translate(-(this.position.x + this.width / 2), -(this.position.y + this.height / 2));
    }

    // Draw invulnerability effect (flashing)
    if (this.invulnerable) {
      const flashInterval = 200; // Flash every 200ms
      const shouldShow = Math.floor(this.invulnerabilityTime / flashInterval) % 2 === 0;
      if (!shouldShow) {
        ctx.restore();
        return; // Skip drawing to create flashing effect
      }
      ctx.globalAlpha = 0.7;
    }

    // Draw shield power-up effect
    if (this.hasPowerUp('shield')) {
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        this.position.x + this.width / 2,
        this.position.y + this.height / 2,
        this.width / 2 + 5,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    // Draw player ship
    const skinImage = this.getCurrentSkinImage();
    ctx.drawImage(
      skinImage,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    );

    ctx.restore();
  }
}

export default PvPPlayer;

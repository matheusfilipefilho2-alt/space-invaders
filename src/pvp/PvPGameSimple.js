import WebRTCConnection from './WebRTCConnection.js';
import Player from '../classes/player.js';
import Grid from '../classes/Grid.js';
import Star from '../classes/Star.js';
import Particle from '../classes/Particle.js';
import Projectile from '../classes/Projectile.js';

/**
 * PvPGame - Versão Simplificada que FUNCIONA
 *
 * Sem sincronização complexa - apenas compartilha estados
 * Cada jogador roda sua própria simulação e sincroniza posições
 */

const FPS = 60;
const FRAME_TIME = 1000 / FPS;

class PvPGameSimple {
  constructor(matchId, isOfferer, gameSeed, canvasId) {
    this.matchId = matchId;
    this.isOfferer = isOfferer;

    // Initialize canvas
    this.canvas = document.getElementById(canvasId);
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // WebRTC
    this.connection = null;

    // Players - positioned top and bottom
    this.localPlayer = new Player(this.canvas.width, this.canvas.height);
    this.remotePlayer = new Player(this.canvas.width, this.canvas.height);

    // Local player at BOTTOM (normal)
    this.localPlayer.position.x = this.canvas.width / 2 - this.localPlayer.width / 2;
    this.localPlayer.position.y = this.canvas.height - this.localPlayer.height - 30;

    // Remote player at TOP (rotated 180)
    this.remotePlayer.position.x = this.canvas.width / 2 - this.remotePlayer.width / 2;
    this.remotePlayer.position.y = 30;

    // Game entities (ORIGINAL CLASSES)
    this.grid = new Grid(5, 4); // Smaller grid for PvP - SHARED between players
    this.gridOffsetX = 0; // Will be calculated after canvas is sized
    this.gridOffsetY = 0;
    this.particles = [];
    this.projectiles = []; // Local player projectiles
    this.remoteProjectiles = []; // Remote player projectiles
    this.stars = [];

    // Game state
    this.running = false;
    this.score = 0;
    this.level = 1;
    this.playerKills = 0; // Only count player eliminations
    this.remotePlayerKills = 0; // Only count player eliminations
    this.alienKills = 0; // Separate counter for aliens (doesn't affect win)
    this.startTime = 0;

    // Input
    this.keys = {
      left: false,
      right: false,
      space: false
    };

    // Shooting cooldown
    this.canShoot = true;
    this.shootCooldown = 500; // ms

    // Calculate grid offset to center it
    // Grid is approximately 4 cols * 50px wide = 200px, 5 rows * 37px tall = 185px
    this.gridOffsetX = (this.canvas.width / 2) - 100;
    this.gridOffsetY = (this.canvas.height / 2) - 120;

    // Init
    this.initStars();
    this.setupInput();
  }

  initStars() {
    for (let i = 0; i < 200; i++) {
      this.stars.push(new Star(this.canvas.width, this.canvas.height));
    }
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.keys.left = true;
      if (e.key === 'ArrowRight') this.keys.right = true;
      if (e.key === ' ') {
        e.preventDefault(); // Prevent page scroll
        console.log('[PvPGame] SPACE pressed, canShoot:', this.canShoot);
        this.keys.space = true;
        if (this.canShoot) {
          this.shoot();
          this.canShoot = false;
          setTimeout(() => this.canShoot = true, this.shootCooldown);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft') this.keys.left = false;
      if (e.key === 'ArrowRight') this.keys.right = false;
      if (e.key === ' ') this.keys.space = false;
    });
  }

  shoot() {
    // Shoot vertically upward (towards center/aliens)
    const projectile = new Projectile(
      {
        x: this.localPlayer.position.x + this.localPlayer.width / 2 - 2,
        y: this.localPlayer.position.y
      },
      -10 // Vertical shot upward (negative Y = up)
    );
    this.projectiles.push(projectile);
    console.log('[PvPGame] Shot fired!', this.projectiles.length, 'total projectiles');

    // Send projectile creation event to remote (they'll create it from their view of our position)
    if (this.connection) {
      this.connection.send({
        type: 'projectile',
        data: { shot: true }
      });
    }
  }

  async start() {
    console.log('[PvPGame] Starting match...');

    // Initialize WebRTC
    this.connection = new WebRTCConnection(this.matchId, this.isOfferer);

    try {
      await this.connection.initialize();
      console.log('[PvPGame] WebRTC connected');

      // Handle disconnect (but keep game running)
      this.connection.onDisconnect(() => {
        console.warn('[PvPGame] Connection lost - continuing anyway');
      });

      // Try to wait for ready, but don't block forever
      const readyPromise = this.waitForReady();
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds max

      await Promise.race([readyPromise, timeoutPromise]);
      console.log('[PvPGame] Starting game (ready or timeout)');
    } catch (error) {
      console.error('[PvPGame] WebRTC failed:', error);
      console.log('[PvPGame] Starting game anyway without multiplayer');
    }

    // Start game loop
    this.running = true;
    this.startTime = Date.now();
    console.log('[PvPGame] 🎮 GAME LOOP STARTING! Canvas:', this.canvas.width, 'x', this.canvas.height);
    this.gameLoop();

    // Verify game started
    setTimeout(() => {
      console.log('[PvPGame] ✅ Game status - Running:', this.running, 'Aliens:', this.grid.invaders.length);
    }, 1000);

    // Send state every 50ms (20 times per second)
    setInterval(() => {
      if (this.running) {
        this.sendGameState();
      }
    }, 50);
  }

  async waitForReady() {
    console.log('[PvPGame] Waiting for ready...');

    return new Promise((resolve) => {
      let localReady = false;
      let remoteReady = false;

      const check = () => {
        console.log('[PvPGame] Ready check - local:', localReady, 'remote:', remoteReady);
        if (localReady && remoteReady) {
          console.log('[PvPGame] Both players ready!');
          resolve();
        }
      };

      // Check if data channel is already open
      if (this.connection.dataChannel && this.connection.dataChannel.readyState === 'open') {
        console.log('[PvPGame] Data channel already open, sending ready');
        this.connection.send({ type: 'ready' });
        localReady = true;
        check();
      } else {
        // Wait for it to open
        this.connection.onDataChannelOpen(() => {
          console.log('[PvPGame] Data channel opened, sending ready');
          this.connection.send({ type: 'ready' });
          localReady = true;
          check();
        });
      }

      // Listen for remote ready and all messages
      this.connection.onMessage((msg) => {
        console.log('[PvPGame] Message received:', msg.type);
        if (msg.type === 'ready') {
          console.log('[PvPGame] Remote player ready!');
          remoteReady = true;
          check();
        } else {
          // Handle all other message types
          this.updateRemoteState(msg);
        }
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!localReady || !remoteReady) {
          console.error('[PvPGame] Ready timeout! Starting anyway.');
          resolve(); // Start anyway
        }
      }, 5000);
    });
  }

  sendGameState() {
    if (!this.connection) return;

    this.connection.send({
      type: 'state',
      data: {
        player: {
          x: this.localPlayer.position.x,
          y: this.localPlayer.position.y,
          lives: this.localPlayer.lives
        },
        grid: {
          direction: this.grid.direction,
          position: this.grid.position,
          velocity: this.grid.velocity
        }
      }
    });
  }

  updateRemoteState(message) {
    const { type, data } = message;

    switch (type) {
      case 'state':
        // Update remote player position and state
        if (data.player) {
          this.remotePlayer.position.x = data.player.x;
          this.remotePlayer.position.y = 30; // Keep at top
          this.remotePlayer.lives = data.player.lives;
        }
        // Sync alien grid movement
        if (data.grid) {
          this.grid.direction = data.grid.direction;
          if (data.grid.position) {
            this.grid.position = data.grid.position;
          }
          if (data.grid.velocity) {
            this.grid.velocity = data.grid.velocity;
          }
        }
        break;

      case 'projectile':
        // Create remote player's projectile (shooting downward from top)
        // Use the remote player's current position on this screen
        console.log('[PvPGame] Remote player shot! Creating projectile from remote position');
        const remoteProjectile = new Projectile(
          {
            x: this.remotePlayer.position.x + this.remotePlayer.width / 2 - 2,
            y: this.remotePlayer.position.y + this.remotePlayer.height
          },
          10 // Shoot downward (positive Y) from top player
        );
        this.remoteProjectiles.push(remoteProjectile);
        console.log('[PvPGame] Remote projectile created at:', remoteProjectile.position);
        break;

      case 'alienHit':
        // Sync alien destruction
        console.log('[PvPGame] Remote hit alien at index:', data.alienIndex);
        const invader = this.grid.invaders[data.alienIndex];
        if (invader) {
          invader.shouldRemove = true;
          invader.alive = false;
          // Add particles for visual feedback
          for (let i = 0; i < 15; i++) {
            this.particles.push(new Particle(
              { x: invader.position.x + this.gridOffsetX, y: invader.position.y + this.gridOffsetY },
              { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 },
              Math.random() * 3,
              `hsl(${Math.random() * 360}, 50%, 50%)`
            ));
          }
        }
        break;

      case 'playerHit':
        // Remote player hit us
        console.log('[PvPGame] We were hit by remote player!');
        this.localPlayer.lives--;
        // Add particles
        for (let i = 0; i < 20; i++) {
          this.particles.push(new Particle(
            { x: this.localPlayer.position.x + this.localPlayer.width / 2, y: this.localPlayer.position.y + this.localPlayer.height / 2 },
            { x: (Math.random() - 0.5) * 15, y: (Math.random() - 0.5) * 15 },
            Math.random() * 4,
            `hsl(${Math.random() * 360}, 100%, 50%)`
          ));
        }
        break;

      default:
        console.log('[PvPGame] Unknown message type:', type);
    }
  }

  gameLoop() {
    if (!this.running) {
      console.error('[PvPGame] Game loop stopped!');
      return;
    }

    this.update();
    this.render();

    setTimeout(() => this.gameLoop(), FRAME_TIME);
  }

  update() {
    // Update stars
    this.stars.forEach(star => {
      star.update();
      if (star.position.y > this.canvas.height) {
        star.position.y = 0;
        star.position.x = Math.random() * this.canvas.width;
      }
    });

    // Update local player (horizontal movement)
    const speed = 7;
    if (this.keys.left) {
      this.localPlayer.position.x -= speed;
    }
    if (this.keys.right) {
      this.localPlayer.position.x += speed;
    }

    // Border collision for local player
    if (this.localPlayer.position.x < 0) {
      this.localPlayer.position.x = 0;
    }
    if (this.localPlayer.position.x + this.localPlayer.width > this.canvas.width) {
      this.localPlayer.position.x = this.canvas.width - this.localPlayer.width;
    }

    this.localPlayer.update();

    // Update grid with boundary checking for centered position
    this.grid.update();

    // Manual boundary check for centered grid
    const rightmostInvader = this.grid.invaders.reduce((max, inv) =>
      inv && inv.position.x > max ? inv.position.x : max, 0
    );
    const leftmostInvader = this.grid.invaders.reduce((min, inv) =>
      inv && inv.position.x < min ? inv.position.x : 999999, 999999
    );

    // Adjust for grid offset and check boundaries
    if (rightmostInvader + this.gridOffsetX + 40 >= this.canvas.width) {
      this.grid.direction = "left";
      this.grid.moveDown = true;
    } else if (leftmostInvader + this.gridOffsetX <= 0) {
      this.grid.direction = "right";
      this.grid.moveDown = true;
    }

    // Update projectiles
    this.projectiles.forEach(projectile => {
      projectile.update();
    });

    // Update remote projectiles
    this.remoteProjectiles.forEach(projectile => {
      projectile.update();
    });

    // Remove off-screen or inactive projectiles
    this.projectiles = this.projectiles.filter(p =>
      p.active !== false &&
      p.position.x > -50 &&
      p.position.x < this.canvas.width + 50 &&
      p.position.y > -50 &&
      p.position.y < this.canvas.height + 50
    );

    this.remoteProjectiles = this.remoteProjectiles.filter(p =>
      p.active !== false &&
      p.position.x > -50 &&
      p.position.x < this.canvas.width + 50 &&
      p.position.y > -50 &&
      p.position.y < this.canvas.height + 50
    );

    // Check collisions
    this.checkCollisions();

    // Check win condition
    this.checkWinCondition();

    // Update particles
    this.particles.forEach(particle => particle.update());
    this.particles = this.particles.filter(p => p.opacity > 0);
  }

  checkCollisions() {
    // Local Projectiles vs Invaders (account for grid offset)
    this.projectiles.forEach(projectile => {
      this.grid.invaders.forEach((invader, index) => {
        if (invader && !invader.shouldRemove) {
          // Create temporary invader position with offset applied
          const invaderWithOffset = {
            position: {
              x: invader.position.x + this.gridOffsetX,
              y: invader.position.y + this.gridOffsetY
            },
            width: invader.width,
            height: invader.height
          };

          if (this.checkCollision(projectile, invaderWithOffset)) {
            // Mark invader for removal
            invader.shouldRemove = true;
            invader.alive = false;
            projectile.active = false;

            // Add particles
            for (let i = 0; i < 15; i++) {
              this.particles.push(new Particle(
                { x: invader.position.x + this.gridOffsetX, y: invader.position.y + this.gridOffsetY },
                { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 },
                Math.random() * 3,
                `hsl(${Math.random() * 360}, 50%, 50%)`
              ));
            }

            this.score += 100;
            this.alienKills++; // Aliens don't count for win condition

            // Send alien hit event to remote
            if (this.connection) {
              this.connection.send({
                type: 'alienHit',
                data: { alienIndex: index }
              });
            }
          }
        }
      });
    });

    // Remote Projectiles vs Invaders
    this.remoteProjectiles.forEach(projectile => {
      this.grid.invaders.forEach((invader, index) => {
        if (invader && !invader.shouldRemove) {
          const invaderWithOffset = {
            position: {
              x: invader.position.x + this.gridOffsetX,
              y: invader.position.y + this.gridOffsetY
            },
            width: invader.width,
            height: invader.height
          };

          if (this.checkCollision(projectile, invaderWithOffset)) {
            invader.shouldRemove = true;
            invader.alive = false;
            projectile.active = false;

            // Add particles
            for (let i = 0; i < 15; i++) {
              this.particles.push(new Particle(
                { x: invader.position.x + this.gridOffsetX, y: invader.position.y + this.gridOffsetY },
                { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 },
                Math.random() * 3,
                `hsl(${Math.random() * 360}, 50%, 50%)`
              ));
            }

            // Remote aliens don't count for win
            console.log('[PvPGame] Remote player destroyed alien');
          }
        }
      });
    });

    // Remote Projectiles vs Local Player
    this.remoteProjectiles.forEach(projectile => {
      if (projectile.active !== false && this.checkCollision(projectile, this.localPlayer)) {
        this.localPlayer.lives--;
        projectile.active = false;

        // Check if we were eliminated (remote player gets a PLAYER KILL)
        if (this.localPlayer.lives <= 0) {
          this.remotePlayerKills++; // Only player kills count
          console.log('[PvPGame] 💀 ELIMINATED! Remote player got a kill! Their kills:', this.remotePlayerKills);
          this.localPlayer.lives = 3; // Respawn
        }

        console.log('[PvPGame] 💥 HIT by remote! Lives remaining:', this.localPlayer.lives);

        // Add particles
        for (let i = 0; i < 20; i++) {
          this.particles.push(new Particle(
            { x: this.localPlayer.position.x + this.localPlayer.width / 2, y: this.localPlayer.position.y + this.localPlayer.height / 2 },
            { x: (Math.random() - 0.5) * 15, y: (Math.random() - 0.5) * 15 },
            Math.random() * 4,
            `hsl(${Math.random() * 360}, 100%, 50%)`
          ));
        }
      }
    });

    // Remove dead invaders
    this.grid.invaders = this.grid.invaders.filter(inv => inv && !inv.shouldRemove);

    // Local Projectiles vs Remote Player
    this.projectiles.forEach(projectile => {
      if (projectile.active !== false && this.checkCollision(projectile, this.remotePlayer)) {
        this.remotePlayer.lives--;
        projectile.active = false;

        // Check if player was eliminated (PLAYER KILL)
        if (this.remotePlayer.lives <= 0) {
          this.playerKills++; // Only player kills count for victory
          console.log('[PvPGame] 💀 PLAYER KILL! Eliminated opponent! Kills:', this.playerKills);
          this.remotePlayer.lives = 3;
        }

        // Add particles
        for (let i = 0; i < 20; i++) {
          this.particles.push(new Particle(
            { x: this.remotePlayer.position.x + this.remotePlayer.width / 2, y: this.remotePlayer.position.y + this.remotePlayer.height / 2 },
            { x: (Math.random() - 0.5) * 15, y: (Math.random() - 0.5) * 15 },
            Math.random() * 4,
            `hsl(${Math.random() * 360}, 100%, 50%)`
          ));
        }

        console.log('[PvPGame] 💥 HIT! Remote player lives remaining:', this.remotePlayer.lives);

        // Send player hit event to remote
        if (this.connection) {
          this.connection.send({
            type: 'playerHit',
            data: { damage: 1 }
          });
        }
      }
    });

    // Check if level complete
    if (this.grid.invaders.length === 0) {
      this.level++;
      this.grid = new Grid(3, Math.min(6 + this.level, 10));
    }
  }

  checkWinCondition() {
    // Check if someone reached 3 PLAYER kills (only eliminating opponent counts)
    if (this.playerKills >= 3) {
      console.log('[PvPGame] 🏆 VICTORY! You eliminated opponent 3 times!');
      this.endGame('victory');
    } else if (this.remotePlayerKills >= 3) {
      console.log('[PvPGame] 💀 DEFEAT! Opponent eliminated you 3 times!');
      this.endGame('defeat');
    }
  }

  endGame(result) {
    this.running = false;

    // Show result modal or screen
    alert(result === 'victory' ? '🏆 VITÓRIA! Você venceu!' : '💀 DERROTA! O oponente venceu!');

    // Return to lobby after 2 seconds
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }

  checkCollision(obj1, obj2) {
    const collision = (
      obj1.position.x < obj2.position.x + obj2.width &&
      obj1.position.x + obj1.width > obj2.position.x &&
      obj1.position.y < obj2.position.y + obj2.height &&
      obj1.position.y + obj1.height > obj2.position.y
    );

    // Debug: Log collision attempts with remote player
    if (obj2 === this.remotePlayer && obj1.position) {
      console.log('[Collision Check]', {
        projectile: { x: obj1.position.x, y: obj1.position.y, w: obj1.width, h: obj1.height },
        player: { x: obj2.position.x, y: obj2.position.y, w: obj2.width, h: obj2.height },
        collision: collision
      });
    }

    return collision;
  }

  render() {
    // Clear
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Stars
    this.stars.forEach(star => star.draw(this.ctx));

    // Grid (centered)
    this.ctx.save();
    this.ctx.translate(this.gridOffsetX, this.gridOffsetY);
    this.grid.draw(this.ctx);
    this.ctx.restore();

    // Local Projectiles (going up)
    this.projectiles.forEach(proj => {
      proj.draw(this.ctx);

      // Debug: Draw a red circle around projectiles
      this.ctx.strokeStyle = 'red';
      this.ctx.beginPath();
      this.ctx.arc(proj.position.x, proj.position.y, 10, 0, Math.PI * 2);
      this.ctx.stroke();
    });

    // Remote Projectiles (going down)
    this.remoteProjectiles.forEach(proj => {
      proj.draw(this.ctx);

      // Debug: Draw a yellow circle around remote projectiles
      this.ctx.strokeStyle = 'yellow';
      this.ctx.beginPath();
      this.ctx.arc(proj.position.x, proj.position.y, 10, 0, Math.PI * 2);
      this.ctx.stroke();
    });

    // Particles
    this.particles.forEach(particle => particle.draw(this.ctx));

    // Local player (normal, bottom)
    this.localPlayer.draw(this.ctx);

    // Remote player (rotated 180 degrees, top)
    this.ctx.save();
    this.ctx.translate(
      this.remotePlayer.position.x + this.remotePlayer.width / 2,
      this.remotePlayer.position.y + this.remotePlayer.height / 2
    );
    this.ctx.rotate(Math.PI);
    this.ctx.translate(
      -(this.remotePlayer.position.x + this.remotePlayer.width / 2),
      -(this.remotePlayer.position.y + this.remotePlayer.height / 2)
    );
    this.remotePlayer.draw(this.ctx);
    this.ctx.restore();

    // Debug: Draw collision boxes
    this.ctx.strokeStyle = 'lime';
    this.ctx.lineWidth = 2;
    // Local player hitbox
    this.ctx.strokeRect(
      this.localPlayer.position.x,
      this.localPlayer.position.y,
      this.localPlayer.width,
      this.localPlayer.height
    );
    // Remote player hitbox
    this.ctx.strokeStyle = 'red';
    this.ctx.strokeRect(
      this.remotePlayer.position.x,
      this.remotePlayer.position.y,
      this.remotePlayer.width,
      this.remotePlayer.height
    );

    // UI
    this.drawUI();
  }

  drawUI() {
    // Update DOM elements instead of drawing on canvas
    const scoreLocal = document.getElementById('pvp-score-local');
    const killsLocal = document.getElementById('pvp-kills-local');
    const livesLocal = document.getElementById('pvp-lives-local');

    const scoreRemote = document.getElementById('pvp-score-remote');
    const killsRemote = document.getElementById('pvp-kills-remote');
    const livesRemote = document.getElementById('pvp-lives-remote');

    const timer = document.getElementById('pvp-timer');
    const alienCount = document.getElementById('pvp-alien-count');

    // Update local player stats
    if (scoreLocal) scoreLocal.textContent = this.score;
    if (killsLocal) killsLocal.textContent = this.playerKills; // Only player eliminations
    if (livesLocal) livesLocal.textContent = this.localPlayer.lives;

    // Update remote player stats
    if (scoreRemote) scoreRemote.textContent = '0'; // Will be synced later
    if (killsRemote) killsRemote.textContent = this.remotePlayerKills; // Only player eliminations
    if (livesRemote) livesRemote.textContent = this.remotePlayer.lives;

    // Update timer
    if (timer) {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Update alien count
    if (alienCount) alienCount.textContent = this.grid.invaders.length;
  }

  stop() {
    this.running = false;
    if (this.connection) {
      this.connection.close();
    }
  }
}

export default PvPGameSimple;

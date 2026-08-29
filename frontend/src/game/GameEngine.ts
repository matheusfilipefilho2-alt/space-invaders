import { Player } from './Player'
import { InvaderGrid } from './InvaderGrid'
import { Projectile } from './Projectile'
import { Obstacle } from './Obstacle'
import { Particle } from './Particle'
import { Star } from './Star'
import { Bonus, type BonusType } from './Bonus'
import { Boss } from './Boss'
import { SoundEffects } from './SoundEffects'
import { SkinManager } from './Skins'
import { SettingsManager } from './Settings'
import { AchievementManager } from './Achievements'
import { LeaderboardManager } from './Leaderboard'
import { StatisticsManager, type SessionStats } from './Statistics'
import { WaveManager } from './WaveManager'
import { Weapon, WeaponType } from './Weapon'
import { Tutorial } from './Tutorial'
import { GameState, type GameStats, type GameConfig } from './types'
import {
  CANVAS_BG_COLOR,
  TARGET_FPS,
  OBSTACLE_COUNT,
  OBSTACLE_WIDTH,
  STAR_COUNT,
  INVADER_SCORE,
  INVADER_VELOCITY_X
} from './constants'

type GameEventName = 'scoreChange' | 'livesChange' | 'levelChange' | 'gameOver' | 'comboChange' | 'statsChange' | 'achievementUnlocked' | 'leaderboardEntry'
type GameEventCallback = (data: any) => void

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private state: GameState
  private player: Player | null
  private invaderGrid: InvaderGrid | null
  private boss: Boss | null
  private isBossLevel: boolean
  private waveManager: WaveManager | null
  private playerProjectiles: Projectile[]
  private enemyProjectiles: Projectile[]
  private obstacles: Obstacle[]
  private particles: Particle[]
  private stars: Star[]
  private bonuses: Bonus[]
  private bonusSpawnTimer: number
  private bonusSpawnInterval: number
  private enemyShootTimer: number
  private enemyShootInterval: number
  private playerBuff: {
    active: boolean
    startTime: number
    duration: number
  }
  private activePowerUps: Map<string, { startTime: number; duration: number }>
  private scoreMultiplier: number
  private currentWeapon: Weapon
  private weapons: Map<WeaponType, Weapon>
  private keys: Record<string, boolean>
  private shootKey: { pressed: boolean; released: boolean }
  private shootCooldown: number
  private lastShootTime: number
  private animationId: number | null
  private lastTime: number
  private stats: GameStats
  private config: GameConfig
  private eventListeners: Map<GameEventName, GameEventCallback[]>
  private soundEffects: SoundEffects
  private paused: boolean
  private pauseKey: { pressed: boolean; released: boolean }
  private highScore: number
  private readonly HIGH_SCORE_KEY = 'space_invaders_high_score'
  private difficulty: 'easy' | 'normal' | 'hard'
  private graphicsQuality: 'low' | 'medium' | 'high'
  private particlesEnabled: boolean
  private visualEffectsEnabled: boolean
  private showFPS: boolean
  private fpsCounter: number
  private fpsLastTime: number
  private fpsFrames: number
  private shakeIntensity: number
  private shakeDuration: number
  private shakeOffsetX: number
  private shakeOffsetY: number
  private shakeStartTime: number
  private tutorial: Tutorial
  private hasShownFirstDeathTip: boolean
  private hasShownComboTip: boolean
  private sessionStats: SessionStats
  private levelCompletePending: boolean

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not supported')
    this.ctx = ctx

    this.state = GameState.MENU
    this.player = null
    this.invaderGrid = null
    this.boss = null
    this.isBossLevel = false
    this.waveManager = null
    this.playerProjectiles = []
    this.enemyProjectiles = []
    this.obstacles = []
    this.particles = []
    this.stars = []
    this.bonuses = []
    this.bonusSpawnTimer = 0
    this.bonusSpawnInterval = 8000 // 8 seconds (reduzido de 15s para mais power-ups)
    this.enemyShootTimer = 0
    this.enemyShootInterval = 1000 // 1 second like original
    this.playerBuff = {
      active: false,
      startTime: 0,
      duration: 10000 // 10 seconds
    }
    this.activePowerUps = new Map()
    this.scoreMultiplier = 1

    // Initialize weapon system
    this.currentWeapon = new Weapon(WeaponType.NORMAL)
    this.weapons = new Map()
    this.weapons.set(WeaponType.NORMAL, this.currentWeapon)

    this.keys = {}
    this.shootKey = { pressed: false, released: false }
    this.shootCooldown = 333 // 333ms between shots = 3 shots/second
    this.lastShootTime = 0
    this.pauseKey = { pressed: false, released: false }
    this.paused = false
    this.animationId = null
    this.lastTime = 0
    this.eventListeners = new Map()

    this.stats = {
      score: 0,
      level: 1,
      lives: 1,
      killCount: 0,
      accuracy: 100,
      startTime: Date.now(),
      // Advanced stats
      combo: 0,
      maxCombo: 0,
      rapidKills: 0,
      shotsFired: 0,
      shotsHit: 0,
      lastKillTime: 0,
      bossKills: 0
    }

    this.config = {
      canvasWidth: window.innerWidth,
      canvasHeight: window.innerHeight,
      backgroundColor: CANVAS_BG_COLOR,
      fps: TARGET_FPS
    }

    this.soundEffects = new SoundEffects()
    this.highScore = this.loadHighScore()

    // Load and apply settings after soundEffects is initialized
    const settings = SettingsManager.getSettings()
    this.soundEffects.setMusicVolume(settings.musicVolume / 100)
    this.soundEffects.setEffectsVolume(settings.sfxVolume / 100)

    // Initialize settings-based properties
    this.difficulty = settings.difficulty
    this.graphicsQuality = settings.graphicsQuality
    this.particlesEnabled = settings.particlesEnabled
    this.visualEffectsEnabled = settings.visualEffects
    this.showFPS = settings.showFPS
    this.fpsCounter = 0
    this.fpsLastTime = 0
    this.fpsFrames = 0
    this.shakeIntensity = 0
    this.shakeDuration = 0
    this.shakeOffsetX = 0
    this.shakeOffsetY = 0
    this.shakeStartTime = 0
    this.tutorial = new Tutorial()
    this.hasShownFirstDeathTip = false
    this.hasShownComboTip = false
    this.sessionStats = StatisticsManager.createSessionStats()

    this.setupCanvas()
    this.setupEventListeners()
    this.initializeStars()
    this.handleResize()

    // Play menu music when game is initialized
    this.soundEffects.playMenuMusic()
  }

  private setupCanvas(): void {
    this.canvas.width = this.config.canvasWidth
    this.canvas.height = this.config.canvasHeight
    this.ctx.imageSmoothingEnabled = false
  }

  private handleResize(): void {
    window.addEventListener('resize', () => {
      this.config.canvasWidth = window.innerWidth
      this.config.canvasHeight = window.innerHeight
      this.setupCanvas()

      // Reinitialize stars with new dimensions
      this.stars = []
      this.initializeStars()
    })
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true

      if (e.key === ' ') {
        e.preventDefault()
        this.shootKey.pressed = true
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault()
        this.pauseKey.pressed = true
      }

      if (e.key === 'Enter') {
        this.tutorial.handleEnterKey()
      }

      if (e.key === 'Escape' && this.tutorial.isRunning()) {
        this.tutorial.handleEscapeKey()
      }
    })

    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false

      if (e.key === ' ') {
        this.shootKey.pressed = false
        this.shootKey.released = true
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        this.pauseKey.pressed = false
        this.pauseKey.released = true
      }
    })
  }

  private initializeStars(): void {
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push(new Star(this.config.canvasWidth, this.config.canvasHeight))
    }
  }

  start(): void {
    this.state = GameState.PLAYING

    // Reset all stats for new game
    this.stats = {
      score: 0,
      level: 1,
      lives: 1,
      killCount: 0,
      accuracy: 100,
      startTime: Date.now(),
      // Advanced stats
      combo: 0,
      maxCombo: 0,
      rapidKills: 0,
      shotsFired: 0,
      shotsHit: 0,
      lastKillTime: 0,
      bossKills: 0
    }

    // Reset tutorial tip flags
    this.hasShownFirstDeathTip = false
    this.hasShownComboTip = false

    // Reset session statistics
    this.sessionStats = StatisticsManager.createSessionStats()

    // Start tutorial for new players
    if (this.tutorial.shouldShowTutorial()) {
      this.tutorial.start()
    } else {
      this.tutorial.reset()
    }

    // Stop menu music and start level music
    this.soundEffects.stopMusic()
    this.soundEffects.playLevelMusic(this.stats.level)

    // Initialize game entities with selected skin
    const selectedSkin = SkinManager.getSelectedSkin()
    this.player = new Player(this.config.canvasWidth, this.config.canvasHeight, selectedSkin)

    // Check if this is a boss level (level 2, then every 5 levels: 7, 12, 17, etc.)
    this.isBossLevel = this.stats.level === 2 || (this.stats.level > 2 && (this.stats.level - 2) % 5 === 0)

    if (this.isBossLevel) {
      // Spawn boss instead of invader grid
      this.boss = new Boss(this.config.canvasWidth, this.config.canvasHeight, this.stats.level)
      this.invaderGrid = null
      this.waveManager = null
    } else {
      // Normal level - create wave manager and spawn first wave
      this.waveManager = new WaveManager(this.stats.level, this.config.canvasWidth)
      this.invaderGrid = this.waveManager.createWaveGrid()
      this.boss = null

      // Apply wave difficulty modifiers to invader grid
      this.applyWaveDifficulty()
    }

    this.playerProjectiles = []
    this.enemyProjectiles = []
    this.particles = []
    this.bonuses = []
    this.bonusSpawnTimer = 0
    this.enemyShootTimer = 0
    this.playerBuff.active = false

    // Reset power-ups
    this.activePowerUps.clear()
    this.scoreMultiplier = 1

    // Initialize obstacles
    this.obstacles = []
    const spacing = this.config.canvasWidth / (OBSTACLE_COUNT + 1)
    for (let i = 0; i < OBSTACLE_COUNT; i++) {
      this.obstacles.push(
        new Obstacle(
          spacing * (i + 1) - (OBSTACLE_WIDTH / 2),
          this.config.canvasHeight - 200
        )
      )
    }

    this.gameLoop()
  }

  private gameLoop = (currentTime: number = 0): void => {
    if (this.state !== GameState.PLAYING) return

    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    // Update FPS counter
    if (this.showFPS) {
      this.updateFPS(currentTime)
    }

    // Handle pause toggle
    if (this.pauseKey.released) {
      this.paused = !this.paused
      this.pauseKey.released = false

      // Pause/resume music
      if (this.paused) {
        this.soundEffects.pauseMusic()
      } else {
        this.soundEffects.resumeMusic()
      }
    }

    // Skip update/collisions if paused, but still render
    if (!this.paused) {
      this.update(deltaTime)
      this.checkCollisions()
      this.checkBonusCollision()
    }

    this.render()

    // Draw pause indicator if paused
    if (this.paused) {
      this.drawPauseIndicator()
    }

    // Draw tutorial messages
    this.drawTutorialMessage()

    this.animationId = requestAnimationFrame(this.gameLoop)
  }

  private update(deltaTime: number): void {
    if (!this.player || !this.invaderGrid) return

    // Apply slowmo effect to deltaTime for enemies
    const slowmoFactor = this.isPowerUpActive('slowmo') ? 0.5 : 1.0
    const adjustedDeltaTime = deltaTime * slowmoFactor

    // Update player (not affected by slowmo)
    this.player.update(this.keys)

    // Handle shooting with cooldown system
    const currentTime = Date.now()
    const shootCooldown = this.isPowerUpActive('rapidfire') ? 150 : this.shootCooldown

    if (this.shootKey.pressed && this.shootKey.released && currentTime - this.lastShootTime >= shootCooldown) {
      this.shoot()
      this.shootKey.released = false
      this.lastShootTime = currentTime
    }

    // Update invaders OR boss (with difficulty modifier)
    const difficultyMod = this.getDifficultyModifier()

    if (this.isBossLevel && this.boss) {
      // Update boss (affected by slowmo)
      this.boss.update(adjustedDeltaTime)
    } else if (this.invaderGrid) {
      // Apply difficulty and wave modifiers to invader movement speed
      const waveSpeedMod = this.waveManager ? this.waveManager.getWaveConfig().speedMultiplier : 1.0
      if (!this.invaderGrid.isEntering) {
        this.invaderGrid.velocity.x = this.invaderGrid.velocity.x > 0
          ? INVADER_VELOCITY_X * difficultyMod * waveSpeedMod * slowmoFactor
          : -INVADER_VELOCITY_X * difficultyMod * waveSpeedMod * slowmoFactor
      }
      this.invaderGrid.update(this.config.canvasWidth, this.config.canvasHeight)
    }

    // Update bonuses (not affected by slowmo - still falls at normal speed)
    this.updateBonuses(deltaTime)

    // Update active power-ups
    this.updatePowerUps()

    // Enemies shoot (boss or invaders, timer-based, affected by difficulty)
    if (this.isBossLevel && this.boss && !this.boss.isEntering) {
      // Boss shooting
      const currentTime = Date.now()
      if (this.boss.canShoot(currentTime)) {
        const bossProjectiles = this.boss.shoot()
        this.enemyProjectiles.push(...bossProjectiles)
        this.boss.updateLastShootTime(currentTime)
      }
    } else if (this.invaderGrid && !this.invaderGrid.isEntering) {
      // Invader shooting (affected by slowmo and wave difficulty)
      this.enemyShootTimer += adjustedDeltaTime
      const waveShootMod = this.waveManager ? this.waveManager.getWaveConfig().shootMultiplier : 1.0
      const adjustedShootInterval = this.enemyShootInterval / (this.getShootProbabilityModifier() * waveShootMod)
      if (this.enemyShootTimer >= adjustedShootInterval) {
        // Use grid method to select shooter (prioritizes snipers)
        const shooter = this.invaderGrid.getInvaderForShooting()
        if (shooter) {
          // Apply invader's individual shoot multiplier
          const shouldShoot = Math.random() < shooter.stats.shootMultiplier
          if (shouldShoot) {
            const projectile = new Projectile(
              shooter.position.x + shooter.width / 2,
              shooter.position.y + shooter.height,
              false // enemy projectile
            )
            this.enemyProjectiles.push(projectile)
          }
        }
        this.enemyShootTimer = 0
      }
    }

    // Update projectiles (with null check)
    this.playerProjectiles = this.playerProjectiles.filter(p => p !== null && p !== undefined)
    this.enemyProjectiles = this.enemyProjectiles.filter(p => p !== null && p !== undefined)

    // Get targets for homing missiles
    const targets = this.invaderGrid ? this.invaderGrid.invaders.filter(inv => inv.alive) : []

    this.playerProjectiles.forEach(p => p.update(targets))
    this.enemyProjectiles.forEach(p => p.update())

    // Remove off-screen projectiles and reset combo on miss
    const beforeCount = this.playerProjectiles.length
    this.playerProjectiles = this.playerProjectiles.filter(
      p => !p.isOffScreen(this.config.canvasHeight)
    )
    if (this.playerProjectiles.length < beforeCount) {
      // Player projectile went off screen (missed) - reset combo
      this.resetCombo()
    }

    this.enemyProjectiles = this.enemyProjectiles.filter(
      p => !p.isOffScreen(this.config.canvasHeight)
    )

    // Update particles (with null check)
    this.particles = this.particles.filter(p => p !== null && p !== undefined)
    this.particles.forEach(p => p.update())
    this.particles = this.particles.filter(p => !p.isDead())

    // Update stars
    this.stars.forEach(s => s.update(this.config.canvasHeight))

    // Update screen shake
    this.updateScreenShake()

    // Check for wave/level completion
    if (this.isBossLevel) {
      // Boss level - complete when boss defeated
      if (this.boss && this.boss.isDefeated() && !this.levelCompletePending) {
        this.levelCompletePending = true
        // Delay is handled in checkCollisions with explosions
      }
    } else if (this.waveManager && this.invaderGrid) {
      // Wave-based level
      if (this.invaderGrid.isAllDead()) {
        // All invaders in current wave are dead
        if (!this.waveManager.isWaveComplete()) {
          this.waveManager.setWaveComplete(true)
        }

        // Check if we can start the next wave
        if (this.waveManager.canStartNextWave()) {
          if (this.waveManager.hasMoreWaves()) {
            // Start next wave
            this.startNextWave()
          } else {
            // All waves complete - level complete
            this.levelComplete()
          }
        }
      }
    }
  }

  private render(): void {
    // Save context state
    this.ctx.save()

    // Apply screen shake offset
    this.ctx.translate(this.shakeOffsetX, this.shakeOffsetY)

    // Clear canvas
    this.ctx.fillStyle = this.config.backgroundColor
    this.ctx.fillRect(-this.shakeOffsetX, -this.shakeOffsetY, this.config.canvasWidth, this.config.canvasHeight)

    // Draw stars
    this.stars.forEach(s => s.draw(this.ctx))

    // Draw obstacles
    this.obstacles.forEach(o => o.draw(this.ctx))

    // Draw player
    this.player?.draw(this.ctx)

    // Draw invaders or boss
    if (this.isBossLevel) {
      this.boss?.draw(this.ctx)
    } else {
      this.invaderGrid?.draw(this.ctx)
    }

    // Draw projectiles
    this.playerProjectiles.forEach(p => p.draw(this.ctx))
    this.enemyProjectiles.forEach(p => p.draw(this.ctx))

    // Draw particles
    this.particles.forEach(p => p.draw(this.ctx))

    // Draw bonuses
    this.drawBonuses()

    // Draw buff indicator
    this.drawBuffIndicator()

    // Draw combo indicator
    this.drawComboIndicator()

    // Draw FPS counter if enabled
    if (this.showFPS) {
      this.drawFPSCounter()
    }

    // Draw active power-up indicators
    this.drawPowerUpIndicators()

    // Draw wave indicator
    this.drawWaveIndicator()

    // Draw weapon indicator
    this.drawWeaponIndicator()

    // Restore context state (removes shake offset)
    this.ctx.restore()
  }

  private drawFPSCounter(): void {
    this.ctx.save()
    this.ctx.fillStyle = '#00ff88'
    this.ctx.font = 'bold 16px monospace'
    this.ctx.textAlign = 'right'
    this.ctx.textBaseline = 'top'
    this.ctx.fillText(`FPS: ${this.fpsCounter}`, this.config.canvasWidth - 10, 10)
    this.ctx.restore()
  }

  private updateFPS(currentTime: number): void {
    this.fpsFrames++
    const elapsed = currentTime - this.fpsLastTime

    if (elapsed >= 1000) {
      this.fpsCounter = Math.round((this.fpsFrames * 1000) / elapsed)
      this.fpsFrames = 0
      this.fpsLastTime = currentTime
    }
  }

  private triggerScreenShake(intensity: number = 5, duration: number = 300): void {
    if (!this.visualEffectsEnabled) return

    this.shakeIntensity = intensity
    this.shakeDuration = duration
    this.shakeStartTime = Date.now()
  }

  private updateScreenShake(): void {
    if (this.shakeIntensity === 0) {
      this.shakeOffsetX = 0
      this.shakeOffsetY = 0
      return
    }

    const currentTime = Date.now()
    const elapsed = currentTime - this.shakeStartTime

    if (elapsed >= this.shakeDuration) {
      // Shake complete
      this.shakeIntensity = 0
      this.shakeOffsetX = 0
      this.shakeOffsetY = 0
      return
    }

    // Calculate decay factor (shake gets weaker over time)
    const progress = elapsed / this.shakeDuration
    const currentIntensity = this.shakeIntensity * (1 - progress)

    // Random offset based on current intensity
    this.shakeOffsetX = (Math.random() - 0.5) * currentIntensity * 2
    this.shakeOffsetY = (Math.random() - 0.5) * currentIntensity * 2
  }

  private findNearbyInvaders(targetInvader: any, maxCount: number = 3): any[] {
    const nearbyInvaders: any[] = []
    const targetCenter = {
      x: targetInvader.position.x + targetInvader.width / 2,
      y: targetInvader.position.y + targetInvader.height / 2
    }

    this.invaderGrid!.invaders.forEach(invader => {
      if (invader !== targetInvader && invader.alive) {
        const invaderCenter = {
          x: invader.position.x + invader.width / 2,
          y: invader.position.y + invader.height / 2
        }

        const distance = Math.sqrt(
          Math.pow(targetCenter.x - invaderCenter.x, 2) +
          Math.pow(targetCenter.y - invaderCenter.y, 2)
        )

        if (distance <= 100 && nearbyInvaders.length < maxCount) {
          nearbyInvaders.push(invader)
        }
      }
    })

    return nearbyInvaders
  }

  private destroyInvaderWithDelay(invader: any, delay: number, isFirst: boolean): void {
    setTimeout(() => {
      if (invader.alive) {
        invader.alive = false
        // Use invader's specific score value based on type
        this.addScore(invader.stats.scoreValue)
        this.trackKill()

        // Special explosion colors and particles (25 for destruction mode)
        const color = isFirst ? '#FF0080' : invader.stats.color
        if (this.particlesEnabled) {
          const particleCount = Math.min(25, this.getParticleCountForQuality() * 2)
          for (let i = 0; i < particleCount; i++) {
            this.particles.push(new Particle(
              invader.position.x + invader.width / 2,
              invader.position.y + invader.height / 2,
              color
            ))
          }
        }
      }
    }, delay)
  }

  private checkCollisions(): void {
    if (!this.player || !this.invaderGrid) return

    const playerProjectilesToRemove = new Set<number>()
    const enemyProjectilesToRemove = new Set<number>()

    // Player projectiles vs invaders or boss
    this.playerProjectiles.forEach((projectile, pIndex) => {
      if (playerProjectilesToRemove.has(pIndex)) return

      // Check boss collision
      if (this.isBossLevel && this.boss && this.boss.alive) {
        const bossBox = {
          x: this.boss.position.x,
          y: this.boss.position.y,
          width: this.boss.width,
          height: this.boss.height
        }

        if (projectile.collidesWith(bossBox)) {
          playerProjectilesToRemove.add(pIndex)
          this.boss.hit(projectile.type === 'destruction' ? 10 : 1)
          this.createExplosion(projectile.position.x, projectile.position.y, '#FF0000')
          this.stats.shotsHit++
          this.sessionStats.hits++
          this.updateAccuracy()

          // Check if boss defeated
          if (this.boss.isDefeated() && !this.levelCompletePending) {
            this.levelCompletePending = true
            const reward = this.boss.getReward()

            // Give rewards
            this.addScore(reward.score)
            this.trackKill(undefined, true) // Track as boss kill

            // Track boss kill
            this.stats.bossKills++

            // Grant guaranteed power-up for higher tier bosses
            if (reward.guaranteedPowerUp) {
              console.log(`🎁 Boss defeated! Guaranteed reward: ${reward.guaranteedPowerUp}`)
              // Spawn guaranteed power-up at boss position
              const bonusType = reward.guaranteedPowerUp as any
              const bonus = new Bonus(this.config.canvasWidth, this.config.canvasHeight, bonusType)
              bonus.position.x = this.boss.position.x + this.boss.width / 2 - bonus.width / 2
              bonus.position.y = this.boss.position.y + this.boss.height / 2
              bonus.velocity.y = 2 // Slow fall
              this.bonuses.push(bonus)
            }

            // Big explosion for boss defeat with screen shake
            for (let i = 0; i < 5; i++) {
              setTimeout(() => {
                this.createExplosion(
                  this.boss!.position.x + Math.random() * this.boss!.width,
                  this.boss!.position.y + Math.random() * this.boss!.height,
                  '#FFD700'
                )
                // Trigger screen shake for each explosion (decreasing intensity)
                this.triggerScreenShake(15 - i * 2, 300)
              }, i * 200)
            }

            this.soundEffects.playSound('nextLevel')
            setTimeout(() => this.levelComplete(), 2000)
          }
        }
      }

      // Check invader collisions
      if (this.invaderGrid) {
        this.invaderGrid.invaders.forEach(invader => {
        if (invader.alive && invader.hit(projectile)) {
          playerProjectilesToRemove.add(pIndex)

          // Check if it's a destruction projectile
          if (projectile.type === 'destruction') {
            // Destroy exactly 4 invaders (including the hit one)
            const invadersToDestroy = [invader]
            const nearbyInvaders = this.findNearbyInvaders(invader, 3)
            invadersToDestroy.push(...nearbyInvaders)

            // Ensure we have exactly 4 invaders to destroy
            const finalInvaders = invadersToDestroy.slice(0, 4)

            // Destroy with staggered delay for dramatic effect
            finalInvaders.forEach((targetInvader, index) => {
              this.destroyInvaderWithDelay(targetInvader, index * 150, index === 0)
            })

            // Special visual effect for projectile impact
            if (this.particlesEnabled && this.visualEffectsEnabled) {
              const particleCount = this.getParticleCountForQuality() * 2
              for (let i = 0; i < particleCount; i++) {
                this.particles.push(new Particle(projectile.position.x, projectile.position.y, '#FF0080'))
              }
            }

            // Screen shake for bomb impact
            this.triggerScreenShake(12, 400)
          } else {
            // Normal projectile - apply damage to invader
            const damage = projectile.type === 'destruction' ? 999 : 1
            const wasKilled = invader.takeDamage(damage)

            if (wasKilled) {
              // Invader was killed - award points and track kill
              this.addScore(invader.stats.scoreValue)
              this.trackKill(invader, false)
              this.createExplosion(invader.position.x, invader.position.y, invader.stats.color)
            } else {
              // Invader was damaged but not killed - show hit effect
              this.createExplosion(invader.position.x, invader.position.y, invader.hasShield ? '#FFD600' : '#FFFFFF')
            }
          }

          // Track hit for accuracy
          this.stats.shotsHit++
          this.sessionStats.hits++
          this.updateAccuracy()
        }
        })
      }

      // Player projectiles vs obstacles
      if (!playerProjectilesToRemove.has(pIndex)) {
        this.obstacles.forEach(obstacle => {
          if (obstacle.collidesWithProjectile(projectile)) {
            playerProjectilesToRemove.add(pIndex)
            this.createExplosion(projectile.position.x, projectile.position.y, obstacle.color)
          }
        })
      }
    })

    // Enemy projectiles vs player
    this.enemyProjectiles.forEach((projectile, pIndex) => {
      if (enemyProjectilesToRemove.has(pIndex)) return

      // Create a collision target with x, y, width, height
      const playerCollisionBox = this.player ? {
        x: this.player.position.x,
        y: this.player.position.y,
        width: this.player.width,
        height: this.player.height
      } : null

      if (playerCollisionBox && projectile.collidesWith(playerCollisionBox)) {
        // Only apply damage if player is not invulnerable
        if (!this.player.isInvulnerable()) {
          this.player.hit()
          this.emit('livesChange', this.player.lives)
          this.soundEffects.playSound('hit')

          // Reset combo when hit
          this.resetCombo()

          // Create explosion effect when player is hit
          this.createExplosion(
            this.player.position.x + this.player.width / 2,
            this.player.position.y + this.player.height / 2,
            '#FF6B6B' // Red explosion for player hit
          )

          // Trigger screen shake when player is hit
          this.triggerScreenShake(8, 400)

          if (!this.player.alive) {
            this.gameOver()
          }
        }

        enemyProjectilesToRemove.add(pIndex)
      }

      // Enemy projectiles vs obstacles
      if (!enemyProjectilesToRemove.has(pIndex)) {
        this.obstacles.forEach(obstacle => {
          if (obstacle.collidesWithProjectile(projectile)) {
            enemyProjectilesToRemove.add(pIndex)
            this.createExplosion(projectile.position.x, projectile.position.y, obstacle.color)
          }
        })
      }
    })

    // Remove marked projectiles
    this.playerProjectiles = this.playerProjectiles.filter((_, index) => !playerProjectilesToRemove.has(index))
    this.enemyProjectiles = this.enemyProjectiles.filter((_, index) => !enemyProjectilesToRemove.has(index))

    // Invaders vs player (game over if they reach player)
    this.invaderGrid.invaders.forEach(invader => {
      if (invader.alive && this.player && invader.position.y + invader.height >= this.player.position.y) {
        this.gameOver()
      }
    })
  }

  private shoot(): void {
    if (!this.player) return

    // Check if weapon expired BEFORE firing - fix for weapon expiration bug
    if (this.currentWeapon.isExpired() && this.currentWeapon.type !== WeaponType.NORMAL) {
      console.log(`Weapon ${this.currentWeapon.type} expired, switching to NORMAL`)
      this.switchWeapon(WeaponType.NORMAL)
    }

    // Use weapon system to fire
    const projectiles = this.currentWeapon.fire(this.player.position.x, this.player.position.y)

    if (projectiles.length > 0) {
      // If Mega Destruction buff is active, convert projectiles to destruction type
      if (this.playerBuff.active) {
        projectiles.forEach(p => {
          p.type = 'destruction'
        })
      }

      // Add all projectiles from weapon
      this.playerProjectiles.push(...projectiles)
      this.stats.shotsFired += projectiles.length

      // Track weapon shots in session stats
      this.sessionStats.shots += projectiles.length
      this.sessionStats.weaponShots[this.currentWeapon.type] += projectiles.length

      // Play sound
      this.soundEffects.playSound('shoot')

      // Update tutorial progress
      this.tutorial.advanceStage(this.stats.shotsFired, this.stats.killCount)
    }
  }

  private createExplosion(x: number, y: number, color: string = '#FFD700'): void {
    // Only create particles if enabled
    if (this.particlesEnabled) {
      const particleCount = this.getParticleCountForQuality()
      for (let i = 0; i < particleCount; i++) {
        this.particles.push(new Particle(x, y, color))
      }
    }
    this.soundEffects.playSound('explosion')
  }

  private addScore(points: number): void {
    // Apply score multiplier if active
    const finalPoints = Math.floor(points * this.scoreMultiplier)
    this.stats.score += finalPoints
    this.emit('scoreChange', this.stats.score)
  }

  private trackKill(invaderType?: any, isBoss: boolean = false): void {
    this.stats.killCount++

    // Track in session stats
    this.sessionStats.kills++

    // Track boss kills
    if (isBoss) {
      this.sessionStats.bossKills++
    }

    // Track enemy type kills
    if (invaderType && invaderType.type) {
      this.sessionStats.enemyKills[invaderType.type]++
    }

    // Track weapon kills
    this.sessionStats.weaponKills[this.currentWeapon.type]++

    // Update combo
    this.stats.combo++
    if (this.stats.combo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.combo
    }
    this.emit('comboChange', this.stats.combo)

    // Update tutorial progress
    this.tutorial.advanceStage(this.stats.shotsFired, this.stats.killCount)

    // Track rapid kills (kills within 2 seconds)
    const currentTime = Date.now()
    if (this.stats.lastKillTime > 0 && currentTime - this.stats.lastKillTime < 2000) {
      this.stats.rapidKills++
    }
    this.stats.lastKillTime = currentTime
  }

  private resetCombo(): void {
    if (this.stats.combo > 0) {
      this.stats.combo = 0
      this.emit('comboChange', 0)
    }
  }

  private updateAccuracy(): void {
    if (this.stats.shotsFired > 0) {
      this.stats.accuracy = Math.round((this.stats.shotsHit / this.stats.shotsFired) * 100)
    }
  }

  private applyWaveDifficulty(): void {
    if (!this.waveManager || !this.invaderGrid) return

    // Wave difficulty is applied dynamically in update() method:
    // - Speed multiplier affects invader velocity
    // - Shoot multiplier affects enemy shoot timer interval
  }

  private startNextWave(): void {
    if (!this.waveManager) return

    // Advance to next wave
    const hasNextWave = this.waveManager.nextWave()
    if (!hasNextWave) return

    // Create new invader grid for the wave
    this.invaderGrid = this.waveManager.createWaveGrid()

    // Clear projectiles and particles for clean start
    this.playerProjectiles = []
    this.enemyProjectiles = []
    this.particles = []

    // Apply wave difficulty
    this.applyWaveDifficulty()

    // Play sound effect
    this.soundEffects.playSound('nextLevel')
  }

  private levelComplete(): void {
    // Reset flag
    this.levelCompletePending = false

    // Increment level
    this.stats.level++
    this.emit('levelChange', this.stats.level)

    // Play next level sound and change music
    this.soundEffects.playSound('nextLevel')
    this.soundEffects.playLevelMusic(this.stats.level)

    // Check if next level is a boss level (level 2, then every 5 levels: 7, 12, 17, etc.)
    this.isBossLevel = this.stats.level === 2 || (this.stats.level > 2 && (this.stats.level - 2) % 5 === 0)

    if (this.isBossLevel) {
      // Spawn boss for boss level
      this.boss = new Boss(this.config.canvasWidth, this.config.canvasHeight, this.stats.level)
      this.invaderGrid = null
      this.waveManager = null
    } else {
      // Create new wave manager for normal level
      this.waveManager = new WaveManager(this.stats.level, this.config.canvasWidth)
      this.invaderGrid = this.waveManager.createWaveGrid()
      this.boss = null

      // Apply wave difficulty
      this.applyWaveDifficulty()
    }

    // Clear projectiles and particles for clean start
    this.playerProjectiles = []
    this.enemyProjectiles = []
    this.particles = []
  }

  private async gameOver(): Promise<void> {
    this.state = GameState.GAME_OVER

    // Calculate play time
    const playTime = Math.floor((Date.now() - this.stats.startTime) / 1000)

    // Check and save high score
    if (this.stats.score > this.highScore) {
      this.highScore = this.stats.score
      this.saveHighScore(this.highScore)
    }

    // Save to leaderboard
    const leaderboardResult = LeaderboardManager.addScore({
      score: Math.floor(this.stats.score),
      level: Math.floor(this.stats.level),
      killCount: Math.floor(this.stats.killCount),
      accuracy: Math.floor(this.stats.accuracy),
      maxCombo: Math.floor(this.stats.maxCombo),
      bossKills: Math.floor(this.stats.bossKills),
      date: Date.now(),
      playTime
    })

    // Emit leaderboard event if made it to top 10
    if (leaderboardResult.rank !== null) {
      this.emit('leaderboardEntry', {
        rank: leaderboardResult.rank,
        isPersonalBest: leaderboardResult.isPersonalBest,
        score: this.stats.score
      })
    }

    // Check for newly unlocked achievements (async)
    try {
      const result = await AchievementManager.checkAchievementsAsync({
        score: Math.floor(this.stats.score),
        killCount: Math.floor(this.stats.killCount),
        maxCombo: Math.floor(this.stats.maxCombo),
        level: Math.floor(this.stats.level),
        bossKills: Math.floor(this.stats.bossKills),
        accuracy: Math.floor(this.stats.accuracy)
      })

      // Emit achievements if any were unlocked
      if (result.newlyUnlocked.length > 0) {
        this.emit('achievementUnlocked', result.newlyUnlocked)
      }
    } catch (error) {
      console.error('Failed to check achievements:', error)
    }

    // Update global statistics
    StatisticsManager.updateAfterGame(
      this.sessionStats,
      Math.floor(this.stats.score),
      Math.floor(this.stats.level),
      Math.floor(this.stats.accuracy),
      Math.floor(this.stats.maxCombo)
    )

    this.emit('gameOver', this.stats)
    this.stop()

    // Play menu music again when game is over
    this.soundEffects.playMenuMusic()
  }

  private loadHighScore(): number {
    try {
      const stored = localStorage.getItem(this.HIGH_SCORE_KEY)
      return stored ? parseInt(stored, 10) : 0
    } catch (err) {
      console.warn('Failed to load high score:', err)
      return 0
    }
  }

  private saveHighScore(score: number): void {
    try {
      localStorage.setItem(this.HIGH_SCORE_KEY, score.toString())
    } catch (err) {
      console.warn('Failed to save high score:', err)
    }
  }

  getHighScore(): number {
    return this.highScore
  }

  reloadPlayerSkin(): void {
    if (!this.player) return

    // Save current player state
    const currentPosition = { ...this.player.position }
    const currentLives = this.player.lives
    const currentAlive = this.player.alive
    const currentInvulnerable = this.player.invulnerable
    const currentInvulnerableStartTime = this.player.invulnerableStartTime

    // Get the newly selected skin
    const selectedSkin = SkinManager.getSelectedSkin()

    // Create new player with the new skin
    this.player = new Player(this.config.canvasWidth, this.config.canvasHeight, selectedSkin)

    // Restore player state
    this.player.position = currentPosition
    this.player.lives = currentLives
    this.player.alive = currentAlive
    this.player.invulnerable = currentInvulnerable
    this.player.invulnerableStartTime = currentInvulnerableStartTime
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.soundEffects.stopMusic()
  }

  getState(): string {
    return this.state
  }

  getStats(): GameStats {
    return { ...this.stats }
  }

  on(event: GameEventName, callback: GameEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  private emit(event: GameEventName, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  setMusicVolume(volume: number): void {
    this.soundEffects.setMusicVolume(volume)
  }

  setSfxVolume(volume: number): void {
    this.soundEffects.setEffectsVolume(volume)
  }

  playTestSound(): void {
    this.soundEffects.playSound('explosion')
  }

  updateSettings(settings: typeof SettingsManager.getSettings extends () => infer R ? R : never): void {
    // Update audio settings
    this.soundEffects.setMusicVolume(settings.musicVolume / 100)
    this.soundEffects.setEffectsVolume(settings.sfxVolume / 100)

    // Update difficulty
    this.difficulty = settings.difficulty

    // Update graphics settings
    this.graphicsQuality = settings.graphicsQuality
    this.particlesEnabled = settings.particlesEnabled
    this.visualEffectsEnabled = settings.visualEffects

    // Update gameplay settings
    this.showFPS = settings.showFPS
  }

  getDifficultyModifier(): number {
    const baseMod = {
      easy: 0.7,
      normal: 1.0,
      hard: 1.5
    }[this.difficulty]

    // Enhanced progressive scaling: faster increase at higher levels
    // Levels 1-5: 5% per level
    // Levels 6-10: 8% per level
    // Levels 11+: 10% per level (capped at 3x base)
    let levelModifier = 1.0
    const level = this.stats.level

    if (level <= 5) {
      levelModifier = 1 + ((level - 1) * 0.05)
    } else if (level <= 10) {
      levelModifier = 1.2 + ((level - 5) * 0.08)
    } else {
      levelModifier = Math.min(1.6 + ((level - 10) * 0.10), 3.0)
    }

    return baseMod * levelModifier
  }

  getShootProbabilityModifier(): number {
    const baseMod = {
      easy: 0.5,
      normal: 1.0,
      hard: 2.0
    }[this.difficulty]

    // Enhanced shooting frequency: more aggressive at higher levels
    // Levels 1-5: 3% per level
    // Levels 6-10: 5% per level
    // Levels 11+: 7% per level (capped at 2.5x base)
    let levelModifier = 1.0
    const level = this.stats.level

    if (level <= 5) {
      levelModifier = 1 + ((level - 1) * 0.03)
    } else if (level <= 10) {
      levelModifier = 1.12 + ((level - 5) * 0.05)
    } else {
      levelModifier = Math.min(1.37 + ((level - 10) * 0.07), 2.5)
    }

    return baseMod * levelModifier
  }

  getParticleCountForQuality(): number {
    const counts = {
      low: 5,
      medium: 10,
      high: 15
    }
    return counts[this.graphicsQuality]
  }

  private getRandomBonusType(): BonusType {
    const rand = Math.random()

    // Power-up and weapon probabilities (total 100%)
    if (rand < 0.25) return 'score'             // 25% - Score bonus
    if (rand < 0.35) return 'life'              // 10% - Extra life
    if (rand < 0.45) return 'shield'            // 10% - Shield
    if (rand < 0.55) return 'multishot'         // 10% - Multi-shot (legacy)
    if (rand < 0.63) return 'rapidfire'         //  8% - Rapid fire (legacy)
    if (rand < 0.70) return 'slowmo'            //  7% - Slow motion
    if (rand < 0.75) return 'multiplier'        //  5% - Score multiplier
    if (rand < 0.78) return 'nuke'              //  3% - Nuke

    // Special weapons (22% total)
    if (rand < 0.83) return 'weapon_laser'      //  5% - Laser
    if (rand < 0.88) return 'weapon_spread'     //  5% - Spread
    if (rand < 0.92) return 'weapon_missile'    //  4% - Missile
    if (rand < 0.96) return 'weapon_lightning'  //  4% - Lightning
    return 'weapon_bomb'                        //  4% - Bomb
  }

  private updateBonuses(deltaTime: number): void {
    // Spawn bonus
    this.bonusSpawnTimer += deltaTime
    if (this.bonusSpawnTimer >= this.bonusSpawnInterval) {
      const bonusType = this.getRandomBonusType()
      this.bonuses.push(new Bonus(this.config.canvasWidth, this.config.canvasHeight, bonusType))
      this.bonusSpawnTimer = 0
    }

    // Update bonuses
    this.bonuses.forEach(bonus => bonus.update())
    this.bonuses = this.bonuses.filter(bonus => !bonus.isOffScreen())

    // Check if buff expired
    if (this.playerBuff.active) {
      const currentTime = Date.now()
      if (currentTime - this.playerBuff.startTime >= this.playerBuff.duration) {
        this.playerBuff.active = false
      }
    }
  }

  private checkBonusCollision(): void {
    if (!this.player) return

    this.bonuses = this.bonuses.filter((bonus, index) => {
      if (bonus.collidesWith(this.player!)) {
        this.soundEffects.playSound('bonus')
        this.activatePowerUp(bonus.type, bonus.value)
        this.createExplosion(bonus.position.x + bonus.width / 2, bonus.position.y + bonus.height / 2, bonus.color)
        return false // Remove bonus
      }
      return true // Keep bonus
    })
  }

  private activatePowerUp(type: BonusType, value: number): void {
    const currentTime = Date.now()

    // Track power-up collection in session stats
    this.sessionStats.powerUpsCollected[type]++

    switch (type) {
      case 'life':
        this.player!.lives++
        if (this.player!.lives > 3) this.player!.lives = 3 // Cap at 3 lives for balance
        this.emit('livesChange', this.player!.lives)
        break

      case 'shield':
        this.activePowerUps.set('shield', { startTime: currentTime, duration: value })
        this.player!.invulnerable = true
        this.player!.invulnerableStartTime = currentTime
        this.player!.invulnerableDuration = value
        break

      case 'multishot':
        this.activePowerUps.set('multishot', { startTime: currentTime, duration: value })
        break

      case 'rapidfire':
        this.activePowerUps.set('rapidfire', { startTime: currentTime, duration: value })
        break

      case 'nuke':
        // Destroy all invaders instantly!
        if (this.invaderGrid) {
          this.invaderGrid.invaders.forEach(invader => {
            if (invader.alive) {
              invader.alive = false
              this.addScore(INVADER_SCORE)
              this.trackKill()
              this.createExplosion(invader.position.x, invader.position.y, '#FF0000')
            }
          })
        }
        // Damage boss heavily
        if (this.boss && this.boss.alive) {
          this.boss.hit(50)
          this.createExplosion(
            this.boss.position.x + this.boss.width / 2,
            this.boss.position.y + this.boss.height / 2,
            '#FF0000'
          )
        }
        // Massive screen shake for nuke
        this.triggerScreenShake(20, 600)
        break

      case 'slowmo':
        this.activePowerUps.set('slowmo', { startTime: currentTime, duration: value })
        break

      case 'multiplier':
        this.activePowerUps.set('multiplier', { startTime: currentTime, duration: value })
        this.scoreMultiplier = 2
        break

      case 'score':
        this.playerBuff.active = true
        this.playerBuff.startTime = currentTime
        this.addScore(value)
        break

      case 'weapon_laser':
        this.switchWeapon(WeaponType.LASER)
        break

      case 'weapon_spread':
        this.switchWeapon(WeaponType.SPREAD)
        break

      case 'weapon_missile':
        this.switchWeapon(WeaponType.MISSILE)
        break

      case 'weapon_bomb':
        this.switchWeapon(WeaponType.BOMB)
        break

      case 'weapon_lightning':
        this.switchWeapon(WeaponType.LIGHTNING)
        break
    }
  }

  private switchWeapon(weaponType: WeaponType): void {
    // Track weapon usage in session stats
    this.sessionStats.weaponsUsed.add(weaponType)

    // Create new weapon if not exists
    if (!this.weapons.has(weaponType)) {
      this.weapons.set(weaponType, new Weapon(weaponType))
    }

    // Switch to weapon
    this.currentWeapon = this.weapons.get(weaponType)!

    // If it's a new weapon (not normal), reinitialize it
    if (weaponType !== WeaponType.NORMAL) {
      this.weapons.set(weaponType, new Weapon(weaponType))
      this.currentWeapon = this.weapons.get(weaponType)!
    }
  }

  private updatePowerUps(): void {
    const currentTime = Date.now()
    const expiredPowerUps: string[] = []

    this.activePowerUps.forEach((powerUp, type) => {
      const elapsed = currentTime - powerUp.startTime
      if (elapsed >= powerUp.duration) {
        expiredPowerUps.push(type)

        // Deactivate power-up effects
        switch (type) {
          case 'shield':
            if (this.player) {
              this.player.invulnerable = false
            }
            break
          case 'multiplier':
            this.scoreMultiplier = 1
            break
        }
      }
    })

    // Remove expired power-ups
    expiredPowerUps.forEach(type => this.activePowerUps.delete(type))
  }

  isPowerUpActive(type: string): boolean {
    return this.activePowerUps.has(type)
  }

  getPowerUpTimeLeft(type: string): number {
    const powerUp = this.activePowerUps.get(type)
    if (!powerUp) return 0

    const elapsed = Date.now() - powerUp.startTime
    return Math.max(0, powerUp.duration - elapsed)
  }

  private drawBonuses(): void {
    this.bonuses.forEach(bonus => bonus.draw(this.ctx))
  }

  private drawBuffIndicator(): void {
    if (!this.playerBuff.active) return

    const currentTime = Date.now()
    const timeLeft = this.playerBuff.duration - (currentTime - this.playerBuff.startTime)
    const progress = timeLeft / this.playerBuff.duration

    // Buff progress bar
    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)'
    this.ctx.fillRect(20, 20, 200 * progress, 10)

    this.ctx.strokeStyle = '#FFD700'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(20, 20, 200, 10)

    // Buff text
    this.ctx.fillStyle = '#FFD700'
    this.ctx.font = 'bold 14px Arial'
    this.ctx.fillText('MEGA DESTRUCTION', 20, 45)
  }

  private drawPauseIndicator(): void {
    const centerX = this.config.canvasWidth / 2
    const centerY = this.config.canvasHeight / 2

    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight)

    // Pause menu box
    const boxWidth = 400
    const boxHeight = 350
    const boxX = centerX - boxWidth / 2
    const boxY = centerY - boxHeight / 2

    // Box background with border
    this.ctx.fillStyle = 'rgba(20, 20, 40, 0.95)'
    this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight)

    this.ctx.strokeStyle = '#4A90E2'
    this.ctx.lineWidth = 3
    this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)

    this.ctx.textAlign = 'center'

    // Pause title
    this.ctx.fillStyle = '#4A90E2'
    this.ctx.font = 'bold 48px Arial'
    this.ctx.fillText('⏸ PAUSED', centerX, boxY + 60)

    // Current stats
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = '20px Arial'
    let yOffset = boxY + 120

    this.ctx.fillText(`Score: ${this.stats.score}`, centerX, yOffset)
    yOffset += 30
    this.ctx.fillText(`Level: ${this.stats.level}`, centerX, yOffset)
    yOffset += 30
    this.ctx.fillText(`Lives: ${this.stats.lives}`, centerX, yOffset)
    yOffset += 30
    this.ctx.fillText(`Combo: ${this.stats.combo}x`, centerX, yOffset)
    yOffset += 30
    this.ctx.fillText(`Accuracy: ${Math.floor(this.stats.accuracy)}%`, centerX, yOffset)

    // Instructions
    yOffset += 60
    this.ctx.fillStyle = '#FFD700'
    this.ctx.font = '18px Arial'
    this.ctx.fillText('Press ESC or P to Resume', centerX, yOffset)

    yOffset += 30
    this.ctx.fillStyle = '#999'
    this.ctx.font = '16px Arial'
    this.ctx.fillText('Refresh page to Quit', centerX, yOffset)

    // Reset text alignment
    this.ctx.textAlign = 'left'
  }

  private drawComboIndicator(): void {
    if (this.stats.combo < 2) return // Only show combo for 2+ kills

    // Position on right side of screen
    const x = this.config.canvasWidth - 150
    const y = 80

    // Combo background
    this.ctx.fillStyle = 'rgba(255, 100, 0, 0.8)'
    this.ctx.fillRect(x, y, 140, 60)

    this.ctx.strokeStyle = '#FF6B00'
    this.ctx.lineWidth = 3
    this.ctx.strokeRect(x, y, 140, 60)

    // Combo text
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = 'bold 16px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('COMBO', x + 70, y + 25)

    // Combo value
    this.ctx.font = 'bold 28px Arial'
    this.ctx.fillStyle = '#FFD700'
    this.ctx.fillText(`x${this.stats.combo}`, x + 70, y + 50)

    // Reset text alignment
    this.ctx.textAlign = 'left'
  }

  private drawPowerUpIndicators(): void {
    if (this.activePowerUps.size === 0) return

    const startX = 20
    let startY = 80 // Start below the buff indicator
    const barWidth = 180
    const barHeight = 35
    const spacing = 10

    // Power-up display config
    const powerUpConfig: Record<string, { name: string; color: string; icon: string }> = {
      shield: { name: 'SHIELD', color: '#00E5FF', icon: '🛡️' },
      multishot: { name: 'MULTI-SHOT', color: '#FF6D00', icon: '⚡' },
      rapidfire: { name: 'RAPID FIRE', color: '#AA00FF', icon: '🚀' },
      slowmo: { name: 'SLOW MOTION', color: '#304FFE', icon: '⏱️' },
      multiplier: { name: 'x2 SCORE', color: '#FFD600', icon: '✨' }
    }

    this.activePowerUps.forEach((powerUp, type) => {
      const config = powerUpConfig[type]
      if (!config) return

      const timeLeft = this.getPowerUpTimeLeft(type)
      const progress = timeLeft / powerUp.duration

      // Background
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      this.ctx.fillRect(startX, startY, barWidth, barHeight)

      // Progress bar
      this.ctx.fillStyle = config.color
      this.ctx.fillRect(startX + 2, startY + 2, (barWidth - 4) * progress, barHeight - 4)

      // Border
      this.ctx.strokeStyle = config.color
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(startX, startY, barWidth, barHeight)

      // Icon and name
      this.ctx.fillStyle = '#FFFFFF'
      this.ctx.font = 'bold 14px Arial'
      this.ctx.textAlign = 'left'
      this.ctx.fillText(`${config.icon} ${config.name}`, startX + 8, startY + 15)

      // Time remaining
      const secondsLeft = Math.ceil(timeLeft / 1000)
      this.ctx.font = 'bold 12px Arial'
      this.ctx.fillStyle = progress < 0.3 ? '#FF0000' : '#FFFFFF' // Red when almost expired
      this.ctx.fillText(`${secondsLeft}s`, startX + 8, startY + 30)

      startY += barHeight + spacing
    })

    // Reset text alignment
    this.ctx.textAlign = 'left'
  }

  private drawWaveIndicator(): void {
    // Only show wave indicator for non-boss levels with wave manager
    if (this.isBossLevel || !this.waveManager) return

    const waveConfig = this.waveManager.getWaveConfig()

    // Position at top center of screen, below the score UI
    const x = this.config.canvasWidth / 2
    const y = 80

    // Draw semi-transparent background
    this.ctx.save()
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    this.ctx.fillRect(x - 80, y - 25, 160, 40)

    // Draw border
    this.ctx.strokeStyle = '#00ff88'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(x - 80, y - 25, 160, 40)

    // Draw wave text
    this.ctx.fillStyle = '#00ff88'
    this.ctx.font = 'bold 18px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(`WAVE ${waveConfig.waveNumber}/${waveConfig.totalWaves}`, x, y)

    // If wave is complete and waiting for next wave, show countdown
    if (this.waveManager.isWaveComplete() && this.waveManager.hasMoreWaves()) {
      const timeUntilNext = this.waveManager.getTimeUntilNextWave()
      if (timeUntilNext > 0) {
        const secondsLeft = Math.ceil(timeUntilNext / 1000)
        this.ctx.fillStyle = '#FFD700'
        this.ctx.font = 'bold 14px monospace'
        this.ctx.fillText(`Next wave in ${secondsLeft}s`, x, y + 30)
      }
    }

    this.ctx.restore()
  }

  private drawWeaponIndicator(): void {
    // Only show if not using normal weapon
    if (this.currentWeapon.type === WeaponType.NORMAL) return

    this.ctx.save()

    // Position at bottom right
    const x = this.config.canvasWidth - 200
    const y = this.config.canvasHeight - 80

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    this.ctx.fillRect(x, y, 190, 70)

    // Border
    this.ctx.strokeStyle = this.currentWeapon.stats.color
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(x, y, 190, 70)

    // Weapon name and icon
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = 'bold 16px monospace'
    this.ctx.textAlign = 'left'
    this.ctx.fillText(`${this.currentWeapon.stats.icon} ${this.currentWeapon.stats.name}`, x + 10, y + 25)

    // Show ammo or duration
    if (this.currentWeapon.stats.ammo > 0) {
      // Ammo-based weapon
      const ammo = this.currentWeapon.getAmmoLeft()
      this.ctx.fillStyle = ammo <= 2 ? '#FF0000' : '#00ff88'
      this.ctx.font = 'bold 20px monospace'
      this.ctx.fillText(`AMMO: ${ammo}`, x + 10, y + 50)
    } else if (this.currentWeapon.stats.duration > 0) {
      // Time-based weapon
      const timeLeft = this.currentWeapon.getTimeLeft()
      const secondsLeft = Math.ceil(timeLeft / 1000)
      const percent = this.currentWeapon.getRemainingPercent()

      // Progress bar
      this.ctx.fillStyle = 'rgba(50, 50, 50, 0.8)'
      this.ctx.fillRect(x + 10, y + 40, 170, 15)

      this.ctx.fillStyle = percent > 30 ? this.currentWeapon.stats.color : '#FF0000'
      this.ctx.fillRect(x + 10, y + 40, (170 * percent) / 100, 15)

      // Border
      this.ctx.strokeStyle = '#FFFFFF'
      this.ctx.lineWidth = 1
      this.ctx.strokeRect(x + 10, y + 40, 170, 15)

      // Time text
      this.ctx.fillStyle = '#FFFFFF'
      this.ctx.font = 'bold 12px monospace'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(`${secondsLeft}s`, x + 95, y + 52)
    }

    this.ctx.restore()
  }

  private drawTutorialMessage(): void {
    const message = this.tutorial.getCurrentMessage()
    if (!message) return

    const centerX = this.config.canvasWidth / 2
    const centerY = this.config.canvasHeight / 2

    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    this.ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight)

    // Tutorial message box
    const boxWidth = Math.min(600, this.config.canvasWidth - 40)
    const boxHeight = message.highlight ? 280 : 220
    const boxX = centerX - boxWidth / 2
    const boxY = centerY - boxHeight / 2

    // Box background with gradient
    const gradient = this.ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxHeight)
    gradient.addColorStop(0, 'rgba(30, 30, 60, 0.98)')
    gradient.addColorStop(1, 'rgba(20, 20, 40, 0.98)')
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight)

    // Box border with glow
    this.ctx.shadowColor = '#4A90E2'
    this.ctx.shadowBlur = 15
    this.ctx.strokeStyle = '#4A90E2'
    this.ctx.lineWidth = 3
    this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)
    this.ctx.shadowBlur = 0

    this.ctx.textAlign = 'center'

    // Title
    this.ctx.fillStyle = '#FFD700'
    this.ctx.font = 'bold 32px Arial'
    this.ctx.fillText(message.title, centerX, boxY + 50)

    // Message (wrapped)
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = '18px Arial'
    const lines = message.message.split('\n')
    let yOffset = boxY + 95

    lines.forEach((line, index) => {
      // Check if line starts with bullet point
      if (line.trim().startsWith('•')) {
        this.ctx.textAlign = 'left'
        this.ctx.fillText(line, boxX + 40, yOffset + index * 28)
      } else {
        this.ctx.textAlign = 'center'
        this.ctx.fillText(line, centerX, yOffset + index * 28)
      }
    })

    // Highlight text (if present)
    if (message.highlight) {
      yOffset += lines.length * 28 + 20
      this.ctx.textAlign = 'center'
      this.ctx.fillStyle = '#00FF88'
      this.ctx.font = 'bold 20px Arial'
      this.ctx.fillText(message.highlight, centerX, yOffset)
    }

    // Instructions (only for welcome stage)
    if (this.tutorial.getStage() === 'welcome') {
      this.ctx.fillStyle = '#999'
      this.ctx.font = '14px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('ENTER to continue  |  ESC to skip', centerX, boxY + boxHeight - 20)
    }

    // Reset text alignment
    this.ctx.textAlign = 'left'
  }

  // Leaderboard methods
  getLeaderboard() {
    return LeaderboardManager.getLeaderboard()
  }

  getPlayerProfile() {
    return LeaderboardManager.getPlayerProfile()
  }

  updatePlayerProfile(profile: Parameters<typeof LeaderboardManager.updatePlayerProfile>[0]) {
    LeaderboardManager.updatePlayerProfile(profile)
  }

  getLeaderboardStats() {
    return LeaderboardManager.getStats()
  }

  // Statistics methods
  getStatistics() {
    return StatisticsManager.getStatistics()
  }

  getStatisticsSummary() {
    return StatisticsManager.getSummary()
  }

  clearStatistics() {
    StatisticsManager.clearStatistics()
  }

  destroy(): void {
    this.stop()
    this.eventListeners.clear()
  }
}

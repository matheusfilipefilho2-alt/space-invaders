import type { Position, Size } from './types'
import { Projectile } from './Projectile'

export interface BossStats {
  maxHealth: number
  currentHealth: number
  damage: number
  speed: number
  shootCooldown: number
}

export interface BossReward {
  score: number
  goldBonus: number
  guaranteedPowerUp?: string
}

export class Boss implements Size {
  position: Position
  width: number
  height: number
  stats: BossStats
  alive: boolean
  image: HTMLImageElement
  movementPattern: 'horizontal' | 'circular' | 'zigzag'
  movementTimer: number
  direction: number
  lastShootTime: number
  canvasWidth: number
  canvasHeight: number
  phase: number // Boss phases: 1, 2, 3 (gets harder)
  level: number // Track which level this boss is from
  isEntering: boolean
  targetY: number
  entrySpeed: number
  phaseTransitionEffectTimer: number
  isTransitioning: boolean

  constructor(canvasWidth: number, canvasHeight: number, level: number) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.width = 150
    this.height = 150
    this.level = level

    // Calculate boss number in sequence (1st boss at level 2, 2nd at 7, 3rd at 12, etc.)
    // Formula: level 2 = boss 1, then every 5 levels = next boss
    const bossNumber = level === 2 ? 1 : Math.floor((level - 2) / 5) + 1
    const difficultyScale = bossNumber - 1 // 0 for first boss, 1 for second, etc.
    const levelBonus = (bossNumber - 1) * 5 // Bonus progression similar to old system

    this.stats = {
      // HP scales more aggressively: 100 -> 150 -> 250 -> 400 -> 600...
      maxHealth: 100 + (difficultyScale * 50) + (levelBonus * 25),
      currentHealth: 100 + (difficultyScale * 50) + (levelBonus * 25),
      damage: 1,
      // Speed increases more: 2 -> 2.5 -> 3.25 -> 4 -> 4.75...
      speed: 2 + (difficultyScale * 0.5) + (levelBonus * 0.15),
      // Shoots much faster at high levels: 1500 -> 1400 -> 1200 -> 900 -> 500 (min)
      shootCooldown: Math.max(500, 1500 - (difficultyScale * 100) - (levelBonus * 50))
    }

    // Start above screen for dramatic entrance
    this.position = {
      x: canvasWidth / 2 - this.width / 2,
      y: -this.height
    }
    this.targetY = 100
    this.isEntering = true
    this.entrySpeed = 2

    this.alive = true
    this.movementPattern = this.getRandomMovementPattern()
    this.movementTimer = 0
    this.direction = 1
    this.lastShootTime = 0
    this.phase = 1
    this.phaseTransitionEffectTimer = 0
    this.isTransitioning = false

    // Load boss image
    this.image = new Image()
    this.image.src = '/assets/images/invader_red.gif' // TODO: Add unique boss sprite
  }

  private getRandomMovementPattern(): 'horizontal' | 'circular' | 'zigzag' {
    const patterns: ('horizontal' | 'circular' | 'zigzag')[] = ['horizontal', 'circular', 'zigzag']
    return patterns[Math.floor(Math.random() * patterns.length)]
  }

  update(deltaTime: number): void {
    if (!this.alive) return

    // Handle entrance animation
    if (this.isEntering) {
      this.position.y += this.entrySpeed
      if (this.position.y >= this.targetY) {
        this.position.y = this.targetY
        this.isEntering = false
      }
      return
    }

    // Update phase based on health with dramatic transitions
    const healthPercent = this.stats.currentHealth / this.stats.maxHealth
    const previousPhase = this.phase

    if (healthPercent <= 0.33 && this.phase < 3) {
      this.phase = 3
      this.isTransitioning = true
      this.phaseTransitionEffectTimer = 1000 // 1 second effect
      this.stats.shootCooldown = Math.max(500, this.stats.shootCooldown - 200)
      console.log(`🔥 Boss entered PHASE 3 (Enraged)! HP: ${Math.floor(healthPercent * 100)}%`)
    } else if (healthPercent <= 0.66 && this.phase < 2) {
      this.phase = 2
      this.isTransitioning = true
      this.phaseTransitionEffectTimer = 800 // 0.8 second effect
      this.stats.shootCooldown = Math.max(700, this.stats.shootCooldown - 100)
      console.log(`⚡ Boss entered PHASE 2 (Aggressive)! HP: ${Math.floor(healthPercent * 100)}%`)
    }

    // Handle phase transition effect
    if (this.isTransitioning) {
      this.phaseTransitionEffectTimer -= deltaTime
      if (this.phaseTransitionEffectTimer <= 0) {
        this.isTransitioning = false
      }
    }

    // Movement patterns
    this.movementTimer += deltaTime
    const speed = this.stats.speed

    switch (this.movementPattern) {
      case 'horizontal':
        this.position.x += speed * this.direction
        if (this.position.x <= 0 || this.position.x >= this.canvasWidth - this.width) {
          this.direction *= -1
        }
        break

      case 'circular':
        const angle = this.movementTimer / 1000
        const radius = 100
        const centerX = this.canvasWidth / 2
        this.position.x = centerX + Math.cos(angle) * radius - this.width / 2
        this.position.y = this.targetY + Math.sin(angle * 0.5) * 30
        break

      case 'zigzag':
        this.position.x += speed * this.direction
        this.position.y = this.targetY + Math.sin(this.movementTimer / 300) * 40
        if (this.position.x <= 0 || this.position.x >= this.canvasWidth - this.width) {
          this.direction *= -1
        }
        break
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return

    // Draw boss sprite
    ctx.save()

    // Add damage flash effect in phase 3
    if (this.phase === 3 && Math.floor(Date.now() / 200) % 2 === 0) {
      ctx.filter = 'brightness(1.5) saturate(2)'
    }

    ctx.drawImage(
      this.image,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    )

    ctx.restore()

    // Draw health bar
    this.drawHealthBar(ctx)

    // Draw boss name/title
    this.drawBossTitle(ctx)
  }

  private drawHealthBar(ctx: CanvasRenderingContext2D): void {
    const barWidth = 200
    const barHeight = 20
    const barX = this.canvasWidth / 2 - barWidth / 2
    const barY = 30

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4)

    // Red background
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(barX, barY, barWidth, barHeight)

    // Health fill (changes color by phase)
    const healthPercent = this.stats.currentHealth / this.stats.maxHealth
    const healthWidth = barWidth * healthPercent

    // Enhanced color scheme based on phase
    let healthColor = '#00ff00' // Green (Phase 1)
    let glowColor = 'rgba(0, 255, 0, 0.5)'

    if (this.phase === 3) {
      healthColor = '#ff0000' // Red (Phase 3 - Enraged)
      glowColor = 'rgba(255, 0, 0, 0.8)'
    } else if (this.phase === 2) {
      healthColor = '#ffaa00' // Orange (Phase 2 - Aggressive)
      glowColor = 'rgba(255, 170, 0, 0.6)'
    }

    // Add glow effect during phase transition
    if (this.isTransitioning) {
      const pulseIntensity = Math.sin(Date.now() / 100) * 0.5 + 0.5
      ctx.shadowBlur = 20 * pulseIntensity
      ctx.shadowColor = glowColor
    }

    ctx.fillStyle = healthColor
    ctx.fillRect(barX, barY, healthWidth, barHeight)

    // Reset shadow
    ctx.shadowBlur = 0

    // Border (thicker during phase transition)
    ctx.strokeStyle = this.isTransitioning ? healthColor : '#ffffff'
    ctx.lineWidth = this.isTransitioning ? 3 : 2
    ctx.strokeRect(barX, barY, barWidth, barHeight)

    // Health text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      `${this.stats.currentHealth} / ${this.stats.maxHealth}`,
      this.canvasWidth / 2,
      barY + barHeight / 2
    )

    // Phase indicator
    if (this.phase > 1) {
      ctx.fillStyle = this.phase === 3 ? '#ff0000' : '#ffaa00'
      ctx.font = 'bold 10px monospace'
      ctx.fillText(`PHASE ${this.phase}`, this.canvasWidth / 2, barY - 10)
    }
  }

  private drawBossTitle(ctx: CanvasRenderingContext2D): void {
    ctx.save()

    // Phase-based colors and titles
    let titleColor = '#ff0000'
    let phaseText = ''

    if (this.phase === 3) {
      titleColor = '#ff0000'
      phaseText = '🔥 ENRAGED 🔥'
    } else if (this.phase === 2) {
      titleColor = '#ffaa00'
      phaseText = '⚡ AGGRESSIVE ⚡'
    } else {
      titleColor = '#ff0000'
      phaseText = '⚠️ BOSS ⚠️'
    }

    // Add pulsing effect during phase transition
    let shadowBlur = 10
    if (this.isTransitioning) {
      const pulseIntensity = Math.sin(Date.now() / 50) * 0.5 + 0.5
      shadowBlur = 10 + (pulseIntensity * 20)
      titleColor = this.phase === 3 ? '#ff0000' : (this.phase === 2 ? '#ffaa00' : '#ff0000')
    }

    ctx.fillStyle = titleColor
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'center'
    ctx.shadowColor = titleColor
    ctx.shadowBlur = shadowBlur
    ctx.fillText(phaseText, this.canvasWidth / 2, 15)

    ctx.restore()
  }

  shoot(): Projectile[] {
    const projectiles: Projectile[] = []
    const centerX = this.position.x + this.width / 2
    const centerY = this.position.y + this.height

    // Determine boss tier for unique attack patterns
    // Boss 1 (level 2), Boss 2 (level 7), Boss 3 (level 12), etc.
    const bossTier = this.level === 2 ? 1 : Math.floor((this.level - 2) / 5) + 1

    // Phase 1: Basic attacks
    if (this.phase === 1) {
      if (bossTier === 1) {
        // Boss 1 (Level 5): Single shot
        projectiles.push(new Projectile(centerX, centerY, false))
      } else if (bossTier === 2) {
        // Boss 2 (Level 10): Double shot
        projectiles.push(new Projectile(centerX - 15, centerY, false))
        projectiles.push(new Projectile(centerX + 15, centerY, false))
      } else {
        // Boss 3+ (Level 15+): Triple shot even in phase 1
        projectiles.push(new Projectile(centerX - 20, centerY, false))
        projectiles.push(new Projectile(centerX, centerY, false))
        projectiles.push(new Projectile(centerX + 20, centerY, false))
      }
    }
    // Phase 2: Medium attacks
    else if (this.phase === 2) {
      if (bossTier === 1) {
        // Boss 1: Triple shot
        projectiles.push(new Projectile(centerX - 20, centerY, false))
        projectiles.push(new Projectile(centerX, centerY, false))
        projectiles.push(new Projectile(centerX + 20, centerY, false))
      } else if (bossTier === 2) {
        // Boss 2: Spread of 5
        for (let i = -2; i <= 2; i++) {
          projectiles.push(new Projectile(centerX + (i * 15), centerY, false))
        }
      } else {
        // Boss 3+: Wide spread of 7
        for (let i = -3; i <= 3; i++) {
          projectiles.push(new Projectile(centerX + (i * 20), centerY, false))
        }
      }
    }
    // Phase 3: Desperate/Enraged attacks
    else if (this.phase === 3) {
      if (bossTier === 1) {
        // Boss 1: Spread of 5
        for (let i = -2; i <= 2; i++) {
          projectiles.push(new Projectile(centerX + (i * 15), centerY, false))
        }
      } else if (bossTier === 2) {
        // Boss 2: Spread of 7
        for (let i = -3; i <= 3; i++) {
          projectiles.push(new Projectile(centerX + (i * 18), centerY, false))
        }
      } else if (bossTier === 3) {
        // Boss 3: Spread of 9 (very wide)
        for (let i = -4; i <= 4; i++) {
          projectiles.push(new Projectile(centerX + (i * 20), centerY, false))
        }
      } else {
        // Boss 4+: Circular pattern (11 projectiles)
        const numProjectiles = 11
        for (let i = 0; i < numProjectiles; i++) {
          const angle = (i / numProjectiles) * Math.PI - Math.PI / 2
          const offsetX = Math.sin(angle) * 100
          projectiles.push(new Projectile(centerX + offsetX, centerY, false))
        }
      }
    }

    return projectiles
  }

  canShoot(currentTime: number): boolean {
    return currentTime - this.lastShootTime >= this.stats.shootCooldown
  }

  updateLastShootTime(time: number): void {
    this.lastShootTime = time
  }

  hit(damage: number = 1): void {
    if (!this.alive) return

    this.stats.currentHealth -= damage

    if (this.stats.currentHealth <= 0) {
      this.stats.currentHealth = 0
      this.alive = false
    }
  }

  getHealthPercent(): number {
    return this.stats.currentHealth / this.stats.maxHealth
  }

  isDefeated(): boolean {
    return !this.alive
  }

  getReward(): BossReward {
    // Enhanced rewards scale with boss tier
    // Boss 1 (level 2), Boss 2 (level 7), Boss 3 (level 12), etc.
    const bossTier = this.level === 2 ? 1 : Math.floor((this.level - 2) / 5) + 1

    // Base rewards
    const baseScore = 5000
    const baseGold = 50

    // Scale rewards exponentially with boss tier
    const scoreMultiplier = 1 + ((bossTier - 1) * 0.5) // 1x, 1.5x, 2x, 2.5x, 3x...
    const goldMultiplier = 1 + ((bossTier - 1) * 0.3)  // 1x, 1.3x, 1.6x, 1.9x, 2.2x...

    // Guaranteed power-ups for higher tier bosses
    const guaranteedPowerUps = [
      undefined,              // Tier 1 (level 2): no guaranteed
      'weapon_laser',        // Tier 2 (level 7): laser weapon
      'weapon_spread',       // Tier 3 (level 12): spread weapon
      'weapon_missile',      // Tier 4 (level 17): missile weapon
      'weapon_lightning'     // Tier 5+ (level 22+): lightning weapon
    ]

    return {
      score: Math.floor(baseScore * scoreMultiplier),
      goldBonus: Math.floor(baseGold * goldMultiplier),
      guaranteedPowerUp: guaranteedPowerUps[Math.min(bossTier - 1, 4)]
    }
  }

  isInPhaseTransition(): boolean {
    return this.isTransitioning
  }

  getPhase(): number {
    return this.phase
  }
}

import type { Position, Size } from './types'
import type { Projectile } from './Projectile'
import { INVADER_WIDTH, INVADER_HEIGHT } from './constants'

export enum InvaderType {
  BASIC = 'basic',
  FAST = 'fast',
  TANK = 'tank',
  SNIPER = 'sniper',
  SHIELD = 'shield'
}

export interface InvaderStats {
  hp: number
  maxHp: number
  scoreValue: number
  speedMultiplier: number
  shootMultiplier: number
  color: string
  imagePath: string
}

export const INVADER_TYPE_STATS: Record<InvaderType, Omit<InvaderStats, 'hp' | 'maxHp'> & { maxHp: number }> = {
  [InvaderType.BASIC]: {
    maxHp: 1,
    scoreValue: 100,
    speedMultiplier: 1.0,
    shootMultiplier: 1.0,
    color: '#00ff88',
    imagePath: '/assets/images/invader.png'
  },
  [InvaderType.FAST]: {
    maxHp: 1,
    scoreValue: 150,
    speedMultiplier: 1.5,
    shootMultiplier: 0.8,
    color: '#00E5FF',
    imagePath: '/assets/images/invader_blue.gif'
  },
  [InvaderType.TANK]: {
    maxHp: 3,
    scoreValue: 300,
    speedMultiplier: 0.7,
    shootMultiplier: 0.6,
    color: '#FF6B6B',
    imagePath: '/assets/images/invader_red.gif'
  },
  [InvaderType.SNIPER]: {
    maxHp: 1,
    scoreValue: 200,
    speedMultiplier: 0.8,
    shootMultiplier: 2.0,
    color: '#AA00FF',
    imagePath: '/assets/images/invader_purple.gif'
  },
  [InvaderType.SHIELD]: {
    maxHp: 2,
    scoreValue: 250,
    speedMultiplier: 0.9,
    shootMultiplier: 1.2,
    color: '#FFD600',
    imagePath: '/assets/images/invader_green.gif'
  }
}

export class Invader implements Position, Size {
  position: Position
  width: number
  height: number
  alive: boolean
  image: HTMLImageElement
  gridRow: number
  gridCol: number
  type: InvaderType
  stats: InvaderStats
  hp: number
  hasShield: boolean
  shieldColor: string

  constructor(x: number, y: number, type: InvaderType, gridRow: number, gridCol: number) {
    this.position = { x, y }
    this.width = INVADER_WIDTH
    this.height = INVADER_HEIGHT
    this.alive = true
    this.gridRow = gridRow
    this.gridCol = gridCol
    this.type = type

    // Load type-specific stats
    const typeStats = INVADER_TYPE_STATS[type]
    this.stats = {
      hp: typeStats.maxHp,
      maxHp: typeStats.maxHp,
      scoreValue: typeStats.scoreValue,
      speedMultiplier: typeStats.speedMultiplier,
      shootMultiplier: typeStats.shootMultiplier,
      color: typeStats.color,
      imagePath: typeStats.imagePath
    }

    this.hp = this.stats.maxHp
    this.hasShield = type === InvaderType.SHIELD
    this.shieldColor = '#FFD600'

    this.image = new Image()
    this.image.src = this.stats.imagePath
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return

    ctx.save()

    // Draw invader image
    ctx.drawImage(
      this.image,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    )

    // Draw shield indicator for shield type
    if (this.hasShield && this.type === InvaderType.SHIELD) {
      ctx.strokeStyle = this.shieldColor
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.6
      ctx.beginPath()
      ctx.arc(
        this.position.x + this.width / 2,
        this.position.y + this.height / 2,
        this.width / 2 + 4,
        0,
        Math.PI * 2
      )
      ctx.stroke()
      ctx.globalAlpha = 1.0
    }

    // Draw HP bar for multi-hp enemies
    if (this.stats.maxHp > 1) {
      const barWidth = this.width
      const barHeight = 4
      const barX = this.position.x
      const barY = this.position.y - 8

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(barX, barY, barWidth, barHeight)

      // HP bar
      const hpPercent = this.hp / this.stats.maxHp
      ctx.fillStyle = hpPercent > 0.5 ? '#00ff88' : hpPercent > 0.25 ? '#FFD600' : '#FF6B6B'
      ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight)

      // Border
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 1
      ctx.strokeRect(barX, barY, barWidth, barHeight)
    }

    ctx.restore()
  }

  takeDamage(damage: number = 1): boolean {
    // Shield absorbs first hit
    if (this.hasShield) {
      this.hasShield = false
      return false // Didn't kill the invader
    }

    this.hp -= damage
    if (this.hp <= 0) {
      this.alive = false
      return true // Killed the invader
    }

    return false // Damaged but still alive
  }

  hit(projectile: Projectile): boolean {
    // Point-based collision detection like original game
    return (
      projectile.position.x >= this.position.x &&
      projectile.position.x <= this.position.x + this.width &&
      projectile.position.y >= this.position.y &&
      projectile.position.y <= this.position.y + this.height
    )
  }

  collidesWith(target: Position & Size): boolean {
    return (
      this.position.x < target.x + target.width &&
      this.position.x + this.width > target.x &&
      this.position.y < target.y + target.height &&
      this.position.y + this.height > target.y
    )
  }
}

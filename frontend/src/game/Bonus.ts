import type { Position, Size } from './types'

export type BonusType = 'score' | 'life' | 'shield' | 'multishot' | 'rapidfire' | 'nuke' | 'slowmo' | 'multiplier' | 'weapon_laser' | 'weapon_spread' | 'weapon_missile' | 'weapon_bomb' | 'weapon_lightning'

export class Bonus implements Position, Size {
  position: Position
  width: number
  height: number
  velocity: number
  canvasHeight: number
  collected: boolean
  type: BonusType
  color: string
  glowColor: string
  icon: string
  value: number
  pulseAnimation: number

  constructor(canvasWidth: number, canvasHeight: number, type: BonusType = 'score') {
    this.width = 30
    this.height = 30
    this.velocity = 4

    // Random position at top of screen
    this.position = {
      x: Math.random() * (canvasWidth - this.width),
      y: -this.height
    }

    this.canvasHeight = canvasHeight
    this.collected = false
    this.type = type
    this.pulseAnimation = 0

    // Setup bonus type properties
    this.setupBonusType()
  }

  private setupBonusType(): void {
    switch (this.type) {
      case 'life':
        this.color = '#FF1744'
        this.glowColor = '#FF5722'
        this.icon = '❤️'
        this.value = 1
        break

      case 'shield':
        this.color = '#00E5FF'
        this.glowColor = '#00B8D4'
        this.icon = '🛡️'
        this.value = 5000 // Duration in ms
        break

      case 'multishot':
        this.color = '#FF6D00'
        this.glowColor = '#FF9100'
        this.icon = '⚡'
        this.value = 10000
        break

      case 'rapidfire':
        this.color = '#AA00FF'
        this.glowColor = '#D500F9'
        this.icon = '🚀'
        this.value = 8000
        break

      case 'nuke':
        this.color = '#DD2C00'
        this.glowColor = '#FF3D00'
        this.icon = '💣'
        this.value = 1 // Instant effect
        break

      case 'slowmo':
        this.color = '#304FFE'
        this.glowColor = '#536DFE'
        this.icon = '⏱️'
        this.value = 6000
        break

      case 'multiplier':
        this.color = '#FFD600'
        this.glowColor = '#FFEA00'
        this.icon = '✨'
        this.value = 10000
        break

      case 'weapon_laser':
        this.color = '#FF0000'
        this.glowColor = '#FF6666'
        this.icon = '━'
        this.value = 10000 // Duration in ms
        break

      case 'weapon_spread':
        this.color = '#00FFFF'
        this.glowColor = '#66FFFF'
        this.icon = '※'
        this.value = 15000
        break

      case 'weapon_missile':
        this.color = '#FFA500'
        this.glowColor = '#FFB833'
        this.icon = '⬆'
        this.value = 10 // Ammo count
        break

      case 'weapon_bomb':
        this.color = '#FF00FF'
        this.glowColor = '#FF66FF'
        this.icon = '💣'
        this.value = 5 // Ammo count
        break

      case 'weapon_lightning':
        this.color = '#FFFF00'
        this.glowColor = '#FFFF66'
        this.icon = '⚡'
        this.value = 12000
        break

      case 'score':
      default:
        this.color = '#FFD700'
        this.glowColor = '#FFA500'
        this.icon = '⭐'
        this.value = 100 // Extra points
        break
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // Pulse animation
    this.pulseAnimation += 0.2
    const pulse = Math.sin(this.pulseAnimation) * 0.2 + 1

    ctx.save()

    // Glow effect
    ctx.shadowColor = this.glowColor
    ctx.shadowBlur = 15

    ctx.fillStyle = this.color
    ctx.translate(this.position.x + this.width / 2, this.position.y + this.height / 2)
    ctx.scale(pulse, pulse)

    if (this.type === 'life') {
      this.drawHeart(ctx, 0, 0, this.width / 2)
    } else {
      this.drawStar(ctx, 0, 0, 8, this.width / 2, this.width / 4)
    }

    ctx.restore()
  }

  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = Math.PI / 2 * 3
    const step = Math.PI / spikes

    ctx.beginPath()
    ctx.moveTo(x, y - outerRadius)

    for (let i = 0; i < spikes; i++) {
      const x1 = x + Math.cos(rot) * outerRadius
      const y1 = y + Math.sin(rot) * outerRadius
      ctx.lineTo(x1, y1)
      rot += step

      const x2 = x + Math.cos(rot) * innerRadius
      const y2 = y + Math.sin(rot) * innerRadius
      ctx.lineTo(x2, y2)
      rot += step
    }

    ctx.lineTo(x, y - outerRadius)
    ctx.closePath()
    ctx.fill()
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath()

    const topCurveHeight = size * 0.3

    // Left side of heart
    ctx.moveTo(x, y + topCurveHeight)
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight)
    ctx.bezierCurveTo(
      x - size / 2, y + (topCurveHeight + size) / 2,
      x, y + (topCurveHeight + size) / 2,
      x, y + size
    )

    // Right side of heart
    ctx.bezierCurveTo(
      x, y + (topCurveHeight + size) / 2,
      x + size / 2, y + (topCurveHeight + size) / 2,
      x + size / 2, y + topCurveHeight
    )
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight)

    ctx.closePath()
    ctx.fill()
  }

  update(): void {
    this.position.y += this.velocity
  }

  isOffScreen(): boolean {
    return this.position.y > this.canvasHeight
  }

  // Check collision with player
  collidesWith(target: Position & Size): boolean {
    return (
      this.position.x < target.position.x + target.width &&
      this.position.x + this.width > target.position.x &&
      this.position.y < target.position.y + target.height &&
      this.position.y + this.height > target.position.y
    )
  }
}

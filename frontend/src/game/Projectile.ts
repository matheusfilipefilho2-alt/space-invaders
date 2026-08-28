import type { Position, Size, Velocity } from './types'
import {
  PROJECTILE_WIDTH,
  PROJECTILE_HEIGHT,
  PROJECTILE_VELOCITY,
  PROJECTILE_COLOR
} from './constants'

export type ProjectileType = 'normal' | 'destruction' | 'laser' | 'spread' | 'missile' | 'bomb' | 'lightning'

export class Projectile implements Position, Size, Velocity {
  position: Position
  width: number
  height: number
  x: number
  y: number
  isPlayerProjectile: boolean
  type: ProjectileType
  animationFrame: number
  glowIntensity: number
  angle: number // for spread shots
  velocityX: number
  velocityY: number
  target: any | null // for homing missiles
  piercing: boolean // for laser
  chainCount: number // for lightning

  constructor(x: number, y: number, isPlayerProjectile: boolean, type: ProjectileType = 'normal') {
    this.position = { x, y }
    this.x = x
    this.y = y

    // Size based on type
    if (type === 'destruction') {
      this.width = 4
      this.height = 30
    } else if (type === 'laser') {
      this.width = 3
      this.height = 25
    } else if (type === 'missile') {
      this.width = 6
      this.height = 12
    } else if (type === 'bomb') {
      this.width = 8
      this.height = 8
    } else if (type === 'lightning') {
      this.width = 4
      this.height = 20
    } else {
      this.width = PROJECTILE_WIDTH
      this.height = PROJECTILE_HEIGHT
    }

    this.isPlayerProjectile = isPlayerProjectile
    this.type = type
    this.animationFrame = 0
    this.glowIntensity = 0
    this.angle = 0
    this.velocityX = 0
    this.velocityY = isPlayerProjectile ? -PROJECTILE_VELOCITY : PROJECTILE_VELOCITY
    this.target = null
    this.piercing = type === 'laser'
    this.chainCount = type === 'lightning' ? 3 : 0
  }

  update(targets?: any[]): void {
    // Handle special weapon types
    switch (this.type) {
      case 'spread':
        this.updateSpread()
        break
      case 'missile':
        this.updateMissile(targets)
        break
      default:
        // Standard movement
        if (this.isPlayerProjectile) {
          this.position.y -= PROJECTILE_VELOCITY
          this.y -= PROJECTILE_VELOCITY
        } else {
          this.position.y += PROJECTILE_VELOCITY
          this.y += PROJECTILE_VELOCITY
        }
    }

    this.animationFrame++
  }

  private updateSpread(): void {
    // Move based on angle
    const radians = (this.angle * Math.PI) / 180
    const speed = PROJECTILE_VELOCITY

    this.velocityX = Math.sin(radians) * speed * 0.5
    this.velocityY = -Math.cos(radians) * speed

    this.position.x += this.velocityX
    this.position.y += this.velocityY
    this.x += this.velocityX
    this.y += this.velocityY
  }

  private updateMissile(targets?: any[]): void {
    if (!targets || targets.length === 0) {
      // No targets, move straight
      this.position.y += this.velocityY
      this.y += this.velocityY
      return
    }

    // Find nearest target or use current target
    if (!this.target || !this.target.alive) {
      this.target = this.findNearestTarget(targets)
    }

    if (this.target) {
      // Home towards target
      const targetX = this.target.position.x + this.target.width / 2
      const targetY = this.target.position.y + this.target.height / 2

      const dx = targetX - this.position.x
      const dy = targetY - this.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > 0) {
        const speed = PROJECTILE_VELOCITY * 1.2 // Slightly faster than normal
        const homingStrength = 0.3 // How strongly it homes

        this.velocityX += (dx / distance) * speed * homingStrength
        this.velocityY += (dy / distance) * speed * homingStrength

        // Limit velocity
        const currentSpeed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2)
        if (currentSpeed > speed) {
          this.velocityX = (this.velocityX / currentSpeed) * speed
          this.velocityY = (this.velocityY / currentSpeed) * speed
        }
      }
    }

    this.position.x += this.velocityX
    this.position.y += this.velocityY
    this.x += this.velocityX
    this.y += this.velocityY
  }

  private findNearestTarget(targets: any[]): any | null {
    let nearest = null
    let minDistance = Infinity

    targets.forEach(target => {
      if (!target.alive) return

      const dx = target.position.x - this.position.x
      const dy = target.position.y - this.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < minDistance) {
        minDistance = distance
        nearest = target
      }
    })

    return nearest
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save()

    switch (this.type) {
      case 'destruction':
        this.drawDestructionProjectile(ctx)
        break
      case 'laser':
        this.drawLaser(ctx)
        break
      case 'spread':
        this.drawSpread(ctx)
        break
      case 'missile':
        this.drawMissile(ctx)
        break
      case 'bomb':
        this.drawBomb(ctx)
        break
      case 'lightning':
        this.drawLightning(ctx)
        break
      default:
        ctx.fillStyle = PROJECTILE_COLOR
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
    }

    ctx.restore()
  }

  private drawLaser(ctx: CanvasRenderingContext2D): void {
    // Red laser beam with glow
    const gradient = ctx.createLinearGradient(
      this.position.x, this.position.y,
      this.position.x, this.position.y + this.height
    )
    gradient.addColorStop(0, '#FF0000')
    gradient.addColorStop(0.5, '#FF6666')
    gradient.addColorStop(1, '#FF0000')

    // Outer glow
    ctx.shadowBlur = 10
    ctx.shadowColor = '#FF0000'
    ctx.fillStyle = gradient
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height)

    // Bright core
    ctx.shadowBlur = 0
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(this.position.x + 1, this.position.y, 1, this.height)
  }

  private drawSpread(ctx: CanvasRenderingContext2D): void {
    // Cyan spread projectiles
    ctx.fillStyle = '#00FFFF'
    ctx.beginPath()
    ctx.arc(this.position.x + this.width / 2, this.position.y + this.height / 2, 3, 0, Math.PI * 2)
    ctx.fill()

    // Trail effect
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#00FFFF'
    ctx.beginPath()
    ctx.arc(this.position.x + this.width / 2, this.position.y + this.height / 2 + 5, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1.0
  }

  private drawMissile(ctx: CanvasRenderingContext2D): void {
    // Orange missile with flame trail
    const angle = Math.atan2(this.velocityY, this.velocityX)

    ctx.translate(this.position.x + this.width / 2, this.position.y + this.height / 2)
    ctx.rotate(angle + Math.PI / 2)

    // Missile body
    ctx.fillStyle = '#FFA500'
    ctx.fillRect(-3, -6, 6, 12)

    // Nose cone
    ctx.fillStyle = '#FF4500'
    ctx.beginPath()
    ctx.moveTo(-3, -6)
    ctx.lineTo(0, -9)
    ctx.lineTo(3, -6)
    ctx.fill()

    // Flame trail
    ctx.globalAlpha = 0.6
    const flameSize = 3 + Math.sin(this.animationFrame * 0.5) * 2
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(0, 8, flameSize, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1.0
  }

  private drawBomb(ctx: CanvasRenderingContext2D): void {
    // Purple bomb
    this.glowIntensity = Math.sin(this.animationFrame * 0.2) * 0.5 + 0.5

    ctx.shadowBlur = 15
    ctx.shadowColor = '#FF00FF'
    ctx.fillStyle = `rgba(255, 0, 255, ${0.8 + this.glowIntensity * 0.2})`
    ctx.beginPath()
    ctx.arc(this.position.x + this.width / 2, this.position.y + this.height / 2, 4, 0, Math.PI * 2)
    ctx.fill()

    // Fuse spark
    ctx.shadowBlur = 5
    ctx.fillStyle = '#FFFFFF'
    const sparkY = this.position.y - 2 - Math.sin(this.animationFrame * 0.3) * 2
    ctx.fillRect(this.position.x + this.width / 2 - 1, sparkY, 2, 2)
  }

  private drawLightning(ctx: CanvasRenderingContext2D): void {
    // Yellow lightning bolt
    ctx.strokeStyle = '#FFFF00'
    ctx.lineWidth = 2
    ctx.shadowBlur = 10
    ctx.shadowColor = '#FFFF00'

    ctx.beginPath()
    ctx.moveTo(this.position.x + this.width / 2, this.position.y)

    // Jagged lightning path
    const segments = 4
    for (let i = 1; i <= segments; i++) {
      const y = this.position.y + (this.height / segments) * i
      const x = this.position.x + this.width / 2 + (Math.random() - 0.5) * 6
      ctx.lineTo(x, y)
    }

    ctx.stroke()

    // Bright core
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1
    ctx.shadowBlur = 0
    ctx.stroke()
  }

  private drawDestructionProjectile(ctx: CanvasRenderingContext2D): void {
    // Pulsing glow animation
    this.glowIntensity = Math.sin(this.animationFrame * 0.3) * 0.5 + 0.5

    // Draw outer aura
    const gradient = ctx.createRadialGradient(
      this.position.x + this.width / 2, this.position.y + this.height / 2, 0,
      this.position.x + this.width / 2, this.position.y + this.height / 2, 15
    )
    gradient.addColorStop(0, `rgba(255, 0, 100, ${this.glowIntensity * 0.8})`)
    gradient.addColorStop(0.5, `rgba(255, 50, 150, ${this.glowIntensity * 0.4})`)
    gradient.addColorStop(1, 'rgba(255, 0, 100, 0)')

    ctx.fillStyle = gradient
    ctx.fillRect(
      this.position.x - 10, this.position.y - 10,
      this.width + 20, this.height + 20
    )

    // Draw projectile core
    ctx.fillStyle = `rgb(255, ${50 + this.glowIntensity * 100}, ${100 + this.glowIntensity * 155})`
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height)

    // Draw bright center line
    ctx.fillStyle = 'white'
    ctx.fillRect(
      this.position.x + this.width / 2 - 0.5, this.position.y,
      1, this.height
    )
  }

  isOffScreen(canvasHeight: number): boolean {
    return this.position.y < 0 || this.position.y > canvasHeight
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

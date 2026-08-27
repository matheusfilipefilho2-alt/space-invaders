import type { Position, Size, Velocity } from './types'
import {
  PROJECTILE_WIDTH,
  PROJECTILE_HEIGHT,
  PROJECTILE_VELOCITY,
  PROJECTILE_COLOR
} from './constants'

export class Projectile implements Position, Size, Velocity {
  position: Position
  width: number
  height: number
  x: number
  y: number
  isPlayerProjectile: boolean

  constructor(x: number, y: number, isPlayerProjectile: boolean) {
    this.position = { x, y }
    this.x = x
    this.y = y
    this.width = PROJECTILE_WIDTH
    this.height = PROJECTILE_HEIGHT
    this.isPlayerProjectile = isPlayerProjectile
  }

  update(): void {
    if (this.isPlayerProjectile) {
      this.position.y -= PROJECTILE_VELOCITY
      this.y -= PROJECTILE_VELOCITY
    } else {
      this.position.y += PROJECTILE_VELOCITY
      this.y += PROJECTILE_VELOCITY
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = PROJECTILE_COLOR
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
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

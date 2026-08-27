import type { Position, Size } from './types'
import { OBSTACLE_WIDTH, OBSTACLE_HEIGHT, OBSTACLE_COLOR } from './constants'

export class Obstacle implements Position, Size {
  position: Position
  width: number
  height: number
  health: number
  maxHealth: number
  color: string

  constructor(x: number, y: number) {
    this.position = { x, y }
    this.width = OBSTACLE_WIDTH
    this.height = OBSTACLE_HEIGHT
    this.health = 100
    this.maxHealth = 100
    this.color = OBSTACLE_COLOR
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.health <= 0) return

    // Draw obstacle with opacity based on health
    ctx.save()
    ctx.globalAlpha = this.health / this.maxHealth
    ctx.fillStyle = this.color
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
    ctx.restore()
  }

  hit(damage: number = 25): void {
    this.health -= damage
    if (this.health < 0) this.health = 0
  }

  isDestroyed(): boolean {
    return this.health <= 0
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

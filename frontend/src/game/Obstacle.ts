import type { Position, Size } from './types'
import { OBSTACLE_WIDTH, OBSTACLE_HEIGHT, OBSTACLE_COLOR } from './constants'
import type { Projectile } from './Projectile'

export class Obstacle implements Position, Size {
  position: Position
  width: number
  height: number
  color: string

  constructor(x: number, y: number) {
    this.position = { x, y }
    this.width = OBSTACLE_WIDTH
    this.height = OBSTACLE_HEIGHT
    this.color = OBSTACLE_COLOR
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
  }

  update(): void {
    // Empty method for compatibility with game loop
  }

  // Point-based collision detection like original
  collidesWithProjectile(projectile: Projectile): boolean {
    const projectileY = projectile.isPlayerProjectile
      ? projectile.position.y
      : projectile.position.y + projectile.height

    return (
      projectile.position.x >= this.position.x &&
      projectile.position.x <= this.position.x + this.width &&
      projectileY >= this.position.y &&
      projectileY <= this.position.y + this.height
    )
  }
}

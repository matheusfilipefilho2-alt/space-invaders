import type { Position } from './types'
import { STAR_MIN_RADIUS, STAR_MAX_RADIUS } from './constants'

export class Star implements Position {
  position: Position
  x: number
  y: number
  radius: number
  velocity: number
  color: string
  canvasWidth: number
  canvasHeight: number

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight

    this.position = {
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight
    }
    this.x = this.position.x
    this.y = this.position.y

    // Radius between 0.3 and 1.3 (like original)
    this.radius = Math.random() * (STAR_MAX_RADIUS - STAR_MIN_RADIUS) + STAR_MIN_RADIUS

    // Velocity varies based on radius (like original)
    this.velocity = (Math.random() * 0.4 + 0.1) * this.radius

    this.color = 'white'
  }

  update(canvasHeight: number): void {
    this.position.y += this.velocity
    this.y += this.velocity

    // Reset to top when off bottom (with new random X position)
    if (this.position.y > canvasHeight + this.radius) {
      this.position.y = -this.radius
      this.y = -this.radius
      this.position.x = Math.random() * this.canvasWidth
      this.x = this.position.x
      // Recalculate velocity
      this.velocity = (Math.random() * 0.4 + 0.1) * this.radius
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

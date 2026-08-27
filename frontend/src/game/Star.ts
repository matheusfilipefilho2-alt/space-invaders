import type { Position } from './types'
import { STAR_MIN_RADIUS, STAR_MAX_RADIUS, STAR_VELOCITY } from './constants'

export class Star implements Position {
  position: Position
  x: number
  y: number
  radius: number
  velocity: number
  color: string

  constructor(canvasWidth: number, canvasHeight: number) {
    this.position = {
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight
    }
    this.x = this.position.x
    this.y = this.position.y
    this.radius = Math.random() * (STAR_MAX_RADIUS - STAR_MIN_RADIUS) + STAR_MIN_RADIUS
    this.velocity = STAR_VELOCITY
    this.color = '#FFFFFF'
  }

  update(canvasHeight: number): void {
    this.position.y += this.velocity
    this.y += this.velocity

    // Reset to top when off bottom
    if (this.position.y > canvasHeight) {
      this.position.y = 0
      this.y = 0
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

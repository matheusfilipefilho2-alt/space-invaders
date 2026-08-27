import type { Position, Velocity } from './types'
import { PARTICLE_SIZE, PARTICLE_VELOCITY, PARTICLE_FADE_RATE } from './constants'

export class Particle implements Position, Velocity {
  position: Position
  x: number
  y: number
  velocity: Velocity
  size: number
  color: string
  opacity: number

  constructor(x: number, y: number, color: string = '#FFFFFF') {
    this.position = { x, y }
    this.x = x
    this.y = y
    this.velocity = {
      x: (Math.random() - 0.5) * PARTICLE_VELOCITY * 2,
      y: (Math.random() - 0.5) * PARTICLE_VELOCITY * 2
    }
    this.size = PARTICLE_SIZE
    this.color = color
    this.opacity = 1
  }

  update(): void {
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y
    this.x += this.velocity.x
    this.y += this.velocity.y
    this.opacity -= PARTICLE_FADE_RATE
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.opacity <= 0) return

    ctx.save()
    ctx.globalAlpha = this.opacity
    ctx.fillStyle = this.color
    ctx.fillRect(this.position.x, this.position.y, this.size, this.size)
    ctx.restore()
  }

  isDead(): boolean {
    return this.opacity <= 0
  }
}

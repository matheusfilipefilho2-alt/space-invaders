import type { Position, Velocity } from './types'
import { Invader } from './Invader'
import { Projectile } from './Projectile'
import {
  INVADER_ROWS,
  INVADER_COLUMNS,
  INVADER_WIDTH,
  INVADER_HEIGHT,
  INVADER_SPACING,
  INVADER_VELOCITY_X,
  INVADER_VELOCITY_Y,
  INVADER_SHOOT_PROBABILITY
} from './constants'

export class InvaderGrid {
  invaders: Invader[]
  velocity: Velocity
  position: Position

  constructor() {
    this.invaders = []
    this.velocity = { x: INVADER_VELOCITY_X, y: 0 }
    this.position = { x: 50, y: 50 }

    this.initializeGrid()
  }

  private initializeGrid(): void {
    for (let row = 0; row < INVADER_ROWS; row++) {
      for (let col = 0; col < INVADER_COLUMNS; col++) {
        const x = this.position.x + col * (INVADER_WIDTH + INVADER_SPACING)
        const y = this.position.y + row * (INVADER_HEIGHT + INVADER_SPACING)
        this.invaders.push(new Invader(x, y))
      }
    }
  }

  update(canvasWidth: number, canvasHeight: number): void {
    // Check if grid hits canvas edges
    const rightEdge = this.invaders
      .filter(inv => inv.alive)
      .reduce((max, inv) => Math.max(max, inv.position.x + inv.width), 0)

    const leftEdge = this.invaders
      .filter(inv => inv.alive)
      .reduce((min, inv) => Math.min(min, inv.position.x), canvasWidth)

    // Reverse direction and move down if hit edge
    if (rightEdge >= canvasWidth || leftEdge <= 0) {
      this.velocity.x *= -1
      this.invaders.forEach(invader => {
        if (invader.alive) {
          invader.position.y += INVADER_VELOCITY_Y
        }
      })
    }

    // Move all invaders horizontally
    this.invaders.forEach(invader => {
      if (invader.alive) {
        invader.position.x += this.velocity.x
      }
    })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.invaders.forEach(invader => invader.draw(ctx))
  }

  shoot(): Projectile | null {
    const aliveInvaders = this.invaders.filter(inv => inv.alive)
    if (aliveInvaders.length === 0) return null

    // Random chance to shoot
    if (Math.random() < INVADER_SHOOT_PROBABILITY) {
      const randomInvader = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)]
      return new Projectile(
        randomInvader.position.x + randomInvader.width / 2,
        randomInvader.position.y + randomInvader.height,
        false // enemy projectile
      )
    }

    return null
  }

  getAliveCount(): number {
    return this.invaders.filter(inv => inv.alive).length
  }

  isAllDead(): boolean {
    return this.getAliveCount() === 0
  }

  reset(): void {
    this.invaders = []
    this.velocity = { x: INVADER_VELOCITY_X, y: 0 }
    this.position = { x: 50, y: 50 }
    this.initializeGrid()
  }
}

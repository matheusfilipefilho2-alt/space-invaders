import type { Position, Size } from './types'
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_VELOCITY,
  PLAYER_INITIAL_LIVES,
  PATH_PLAYER_IMAGE
} from './constants'

export class Player implements Position, Size {
  position: Position
  width: number
  height: number
  velocity: number
  alive: boolean
  lives: number
  image: HTMLImageElement
  canvasWidth: number
  canvasHeight: number

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.width = PLAYER_WIDTH
    this.height = PLAYER_HEIGHT
    this.velocity = PLAYER_VELOCITY
    this.alive = true
    this.lives = PLAYER_INITIAL_LIVES

    this.position = {
      x: canvasWidth / 2 - this.width / 2,
      y: canvasHeight - this.height - 30
    }

    this.image = new Image()
    this.image.src = PATH_PLAYER_IMAGE
  }

  update(keys: Record<string, boolean>): void {
    if (keys.ArrowLeft && this.position.x > 0) {
      this.position.x -= this.velocity
    }

    if (keys.ArrowRight && this.position.x < this.canvasWidth - this.width) {
      this.position.x += this.velocity
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return

    // Draw spaceship image
    ctx.drawImage(
      this.image,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    )
  }

  shoot(): any {
    // Projectile class will be implemented in Task 3
    // For now, return null to allow tests to pass
    return null
  }

  hit(): void {
    this.lives--
    if (this.lives <= 0) {
      this.alive = false
    }
  }

  reset(): void {
    this.position.x = this.canvasWidth / 2 - this.width / 2
    this.position.y = this.canvasHeight - this.height - 30
    this.alive = true
    this.lives = PLAYER_INITIAL_LIVES
  }
}

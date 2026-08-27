import type { Position, Size } from './types'
import { INVADER_WIDTH, INVADER_HEIGHT, PATH_INVADER_IMAGE } from './constants'

export class Invader implements Position, Size {
  position: Position
  width: number
  height: number
  alive: boolean
  image: HTMLImageElement

  constructor(x: number, y: number) {
    this.position = { x, y }
    this.width = INVADER_WIDTH
    this.height = INVADER_HEIGHT
    this.alive = true

    this.image = new Image()
    this.image.src = PATH_INVADER_IMAGE
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return

    ctx.drawImage(
      this.image,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    )
  }

  hit(): void {
    this.alive = false
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

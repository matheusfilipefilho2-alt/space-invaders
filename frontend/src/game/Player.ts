import type { Position, Size } from './types'
import { Projectile, type ProjectileType } from './Projectile'
import type { Skin } from './Skins'
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_VELOCITY,
  PLAYER_INITIAL_LIVES,
  INITIAL_FRAMES
} from './constants'

export class Player implements Size {
  position: Position
  width: number
  height: number
  velocity: number
  alive: boolean
  lives: number
  image: HTMLImageElement
  engineImage: HTMLImageElement
  engineSprites: HTMLImageElement
  sx: number
  framesCounter: number
  canvasWidth: number
  canvasHeight: number
  invulnerable: boolean
  invulnerableStartTime: number
  invulnerableDuration: number
  blinkInterval: number
  skin: Skin

  constructor(canvasWidth: number, canvasHeight: number, skin: Skin) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.width = PLAYER_WIDTH
    this.height = PLAYER_HEIGHT
    this.velocity = PLAYER_VELOCITY
    this.alive = true
    this.lives = PLAYER_INITIAL_LIVES
    this.skin = skin

    this.position = {
      x: canvasWidth / 2 - this.width / 2,
      y: canvasHeight - this.height - 30
    }

    this.image = new Image()
    this.image.src = skin.shipImage

    this.engineImage = new Image()
    this.engineImage.src = skin.engineImage

    this.engineSprites = new Image()
    this.engineSprites.src = skin.engineSprites

    this.sx = 0
    this.framesCounter = INITIAL_FRAMES

    // Invulnerability system
    this.invulnerable = false
    this.invulnerableStartTime = 0
    this.invulnerableDuration = 2000 // 2 seconds
    this.blinkInterval = 100 // Blink every 100ms
  }

  update(keys: Record<string, boolean>): void {
    if (keys.ArrowLeft && this.position.x > 0) {
      this.position.x -= this.velocity
    }

    if (keys.ArrowRight && this.position.x < this.canvasWidth - this.width) {
      this.position.x += this.velocity
    }

    // Update engine animation
    if (this.framesCounter === 0) {
      this.sx = this.sx === 96 ? 0 : this.sx + 48
      this.framesCounter = INITIAL_FRAMES
    }
    this.framesCounter--

    // Check invulnerability timer
    if (this.invulnerable) {
      const elapsed = Date.now() - this.invulnerableStartTime
      if (elapsed >= this.invulnerableDuration) {
        this.invulnerable = false
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return

    // Blink effect during invulnerability
    if (this.invulnerable) {
      const elapsed = Date.now() - this.invulnerableStartTime
      const blinkPhase = Math.floor(elapsed / this.blinkInterval) % 2
      if (blinkPhase === 0) {
        // Skip drawing on blink off phase
        return
      }
    }

    // Draw spaceship image
    ctx.drawImage(
      this.image,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    )

    // Draw engine sprites (animated)
    ctx.drawImage(
      this.engineSprites,
      this.sx,              // Source X position in sprite sheet
      0,                    // Source Y
      48,                   // Source width
      48,                   // Source height
      this.position.x,      // Destination X
      this.position.y + 3,  // Destination Y (slightly offset)
      this.width,           // Destination width
      this.height           // Destination height
    )

    // Draw engine image overlay
    ctx.drawImage(
      this.engineImage,
      this.position.x,
      this.position.y + 1,
      this.width,
      this.height
    )
  }

  shoot(type: ProjectileType = 'normal'): Projectile {
    const xOffset = type === 'destruction' ? -2 : -1
    return new Projectile(
      this.position.x + this.width / 2 + xOffset,
      this.position.y,
      true,
      type
    )
  }

  hit(): void {
    this.lives--
    if (this.lives <= 0) {
      this.alive = false
    } else {
      // Reset player position to center when hit (like original game)
      this.position.x = this.canvasWidth / 2 - this.width / 2
      this.position.y = this.canvasHeight - this.height - 30

      // Activate invulnerability after hit
      this.invulnerable = true
      this.invulnerableStartTime = Date.now()
    }
  }

  isInvulnerable(): boolean {
    return this.invulnerable
  }

  reset(): void {
    this.position.x = this.canvasWidth / 2 - this.width / 2
    this.position.y = this.canvasHeight - this.height - 30
    this.alive = true
    this.lives = PLAYER_INITIAL_LIVES
    this.invulnerable = false
    this.invulnerableStartTime = 0
  }
}

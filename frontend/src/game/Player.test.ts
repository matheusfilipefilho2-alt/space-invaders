import { describe, it, expect, beforeEach } from 'vitest'
import { Player } from './Player'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants'

describe('Player', () => {
  let player: Player

  beforeEach(() => {
    player = new Player(CANVAS_WIDTH, CANVAS_HEIGHT)
  })

  it('should initialize at bottom center', () => {
    expect(player.position.x).toBeGreaterThan(0)
    expect(player.position.y).toBe(CANVAS_HEIGHT - player.height - 30)
  })

  it('should move left when left key pressed', () => {
    const initialX = player.position.x
    player.update({ ArrowLeft: true })
    expect(player.position.x).toBeLessThan(initialX)
  })

  it('should move right when right key pressed', () => {
    const initialX = player.position.x
    player.update({ ArrowRight: true })
    expect(player.position.x).toBeGreaterThan(initialX)
  })

  it('should not move beyond left boundary', () => {
    player.position.x = 0
    player.update({ ArrowLeft: true })
    expect(player.position.x).toBeGreaterThanOrEqual(0)
  })

  it('should not move beyond right boundary', () => {
    player.position.x = CANVAS_WIDTH - player.width
    player.update({ ArrowRight: true })
    expect(player.position.x).toBeLessThanOrEqual(CANVAS_WIDTH - player.width)
  })

  it('should be alive initially', () => {
    expect(player.alive).toBe(true)
  })

  it('should have correct lives count', () => {
    expect(player.lives).toBe(3)
  })
})

import { describe, it, expect } from 'vitest'
import type { Position, Velocity, Size } from './types'

describe('Game Types', () => {
  it('Position should have x and y coordinates', () => {
    const pos: Position = { x: 100, y: 200 }
    expect(pos.x).toBe(100)
    expect(pos.y).toBe(200)
  })

  it('Velocity should have x and y speeds', () => {
    const vel: Velocity = { x: 5, y: -3 }
    expect(vel.x).toBe(5)
    expect(vel.y).toBe(-3)
  })

  it('Size should have width and height', () => {
    const size: Size = { width: 48, height: 48 }
    expect(size.width).toBe(48)
    expect(size.height).toBe(48)
  })
})

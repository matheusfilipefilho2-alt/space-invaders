import { describe, it, expect } from 'vitest'
import { InvaderGrid } from './InvaderGrid'
import { INVADER_ROWS, INVADER_COLUMNS } from './constants'

describe('InvaderGrid', () => {
  it('should create grid with correct dimensions', () => {
    const grid = new InvaderGrid()
    expect(grid.invaders.length).toBe(INVADER_ROWS * INVADER_COLUMNS)
  })

  it('should move right initially', () => {
    const grid = new InvaderGrid()
    const initialX = grid.invaders[0].position.x

    grid.update(800, 600)

    expect(grid.invaders[0].position.x).toBeGreaterThan(initialX)
  })

  it('should count alive invaders correctly', () => {
    const grid = new InvaderGrid()
    const initialCount = grid.getAliveCount()

    grid.invaders[0].hit()

    expect(grid.getAliveCount()).toBe(initialCount - 1)
  })

  it('should return true when all dead', () => {
    const grid = new InvaderGrid()
    grid.invaders.forEach(inv => inv.hit())
    expect(grid.isAllDead()).toBe(true)
  })
})

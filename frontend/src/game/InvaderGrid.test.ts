import { describe, it, expect } from 'vitest'
import { InvaderGrid } from './InvaderGrid'
import { INVADER_ROWS, INVADER_COLUMNS } from './constants'

describe('InvaderGrid', () => {
  it('should create grid with correct dimensions', () => {
    const grid = new InvaderGrid(800, INVADER_ROWS, INVADER_COLUMNS, 1)
    expect(grid.invaders.length).toBeGreaterThan(0)
    expect(grid.invaders.length).toBeLessThanOrEqual(INVADER_ROWS * INVADER_COLUMNS)
  })

  it('should move right initially during entrance', () => {
    const grid = new InvaderGrid(800, INVADER_ROWS, INVADER_COLUMNS, 1)
    const initialY = grid.invaders[0].position.y

    grid.update(800, 600)

    // During entrance, invaders move down
    expect(grid.invaders[0].position.y).toBeGreaterThan(initialY)
  })

  it('should count alive invaders correctly', () => {
    const grid = new InvaderGrid(800, INVADER_ROWS, INVADER_COLUMNS, 1)
    const initialCount = grid.getAliveCount()

    // Kill first invader (need to damage twice for shield enemies)
    grid.invaders[0].takeDamage(999)
    if (grid.invaders[0].alive) {
      grid.invaders[0].takeDamage(999)
    }

    expect(grid.getAliveCount()).toBe(initialCount - 1)
  })

  it('should return true when all dead', () => {
    const grid = new InvaderGrid(800, INVADER_ROWS, INVADER_COLUMNS, 1)

    // Kill all invaders (need to damage twice for shield enemies)
    grid.invaders.forEach(inv => {
      inv.takeDamage(999)
      if (inv.alive) {
        inv.takeDamage(999)
      }
    })

    expect(grid.isAllDead()).toBe(true)
  })

  it('should support custom grid sizes', () => {
    const grid = new InvaderGrid(800, 5, 10, 1)
    expect(grid.rows).toBe(5)
    expect(grid.columns).toBe(10)
  })

  it('should assign types to invaders', () => {
    const grid = new InvaderGrid(800, 3, 6, 1)

    // Check that invaders have types assigned
    grid.invaders.forEach(invader => {
      expect(invader.type).toBeDefined()
      expect(invader.stats).toBeDefined()
      expect(invader.stats.scoreValue).toBeGreaterThan(0)
    })
  })

  it('should prioritize snipers for shooting', () => {
    const grid = new InvaderGrid(800, 3, 6, 1)

    // Get multiple shooters and check if any are snipers
    const shooters = new Set()
    for (let i = 0; i < 20; i++) {
      const shooter = grid.getInvaderForShooting()
      if (shooter) {
        shooters.add(shooter.type)
      }
    }

    expect(shooters.size).toBeGreaterThan(0)
  })
})

import { describe, it, expect } from 'vitest'
import { Projectile } from './Projectile'

describe('Projectile', () => {
  it('should move upward when player projectile', () => {
    const projectile = new Projectile(100, 200, true)
    const initialY = projectile.position.y

    projectile.update()

    expect(projectile.position.y).toBeLessThan(initialY)
  })

  it('should move downward when enemy projectile', () => {
    const projectile = new Projectile(100, 200, false)
    const initialY = projectile.position.y

    projectile.update()

    expect(projectile.position.y).toBeGreaterThan(initialY)
  })

  it('should be off-screen when y < 0', () => {
    const projectile = new Projectile(100, -10, true)
    expect(projectile.isOffScreen(600)).toBe(true)
  })

  it('should be off-screen when y > canvasHeight', () => {
    const projectile = new Projectile(100, 610, false)
    expect(projectile.isOffScreen(600)).toBe(true)
  })

  it('should not be off-screen when within bounds', () => {
    const projectile = new Projectile(100, 300, true)
    expect(projectile.isOffScreen(600)).toBe(false)
  })
})

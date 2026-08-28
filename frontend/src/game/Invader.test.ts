import { describe, it, expect } from 'vitest'
import { Invader, InvaderType } from './Invader'
import { Projectile } from './Projectile'

describe('Invader', () => {
  it('should initialize at given position', () => {
    const invader = new Invader(100, 200, InvaderType.BASIC, 0, 0)
    expect(invader.position.x).toBe(100)
    expect(invader.position.y).toBe(200)
  })

  it('should be alive initially', () => {
    const invader = new Invader(0, 0, InvaderType.BASIC, 0, 0)
    expect(invader.alive).toBe(true)
  })

  it('should detect projectile collision', () => {
    const invader = new Invader(100, 100, InvaderType.BASIC, 0, 0)
    const projectile = new Projectile(110, 110, true)

    const hit = invader.hit(projectile)
    expect(hit).toBe(true)
  })

  it('should not detect collision when projectile misses', () => {
    const invader = new Invader(100, 100, InvaderType.BASIC, 0, 0)
    const projectile = new Projectile(200, 200, true)

    const hit = invader.hit(projectile)
    expect(hit).toBe(false)
  })

  it('should store grid position', () => {
    const invader = new Invader(100, 100, InvaderType.BASIC, 2, 3)
    expect(invader.gridRow).toBe(2)
    expect(invader.gridCol).toBe(3)
  })
})

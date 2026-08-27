import { describe, it, expect } from 'vitest'
import { Invader } from './Invader'

describe('Invader', () => {
  it('should initialize at given position', () => {
    const invader = new Invader(100, 200)
    expect(invader.position.x).toBe(100)
    expect(invader.position.y).toBe(200)
  })

  it('should be alive initially', () => {
    const invader = new Invader(0, 0)
    expect(invader.alive).toBe(true)
  })

  it('should die when hit', () => {
    const invader = new Invader(0, 0)
    invader.hit()
    expect(invader.alive).toBe(false)
  })
})

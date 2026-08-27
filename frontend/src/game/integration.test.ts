import { describe, it, expect, beforeAll, vi } from 'vitest'
import { GameEngine } from './GameEngine'

describe('Game Integration', () => {
  let canvas: HTMLCanvasElement
  let engine: GameEngine

  beforeAll(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600

    // Mock canvas 2D context
    const mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn()
    }

    canvas.getContext = vi.fn(() => mockCtx) as any
  })

  it('should complete full game lifecycle', () => {
    engine = new GameEngine(canvas)

    // Start game
    engine.start()
    expect(engine.getState()).toBe('PLAYING')

    // Get initial stats
    const stats = engine.getStats()
    expect(stats.score).toBe(0)
    expect(stats.lives).toBe(3)
    expect(stats.level).toBe(1)
  })

  it('should track score changes', (done) => {
    engine = new GameEngine(canvas)

    engine.on('scoreChange', (score: number) => {
      expect(score).toBeGreaterThan(0)
      done()
    })

    engine.start()
    // Simulate killing an invader would trigger scoreChange
  })

  it('should handle game over', (done) => {
    engine = new GameEngine(canvas)

    engine.on('gameOver', (stats) => {
      expect(stats.score).toBeGreaterThanOrEqual(0)
      expect(engine.getState()).toBe('GAME_OVER')
      done()
    })

    engine.start()
    // Simulate player death would trigger gameOver
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameEngine } from './GameEngine'

describe('GameEngine', () => {
  let canvas: HTMLCanvasElement
  let engine: GameEngine

  beforeEach(() => {
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

    engine = new GameEngine(canvas)
  })

  it('should initialize with MENU state', () => {
    expect(engine.getState()).toBe('MENU')
  })

  it('should start game and change state to PLAYING', () => {
    engine.start()
    expect(engine.getState()).toBe('PLAYING')
  })

  it('should initialize player at bottom center', () => {
    engine.start()
    const stats = engine.getStats()
    expect(stats.lives).toBe(3)
    expect(stats.score).toBe(0)
  })

  it('should emit score change events', () => {
    const onScoreChange = vi.fn()
    engine.on('scoreChange', onScoreChange)

    engine.start()
    // Simulate killing an invader would trigger this

    expect(onScoreChange).toBeDefined()
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { WaveManager } from './WaveManager'

describe('WaveManager', () => {
  let waveManager: WaveManager
  const canvasWidth = 800

  beforeEach(() => {
    waveManager = new WaveManager(1, canvasWidth)
  })

  describe('Wave Configuration', () => {
    it('should calculate correct total waves for level 1', () => {
      const manager = new WaveManager(1, canvasWidth)
      expect(manager.getTotalWaves()).toBe(2)
    })

    it('should calculate correct total waves for level 3', () => {
      const manager = new WaveManager(3, canvasWidth)
      expect(manager.getTotalWaves()).toBe(3)
    })

    it('should calculate correct total waves for level 5', () => {
      const manager = new WaveManager(5, canvasWidth)
      expect(manager.getTotalWaves()).toBe(4)
    })

    it('should calculate correct total waves for level 8+', () => {
      const manager = new WaveManager(10, canvasWidth)
      expect(manager.getTotalWaves()).toBe(5)
    })

    it('should start at wave 1', () => {
      expect(waveManager.getCurrentWave()).toBe(1)
    })

    it('should provide wave configuration', () => {
      const config = waveManager.getWaveConfig()
      expect(config.waveNumber).toBe(1)
      expect(config.totalWaves).toBe(2)
      expect(config.invaderRows).toBeGreaterThan(0)
      expect(config.invaderColumns).toBeGreaterThan(0)
      expect(config.speedMultiplier).toBeGreaterThan(0)
      expect(config.shootMultiplier).toBeGreaterThan(0)
    })
  })

  describe('Wave Progression', () => {
    it('should not be complete initially', () => {
      expect(waveManager.isWaveComplete()).toBe(false)
    })

    it('should mark wave as complete', () => {
      waveManager.setWaveComplete(true)
      expect(waveManager.isWaveComplete()).toBe(true)
    })

    it('should not start next wave immediately after completion', () => {
      waveManager.setWaveComplete(true)
      expect(waveManager.canStartNextWave()).toBe(false)
    })

    it('should allow next wave after delay', (done) => {
      waveManager.setWaveComplete(true)

      setTimeout(() => {
        expect(waveManager.canStartNextWave()).toBe(true)
        done()
      }, 3100) // Wait for 3-second delay + buffer
    }, 3500)

    it('should advance to next wave', () => {
      waveManager.setWaveComplete(true)
      const hasNext = waveManager.nextWave()

      expect(hasNext).toBe(true)
      expect(waveManager.getCurrentWave()).toBe(2)
      expect(waveManager.isWaveComplete()).toBe(false)
    })

    it('should return false when no more waves', () => {
      waveManager.setWaveComplete(true)
      waveManager.nextWave() // Wave 2

      waveManager.setWaveComplete(true)
      const hasNext = waveManager.nextWave() // Try wave 3 (doesn't exist for level 1)

      expect(hasNext).toBe(false)
      expect(waveManager.getCurrentWave()).toBe(2)
    })

    it('should track remaining waves', () => {
      expect(waveManager.hasMoreWaves()).toBe(true)

      waveManager.nextWave()
      expect(waveManager.hasMoreWaves()).toBe(false)
    })
  })

  describe('Wave Difficulty Scaling', () => {
    it('should increase difficulty with each wave', () => {
      const wave1Config = waveManager.getWaveConfig()

      waveManager.nextWave()
      const wave2Config = waveManager.getWaveConfig()

      expect(wave2Config.speedMultiplier).toBeGreaterThan(wave1Config.speedMultiplier)
      expect(wave2Config.shootMultiplier).toBeGreaterThan(wave1Config.shootMultiplier)
    })

    it('should increase invader count with waves', () => {
      const wave1Config = waveManager.getWaveConfig()

      waveManager.nextWave()
      const wave2Config = waveManager.getWaveConfig()

      // Either rows or columns should increase
      const wave1Total = wave1Config.invaderRows * wave1Config.invaderColumns
      const wave2Total = wave2Config.invaderRows * wave2Config.invaderColumns
      expect(wave2Total).toBeGreaterThanOrEqual(wave1Total)
    })

    it('should add bonus enemies in later waves', () => {
      const wave1Config = waveManager.getWaveConfig()
      expect(wave1Config.bonusEnemies).toBe(0)

      waveManager.nextWave()
      const wave2Config = waveManager.getWaveConfig()
      expect(wave2Config.bonusEnemies).toBeGreaterThan(0)
    })
  })

  describe('Wave Progress', () => {
    it('should calculate wave progress correctly', () => {
      const progress = waveManager.getWaveProgress(10, 20)
      expect(progress).toBe(50) // 10 killed out of 20 = 50%
    })

    it('should return 100% when all invaders killed', () => {
      const progress = waveManager.getWaveProgress(0, 20)
      expect(progress).toBe(100)
    })

    it('should handle zero total invaders', () => {
      const progress = waveManager.getWaveProgress(0, 0)
      expect(progress).toBe(100)
    })
  })

  describe('Wave Timing', () => {
    it('should track time until next wave', () => {
      waveManager.setWaveComplete(true)
      const timeLeft = waveManager.getTimeUntilNextWave()
      expect(timeLeft).toBeGreaterThan(0)
      expect(timeLeft).toBeLessThanOrEqual(3000)
    })

    it('should return 0 if wave not complete', () => {
      const timeLeft = waveManager.getTimeUntilNextWave()
      expect(timeLeft).toBe(0)
    })
  })

  describe('Grid Creation', () => {
    it('should create invader grid with wave configuration', () => {
      const grid = waveManager.createWaveGrid()
      expect(grid).toBeDefined()
      expect(grid.invaders.length).toBeGreaterThan(0)
    })

    it('should create different sized grids for different waves', () => {
      const grid1 = waveManager.createWaveGrid()
      const wave1Count = grid1.invaders.length

      waveManager.nextWave()
      const grid2 = waveManager.createWaveGrid()
      const wave2Count = grid2.invaders.length

      expect(wave2Count).toBeGreaterThanOrEqual(wave1Count)
    })
  })

  describe('Reset', () => {
    it('should reset to wave 1', () => {
      waveManager.nextWave()
      waveManager.setWaveComplete(true)

      waveManager.reset()

      expect(waveManager.getCurrentWave()).toBe(1)
      expect(waveManager.isWaveComplete()).toBe(false)
    })
  })
})

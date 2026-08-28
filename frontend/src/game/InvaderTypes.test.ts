import { describe, it, expect } from 'vitest'
import { Invader, InvaderType, INVADER_TYPE_STATS } from './Invader'

describe('Invader Types System', () => {
  describe('Invader Type Stats', () => {
    it('should have stats for all enemy types', () => {
      expect(INVADER_TYPE_STATS[InvaderType.BASIC]).toBeDefined()
      expect(INVADER_TYPE_STATS[InvaderType.FAST]).toBeDefined()
      expect(INVADER_TYPE_STATS[InvaderType.TANK]).toBeDefined()
      expect(INVADER_TYPE_STATS[InvaderType.SNIPER]).toBeDefined()
      expect(INVADER_TYPE_STATS[InvaderType.SHIELD]).toBeDefined()
    })

    it('should have valid HP values', () => {
      Object.values(INVADER_TYPE_STATS).forEach(stats => {
        expect(stats.maxHp).toBeGreaterThan(0)
        expect(stats.maxHp).toBeLessThanOrEqual(5)
      })
    })

    it('should have valid score values', () => {
      Object.values(INVADER_TYPE_STATS).forEach(stats => {
        expect(stats.scoreValue).toBeGreaterThan(0)
        expect(stats.scoreValue).toBeLessThanOrEqual(1000)
      })
    })

    it('should have valid multipliers', () => {
      Object.values(INVADER_TYPE_STATS).forEach(stats => {
        expect(stats.speedMultiplier).toBeGreaterThan(0)
        expect(stats.shootMultiplier).toBeGreaterThan(0)
      })
    })
  })

  describe('BASIC Enemy Type', () => {
    let invader: Invader

    it('should create basic invader with correct stats', () => {
      invader = new Invader(100, 100, InvaderType.BASIC, 0, 0)

      expect(invader.type).toBe(InvaderType.BASIC)
      expect(invader.hp).toBe(1)
      expect(invader.stats.maxHp).toBe(1)
      expect(invader.stats.scoreValue).toBe(100)
      expect(invader.stats.speedMultiplier).toBe(1.0)
      expect(invader.stats.shootMultiplier).toBe(1.0)
      expect(invader.hasShield).toBe(false)
    })

    it('should be killed in one hit', () => {
      invader = new Invader(100, 100, InvaderType.BASIC, 0, 0)
      const killed = invader.takeDamage(1)

      expect(killed).toBe(true)
      expect(invader.alive).toBe(false)
    })
  })

  describe('FAST Enemy Type', () => {
    let invader: Invader

    it('should create fast invader with correct stats', () => {
      invader = new Invader(100, 100, InvaderType.FAST, 0, 0)

      expect(invader.type).toBe(InvaderType.FAST)
      expect(invader.hp).toBe(1)
      expect(invader.stats.scoreValue).toBe(150)
      expect(invader.stats.speedMultiplier).toBeGreaterThan(1.0)
      expect(invader.stats.shootMultiplier).toBeLessThan(1.0)
    })

    it('should have higher speed multiplier than basic', () => {
      const fastInvader = new Invader(100, 100, InvaderType.FAST, 0, 0)
      const basicInvader = new Invader(100, 100, InvaderType.BASIC, 0, 0)

      expect(fastInvader.stats.speedMultiplier).toBeGreaterThan(basicInvader.stats.speedMultiplier)
    })
  })

  describe('TANK Enemy Type', () => {
    let invader: Invader

    it('should create tank invader with correct stats', () => {
      invader = new Invader(100, 100, InvaderType.TANK, 0, 0)

      expect(invader.type).toBe(InvaderType.TANK)
      expect(invader.hp).toBe(3)
      expect(invader.stats.maxHp).toBe(3)
      expect(invader.stats.scoreValue).toBe(300)
      expect(invader.stats.speedMultiplier).toBeLessThan(1.0)
    })

    it('should require 3 hits to kill', () => {
      invader = new Invader(100, 100, InvaderType.TANK, 0, 0)

      let killed = invader.takeDamage(1)
      expect(killed).toBe(false)
      expect(invader.alive).toBe(true)
      expect(invader.hp).toBe(2)

      killed = invader.takeDamage(1)
      expect(killed).toBe(false)
      expect(invader.alive).toBe(true)
      expect(invader.hp).toBe(1)

      killed = invader.takeDamage(1)
      expect(killed).toBe(true)
      expect(invader.alive).toBe(false)
      expect(invader.hp).toBe(0)
    })

    it('should have higher HP than basic', () => {
      const tankInvader = new Invader(100, 100, InvaderType.TANK, 0, 0)
      const basicInvader = new Invader(100, 100, InvaderType.BASIC, 0, 0)

      expect(tankInvader.stats.maxHp).toBeGreaterThan(basicInvader.stats.maxHp)
    })
  })

  describe('SNIPER Enemy Type', () => {
    let invader: Invader

    it('should create sniper invader with correct stats', () => {
      invader = new Invader(100, 100, InvaderType.SNIPER, 0, 0)

      expect(invader.type).toBe(InvaderType.SNIPER)
      expect(invader.hp).toBe(1)
      expect(invader.stats.scoreValue).toBe(200)
      expect(invader.stats.shootMultiplier).toBeGreaterThan(1.0)
    })

    it('should have higher shoot multiplier than basic', () => {
      const sniperInvader = new Invader(100, 100, InvaderType.SNIPER, 0, 0)
      const basicInvader = new Invader(100, 100, InvaderType.BASIC, 0, 0)

      expect(sniperInvader.stats.shootMultiplier).toBeGreaterThan(basicInvader.stats.shootMultiplier)
    })
  })

  describe('SHIELD Enemy Type', () => {
    let invader: Invader

    it('should create shield invader with correct stats', () => {
      invader = new Invader(100, 100, InvaderType.SHIELD, 0, 0)

      expect(invader.type).toBe(InvaderType.SHIELD)
      expect(invader.hp).toBe(2)
      expect(invader.stats.scoreValue).toBe(250)
      expect(invader.hasShield).toBe(true)
    })

    it('should absorb first hit with shield', () => {
      invader = new Invader(100, 100, InvaderType.SHIELD, 0, 0)

      expect(invader.hasShield).toBe(true)

      const killed = invader.takeDamage(1)

      expect(killed).toBe(false)
      expect(invader.hasShield).toBe(false)
      expect(invader.hp).toBe(2) // HP unchanged, shield absorbed hit
      expect(invader.alive).toBe(true)
    })

    it('should take damage after shield is broken', () => {
      invader = new Invader(100, 100, InvaderType.SHIELD, 0, 0)

      // Break shield
      invader.takeDamage(1)
      expect(invader.hasShield).toBe(false)

      // Now damage HP
      let killed = invader.takeDamage(1)
      expect(killed).toBe(false)
      expect(invader.hp).toBe(1)

      // Kill
      killed = invader.takeDamage(1)
      expect(killed).toBe(true)
      expect(invader.alive).toBe(false)
    })
  })

  describe('Damage System', () => {
    it('should handle multiple damage points', () => {
      const invader = new Invader(100, 100, InvaderType.TANK, 0, 0)

      const killed = invader.takeDamage(2)

      expect(killed).toBe(false)
      expect(invader.hp).toBe(1)
    })

    it('should handle overkill damage', () => {
      const invader = new Invader(100, 100, InvaderType.BASIC, 0, 0)

      const killed = invader.takeDamage(999)

      expect(killed).toBe(true)
      expect(invader.alive).toBe(false)
      expect(invader.hp).toBeLessThanOrEqual(0)
    })
  })

  describe('Score Values', () => {
    it('should have higher scores for tougher enemies', () => {
      const basic = new Invader(100, 100, InvaderType.BASIC, 0, 0)
      const tank = new Invader(100, 100, InvaderType.TANK, 0, 0)

      expect(tank.stats.scoreValue).toBeGreaterThan(basic.stats.scoreValue)
    })

    it('should have higher scores for special abilities', () => {
      const basic = new Invader(100, 100, InvaderType.BASIC, 0, 0)
      const sniper = new Invader(100, 100, InvaderType.SNIPER, 0, 0)
      const shield = new Invader(100, 100, InvaderType.SHIELD, 0, 0)

      expect(sniper.stats.scoreValue).toBeGreaterThan(basic.stats.scoreValue)
      expect(shield.stats.scoreValue).toBeGreaterThan(basic.stats.scoreValue)
    })
  })

  describe('Visual Properties', () => {
    it('should have unique colors for each type', () => {
      const types = [
        InvaderType.BASIC,
        InvaderType.FAST,
        InvaderType.TANK,
        InvaderType.SNIPER,
        InvaderType.SHIELD
      ]

      const colors = types.map(type =>
        new Invader(100, 100, type, 0, 0).stats.color
      )

      const uniqueColors = new Set(colors)
      expect(uniqueColors.size).toBe(types.length)
    })

    it('should have unique image paths for each type', () => {
      const types = [
        InvaderType.BASIC,
        InvaderType.FAST,
        InvaderType.TANK,
        InvaderType.SNIPER,
        InvaderType.SHIELD
      ]

      const imagePaths = types.map(type =>
        new Invader(100, 100, type, 0, 0).stats.imagePath
      )

      const uniquePaths = new Set(imagePaths)
      expect(uniquePaths.size).toBe(types.length)
    })
  })
})

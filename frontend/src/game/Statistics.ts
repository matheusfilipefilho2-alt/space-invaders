import type { InvaderType } from './Invader'
import type { WeaponType } from './Weapon'
import type { BonusType } from './Bonus'

export interface GameStatistics {
  // Global stats
  totalGamesPlayed: number
  totalPlayTime: number // in seconds
  totalScore: number
  highestScore: number
  averageScore: number

  // Combat stats
  totalKills: number
  totalShots: number
  totalHits: number
  overallAccuracy: number
  bestAccuracy: number
  bestCombo: number
  totalBossKills: number

  // Level progression
  highestLevel: number
  totalLevelsCompleted: number

  // Enemy stats by type
  enemyKills: {
    [key in InvaderType]: number
  }

  // Weapon stats
  weaponStats: {
    [key in WeaponType]: {
      timesUsed: number
      killsWithWeapon: number
      shotsWithWeapon: number
    }
  }

  // Power-up stats
  powerUpStats: {
    [key in BonusType]: number // times collected
  }

  // Death stats
  totalDeaths: number
  deathsByEnemyFire: number
  deathsByCollision: number

  // Milestones
  firstGameDate: number
  lastGameDate: number
  longestGameTime: number
  fastestLevelCompletion: number
}

export interface SessionStats {
  kills: number
  shots: number
  hits: number
  bossKills: number
  levelsCompleted: number
  enemyKills: { [key in InvaderType]: number }
  weaponsUsed: Set<WeaponType>
  powerUpsCollected: { [key in BonusType]: number }
  weaponKills: { [key in WeaponType]: number }
  weaponShots: { [key in WeaponType]: number }
  startTime: number
  deaths: number
}

export class StatisticsManager {
  private static readonly STORAGE_KEY = 'space_invaders_statistics'

  /**
   * Get all statistics
   */
  static getStatistics(): GameStatistics {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (err) {
      console.warn('Failed to load statistics:', err)
    }

    // Return default empty statistics
    return this.getDefaultStatistics()
  }

  /**
   * Get default empty statistics
   */
  private static getDefaultStatistics(): GameStatistics {
    return {
      totalGamesPlayed: 0,
      totalPlayTime: 0,
      totalScore: 0,
      highestScore: 0,
      averageScore: 0,
      totalKills: 0,
      totalShots: 0,
      totalHits: 0,
      overallAccuracy: 0,
      bestAccuracy: 0,
      bestCombo: 0,
      totalBossKills: 0,
      highestLevel: 0,
      totalLevelsCompleted: 0,
      enemyKills: {
        BASIC: 0,
        FAST: 0,
        TANK: 0,
        SNIPER: 0,
        SHIELD: 0
      },
      weaponStats: {
        NORMAL: { timesUsed: 0, killsWithWeapon: 0, shotsWithWeapon: 0 },
        LASER: { timesUsed: 0, killsWithWeapon: 0, shotsWithWeapon: 0 },
        SPREAD: { timesUsed: 0, killsWithWeapon: 0, shotsWithWeapon: 0 },
        MISSILE: { timesUsed: 0, killsWithWeapon: 0, shotsWithWeapon: 0 },
        BOMB: { timesUsed: 0, killsWithWeapon: 0, shotsWithWeapon: 0 },
        LIGHTNING: { timesUsed: 0, killsWithWeapon: 0, shotsWithWeapon: 0 }
      },
      powerUpStats: {
        score: 0,
        life: 0,
        shield: 0,
        multishot: 0,
        rapidfire: 0,
        slowmo: 0,
        multiplier: 0,
        nuke: 0,
        weapon_laser: 0,
        weapon_spread: 0,
        weapon_missile: 0,
        weapon_bomb: 0,
        weapon_lightning: 0
      },
      totalDeaths: 0,
      deathsByEnemyFire: 0,
      deathsByCollision: 0,
      firstGameDate: 0,
      lastGameDate: 0,
      longestGameTime: 0,
      fastestLevelCompletion: 0
    }
  }

  /**
   * Save statistics
   */
  static saveStatistics(stats: GameStatistics): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats))
    } catch (err) {
      console.warn('Failed to save statistics:', err)
    }
  }

  /**
   * Update statistics after a game session
   */
  static updateAfterGame(sessionStats: SessionStats, finalScore: number, finalLevel: number, accuracy: number, maxCombo: number): void {
    const stats = this.getStatistics()

    // Calculate play time
    const playTime = Math.floor((Date.now() - sessionStats.startTime) / 1000)

    // Update global stats
    stats.totalGamesPlayed++
    stats.totalPlayTime += playTime
    stats.totalScore += finalScore
    stats.lastGameDate = Date.now()

    if (stats.firstGameDate === 0) {
      stats.firstGameDate = Date.now()
    }

    // Update high scores
    if (finalScore > stats.highestScore) {
      stats.highestScore = finalScore
    }

    // Update average score
    stats.averageScore = Math.floor(stats.totalScore / stats.totalGamesPlayed)

    // Update combat stats
    stats.totalKills += sessionStats.kills
    stats.totalShots += sessionStats.shots
    stats.totalHits += sessionStats.hits

    // Update accuracy
    if (stats.totalShots > 0) {
      stats.overallAccuracy = Math.round((stats.totalHits / stats.totalShots) * 100)
    }

    if (accuracy > stats.bestAccuracy) {
      stats.bestAccuracy = accuracy
    }

    if (maxCombo > stats.bestCombo) {
      stats.bestCombo = maxCombo
    }

    // Update boss kills
    stats.totalBossKills += sessionStats.bossKills

    // Update level stats
    if (finalLevel > stats.highestLevel) {
      stats.highestLevel = finalLevel
    }
    stats.totalLevelsCompleted += sessionStats.levelsCompleted

    // Update enemy kills by type
    Object.entries(sessionStats.enemyKills).forEach(([type, count]) => {
      const invaderType = type as InvaderType
      if (stats.enemyKills[invaderType] !== undefined) {
        stats.enemyKills[invaderType] += count
      }
    })

    // Update weapon stats
    sessionStats.weaponsUsed.forEach(weaponType => {
      // Ensure weapon stats entry exists
      if (!stats.weaponStats[weaponType]) {
        stats.weaponStats[weaponType] = { timesUsed: 0, killsWithWeapon: 0, shotsWithWeapon: 0 }
      }
      stats.weaponStats[weaponType].timesUsed++
      stats.weaponStats[weaponType].killsWithWeapon += sessionStats.weaponKills[weaponType] || 0
      stats.weaponStats[weaponType].shotsWithWeapon += sessionStats.weaponShots[weaponType] || 0
    })

    // Update power-up stats
    Object.entries(sessionStats.powerUpsCollected).forEach(([type, count]) => {
      const bonusType = type as BonusType
      if (stats.powerUpStats[bonusType] !== undefined) {
        stats.powerUpStats[bonusType] += count
      }
    })

    // Update death stats
    stats.totalDeaths += sessionStats.deaths

    // Update longest game time
    if (playTime > stats.longestGameTime) {
      stats.longestGameTime = playTime
    }

    // Save updated stats
    this.saveStatistics(stats)
  }

  /**
   * Create a new session stats object
   */
  static createSessionStats(): SessionStats {
    return {
      kills: 0,
      shots: 0,
      hits: 0,
      bossKills: 0,
      levelsCompleted: 0,
      enemyKills: {
        BASIC: 0,
        FAST: 0,
        TANK: 0,
        SNIPER: 0,
        SHIELD: 0
      },
      weaponsUsed: new Set(['NORMAL']), // Normal weapon is always used
      powerUpsCollected: {
        score: 0,
        life: 0,
        shield: 0,
        multishot: 0,
        rapidfire: 0,
        slowmo: 0,
        multiplier: 0,
        nuke: 0,
        weapon_laser: 0,
        weapon_spread: 0,
        weapon_missile: 0,
        weapon_bomb: 0,
        weapon_lightning: 0
      },
      weaponKills: {
        NORMAL: 0,
        LASER: 0,
        SPREAD: 0,
        MISSILE: 0,
        BOMB: 0,
        LIGHTNING: 0
      },
      weaponShots: {
        NORMAL: 0,
        LASER: 0,
        SPREAD: 0,
        MISSILE: 0,
        BOMB: 0,
        LIGHTNING: 0
      },
      startTime: Date.now(),
      deaths: 0
    }
  }

  /**
   * Get most used weapon
   */
  static getMostUsedWeapon(): { weapon: WeaponType; timesUsed: number } | null {
    const stats = this.getStatistics()
    let maxWeapon: WeaponType | null = null
    let maxUsage = 0

    Object.entries(stats.weaponStats).forEach(([weapon, data]) => {
      if (data.timesUsed > maxUsage) {
        maxUsage = data.timesUsed
        maxWeapon = weapon as WeaponType
      }
    })

    return maxWeapon ? { weapon: maxWeapon, timesUsed: maxUsage } : null
  }

  /**
   * Get most killed enemy type
   */
  static getMostKilledEnemy(): { enemy: InvaderType; kills: number } | null {
    const stats = this.getStatistics()
    let maxEnemy: InvaderType | null = null
    let maxKills = 0

    Object.entries(stats.enemyKills).forEach(([enemy, kills]) => {
      if (kills > maxKills) {
        maxKills = kills
        maxEnemy = enemy as InvaderType
      }
    })

    return maxEnemy ? { enemy: maxEnemy, kills: maxKills } : null
  }

  /**
   * Get most collected power-up
   */
  static getMostCollectedPowerUp(): { powerUp: BonusType; count: number } | null {
    const stats = this.getStatistics()
    let maxPowerUp: BonusType | null = null
    let maxCount = 0

    Object.entries(stats.powerUpStats).forEach(([powerUp, count]) => {
      if (count > maxCount) {
        maxCount = count
        maxPowerUp = powerUp as BonusType
      }
    })

    return maxPowerUp ? { powerUp: maxPowerUp, count: maxCount } : null
  }

  /**
   * Format time for display (hours, minutes, seconds)
   */
  static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  /**
   * Clear all statistics (for testing)
   */
  static clearStatistics(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      console.log('Statistics cleared')
    } catch (err) {
      console.warn('Failed to clear statistics:', err)
    }
  }

  /**
   * Get statistics summary for display
   */
  static getSummary() {
    const stats = this.getStatistics()

    return {
      gamesPlayed: stats.totalGamesPlayed,
      totalPlayTime: this.formatTime(stats.totalPlayTime),
      averageScore: stats.averageScore,
      highestScore: stats.highestScore,
      totalKills: stats.totalKills,
      accuracy: stats.overallAccuracy,
      bestCombo: stats.bestCombo,
      bossKills: stats.totalBossKills,
      highestLevel: stats.highestLevel,
      mostUsedWeapon: this.getMostUsedWeapon(),
      mostKilledEnemy: this.getMostKilledEnemy(),
      mostCollectedPowerUp: this.getMostCollectedPowerUp()
    }
  }
}

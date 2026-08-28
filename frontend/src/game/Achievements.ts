export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  requirement: number
  unlocked: boolean
  progress: number
  category: 'score' | 'kills' | 'survival' | 'combo' | 'special'
  rewardGold: number
}

export interface AchievementProgress {
  [achievementId: string]: {
    unlocked: boolean
    progress: number
    unlockedAt?: number
  }
}

import { achievementAPI } from '@/services/api'

export class AchievementManager {
  private static readonly STORAGE_KEY = 'space_invaders_achievements'
  private static useBackend = true // Flag to enable/disable backend integration

  // Define all achievements
  static readonly achievements: Achievement[] = [
    // Score Achievements
    {
      id: 'score_1k',
      name: 'First Steps',
      description: 'Score 1,000 points',
      icon: '🎯',
      requirement: 1000,
      unlocked: false,
      progress: 0,
      category: 'score',
      rewardGold: 5
    },
    {
      id: 'score_5k',
      name: 'Rising Star',
      description: 'Score 5,000 points',
      icon: '⭐',
      requirement: 5000,
      unlocked: false,
      progress: 0,
      category: 'score',
      rewardGold: 10
    },
    {
      id: 'score_10k',
      name: 'Elite Pilot',
      description: 'Score 10,000 points',
      icon: '🏆',
      requirement: 10000,
      unlocked: false,
      progress: 0,
      category: 'score',
      rewardGold: 25
    },
    {
      id: 'score_50k',
      name: 'Master of Space',
      description: 'Score 50,000 points',
      icon: '👑',
      requirement: 50000,
      unlocked: false,
      progress: 0,
      category: 'score',
      rewardGold: 50
    },

    // Kill Achievements
    {
      id: 'kills_50',
      name: 'Exterminator',
      description: 'Destroy 50 invaders',
      icon: '💥',
      requirement: 50,
      unlocked: false,
      progress: 0,
      category: 'kills',
      rewardGold: 5
    },
    {
      id: 'kills_200',
      name: 'Alien Hunter',
      description: 'Destroy 200 invaders',
      icon: '🔫',
      requirement: 200,
      unlocked: false,
      progress: 0,
      category: 'kills',
      rewardGold: 15
    },
    {
      id: 'kills_500',
      name: 'Genocide',
      description: 'Destroy 500 invaders',
      icon: '☠️',
      requirement: 500,
      unlocked: false,
      progress: 0,
      category: 'kills',
      rewardGold: 30
    },

    // Combo Achievements
    {
      id: 'combo_10',
      name: 'On Fire',
      description: 'Achieve a 10x combo',
      icon: '🔥',
      requirement: 10,
      unlocked: false,
      progress: 0,
      category: 'combo',
      rewardGold: 10
    },
    {
      id: 'combo_25',
      name: 'Unstoppable',
      description: 'Achieve a 25x combo',
      icon: '⚡',
      requirement: 25,
      unlocked: false,
      progress: 0,
      category: 'combo',
      rewardGold: 20
    },
    {
      id: 'combo_50',
      name: 'God Mode',
      description: 'Achieve a 50x combo',
      icon: '👹',
      requirement: 50,
      unlocked: false,
      progress: 0,
      category: 'combo',
      rewardGold: 50
    },

    // Survival Achievements
    {
      id: 'level_5',
      name: 'Survivor',
      description: 'Reach level 5',
      icon: '🛡️',
      requirement: 5,
      unlocked: false,
      progress: 0,
      category: 'survival',
      rewardGold: 10
    },
    {
      id: 'level_10',
      name: 'Veteran',
      description: 'Reach level 10',
      icon: '🎖️',
      requirement: 10,
      unlocked: false,
      progress: 0,
      category: 'survival',
      rewardGold: 25
    },
    {
      id: 'level_20',
      name: 'Legend',
      description: 'Reach level 20',
      icon: '🌟',
      requirement: 20,
      unlocked: false,
      progress: 0,
      category: 'survival',
      rewardGold: 75
    },

    // Special Achievements
    {
      id: 'boss_first',
      name: 'Boss Slayer',
      description: 'Defeat your first boss',
      icon: '🐲',
      requirement: 1,
      unlocked: false,
      progress: 0,
      category: 'special',
      rewardGold: 20
    },
    {
      id: 'boss_5',
      name: 'Dragon Hunter',
      description: 'Defeat 5 bosses',
      icon: '⚔️',
      requirement: 5,
      unlocked: false,
      progress: 0,
      category: 'special',
      rewardGold: 50
    },
    {
      id: 'accuracy_90',
      name: 'Sharpshooter',
      description: 'Finish a game with 90%+ accuracy',
      icon: '🎯',
      requirement: 90,
      unlocked: false,
      progress: 0,
      category: 'special',
      rewardGold: 30
    },
    {
      id: 'perfect_accuracy',
      name: 'Perfect Aim',
      description: 'Finish a game with 100% accuracy',
      icon: '💎',
      requirement: 100,
      unlocked: false,
      progress: 0,
      category: 'special',
      rewardGold: 100
    }
  ]

  static loadProgress(): AchievementProgress {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (err) {
      console.warn('Failed to load achievement progress:', err)
      return {}
    }
  }

  static saveProgress(progress: AchievementProgress): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress))
    } catch (err) {
      console.warn('Failed to save achievement progress:', err)
    }
  }

  static getAchievements(): Achievement[] {
    const progress = this.loadProgress()

    return this.achievements.map(achievement => ({
      ...achievement,
      unlocked: progress[achievement.id]?.unlocked || false,
      progress: progress[achievement.id]?.progress || 0
    }))
  }

  static updateProgress(
    achievementId: string,
    currentValue: number
  ): { unlocked: boolean; achievement?: Achievement } {
    const achievement = this.achievements.find(a => a.id === achievementId)
    if (!achievement) return { unlocked: false }

    const progress = this.loadProgress()
    const currentProgress = progress[achievementId] || { unlocked: false, progress: 0 }

    // If already unlocked, return early
    if (currentProgress.unlocked) {
      return { unlocked: false }
    }

    // Update progress
    currentProgress.progress = currentValue

    // Check if achievement is unlocked
    if (currentValue >= achievement.requirement) {
      currentProgress.unlocked = true
      currentProgress.unlockedAt = Date.now()
      progress[achievementId] = currentProgress
      this.saveProgress(progress)

      return {
        unlocked: true,
        achievement: {
          ...achievement,
          unlocked: true,
          progress: currentValue
        }
      }
    }

    // Save progress
    progress[achievementId] = currentProgress
    this.saveProgress(progress)

    return { unlocked: false }
  }

  static async checkAchievementsAsync(stats: {
    score: number
    killCount: number
    maxCombo: number
    level: number
    bossKills: number
    accuracy: number
  }): Promise<{ newlyUnlocked: Achievement[]; totalGoldEarned: number }> {
    if (this.useBackend) {
      try {
        const response = await achievementAPI.checkGameStats(stats)
        const data = response.data.data

        // Convert backend response to Achievement objects
        const newlyUnlocked: Achievement[] = data.newlyUnlocked.map((a: any) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          requirement: a.requirementValue,
          unlocked: true,
          progress: a.requirementValue,
          category: this.getCategoryFromType(a.requirementType),
          rewardGold: a.rewardGold
        }))

        return {
          newlyUnlocked,
          totalGoldEarned: data.totalGoldEarned
        }
      } catch (error) {
        console.error('Failed to check achievements with backend:', error)
        // Fallback to local check
        return {
          newlyUnlocked: this.checkAchievements(stats),
          totalGoldEarned: 0
        }
      }
    } else {
      return {
        newlyUnlocked: this.checkAchievements(stats),
        totalGoldEarned: 0
      }
    }
  }

  static checkAchievements(stats: {
    score: number
    killCount: number
    maxCombo: number
    level: number
    bossKills: number
    accuracy: number
  }): Achievement[] {
    const newlyUnlocked: Achievement[] = []

    // Check score achievements
    const scoreAchievements = ['score_1k', 'score_5k', 'score_10k', 'score_50k']
    scoreAchievements.forEach(id => {
      const result = this.updateProgress(id, stats.score)
      if (result.unlocked && result.achievement) {
        newlyUnlocked.push(result.achievement)
      }
    })

    // Check kill achievements
    const killAchievements = ['kills_50', 'kills_200', 'kills_500']
    killAchievements.forEach(id => {
      const result = this.updateProgress(id, stats.killCount)
      if (result.unlocked && result.achievement) {
        newlyUnlocked.push(result.achievement)
      }
    })

    // Check combo achievements
    const comboAchievements = ['combo_10', 'combo_25', 'combo_50']
    comboAchievements.forEach(id => {
      const result = this.updateProgress(id, stats.maxCombo)
      if (result.unlocked && result.achievement) {
        newlyUnlocked.push(result.achievement)
      }
    })

    // Check level achievements
    const levelAchievements = ['level_5', 'level_10', 'level_20']
    levelAchievements.forEach(id => {
      const result = this.updateProgress(id, stats.level)
      if (result.unlocked && result.achievement) {
        newlyUnlocked.push(result.achievement)
      }
    })

    // Check boss achievements
    const bossAchievements = ['boss_first', 'boss_5']
    bossAchievements.forEach(id => {
      const result = this.updateProgress(id, stats.bossKills)
      if (result.unlocked && result.achievement) {
        newlyUnlocked.push(result.achievement)
      }
    })

    // Check accuracy achievements
    const accuracyAchievements = ['accuracy_90', 'perfect_accuracy']
    accuracyAchievements.forEach(id => {
      const result = this.updateProgress(id, stats.accuracy)
      if (result.unlocked && result.achievement) {
        newlyUnlocked.push(result.achievement)
      }
    })

    return newlyUnlocked
  }

  private static getCategoryFromType(type: string): 'score' | 'kills' | 'survival' | 'combo' | 'special' {
    if (type === 'score') return 'score'
    if (type === 'kills') return 'kills'
    if (type === 'level') return 'survival'
    if (type === 'combo') return 'combo'
    return 'special'
  }

  static async loadAchievementsFromBackend(): Promise<Achievement[]> {
    if (this.useBackend) {
      try {
        const response = await achievementAPI.getWithStatus()
        const data = response.data.data

        return data.map((a: any) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          requirement: a.requirementValue,
          unlocked: a.unlocked,
          progress: 0, // Backend doesn't track progress, only unlocked status
          category: this.getCategoryFromType(a.requirementType),
          rewardGold: a.rewardGold
        }))
      } catch (error) {
        console.error('Failed to load achievements from backend:', error)
        // Fallback to local
        return this.getAchievements()
      }
    } else {
      return this.getAchievements()
    }
  }

  static getTotalGoldEarned(): number {
    const progress = this.loadProgress()
    let total = 0

    this.achievements.forEach(achievement => {
      if (progress[achievement.id]?.unlocked) {
        total += achievement.rewardGold
      }
    })

    return total
  }

  static getUnlockedCount(): number {
    const progress = this.loadProgress()
    return Object.values(progress).filter(p => p.unlocked).length
  }

  static getTotalCount(): number {
    return this.achievements.length
  }
}

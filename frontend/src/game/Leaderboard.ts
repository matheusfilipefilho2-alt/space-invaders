export interface LeaderboardEntry {
  id: string
  playerName: string
  score: number
  level: number
  killCount: number
  accuracy: number
  date: number
  maxCombo: number
  bossKills: number
  playTime: number // in seconds
}

export interface PlayerProfile {
  name: string
  avatar: string
  gamesPlayed: number
  lastPlayed: number
}

export class LeaderboardManager {
  private static readonly LEADERBOARD_KEY = 'space_invaders_leaderboard'
  private static readonly PLAYER_PROFILE_KEY = 'space_invaders_player_profile'
  private static readonly MAX_ENTRIES = 10

  /**
   * Get the current player profile
   */
  static getPlayerProfile(): PlayerProfile {
    try {
      const stored = localStorage.getItem(this.PLAYER_PROFILE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (err) {
      console.warn('Failed to load player profile:', err)
    }

    // Default profile
    return {
      name: 'Player',
      avatar: '🚀',
      gamesPlayed: 0,
      lastPlayed: 0
    }
  }

  /**
   * Update player profile
   */
  static updatePlayerProfile(profile: Partial<PlayerProfile>): void {
    try {
      const current = this.getPlayerProfile()
      const updated = { ...current, ...profile }
      localStorage.setItem(this.PLAYER_PROFILE_KEY, JSON.stringify(updated))
    } catch (err) {
      console.warn('Failed to save player profile:', err)
    }
  }

  /**
   * Get all leaderboard entries sorted by score
   */
  static getLeaderboard(): LeaderboardEntry[] {
    try {
      const stored = localStorage.getItem(this.LEADERBOARD_KEY)
      if (stored) {
        const entries: LeaderboardEntry[] = JSON.parse(stored)
        // Sort by score descending
        return entries.sort((a, b) => b.score - a.score)
      }
    } catch (err) {
      console.warn('Failed to load leaderboard:', err)
    }
    return []
  }

  /**
   * Add a new score to the leaderboard
   * Returns the rank (1-based) if entry made it to top 10, otherwise null
   */
  static addScore(entry: Omit<LeaderboardEntry, 'id'>): { rank: number | null; isPersonalBest: boolean } {
    try {
      const leaderboard = this.getLeaderboard()
      const profile = this.getPlayerProfile()

      // Generate unique ID
      const newEntry: LeaderboardEntry = {
        ...entry,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        playerName: profile.name
      }

      // Add new entry
      leaderboard.push(newEntry)

      // Sort by score
      leaderboard.sort((a, b) => b.score - a.score)

      // Check if it's a personal best
      const playerEntries = leaderboard.filter(e => e.playerName === profile.name)
      const isPersonalBest = playerEntries[0]?.id === newEntry.id

      // Keep only top MAX_ENTRIES
      const trimmedLeaderboard = leaderboard.slice(0, this.MAX_ENTRIES)

      // Save
      localStorage.setItem(this.LEADERBOARD_KEY, JSON.stringify(trimmedLeaderboard))

      // Update player profile
      this.updatePlayerProfile({
        gamesPlayed: profile.gamesPlayed + 1,
        lastPlayed: Date.now()
      })

      // Find rank (1-based)
      const rank = trimmedLeaderboard.findIndex(e => e.id === newEntry.id)

      return {
        rank: rank >= 0 ? rank + 1 : null,
        isPersonalBest
      }
    } catch (err) {
      console.warn('Failed to add score to leaderboard:', err)
      return { rank: null, isPersonalBest: false }
    }
  }

  /**
   * Get player's rank on the leaderboard
   */
  static getPlayerRank(playerName: string): number | null {
    const leaderboard = this.getLeaderboard()
    const index = leaderboard.findIndex(e => e.playerName === playerName)
    return index >= 0 ? index + 1 : null
  }

  /**
   * Get player's best score
   */
  static getPlayerBestScore(): LeaderboardEntry | null {
    const profile = this.getPlayerProfile()
    const leaderboard = this.getLeaderboard()
    const playerEntries = leaderboard.filter(e => e.playerName === profile.name)

    if (playerEntries.length > 0) {
      return playerEntries[0] // Already sorted by score
    }

    return null
  }

  /**
   * Get player's position relative to leaderboard
   */
  static getPlayerPosition(score: number): number {
    const leaderboard = this.getLeaderboard()

    // Count how many scores are higher
    const position = leaderboard.filter(e => e.score > score).length + 1

    return position
  }

  /**
   * Check if score qualifies for leaderboard
   */
  static qualifiesForLeaderboard(score: number): boolean {
    const leaderboard = this.getLeaderboard()

    // If less than MAX_ENTRIES, always qualifies
    if (leaderboard.length < this.MAX_ENTRIES) {
      return true
    }

    // Check if score is higher than lowest entry
    const lowestScore = leaderboard[leaderboard.length - 1].score
    return score > lowestScore
  }

  /**
   * Clear all leaderboard data (for testing)
   */
  static clearLeaderboard(): void {
    try {
      localStorage.removeItem(this.LEADERBOARD_KEY)
      console.log('Leaderboard cleared')
    } catch (err) {
      console.warn('Failed to clear leaderboard:', err)
    }
  }

  /**
   * Get leaderboard statistics
   */
  static getStats(): {
    totalEntries: number
    highestScore: number
    averageScore: number
    totalGamesPlayed: number
  } {
    const leaderboard = this.getLeaderboard()
    const profile = this.getPlayerProfile()

    if (leaderboard.length === 0) {
      return {
        totalEntries: 0,
        highestScore: 0,
        averageScore: 0,
        totalGamesPlayed: profile.gamesPlayed
      }
    }

    const totalScore = leaderboard.reduce((sum, entry) => sum + entry.score, 0)

    return {
      totalEntries: leaderboard.length,
      highestScore: leaderboard[0].score,
      averageScore: Math.round(totalScore / leaderboard.length),
      totalGamesPlayed: profile.gamesPlayed
    }
  }

  /**
   * Format date for display
   */
  static formatDate(timestamp: number): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Hoje'
    } else if (diffDays === 1) {
      return 'Ontem'
    } else if (diffDays < 7) {
      return `${diffDays} dias atrás`
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }
  }

  /**
   * Format play time for display
   */
  static formatPlayTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60

    if (minutes === 0) {
      return `${secs}s`
    }

    return `${minutes}m ${secs}s`
  }
}

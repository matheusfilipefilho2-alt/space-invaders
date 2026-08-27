import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

interface LeagueInfo {
  id: number
  name: string
  minPoints: number
  maxPoints: number
  icon: string
  color: string
}

interface LeaderboardPlayer {
  rank: number
  username: string
  highScore: number
  totalGames: number
  leagueId?: number
  leagueName?: string
}

const leagues: LeagueInfo[] = [
  { id: 1, name: 'Bronze', minPoints: 0, maxPoints: 999, icon: '🥉', color: '#CD7F32' },
  { id: 2, name: 'Silver', minPoints: 1000, maxPoints: 2499, icon: '🥈', color: '#C0C0C0' },
  { id: 3, name: 'Gold', minPoints: 2500, maxPoints: 4999, icon: '🥇', color: '#FFD700' },
  { id: 4, name: 'Platinum', minPoints: 5000, maxPoints: 9999, icon: '⭐', color: '#E5E4E2' },
  { id: 5, name: 'Diamond', minPoints: 10000, maxPoints: 19999, icon: '💎', color: '#B9F2FF' },
  { id: 6, name: 'Master', minPoints: 20000, maxPoints: 999999, icon: '👑', color: '#FF6B6B' }
]

export const useLeaderboardStore = defineStore('leaderboard', () => {
  const globalLeaderboard = ref<LeaderboardPlayer[]>([])
  const leagueLeaderboard = ref<LeaderboardPlayer[]>([])
  const currentLeague = ref<LeagueInfo | null>(null)
  const rankPoints = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const nextLeague = computed(() => {
    if (!currentLeague.value) return null
    const currentIndex = leagues.findIndex(l => l.id === currentLeague.value?.id)
    return currentIndex < leagues.length - 1 ? leagues[currentIndex + 1] : null
  })

  const previousLeague = computed(() => {
    if (!currentLeague.value) return null
    const currentIndex = leagues.findIndex(l => l.id === currentLeague.value?.id)
    return currentIndex > 0 ? leagues[currentIndex - 1] : null
  })

  const pointsToNextLeague = computed(() => {
    if (!nextLeague.value) return 0
    return nextLeague.value.minPoints - rankPoints.value
  })

  const pointsToPreviousLeague = computed(() => {
    if (!previousLeague.value || !currentLeague.value) return 0
    return rankPoints.value - currentLeague.value.minPoints
  })

  const progressInCurrentLeague = computed(() => {
    if (!currentLeague.value) return 0
    const range = currentLeague.value.maxPoints - currentLeague.value.minPoints
    const current = rankPoints.value - currentLeague.value.minPoints
    return Math.min(100, Math.max(0, (current / range) * 100))
  })

  // Actions
  async function fetchGlobalLeaderboard(limit = 50) {
    loading.value = true
    error.value = null
    try {
      const response = await axios.get(`http://localhost:8080/api/v1/leaderboard/global?limit=${limit}`)
      globalLeaderboard.value = response.data.map((player: any, index: number) => ({
        rank: index + 1,
        username: player.username,
        highScore: player.highScore || player.high_score,
        totalGames: player.totalGames || player.total_games,
        leagueId: player.leagueId || player.league_id,
        leagueName: getLeagueName(player.leagueId || player.league_id)
      }))
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch global leaderboard'
      console.error('Error fetching global leaderboard:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchLeagueLeaderboard(leagueId: number, limit = 50) {
    loading.value = true
    error.value = null
    try {
      const response = await axios.get(`http://localhost:8080/api/v1/leaderboard/league/${leagueId}?limit=${limit}`)
      leagueLeaderboard.value = response.data.map((player: any, index: number) => ({
        rank: index + 1,
        username: player.username,
        highScore: player.highScore || player.high_score,
        totalGames: player.totalGames || player.total_games,
        leagueId: leagueId
      }))
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch league leaderboard'
      console.error('Error fetching league leaderboard:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchPlayerLeague() {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await axios.get('http://localhost:8080/api/v1/players/me', {
        headers: { Authorization: `Bearer ${token}` }
      })

      const leagueId = response.data.leagueId || response.data.league_id || 1
      rankPoints.value = response.data.rankPoints || response.data.rank_points || 0
      currentLeague.value = getLeagueInfo(leagueId)
    } catch (err) {
      console.error('Error fetching player league:', err)
    }
  }

  function getLeagueInfo(leagueId: number): LeagueInfo {
    return leagues.find(l => l.id === leagueId) || leagues[0]
  }

  function getLeagueName(leagueId: number): string {
    return getLeagueInfo(leagueId).name
  }

  function getAllLeagues(): LeagueInfo[] {
    return leagues
  }

  async function initialize() {
    await Promise.all([
      fetchPlayerLeague(),
      fetchGlobalLeaderboard()
    ])

    if (currentLeague.value) {
      await fetchLeagueLeaderboard(currentLeague.value.id)
    }
  }

  return {
    // State
    globalLeaderboard,
    leagueLeaderboard,
    currentLeague,
    rankPoints,
    loading,
    error,

    // Computed
    nextLeague,
    previousLeague,
    pointsToNextLeague,
    pointsToPreviousLeague,
    progressInCurrentLeague,

    // Actions
    fetchGlobalLeaderboard,
    fetchLeagueLeaderboard,
    fetchPlayerLeague,
    getLeagueInfo,
    getLeagueName,
    getAllLeagues,
    initialize
  }
})

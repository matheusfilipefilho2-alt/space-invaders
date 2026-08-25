import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: string // COMMON, RARE, EPIC, LEGENDARY
  reward_gold: number
  requirement_type: string
  requirement_value: number
  created_at: string
  updated_at: string
}

export interface PlayerAchievement {
  id: number
  player_id: number
  achievement_id: string
  unlocked_at: string
  notified: boolean
  created_at: string
  updated_at: string
  achievement?: Achievement
}

export const useAchievementStore = defineStore('achievement', () => {
  // State
  const achievements = ref<Achievement[]>([])
  const playerAchievements = ref<PlayerAchievement[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filterRarity = ref<string>('all')
  const filterStatus = ref<string>('all') // all, unlocked, locked

  // Computed
  const unlockedIds = computed(() => {
    return new Set(playerAchievements.value.map(pa => pa.achievement_id))
  })

  const filteredAchievements = computed(() => {
    let filtered = [...achievements.value]

    // Filter by rarity
    if (filterRarity.value !== 'all') {
      filtered = filtered.filter(ach => ach.rarity === filterRarity.value)
    }

    // Filter by status
    if (filterStatus.value === 'unlocked') {
      filtered = filtered.filter(ach => unlockedIds.value.has(ach.id))
    } else if (filterStatus.value === 'locked') {
      filtered = filtered.filter(ach => !unlockedIds.value.has(ach.id))
    }

    return filtered
  })

  const unlockedCount = computed(() => playerAchievements.value.length)
  const totalCount = computed(() => achievements.value.length)
  const completionPercentage = computed(() => {
    if (totalCount.value === 0) return 0
    return Math.round((unlockedCount.value / totalCount.value) * 100)
  })

  const rarityStats = computed(() => {
    const stats = {
      COMMON: { total: 0, unlocked: 0 },
      RARE: { total: 0, unlocked: 0 },
      EPIC: { total: 0, unlocked: 0 },
      LEGENDARY: { total: 0, unlocked: 0 }
    }

    achievements.value.forEach(ach => {
      if (stats[ach.rarity]) {
        stats[ach.rarity].total++
        if (unlockedIds.value.has(ach.id)) {
          stats[ach.rarity].unlocked++
        }
      }
    })

    return stats
  })

  const totalGoldEarned = computed(() => {
    return playerAchievements.value.reduce((sum, pa) => {
      const achievement = achievements.value.find(a => a.id === pa.achievement_id)
      return sum + (achievement?.reward_gold || 0)
    }, 0)
  })

  const recentUnlocks = computed(() => {
    return [...playerAchievements.value]
      .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
      .slice(0, 5)
  })

  // Helpers
  const isUnlocked = (achievementId: string): boolean => {
    return unlockedIds.value.has(achievementId)
  }

  const getUnlockedDate = (achievementId: string): string | null => {
    const pa = playerAchievements.value.find(pa => pa.achievement_id === achievementId)
    return pa ? pa.unlocked_at : null
  }

  const getRarityColor = (rarity: string): string => {
    const colors: { [key: string]: string } = {
      COMMON: '#a0aec0',
      RARE: '#4299e1',
      EPIC: '#9f7aea',
      LEGENDARY: '#f6ad55'
    }
    return colors[rarity] || '#a0aec0'
  }

  const getRarityIcon = (rarity: string): string => {
    const icons: { [key: string]: string } = {
      COMMON: '⚪',
      RARE: '🔵',
      EPIC: '🟣',
      LEGENDARY: '🟠'
    }
    return icons[rarity] || '⚪'
  }

  // Actions
  async function fetchAchievements() {
    loading.value = true
    error.value = null

    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/achievements`)
      if (response.data.success && response.data.data) {
        achievements.value = response.data.data
      } else {
        achievements.value = []
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch achievements'
      console.error('Error fetching achievements:', err)
      achievements.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchPlayerAchievements() {
    loading.value = true
    error.value = null

    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/api/v1/players/me/achievements`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success && response.data.data) {
        playerAchievements.value = response.data.data
      } else {
        playerAchievements.value = []
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch player achievements'
      console.error('Error fetching player achievements:', err)
      playerAchievements.value = []
    } finally {
      loading.value = false
    }
  }

  async function checkAchievements() {
    loading.value = true
    error.value = null

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/achievements/check`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        // Refresh player achievements to get new unlocks
        await fetchPlayerAchievements()
        return response.data.data || []
      }
      return []
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to check achievements'
      console.error('Error checking achievements:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  function setFilterRarity(rarity: string) {
    filterRarity.value = rarity
  }

  function setFilterStatus(status: string) {
    filterStatus.value = status
  }

  async function initialize() {
    await Promise.all([
      fetchAchievements(),
      fetchPlayerAchievements()
    ])
  }

  return {
    // State
    achievements,
    playerAchievements,
    loading,
    error,
    filterRarity,
    filterStatus,

    // Computed
    unlockedIds,
    filteredAchievements,
    unlockedCount,
    totalCount,
    completionPercentage,
    rarityStats,
    totalGoldEarned,
    recentUnlocks,

    // Helpers
    isUnlocked,
    getUnlockedDate,
    getRarityColor,
    getRarityIcon,

    // Actions
    fetchAchievements,
    fetchPlayerAchievements,
    checkAchievements,
    setFilterRarity,
    setFilterStatus,
    initialize
  }
})

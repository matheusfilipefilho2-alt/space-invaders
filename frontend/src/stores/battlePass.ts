import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

interface BattlePassSeason {
  id: number
  name: string
  start_date: string
  end_date: string
  active: boolean
  max_tier: number
  xp_per_tier: number
  created_at: string
  updated_at: string
}

interface BattlePassProgress {
  id: number
  player_id: number
  season_id: number
  xp: number
  current_tier: number
  is_premium: boolean
  claimed_free_tiers: string
  claimed_premium_tiers: string
  created_at: string
  updated_at: string
}

interface BattlePassReward {
  id: number
  season_id: number
  tier: number
  type: string // 'free' or 'premium'
  reward_type: string // 'gold', 'space', 'item', 'nft', 'achievement'
  gold_amount: number
  space_amount: number
  item_id?: number
  nft_metadata_uri?: string
  description: string
  icon: string
}

interface ProgressSummary {
  season_name: string
  season_end_date: string
  current_tier: number
  max_tier: number
  total_xp: number
  xp_for_next_tier: number
  xp_progress: number
  xp_needed: number
  is_premium: boolean
  unclaimed_rewards: number
  days_remaining: number
}

interface LeaderboardEntry {
  player_id: number
  username: string
  xp: number
  current_tier: number
  is_premium: boolean
}

export const useBattlePassStore = defineStore('battlePass', () => {
  // State
  const season = ref<BattlePassSeason | null>(null)
  const progress = ref<BattlePassProgress | null>(null)
  const summary = ref<ProgressSummary | null>(null)
  const rewards = ref<BattlePassReward[]>([])
  const unclaimedRewards = ref<BattlePassReward[]>([])
  const leaderboard = ref<LeaderboardEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const currentTier = computed(() => progress.value?.current_tier || 0)
  const totalXP = computed(() => progress.value?.xp || 0)
  const isPremium = computed(() => progress.value?.is_premium || false)
  const hasUnclaimedRewards = computed(() => (unclaimedRewards.value?.length || 0) > 0)

  const xpProgress = computed(() => {
    if (!summary.value) return 0
    const percent = (summary.value.xp_progress / summary.value.xp_needed) * 100
    return Math.min(100, Math.max(0, percent))
  })

  const daysRemaining = computed(() => summary.value?.days_remaining || 0)

  // Group rewards by tier
  const rewardsByTier = computed(() => {
    const grouped: { [tier: number]: { free?: BattlePassReward; premium?: BattlePassReward } } = {}

    rewards.value.forEach(reward => {
      if (!grouped[reward.tier]) {
        grouped[reward.tier] = {}
      }
      if (reward.type === 'free') {
        grouped[reward.tier].free = reward
      } else {
        grouped[reward.tier].premium = reward
      }
    })

    return grouped
  })

  // Check if reward is claimed
  const isRewardClaimed = (tier: number, type: string): boolean => {
    if (!progress.value) return false

    try {
      const claimedTiers = type === 'free'
        ? JSON.parse(progress.value.claimed_free_tiers || '[]')
        : JSON.parse(progress.value.claimed_premium_tiers || '[]')
      return claimedTiers.includes(tier)
    } catch {
      return false
    }
  }

  // Check if reward is unlocked (tier reached)
  const isRewardUnlocked = (tier: number): boolean => {
    return currentTier.value >= tier
  }

  // Actions
  async function fetchCurrentSeason() {
    loading.value = true
    error.value = null

    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/battle-pass/season`)
      if (response.data.success && response.data.data) {
        season.value = response.data.data
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch season'
      console.error('Error fetching season:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchProgress() {
    loading.value = true
    error.value = null

    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/api/v1/battle-pass/progress`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success && response.data.data) {
        progress.value = response.data.data
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch progress'
      console.error('Error fetching progress:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary() {
    loading.value = true
    error.value = null

    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/api/v1/battle-pass/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success && response.data.data) {
        summary.value = response.data.data
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch summary'
      console.error('Error fetching summary:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchRewards() {
    loading.value = true
    error.value = null

    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/battle-pass/rewards`)
      if (response.data.success && response.data.data) {
        rewards.value = response.data.data
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch rewards'
      console.error('Error fetching rewards:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchUnclaimedRewards() {
    loading.value = true
    error.value = null

    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/api/v1/battle-pass/unclaimed`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success && response.data.data) {
        unclaimedRewards.value = response.data.data
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch unclaimed rewards'
      console.error('Error fetching unclaimed rewards:', err)
    } finally {
      loading.value = false
    }
  }

  async function claimReward(tier: number, rewardType: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/battle-pass/claim`,
        { tier, reward_type: rewardType },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        // Refresh progress and unclaimed rewards
        await Promise.all([fetchProgress(), fetchUnclaimedRewards()])
        return true
      }
      return false
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to claim reward'
      console.error('Error claiming reward:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function purchasePremium(paymentType: string, orderId: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/battle-pass/premium/purchase`,
        { payment_type: paymentType, order_id: orderId },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        // Refresh progress
        await fetchProgress()
        return true
      }
      return false
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to purchase premium'
      console.error('Error purchasing premium:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchLeaderboard(limit: number = 10) {
    loading.value = true
    error.value = null

    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/battle-pass/leaderboard?limit=${limit}`)
      if (response.data.success && response.data.data) {
        leaderboard.value = response.data.data
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch leaderboard'
      console.error('Error fetching leaderboard:', err)
    } finally {
      loading.value = false
    }
  }

  // Initialize - fetch all data
  async function initialize() {
    await Promise.all([
      fetchCurrentSeason(),
      fetchProgress(),
      fetchSummary(),
      fetchRewards(),
      fetchUnclaimedRewards()
    ])
  }

  return {
    // State
    season,
    progress,
    summary,
    rewards,
    unclaimedRewards,
    leaderboard,
    loading,
    error,

    // Computed
    currentTier,
    totalXP,
    isPremium,
    hasUnclaimedRewards,
    xpProgress,
    daysRemaining,
    rewardsByTier,

    // Methods
    isRewardClaimed,
    isRewardUnlocked,
    fetchCurrentSeason,
    fetchProgress,
    fetchSummary,
    fetchRewards,
    fetchUnclaimedRewards,
    claimReward,
    purchasePremium,
    fetchLeaderboard,
    initialize
  }
})

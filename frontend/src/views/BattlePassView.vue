<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useBattlePassStore } from '@/stores/battlePass'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const battlePassStore = useBattlePassStore()
const authStore = useAuthStore()
const router = useRouter()

const showPremiumModal = ref(false)
const selectedTier = ref<number | null>(null)
const selectedRewardType = ref<string | null>(null)

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }

  await battlePassStore.initialize()
  // Auto-refresh every 30 seconds
  setInterval(() => {
    battlePassStore.fetchProgress()
    battlePassStore.fetchUnclaimedRewards()
  }, 30000)
})

const formatXP = (xp: number) => {
  return xp.toLocaleString()
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const getRewardIcon = (rewardType: string) => {
  const icons: { [key: string]: string } = {
    gold: '🪙',
    space: '🚀',
    item: '🎁',
    nft: '🖼️',
    achievement: '🏆'
  }
  return icons[rewardType] || '🎁'
}

const getRewardDescription = (reward: any) => {
  if (reward.gold_amount > 0) return `${reward.gold_amount.toLocaleString()} Gold`
  if (reward.space_amount > 0) return `${reward.space_amount.toLocaleString()} SPACE`
  if (reward.description) return reward.description
  return 'Reward'
}

const canClaimReward = (tier: number, type: string) => {
  return (
    battlePassStore.isRewardUnlocked(tier) &&
    !battlePassStore.isRewardClaimed(tier, type) &&
    (type === 'free' || battlePassStore.isPremium)
  )
}

const handleClaimReward = async (tier: number, type: string) => {
  const success = await battlePassStore.claimReward(tier, type)
  if (success) {
    selectedTier.value = null
    selectedRewardType.value = null
  }
}

const handlePurchasePremium = () => {
  showPremiumModal.value = true
}

const confirmPremiumPurchase = async () => {
  // TODO: Integrate with actual payment flow
  const orderId = `order_${Date.now()}`
  const success = await battlePassStore.purchasePremium('pix', orderId)
  if (success) {
    showPremiumModal.value = false
  }
}

// Generate tier array for rendering
const tiers = computed(() => {
  const maxTier = battlePassStore.season?.max_tier || 50
  return Array.from({ length: maxTier }, (_, i) => i + 1)
})
</script>

<template>
  <div class="battle-pass-container">
    <!-- Header -->
    <div class="bp-header">
      <h1 class="bp-title">🎮 BATTLE PASS 🎮</h1>
      <div v-if="battlePassStore.season" class="bp-season-info">
        <div class="season-name">{{ battlePassStore.season.name }}</div>
        <div class="season-timer">
          ⏰ {{ battlePassStore.daysRemaining }} days remaining
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="battlePassStore.loading && !battlePassStore.progress" class="loading-state">
      <div class="loading-spinner">⌛</div>
      <p>Loading Battle Pass...</p>
    </div>

    <!-- Error State -->
    <div v-if="battlePassStore.error" class="error-state">
      <p>❌ {{ battlePassStore.error }}</p>
      <button @click="battlePassStore.initialize()" class="retry-button">
        🔄 Retry
      </button>
    </div>

    <!-- Main Content -->
    <div v-if="!battlePassStore.loading || battlePassStore.progress" class="bp-content">
      <!-- Progress Summary -->
      <div class="progress-summary">
        <div class="summary-card">
          <div class="summary-header">
            <h2>Your Progress</h2>
            <span v-if="battlePassStore.isPremium" class="premium-badge">⭐ PREMIUM</span>
            <button v-else @click="handlePurchasePremium" class="premium-upgrade-btn">
              ✨ Upgrade to Premium
            </button>
          </div>

          <div class="tier-display">
            <span class="tier-label">TIER</span>
            <span class="tier-number">{{ battlePassStore.currentTier }}</span>
            <span class="tier-max">/ {{ battlePassStore.season?.max_tier || 50 }}</span>
          </div>

          <div class="xp-bar-container">
            <div class="xp-bar-labels">
              <span>{{ formatXP(battlePassStore.summary?.xp_progress || 0) }} XP</span>
              <span>{{ formatXP(battlePassStore.summary?.xp_needed || 100) }} XP</span>
            </div>
            <div class="xp-bar">
              <div class="xp-bar-fill" :style="{ width: `${battlePassStore.xpProgress}%` }"></div>
            </div>
          </div>

          <div class="total-xp">
            Total XP: {{ formatXP(battlePassStore.totalXP) }}
          </div>

          <div v-if="battlePassStore.hasUnclaimedRewards" class="unclaimed-alert">
            🎁 You have {{ battlePassStore.unclaimedRewards.length }} unclaimed reward(s)!
          </div>
        </div>
      </div>

      <!-- Rewards Grid -->
      <div class="rewards-section">
        <h2>Rewards</h2>
        <div class="rewards-grid">
          <div
            v-for="tier in tiers"
            :key="tier"
            class="tier-card"
            :class="{
              'tier-unlocked': battlePassStore.isRewardUnlocked(tier),
              'tier-current': tier === battlePassStore.currentTier
            }"
          >
            <div class="tier-number-badge">{{ tier }}</div>

            <!-- Free Reward -->
            <div class="reward-slot free-reward">
              <div class="reward-label">FREE</div>
              <div v-if="battlePassStore.rewardsByTier[tier]?.free" class="reward-content">
                <div class="reward-icon">
                  {{ getRewardIcon(battlePassStore.rewardsByTier[tier]?.free?.reward_type || '') }}
                </div>
                <div class="reward-desc">
                  {{ getRewardDescription(battlePassStore.rewardsByTier[tier]?.free) }}
                </div>
                <button
                  v-if="canClaimReward(tier, 'free')"
                  @click="handleClaimReward(tier, 'free')"
                  class="claim-button"
                >
                  Claim
                </button>
                <div v-else-if="battlePassStore.isRewardClaimed(tier, 'free')" class="claimed-badge">
                  ✓ Claimed
                </div>
                <div v-else-if="!battlePassStore.isRewardUnlocked(tier)" class="locked-badge">
                  🔒 Locked
                </div>
              </div>
              <div v-else class="no-reward">-</div>
            </div>

            <!-- Premium Reward -->
            <div class="reward-slot premium-reward">
              <div class="reward-label premium-label">PREMIUM ⭐</div>
              <div v-if="battlePassStore.rewardsByTier[tier]?.premium" class="reward-content">
                <div class="reward-icon">
                  {{ getRewardIcon(battlePassStore.rewardsByTier[tier]?.premium?.reward_type || '') }}
                </div>
                <div class="reward-desc">
                  {{ getRewardDescription(battlePassStore.rewardsByTier[tier]?.premium) }}
                </div>
                <button
                  v-if="canClaimReward(tier, 'premium')"
                  @click="handleClaimReward(tier, 'premium')"
                  class="claim-button premium-claim"
                >
                  Claim
                </button>
                <div v-else-if="battlePassStore.isRewardClaimed(tier, 'premium')" class="claimed-badge">
                  ✓ Claimed
                </div>
                <div v-else-if="!battlePassStore.isPremium" class="premium-required-badge">
                  ⭐ Premium Only
                </div>
                <div v-else-if="!battlePassStore.isRewardUnlocked(tier)" class="locked-badge">
                  🔒 Locked
                </div>
              </div>
              <div v-else class="no-reward">-</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Premium Modal -->
    <div v-if="showPremiumModal" class="modal-overlay" @click="showPremiumModal = false">
      <div class="modal-content premium-modal" @click.stop>
        <h2>⭐ Upgrade to Premium Battle Pass</h2>
        <div class="premium-features">
          <p>✨ Unlock all premium rewards</p>
          <p>🎁 Get exclusive NFTs and items</p>
          <p>🚀 2x SPACE token rewards</p>
          <p>🏆 Special achievements</p>
        </div>
        <div class="premium-price">
          <strong>R$ 49,90</strong>
        </div>
        <div class="modal-actions">
          <button @click="confirmPremiumPurchase" class="confirm-button">
            Purchase Premium
          </button>
          <button @click="showPremiumModal = false" class="cancel-button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-pass-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Press Start 2P', monospace;
}

.bp-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.bp-title {
  font-size: 2em;
  color: #fff;
  text-shadow: 3px 3px 0 #000;
  margin: 0 0 15px 0;
}

.bp-season-info {
  color: #fff;
  font-size: 0.8em;
}

.season-name {
  font-size: 1.2em;
  margin-bottom: 8px;
}

.season-timer {
  color: #ffd700;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  margin: 20px 0;
}

.loading-spinner {
  font-size: 3em;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-button {
  margin-top: 15px;
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.8em;
}

.progress-summary {
  margin-bottom: 30px;
}

.summary-card {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  padding: 25px;
  border-radius: 10px;
  color: white;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.premium-badge {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  padding: 8px 15px;
  border-radius: 20px;
  font-size: 0.7em;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.premium-upgrade-btn {
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  color: #000;
  padding: 10px 20px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.7em;
  font-weight: bold;
  transition: transform 0.2s;
}

.premium-upgrade-btn:hover {
  transform: scale(1.1);
}

.tier-display {
  text-align: center;
  margin: 20px 0;
}

.tier-label {
  font-size: 0.8em;
  color: #ffd700;
}

.tier-number {
  font-size: 3em;
  margin: 0 10px;
  color: #fff;
  text-shadow: 2px 2px 0 #000;
}

.tier-max {
  font-size: 1.5em;
  color: #aaa;
}

.xp-bar-container {
  margin: 20px 0;
}

.xp-bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.7em;
  margin-bottom: 8px;
}

.xp-bar {
  background: rgba(0, 0, 0, 0.3);
  height: 30px;
  border-radius: 15px;
  overflow: hidden;
  position: relative;
}

.xp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ff00 0%, #00cc00 100%);
  transition: width 0.5s ease;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
}

.total-xp {
  text-align: center;
  font-size: 0.9em;
  margin-top: 15px;
}

.unclaimed-alert {
  background: rgba(255, 215, 0, 0.2);
  border: 2px solid #ffd700;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
  text-align: center;
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.rewards-section h2 {
  color: #fff;
  text-shadow: 2px 2px 0 #000;
  margin-bottom: 20px;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.tier-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 15px;
  transition: all 0.3s;
}

.tier-card.tier-unlocked {
  background: rgba(0, 255, 0, 0.1);
  border-color: rgba(0, 255, 0, 0.3);
}

.tier-card.tier-current {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 165, 0, 0.2) 100%);
  border-color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.tier-number-badge {
  background: #667eea;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 15px;
  font-size: 0.9em;
  font-weight: bold;
}

.reward-slot {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 10px;
  min-height: 120px;
}

.premium-reward {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.1) 100%);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.reward-label {
  font-size: 0.6em;
  color: #aaa;
  margin-bottom: 8px;
}

.premium-label {
  color: #ffd700;
}

.reward-content {
  text-align: center;
}

.reward-icon {
  font-size: 2em;
  margin: 10px 0;
}

.reward-desc {
  font-size: 0.6em;
  color: #fff;
  margin: 8px 0;
  min-height: 30px;
}

.claim-button {
  background: #00ff00;
  color: #000;
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.6em;
  font-weight: bold;
  transition: all 0.2s;
}

.claim-button:hover {
  background: #00cc00;
  transform: scale(1.05);
}

.premium-claim {
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
}

.claimed-badge,
.locked-badge,
.premium-required-badge {
  font-size: 0.6em;
  padding: 5px 10px;
  border-radius: 5px;
  display: inline-block;
  margin-top: 5px;
}

.claimed-badge {
  background: rgba(0, 255, 0, 0.2);
  color: #00ff00;
}

.locked-badge {
  background: rgba(255, 255, 255, 0.1);
  color: #888;
}

.premium-required-badge {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.no-reward {
  text-align: center;
  color: #555;
  font-size: 1.5em;
  padding: 20px;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  padding: 30px;
  border-radius: 15px;
  max-width: 500px;
  color: white;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.premium-modal h2 {
  color: #ffd700;
  text-align: center;
  margin-bottom: 20px;
}

.premium-features {
  margin: 20px 0;
}

.premium-features p {
  margin: 10px 0;
  font-size: 0.8em;
}

.premium-price {
  text-align: center;
  font-size: 1.5em;
  color: #ffd700;
  margin: 20px 0;
}

.modal-actions {
  display: flex;
  gap: 15px;
  margin-top: 25px;
}

.confirm-button,
.cancel-button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.8em;
  transition: transform 0.2s;
}

.confirm-button {
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  color: #000;
  font-weight: bold;
}

.cancel-button {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.confirm-button:hover,
.cancel-button:hover {
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .bp-title {
    font-size: 1.2em;
  }

  .rewards-grid {
    grid-template-columns: 1fr;
  }

  .tier-number {
    font-size: 2em;
  }
}
</style>

<template>
  <div class="daily-challenges-view">
    <div class="challenges-container">
      <!-- Header -->
      <div class="challenges-header">
        <h1 class="title">
          <span class="icon">🎯</span>
          Desafio Diário
        </h1>
        <p class="subtitle">Complete o desafio de hoje para ganhar recompensas!</p>
      </div>

      <!-- Streak Section -->
      <div class="streak-section">
        <div class="streak-card">
          <div class="streak-icon">🔥</div>
          <div class="streak-info">
            <div class="streak-label">Sequência Atual</div>
            <div class="streak-value">{{ streak.current }} dias</div>
          </div>
        </div>
        <div class="streak-card">
          <div class="streak-icon">⭐</div>
          <div class="streak-info">
            <div class="streak-label">Melhor Sequência</div>
            <div class="streak-value">{{ streak.best }} dias</div>
          </div>
        </div>
      </div>

      <!-- Current Challenge -->
      <div v-if="currentChallenge" class="current-challenge-section">
        <div class="challenge-card" :class="{ 'completed': currentChallenge.completed }">
          <!-- Challenge Header -->
          <div class="challenge-header">
            <div class="difficulty-badge" :class="`difficulty-${currentChallenge.difficulty}`">
              {{ difficultyLabel(currentChallenge.difficulty) }}
            </div>
            <div v-if="currentChallenge.completed" class="completed-badge">
              ✓ Completo
            </div>
          </div>

          <!-- Challenge Title & Description -->
          <h2 class="challenge-title">{{ currentChallenge.title }}</h2>
          <p class="challenge-description">{{ currentChallenge.description }}</p>

          <!-- Progress Bar -->
          <div class="progress-section">
            <div class="progress-header">
              <span class="progress-label">Progresso</span>
              <span class="progress-percentage">{{ completionPercentage }}%</span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${completionPercentage}%` }"
              ></div>
            </div>
            <div class="progress-numbers">
              <span>{{ formatProgress(currentChallenge.progress) }}</span>
              <span>/</span>
              <span>{{ formatProgress(currentChallenge.targetValue) }}</span>
            </div>
          </div>

          <!-- Rewards -->
          <div class="rewards-section">
            <h3 class="rewards-title">🎁 Recompensas</h3>
            <div class="rewards-grid">
              <div
                v-for="(reward, index) in currentChallenge.rewards"
                :key="index"
                class="reward-item"
              >
                <div class="reward-icon">{{ getRewardIcon(reward.type) }}</div>
                <div class="reward-label">{{ getRewardLabel(reward) }}</div>
              </div>
            </div>
          </div>

          <!-- Claim Button -->
          <button
            v-if="canClaim"
            class="claim-button"
            @click="claimRewards"
            :disabled="claiming"
          >
            <span v-if="!claiming">🎉 Resgatar Recompensas</span>
            <span v-else>Resgatando...</span>
          </button>

          <div v-else-if="currentChallenge.claimed" class="claimed-message">
            ✓ Recompensas resgatadas!
          </div>

          <div v-else class="progress-hint">
            Continue jogando para completar o desafio!
          </div>
        </div>

        <!-- Timer to Next Challenge -->
        <div class="next-challenge-timer">
          <div class="timer-icon">⏰</div>
          <div class="timer-text">
            <span>Próximo desafio em: </span>
            <strong>{{ timeUntilReset }}</strong>
          </div>
        </div>
      </div>

      <!-- No Challenge -->
      <div v-else class="no-challenge">
        <div class="no-challenge-icon">🎯</div>
        <p>Carregando desafio...</p>
      </div>

      <!-- History Section -->
      <div class="history-section">
        <h2 class="history-title">📜 Histórico</h2>
        <div v-if="history.length > 0" class="history-list">
          <div
            v-for="item in history.slice(0, 10)"
            :key="item.date"
            class="history-item"
          >
            <div class="history-date">{{ formatDate(item.date) }}</div>
            <div class="history-status" :class="{ 'completed': item.completed }">
              <span v-if="item.completed">✓ Completo</span>
              <span v-else>✗ Não completo</span>
            </div>
          </div>
        </div>
        <div v-else class="no-history">
          Nenhum histórico ainda. Complete seu primeiro desafio!
        </div>
      </div>

      <!-- Back Button -->
      <button class="back-button" @click="goBack">
        ← Voltar
      </button>
    </div>

    <!-- Claim Success Modal -->
    <Teleport to="body">
      <div v-if="showClaimModal" class="claim-modal-overlay" @click="closeClaimModal">
        <div class="claim-modal" @click.stop>
          <h2 class="modal-title">🎉 Recompensas Resgatadas!</h2>
          <div class="rewards-claimed">
            <div
              v-for="(reward, index) in claimedRewards"
              :key="index"
              class="claimed-reward"
            >
              <div class="claimed-icon">{{ getRewardIcon(reward.type) }}</div>
              <div class="claimed-text">{{ getClaimedRewardLabel(reward) }}</div>
            </div>
          </div>
          <button class="modal-button" @click="closeClaimModal">
            Continuar
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { DailyChallengesManager } from '@/game/DailyChallenges'
import type { DailyChallenge, RewardType } from '@/game/DailyChallengesTypes'

const router = useRouter()

const currentChallenge = ref<DailyChallenge | null>(null)
const streak = ref({ current: 0, best: 0 })
const history = ref<any[]>([])
const timeUntilReset = ref('')
const claiming = ref(false)
const showClaimModal = ref(false)
const claimedRewards = ref<any[]>([])

let timerInterval: number | null = null

const completionPercentage = computed(() => {
  return DailyChallengesManager.getCompletionPercentage()
})

const canClaim = computed(() => {
  return DailyChallengesManager.canClaimRewards()
})

function difficultyLabel(difficulty: string): string {
  const labels = {
    easy: 'Fácil',
    medium: 'Médio',
    hard: 'Difícil',
    expert: 'Expert'
  }
  return labels[difficulty as keyof typeof labels] || difficulty
}

function formatProgress(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }
  return value.toString()
}

function getRewardIcon(type: RewardType): string {
  const icons = {
    gold: '💰',
    skin: '👕',
    powerup: '⚡',
    boost: '🚀'
  }
  return icons[type as keyof typeof icons] || '🎁'
}

function getRewardLabel(reward: any): string {
  if (reward.type === 'gold') {
    return `${reward.value} Gold`
  }
  return reward.value.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
}

function getClaimedRewardLabel(reward: any): string {
  if (reward.type === 'gold') {
    return `+${reward.amount} Gold`
  }
  if (reward.quantity && reward.quantity > 1) {
    return `${reward.id} x${reward.quantity}`
  }
  return reward.id
}

async function claimRewards() {
  if (claiming.value) return

  claiming.value = true

  try {
    const result = DailyChallengesManager.claimRewards()

    if (result.success && result.rewards) {
      claimedRewards.value = result.rewards
      showClaimModal.value = true

      // Update challenge state
      currentChallenge.value = DailyChallengesManager.getCurrentChallenge()
    }
  } catch (error) {
    console.error('Failed to claim rewards:', error)
  } finally {
    claiming.value = false
  }
}

function closeClaimModal() {
  showClaimModal.value = false
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function updateTimeUntilReset() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const diff = tomorrow.getTime() - now.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  timeUntilReset.value = `${hours}h ${minutes}m`
}

function loadData() {
  currentChallenge.value = DailyChallengesManager.getCurrentChallenge()
  streak.value = DailyChallengesManager.getStreak()
  history.value = DailyChallengesManager.getHistory()
}

function goBack() {
  router.push('/')
}

onMounted(() => {
  loadData()
  updateTimeUntilReset()

  // Update timer every minute
  timerInterval = window.setInterval(updateTimeUntilReset, 60000)
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<style scoped>
.daily-challenges-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
  padding: 20px;
  color: white;
}

.challenges-container {
  max-width: 800px;
  margin: 0 auto;
}

/* Header */
.challenges-header {
  text-align: center;
  margin-bottom: 30px;
}

.title {
  font-size: 48px;
  font-weight: bold;
  margin: 0;
  background: linear-gradient(90deg, #00ff00, #00ffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.icon {
  font-size: 48px;
}

.subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 10px;
}

/* Streak Section */
.streak-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.streak-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(0, 255, 0, 0.3);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.streak-icon {
  font-size: 40px;
}

.streak-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 5px;
}

.streak-value {
  font-size: 24px;
  font-weight: bold;
  color: #00ff00;
}

/* Challenge Card */
.current-challenge-section {
  margin-bottom: 30px;
}

.challenge-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(0, 255, 0, 0.3);
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 20px;
}

.challenge-card.completed {
  border-color: #ffd700;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
}

.challenge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.difficulty-badge {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
}

.difficulty-easy {
  background: rgba(0, 255, 0, 0.2);
  color: #00ff00;
}

.difficulty-medium {
  background: rgba(255, 165, 0, 0.2);
  color: #ffa500;
}

.difficulty-hard {
  background: rgba(255, 0, 0, 0.2);
  color: #ff4444;
}

.difficulty-expert {
  background: rgba(138, 43, 226, 0.2);
  color: #8a2be2;
}

.completed-badge {
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  font-weight: bold;
}

.challenge-title {
  font-size: 28px;
  margin: 0 0 10px 0;
  color: #00ff00;
}

.challenge-card.completed .challenge-title {
  color: #ffd700;
}

.challenge-description {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 25px;
}

/* Progress */
.progress-section {
  margin-bottom: 25px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.progress-label {
  color: rgba(255, 255, 255, 0.7);
}

.progress-percentage {
  font-weight: bold;
  color: #00ff00;
}

.progress-bar {
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ff00, #00ffff);
  transition: width 0.5s ease;
}

.challenge-card.completed .progress-fill {
  background: linear-gradient(90deg, #ffd700, #ffed4e);
}

.progress-numbers {
  text-align: right;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

/* Rewards */
.rewards-section {
  margin-bottom: 25px;
}

.rewards-title {
  font-size: 18px;
  margin-bottom: 15px;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
}

.reward-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  text-align: center;
}

.reward-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.reward-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

/* Buttons */
.claim-button {
  width: 100%;
  padding: 16px;
  background: linear-gradient(90deg, #ffd700, #ffed4e);
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: bold;
  color: #000;
  cursor: pointer;
  transition: all 0.3s ease;
}

.claim-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(255, 215, 0, 0.5);
}

.claim-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.claimed-message,
.progress-hint {
  text-align: center;
  padding: 16px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
}

.claimed-message {
  color: #ffd700;
  font-weight: bold;
}

/* Timer */
.next-challenge-timer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  font-size: 14px;
}

.timer-icon {
  font-size: 24px;
}

/* History */
.history-section {
  margin-bottom: 30px;
}

.history-title {
  font-size: 24px;
  margin-bottom: 20px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.history-date {
  color: rgba(255, 255, 255, 0.7);
}

.history-status.completed {
  color: #00ff00;
}

.history-status:not(.completed) {
  color: rgba(255, 255, 255, 0.4);
}

.no-history {
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.5);
}

/* No Challenge */
.no-challenge {
  text-align: center;
  padding: 60px 20px;
}

.no-challenge-icon {
  font-size: 80px;
  margin-bottom: 20px;
}

/* Back Button */
.back-button {
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

/* Claim Modal */
.claim-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.claim-modal {
  background: linear-gradient(135deg, #1a1f3a, #0a0e27);
  border: 2px solid #ffd700;
  border-radius: 20px;
  padding: 40px;
  max-width: 500px;
  width: 90%;
  animation: slideUp 0.3s ease;
  box-shadow: 0 20px 60px rgba(255, 215, 0, 0.3);
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-title {
  text-align: center;
  font-size: 32px;
  margin-bottom: 30px;
  color: #ffd700;
}

.rewards-claimed {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

.claimed-reward {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.claimed-icon {
  font-size: 36px;
}

.claimed-text {
  font-size: 18px;
  font-weight: bold;
  color: #00ff00;
}

.modal-button {
  width: 100%;
  padding: 16px;
  background: linear-gradient(90deg, #00ff00, #00ffff);
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: bold;
  color: #000;
  cursor: pointer;
  transition: all 0.3s ease;
}

.modal-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0, 255, 0, 0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .streak-section {
    grid-template-columns: 1fr;
  }

  .title {
    font-size: 36px;
  }

  .challenge-title {
    font-size: 22px;
  }

  .claim-modal {
    padding: 30px 20px;
  }

  .modal-title {
    font-size: 24px;
  }
}
</style>

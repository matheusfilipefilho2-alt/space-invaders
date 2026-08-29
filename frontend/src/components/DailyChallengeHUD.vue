<template>
  <div v-if="challenge" class="daily-challenge-hud" :class="{ 'completed': challenge.completed }">
    <div class="challenge-icon" @click="navigateToChallenges">
      <div class="icon-container">
        <svg class="calendar-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
          <path d="M7 12h5v5H7z"/>
        </svg>

        <div v-if="challenge.completed && !challenge.claimed" class="notification-badge">
          !
        </div>
      </div>

      <div class="challenge-info">
        <div class="challenge-title">{{ challenge.title }}</div>
        <div class="challenge-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${completionPercentage}%` }"></div>
          </div>
          <div class="progress-text">{{ progressText }}</div>
        </div>
      </div>
    </div>

    <div v-if="challenge.completed && !challenge.claimed" class="claim-hint">
      Clique para resgatar!
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { DailyChallengesManager } from '@/game/DailyChallenges'
import type { DailyChallenge } from '@/game/DailyChallengesTypes'

const router = useRouter()
const challenge = ref<DailyChallenge | null>(null)
let updateInterval: number | null = null

const completionPercentage = computed(() => {
  if (!challenge.value) return 0
  return DailyChallengesManager.getCompletionPercentage()
})

const progressText = computed(() => {
  if (!challenge.value) return ''

  const current = Math.min(challenge.value.progress, challenge.value.targetValue)
  const target = challenge.value.targetValue

  return `${formatNumber(current)} / ${formatNumber(target)}`
})

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return num.toString()
}

function updateChallenge() {
  challenge.value = DailyChallengesManager.getCurrentChallenge()
}

function navigateToChallenges() {
  router.push('/daily-challenges')
}

onMounted(() => {
  updateChallenge()
  // Update every 5 seconds
  updateInterval = window.setInterval(updateChallenge, 5000)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>

<style scoped>
.daily-challenge-hud {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #00ff00;
  border-radius: 12px;
  padding: 15px;
  min-width: 280px;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
}

.daily-challenge-hud:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(0, 255, 0, 0.5);
  border-color: #00ffff;
}

.daily-challenge-hud.completed {
  border-color: #ffd700;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 4px 20px rgba(255, 215, 0, 0.3);
  }
  50% {
    box-shadow: 0 4px 30px rgba(255, 215, 0, 0.6);
  }
}

.challenge-icon {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-container {
  position: relative;
  flex-shrink: 0;
}

.calendar-icon {
  width: 40px;
  height: 40px;
  color: #00ff00;
}

.completed .calendar-icon {
  color: #ffd700;
}

.notification-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff0000;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.challenge-info {
  flex: 1;
  min-width: 0;
}

.challenge-title {
  font-size: 14px;
  font-weight: bold;
  color: #00ff00;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.completed .challenge-title {
  color: #ffd700;
}

.challenge-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ff00, #00ff00);
  transition: width 0.5s ease;
  border-radius: 4px;
}

.completed .progress-fill {
  background: linear-gradient(90deg, #ffd700, #ffed4e);
}

.progress-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  text-align: right;
}

.claim-hint {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: #ffd700;
  font-weight: bold;
  animation: glow 1.5s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .daily-challenge-hud {
    top: 10px;
    right: 10px;
    min-width: 240px;
    padding: 12px;
  }

  .calendar-icon {
    width: 32px;
    height: 32px;
  }

  .challenge-title {
    font-size: 12px;
  }
}
</style>

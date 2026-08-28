<template>
  <div class="game-over-overlay" @click.self="handleOverlayClick">
    <div class="game-over-modal">
      <h1 class="game-over-title">GAME OVER</h1>

      <div v-if="isNewHighScore" class="new-high-score-banner">
        🏆 NEW HIGH SCORE! 🏆
      </div>

      <div class="stats-container">
        <div class="stat-row main-stat">
          <span class="stat-label">FINAL SCORE</span>
          <span class="stat-value score">{{ formatNumber(stats.score) }}</span>
        </div>

        <div class="stats-grid">
          <div class="stat-row">
            <span class="stat-label">Level Reached</span>
            <span class="stat-value">{{ stats.level }}</span>
          </div>

          <div class="stat-row">
            <span class="stat-label">Kills</span>
            <span class="stat-value">{{ stats.killCount }}</span>
          </div>

          <div class="stat-row">
            <span class="stat-label">Accuracy</span>
            <span class="stat-value">{{ stats.accuracy.toFixed(1) }}%</span>
          </div>

          <div class="stat-row">
            <span class="stat-label">Max Combo</span>
            <span class="stat-value">x{{ stats.maxCombo }}</span>
          </div>

          <div class="stat-row">
            <span class="stat-label">Rapid Kills</span>
            <span class="stat-value">{{ stats.rapidKills }}</span>
          </div>

          <div class="stat-row">
            <span class="stat-label">Time Played</span>
            <span class="stat-value">{{ formatTime(stats.startTime) }}</span>
          </div>
        </div>

        <div class="rewards-section" v-if="rewards">
          <h3 class="rewards-title">REWARDS</h3>
          <div class="rewards-grid">
            <div class="reward-item">
              <span class="reward-icon">💰</span>
              <span class="reward-label">Gold Earned</span>
              <span class="reward-value">{{ rewards.goldEarned }}</span>
            </div>
            <div class="reward-item" v-if="rewards.xpEarned">
              <span class="reward-icon">⭐</span>
              <span class="reward-label">XP Earned</span>
              <span class="reward-value">{{ rewards.xpEarned }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn btn-primary" @click="$emit('restart')">
          <span class="btn-icon">🔄</span>
          PLAY AGAIN
        </button>
        <button class="btn btn-secondary" @click="$emit('view-ranking')">
          <span class="btn-icon">🏆</span>
          RANKING
        </button>
      </div>

      <div class="hint-text">
        Press ESC to close
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GameStats } from '@/game/types'

interface Rewards {
  goldEarned: number
  xpEarned?: number
}

interface Props {
  stats: GameStats
  rewards?: Rewards
  highScore?: number
}

const props = defineProps<Props>()

const isNewHighScore = computed(() => {
  return props.highScore !== undefined && props.stats.score > props.highScore
})

const emit = defineEmits<{
  restart: []
  viewRanking: []
  close: []
}>()

function formatNumber(num: number): string {
  return num.toLocaleString()
}

function formatTime(startTime: number): string {
  const seconds = Math.floor((Date.now() - startTime) / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function handleOverlayClick() {
  emit('close')
}

// Handle ESC key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    emit('close')
  }
})
</script>

<style scoped>
.game-over-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.game-over-modal {
  background: linear-gradient(135deg, #1a1a3e 0%, #0f0f2e 100%);
  border: 3px solid #00ff88;
  border-radius: 16px;
  padding: 40px;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 0 40px rgba(0, 255, 136, 0.5), 0 0 80px rgba(0, 255, 136, 0.3);
  animation: slideUp 0.4s ease-out;
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

.game-over-title {
  font-size: 3rem;
  font-weight: bold;
  text-align: center;
  color: #ff4444;
  text-shadow: 0 0 20px rgba(255, 68, 68, 0.8), 0 0 40px rgba(255, 68, 68, 0.5);
  margin-bottom: 30px;
  letter-spacing: 4px;
}

.new-high-score-banner {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #000;
  font-size: 1.5rem;
  font-weight: bold;
  text-align: center;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 8px;
  animation: pulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.stats-container {
  margin-bottom: 30px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 255, 136, 0.2);
}

.stat-row.main-stat {
  padding: 20px 0;
  border-bottom: 2px solid #00ff88;
  margin-bottom: 20px;
}

.stat-label {
  font-size: 0.9rem;
  color: #888;
  text-transform: uppercase;
}

.main-stat .stat-label {
  font-size: 1.2rem;
  color: #00ff88;
}

.stat-value {
  font-size: 1.4rem;
  font-weight: bold;
  color: #fff;
}

.stat-value.score {
  font-size: 2.5rem;
  color: #00ff88;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.stats-grid {
  display: grid;
  gap: 8px;
}

.rewards-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 2px solid rgba(0, 255, 136, 0.3);
}

.rewards-title {
  font-size: 1.5rem;
  color: #FFD700;
  text-align: center;
  margin-bottom: 20px;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.reward-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 255, 136, 0.1);
  border: 2px solid rgba(0, 255, 136, 0.3);
  border-radius: 8px;
  padding: 15px;
  transition: all 0.3s ease;
}

.reward-item:hover {
  background: rgba(0, 255, 136, 0.2);
  border-color: #00ff88;
  transform: translateY(-2px);
}

.reward-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.reward-label {
  font-size: 0.8rem;
  color: #888;
  margin-bottom: 5px;
}

.reward-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #FFD700;
}

.action-buttons {
  display: flex;
  gap: 15px;
  margin-top: 30px;
}

.btn {
  flex: 1;
  padding: 15px 30px;
  font-size: 1.1rem;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn-primary {
  background: linear-gradient(135deg, #00ff88 0%, #00cc70 100%);
  color: #000;
  box-shadow: 0 4px 15px rgba(0, 255, 136, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 255, 136, 0.6);
}

.btn-secondary {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #000;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
}

.btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 215, 0, 0.6);
}

.btn-icon {
  font-size: 1.3rem;
}

.hint-text {
  text-align: center;
  margin-top: 20px;
  color: #666;
  font-size: 0.85rem;
}
</style>

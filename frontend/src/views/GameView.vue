<template>
  <div class="game-view">
    <div class="score-ui">
      <div class="game-stats">
        <div class="score-item">
          <span class="score-label">SCORE</span>
          <span class="score-value">{{ score }}</span>
        </div>
        <div class="score-item">
          <span class="score-label">LEVEL</span>
          <span class="score-value">{{ level }}</span>
        </div>
        <div class="score-item">
          <span class="score-label">LIVES</span>
          <span class="score-value">{{ lives }}</span>
        </div>
        <div class="score-item">
          <span class="score-label">GOLD</span>
          <span class="score-value" style="color: #FFD700;">{{ authStore.user?.gold_balance || 0 }}</span>
        </div>
      </div>
    </div>

    <GameCanvas
      ref="gameCanvasRef"
      @score-change="handleScoreChange"
      @lives-change="handleLivesChange"
      @level-change="handleLevelChange"
      @game-over="handleGameOver"
    />

    <div v-if="gameStarted" class="game-controls">
      <p class="controls-hint">← → Move | SPACE Shoot</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { gameAPI } from '@/services/api'
import GameCanvas from '@/components/game/GameCanvas.vue'
import type { GameStats } from '@/game/types'

const authStore = useAuthStore()
const gameCanvasRef = ref<InstanceType<typeof GameCanvas> | null>(null)
const gameStarted = ref(false)
const score = ref(0)
const level = ref(1)
const lives = ref(3)
const sessionStarted = ref(false)

onMounted(() => {
  // Auto-start the game when view is mounted
  startNewGame()
})

async function startNewGame() {
  try {
    // Call backend to start session
    await gameAPI.start()
    sessionStarted.value = true
    gameStarted.value = true

    // Reset stats
    score.value = 0
    level.value = 1
    lives.value = 3

    // Start the game engine
    gameCanvasRef.value?.startGame()
  } catch (err) {
    console.error('Failed to start game session:', err)
    alert('Failed to start game. Please try again.')
  }
}

function handleScoreChange(newScore: number) {
  score.value = newScore
}

function handleLivesChange(newLives: number) {
  lives.value = newLives
}

function handleLevelChange(newLevel: number) {
  level.value = newLevel
}

async function handleGameOver(stats: GameStats) {
  if (!sessionStarted.value) return

  try {
    // Send final score to backend
    const response = await gameAPI.end(stats.score)
    const data = response.data.data

    alert(`Game Over!\nScore: ${stats.score}\nGold Earned: ${data.goldEarned}\nXP Earned: ${data.xpEarned || 0}`)

    // Refresh user data
    await authStore.fetchProfile()

    gameStarted.value = false
    sessionStarted.value = false
  } catch (err) {
    console.error('Failed to end game session:', err)
    alert('Failed to save game results. Please try again.')
  }
}
</script>

<style scoped>
.game-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  background: #000;
}

.score-ui {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.game-stats {
  display: flex;
  justify-content: center;
  gap: 30px;
  background: rgba(0, 0, 0, 0.85);
  border: 2px solid #00ff88;
  border-radius: 8px;
  padding: 12px 25px;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-label {
  font-size: 0.8rem;
  color: #888;
  margin-bottom: 5px;
}

.score-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #00ff88;
}

.game-controls {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 10;
}

.controls-hint {
  color: #888;
  font-size: 0.9rem;
  background: rgba(0, 0, 0, 0.8);
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #00ff88;
}
</style>

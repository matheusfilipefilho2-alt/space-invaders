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

    <div v-if="!gameStarted" class="menu-buttons">
      <button @click="startNewGame" class="button-play">
        START NEW GAME
      </button>
      <router-link to="/leaderboard" class="button-view-ranking">LEADERBOARD</router-link>
      <router-link to="/profile" class="button-view-ranking">PROFILE</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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
  padding: 20px;
}

.score-ui {
  width: 100%;
  max-width: 800px;
  margin-bottom: 20px;
}

.game-stats {
  display: flex;
  justify-content: space-around;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid #00ff88;
  border-radius: 8px;
  padding: 15px;
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
  margin-top: 20px;
  text-align: center;
}

.controls-hint {
  color: #888;
  font-size: 0.9rem;
}

.menu-buttons {
  display: flex;
  gap: 15px;
  margin-top: 30px;
}

.button-play,
.button-view-ranking {
  padding: 12px 24px;
  font-size: 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  transition: all 0.3s;
}

.button-play {
  background: #00ff88;
  color: #000;
  font-weight: bold;
}

.button-view-ranking {
  background: #667eea;
  color: #fff;
}

.button-play:hover {
  background: #00cc6a;
  transform: scale(1.05);
}

.button-view-ranking:hover {
  background: #5568d3;
  transform: scale(1.05);
}
</style>

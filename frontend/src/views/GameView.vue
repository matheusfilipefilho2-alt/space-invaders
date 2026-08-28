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
      <!-- Action buttons removed - all features now accessible via navigation menu -->
    </div>

    <GameCanvas
      ref="gameCanvasRef"
      @score-change="handleScoreChange"
      @lives-change="handleLivesChange"
      @level-change="handleLevelChange"
      @game-over="handleGameOver"
      @combo-change="handleComboChange"
      @achievement-unlocked="handleAchievementUnlocked"
    />

    <AchievementNotification :achievements="newAchievements" />

    <GameOverScreen
      v-if="showGameOver && gameOverStats"
      :stats="gameOverStats"
      :rewards="gameOverRewards"
      :high-score="highScore"
      @restart="handleRestart"
      @close="showGameOver = false"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { gameAPI } from '@/services/api'
import GameCanvas from '@/components/game/GameCanvas.vue'
import GameOverScreen from '@/components/game/GameOverScreen.vue'
import AchievementNotification from '@/components/game/AchievementNotification.vue'
import type { GameStats } from '@/game/types'
import type { Achievement } from '@/game/Achievements'

const authStore = useAuthStore()
const gameCanvasRef = ref<InstanceType<typeof GameCanvas> | null>(null)
const gameStarted = ref(false)
const score = ref(0)
const level = ref(1)
const lives = ref(3)
const sessionStarted = ref(false)
const showGameOver = ref(false)
const gameOverStats = ref<GameStats | null>(null)
const gameOverRewards = ref<{ goldEarned: number; xpEarned?: number } | null>(null)
const highScore = ref(0)
const combo = ref(0)
const newAchievements = ref<Achievement[]>([])

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
    lives.value = 1
    combo.value = 0

    // Get high score from game engine
    if (gameCanvasRef.value?.getGameEngine) {
      highScore.value = gameCanvasRef.value.getGameEngine().getHighScore()
    }

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

function handleComboChange(newCombo: number) {
  combo.value = newCombo
}

async function handleGameOver(stats: GameStats) {
  // Always store stats and show game over screen first
  gameOverStats.value = stats
  showGameOver.value = true

  if (!sessionStarted.value) return

  try {
    // Send final score to backend (ensure it's an integer)
    const response = await gameAPI.end(Math.floor(stats.score))
    const data = response.data.data

    // Update rewards from backend
    gameOverRewards.value = {
      goldEarned: data.goldEarned,
      xpEarned: data.xpEarned || 0
    }

    // Refresh user data
    await authStore.fetchProfile()

    gameStarted.value = false
    sessionStarted.value = false
  } catch (err) {
    console.error('Failed to end game session:', err)

    // Show game over screen with default rewards even if backend fails
    gameOverRewards.value = {
      goldEarned: 0,
      xpEarned: 0
    }

    gameStarted.value = false
    sessionStarted.value = false

    // Don't show alert, just log the error
    console.warn('Game results not saved to backend, but showing game over screen')
  }
}

function handleRestart() {
  showGameOver.value = false
  startNewGame()
}

function handleAchievementUnlocked(achievements: Achievement[]) {
  newAchievements.value = achievements
}
</script>

<style scoped>
.game-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  background: linear-gradient(135deg, #050519 0%, #0a0a2e 50%, #16213e 100%);
}

.score-ui {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
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

.action-buttons {
  display: flex;
  gap: 12px;
}

.game-btn {
  padding: 12px 20px;
  font-size: 0.95rem;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #000;
}

.btn-icon {
  font-size: 1.2rem;
}

.skins-btn {
  background: linear-gradient(135deg, #9370DB 0%, #8A2BE2 100%);
  box-shadow: 0 4px 15px rgba(147, 112, 219, 0.4);
}

.skins-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(147, 112, 219, 0.6);
}

.profile-btn {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
}

.profile-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 215, 0, 0.6);
}

.leaderboard-btn {
  background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
  box-shadow: 0 4px 15px rgba(255, 107, 157, 0.4);
}

.leaderboard-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 157, 0.6);
}

.settings-btn {
  background: linear-gradient(135deg, #00ff88 0%, #00cc70 100%);
  box-shadow: 0 4px 15px rgba(0, 255, 136, 0.4);
}

.settings-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 255, 136, 0.6);
}
</style>

<template>
  <div class="game-container">
    <div class="game-header">
      <h1>Space Invaders</h1>
      <div class="game-stats">
        <p>Score: {{ score }}</p>
        <p>Gold: {{ authStore.user?.gold_balance || 0 }}</p>
        <button @click="authStore.logout(); router.push('/login')" class="logout-btn">
          Logout
        </button>
      </div>
    </div>
    <div id="game-canvas" ref="gameCanvas"></div>
    <div class="game-controls">
      <button @click="startGame" :disabled="gameStarted">Start Game</button>
      <button @click="endGame" :disabled="!gameStarted">End Game</button>
      <router-link to="/profile" class="nav-button">Profile</router-link>
      <router-link to="/shop" class="nav-button">Shop</router-link>
      <router-link to="/leaderboard" class="nav-button">Leaderboard</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { gameAPI } from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()
const gameStarted = ref(false)
const score = ref(0)
const gameCanvas = ref<HTMLElement | null>(null)

async function startGame() {
  try {
    await gameAPI.start()
    gameStarted.value = true
    score.value = 0
    // TODO: Initialize Phaser game here
    alert('Game started! (Phaser integration pending)')

    // Simulate score increase for testing
    const interval = setInterval(() => {
      if (gameStarted.value) {
        score.value += Math.floor(Math.random() * 10)
      } else {
        clearInterval(interval)
      }
    }, 1000)
  } catch (err) {
    console.error('Failed to start game:', err)
    alert('Failed to start game. Please try again.')
  }
}

async function endGame() {
  try {
    const response = await gameAPI.end(score.value)
    const goldEarned = response.data.data.gold_earned
    alert(`Game ended! Gold earned: ${goldEarned}`)
    gameStarted.value = false
    await authStore.fetchProfile()
  } catch (err) {
    console.error('Failed to end game:', err)
    alert('Failed to end game. Please try again.')
  }
}

onMounted(() => {
  // Fetch profile to ensure we have latest user data
  authStore.fetchProfile()
  // TODO: Initialize Phaser game
  if (gameCanvas.value) {
    gameCanvas.value.innerHTML = '<p style="text-align: center; padding: 4rem; color: #999;">Phaser game canvas will be initialized here</p>'
  }
})
</script>

<style scoped>
.game-container {
  min-height: 100vh;
  background: #1a1a2e;
  color: white;
  padding: 2rem;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

h1 {
  font-size: 2.5rem;
  margin: 0;
}

.game-stats {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.game-stats p {
  font-size: 1.25rem;
  margin: 0;
}

.logout-btn {
  background: #e53e3e;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
}

.logout-btn:hover {
  background: #c53030;
}

#game-canvas {
  background: #0f0f1e;
  border-radius: 1rem;
  min-height: 400px;
  margin-bottom: 2rem;
  border: 2px solid #667eea;
}

.game-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

button, .nav-button {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s;
  text-decoration: none;
  display: inline-block;
}

button:hover:not(:disabled), .nav-button:hover {
  background: #5568d3;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

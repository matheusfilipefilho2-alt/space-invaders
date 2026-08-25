<template>
  <div class="game-view">
    <div class="score-ui">
      <div class="game-stats">
        <div class="score-item">
          <span class="score-label">SCORE</span>
          <span class="score-value">{{ score }}</span>
        </div>
        <div class="score-item">
          <span class="score-label">GOLD</span>
          <span class="score-value" style="color: #FFD700;">{{ authStore.user?.gold_balance || 0 }}</span>
        </div>
        <div class="score-item">
          <span class="score-label">PLAYER</span>
          <span class="score-value" style="color: #4ECDC4;">{{ authStore.user?.username || 'Guest' }}</span>
        </div>
      </div>
    </div>

    <div id="game-canvas" ref="gameCanvas"></div>

    <div class="menu-buttons">
      <button @click="startGame" :disabled="gameStarted" class="button-play">
        {{ gameStarted ? 'JOGO INICIADO' : 'INICIAR JOGO' }}
      </button>
      <button @click="endGame" :disabled="!gameStarted" class="button-restart">
        FINALIZAR JOGO
      </button>
      <router-link to="/profile" class="button-view-ranking">PERFIL</router-link>
      <router-link to="/shop" class="button-pvp">LOJA</router-link>
      <router-link to="/leaderboard" class="button-view-ranking">RANKING</router-link>
      <button @click="authStore.logout(); router.push('/login')" class="button-restart">
        SAIR
      </button>
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
.game-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  padding-top: 100px;
}

#game-canvas {
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid #00ff88;
  border-radius: 10px;
  min-height: 400px;
  width: 100%;
  max-width: 800px;
  margin: 20px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 14px;
}

.menu-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin: 30px auto;
  width: 100%;
  max-width: 800px;
  padding: 0 10px;
}

.menu-buttons .button-play {
  grid-column: 1 / -1;
}

@media (max-width: 768px) {
  .menu-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .menu-buttons {
    grid-template-columns: 1fr;
  }
}
</style>

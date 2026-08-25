<template>
  <div class="start-screen">
    <div class="game-container">
      <!-- Título com efeito neon -->
      <div class="title-container">
        <h1 class="main-title">
          <span class="title-word space-word" data-text="SPACE">SPACE</span>
          <span class="title-word invaders-word" data-text="INVADERS">INVADERS</span>
        </h1>
        <div class="title-scanlines"></div>
        <div class="title-glow"></div>
      </div>

      <!-- Subtítulo -->
      <p class="game-subtitle">DEFEND EARTH FROM ALIEN INVASION</p>

      <!-- Menu de botões para usuários autenticados -->
      <div v-if="authStore.isAuthenticated" class="menu-buttons action-buttons menu-buttons-enhanced">
        <p class="welcome-message">WELCOME BACK, {{ authStore.user?.username?.toUpperCase() }}!</p>

        <div class="button-with-badge">
          <router-link to="/game" class="button-play primary-action">
            <span class="button-icon">🚀</span>
            START GAME
          </router-link>
        </div>

        <div class="button-with-badge">
          <router-link to="/profile" class="button-view-ranking secondary-action">
            <span class="button-icon">👤</span>
            PROFILE
          </router-link>
        </div>

        <div class="button-with-badge">
          <router-link to="/shop" class="button-view-ranking secondary-action">
            <span class="button-icon">🛍️</span>
            SHOP
          </router-link>
        </div>

        <div class="button-with-badge">
          <router-link to="/leaderboard" class="button-view-ranking secondary-action">
            <span class="button-icon">🏆</span>
            LEADERBOARD
          </router-link>
        </div>

        <button @click="handleLogout" class="button-view-ranking secondary-action logout-btn">
          <span class="button-icon">🚪</span>
          LOGOUT
        </button>
      </div>

      <!-- Menu de botões para usuários não autenticados -->
      <div v-else class="menu-buttons action-buttons menu-buttons-enhanced">
        <div class="button-with-badge">
          <router-link to="/login" class="button-play primary-action">
            <span class="button-icon">🚀</span>
            START GAME
          </router-link>
        </div>

        <div class="button-with-badge">
          <router-link to="/login" class="button-view-ranking secondary-action">
            <span class="button-icon">👤</span>
            LOGIN
          </router-link>
        </div>

        <div class="button-with-badge">
          <router-link to="/register" class="button-view-ranking secondary-action">
            <span class="button-icon">✨</span>
            REGISTER
          </router-link>
        </div>

        <div class="button-with-badge">
          <router-link to="/leaderboard" class="button-view-ranking secondary-action">
            <span class="button-icon">🏆</span>
            LEADERBOARD
          </router-link>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer-container">
      <div class="footer-line"></div>
      <span class="footer-text">
        DEVELOPED BY MATHEUSIN v2.0
      </span>
      <div class="footer-stars">
        <span>✦</span><span>✧</span><span>✦</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  // If user is authenticated, fetch their profile
  if (authStore.isAuthenticated && !authStore.user) {
    authStore.fetchProfile()
  }
})

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.start-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.game-container {
  text-align: center;
  z-index: 1;
  max-width: 800px;
  padding: 2rem;
}

.title-container {
  position: relative;
  margin-bottom: 2rem;
}

.main-title {
  margin: 0;
  padding: 0;
}

.title-word {
  display: block;
  font-size: 80px;
  line-height: 1.2;
  margin: 10px 0;
}

.space-word {
  color: #00ff88;
  text-shadow:
    0 0 10px #00ff88,
    0 0 20px #00ff88,
    0 0 30px #00ff88;
}

.invaders-word {
  color: #ffa502;
  text-shadow:
    0 0 10px #ffa502,
    0 0 20px #ffa502,
    0 0 30px #ffa502;
}

.game-subtitle {
  font-size: 14px;
  color: #4ECDC4;
  letter-spacing: 4px;
  margin-bottom: 3rem;
  text-shadow: 0 0 10px #4ECDC4;
}

.welcome-message {
  font-size: 16px;
  color: #FFD700;
  margin-bottom: 2rem;
  text-shadow: 0 0 10px #FFD700;
  letter-spacing: 2px;
}

.menu-buttons-enhanced {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 30px 0;
  align-items: center;
  width: 100%;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.button-with-badge {
  width: 100%;
  position: relative;
  display: inline-block;
}

.logout-btn {
  margin-top: 1rem;
  background: #FF4757 !important;
  border-color: #FF4757 !important;
}

.logout-btn:hover {
  background: #ff6b7a !important;
  box-shadow: 0 0 20px #FF4757 !important;
}

.footer-container {
  position: fixed;
  bottom: 20px;
  text-align: center;
  z-index: 1;
}

.footer-line {
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #4ECDC4, transparent);
  margin: 0 auto 10px;
}

.footer-text {
  font-size: 10px;
  color: #4ECDC4;
  letter-spacing: 2px;
  text-shadow: 0 0 10px #4ECDC4;
}

.footer-stars {
  margin-top: 5px;
  color: #4ECDC4;
  font-size: 12px;
  display: flex;
  gap: 10px;
  justify-content: center;
}

@media (max-width: 768px) {
  .title-word {
    font-size: 50px;
  }

  .game-subtitle {
    font-size: 10px;
    letter-spacing: 2px;
  }

  .menu-buttons-enhanced {
    max-width: 300px;
  }
}
</style>

<template>
  <div class="start-screen screen">
    <div class="game-container">
      <!-- Título com efeito neon -->
      <div class="title-container">
        <h1 class="main-title">
          <span
            class="title-word space-word"
            data-text="SPACE"
            style="font-size: 100px; display: block; margin-bottom: 20px"
          >SPACE</span>
          <span
            class="title-word invaders-word"
            data-text="INVADERS"
            style="font-size: 100px; display: block"
          >INVADERS</span>
        </h1>
        <div class="title-scanlines"></div>
        <div class="title-glow"></div>
      </div>

      <!-- Subtítulo -->
      <p class="game-subtitle">DEFEND EARTH FROM ALIEN INVASION</p>

      <!-- Menu de botões AUTENTICADO -->
      <div v-if="authStore.isAuthenticated" class="menu-buttons action-buttons menu-buttons-enhanced" id="main-menu-buttons">
        <!-- Mensagem de boas-vindas -->
        <p style="color: #FFD700; font-size: 14px; margin-bottom: 20px; text-shadow: 0 0 10px #FFD700;">
          WELCOME BACK, {{ authStore.user?.username?.toUpperCase() }}!
        </p>

        <!-- Botão Jogar -->
        <div class="button-with-badge">
          <router-link to="/game" class="button-play primary-action">
            <span class="button-icon">🚀</span>
            START GAME
          </router-link>
        </div>

        <!-- Botão Perfil -->
        <div class="button-with-badge">
          <router-link to="/profile" class="button-view-ranking secondary-action">
            <span class="button-icon">👤</span>
            PROFILE
          </router-link>
        </div>

        <!-- Menu secundário -->
        <div class="button-with-badge">
          <router-link to="/leaderboard" class="button-view-ranking secondary-action">
            <span class="button-icon">🏆</span>
            RANKING
          </router-link>
        </div>

        <div class="button-with-badge">
          <router-link to="/shop" class="button-view-ranking secondary-action">
            <span class="button-icon">🛍️</span>
            LOJA
          </router-link>
        </div>

        <!-- Botão Logout -->
        <button @click="handleLogout" class="button-view-ranking secondary-action" style="background: #FF4757; border-color: #FF4757;">
          <span class="button-icon">🚪</span>
          LOGOUT
        </button>
      </div>

      <!-- Menu de botões NÃO AUTENTICADO -->
      <div v-else class="menu-buttons action-buttons menu-buttons-enhanced" id="main-menu-buttons">
        <!-- Botão Jogar -->
        <div class="button-with-badge">
          <router-link to="/login" class="button-play primary-action">
            <span class="button-icon">🚀</span>
            START GAME
          </router-link>
        </div>

        <!-- Botão Login/Perfil -->
        <div class="button-with-badge">
          <router-link to="/login" class="button-view-ranking secondary-action">
            <span class="button-icon">👤</span>
            LOGIN
          </router-link>
        </div>

        <!-- Botão Registro -->
        <div class="button-with-badge">
          <router-link to="/register" class="button-view-ranking secondary-action">
            <span class="button-icon">✨</span>
            REGISTER
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
/* Forçar layout vertical dos botões */
.menu-buttons-enhanced {
  grid-template-columns: 1fr !important;
  display: flex !important;
  flex-direction: column !important;
}

.button-with-badge {
  width: 100%;
}

/* Garantir que router-link ocupe 100% da largura */
.button-with-badge a,
.button-with-badge button {
  width: 100%;
  display: block;
}
</style>

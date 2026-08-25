<template>
  <div class="start-screen">
    <div class="game-container">
      <h1 class="game-title">LOGIN</h1>
      <p class="game-subtitle">ACESSE SUA CONTA</p>

      <form @submit.prevent="handleLogin" class="form-container">
        <input
          v-model="username"
          type="text"
          class="game-input"
          placeholder="USERNAME"
          required
        />
        <input
          v-model="password"
          type="password"
          class="game-input"
          placeholder="PASSWORD"
          required
        />

        <div v-if="authStore.error" class="error-message">
          {{ authStore.error }}
        </div>

        <button type="submit" class="button-play" :disabled="authStore.loading">
          {{ authStore.loading ? 'CARREGANDO...' : 'JOGAR AGORA' }}
        </button>
      </form>

      <div class="auth-link">
        <p>Não tem conta? <router-link to="/register" class="link">Registre-se</router-link></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')

async function handleLogin() {
  const success = await authStore.login(username.value, password.value)
  if (success) {
    router.push('/game')
  }
}
</script>

<style scoped>
.form-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
}

.error-message {
  background: rgba(255, 71, 87, 0.2);
  border: 2px solid #ff4757;
  border-radius: 8px;
  padding: 12px 20px;
  color: #ff4757;
  font-size: 10px;
  text-align: center;
  width: 100%;
  max-width: 300px;
  animation: pulse 2s infinite;
}

.auth-link {
  margin-top: 20px;
  text-align: center;
}

.auth-link p {
  color: #ffa502;
  font-size: 12px;
}

.link {
  color: #00ff88;
  text-decoration: none;
  font-weight: bold;
  text-shadow: 0 0 10px #00ff88;
  transition: all 0.3s ease;
}

.link:hover {
  text-shadow: 0 0 20px #00ff88;
}
</style>

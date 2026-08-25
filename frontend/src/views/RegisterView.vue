<template>
  <div class="register-container">
    <div class="register-card">
      <h1>Register</h1>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label>Username</label>
          <input v-model="username" type="text" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" required />
        </div>
        <div v-if="authStore.error" class="error">
          {{ authStore.error }}
        </div>
        <button type="submit" :disabled="authStore.loading">
          {{ authStore.loading ? 'Loading...' : 'Register' }}
        </button>
      </form>
      <p>
        Already have an account?
        <router-link to="/login">Login</router-link>
      </p>
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
const email = ref('')
const password = ref('')

async function handleRegister() {
  const success = await authStore.register(username.value, email.value, password.value)
  if (success) {
    router.push('/game')
  }
}
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-card {
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  width: 100%;
  max-width: 400px;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  font-size: 1rem;
}

button {
  width: 100%;
  padding: 0.75rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s;
}

button:hover:not(:disabled) {
  background: #5568d3;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #e53e3e;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #fed7d7;
  border-radius: 0.25rem;
}

p {
  margin-top: 1rem;
  text-align: center;
}

a {
  color: #667eea;
  text-decoration: none;
  font-weight: bold;
}

a:hover {
  text-decoration: underline;
}
</style>

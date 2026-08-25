<template>
  <div class="home-container">
    <div class="home-content">
      <h1>Space Invaders</h1>
      <p class="tagline">Defend the galaxy. Earn rewards. Dominate the leaderboard.</p>

      <div v-if="authStore.isAuthenticated" class="authenticated-section">
        <p class="welcome">Welcome back, {{ authStore.user?.username }}!</p>
        <div class="action-buttons">
          <router-link to="/game" class="button primary">Play Game</router-link>
          <router-link to="/profile" class="button">Profile</router-link>
          <router-link to="/shop" class="button">Shop</router-link>
          <router-link to="/leaderboard" class="button">Leaderboard</router-link>
        </div>
      </div>

      <div v-else class="unauthenticated-section">
        <div class="action-buttons">
          <router-link to="/login" class="button primary">Login</router-link>
          <router-link to="/register" class="button">Register</router-link>
          <router-link to="/leaderboard" class="button">View Leaderboard</router-link>
        </div>
      </div>

      <div class="features">
        <div class="feature-card">
          <h3>Classic Gameplay</h3>
          <p>Experience the timeless Space Invaders action with modern enhancements</p>
        </div>
        <div class="feature-card">
          <h3>Earn Rewards</h3>
          <p>Collect gold, unlock achievements, and purchase powerful items</p>
        </div>
        <div class="feature-card">
          <h3>Compete Globally</h3>
          <p>Climb the ranks and prove you're the ultimate space defender</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  // If user is authenticated, fetch their profile
  if (authStore.isAuthenticated && !authStore.user) {
    authStore.fetchProfile()
  }
})
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.home-content {
  max-width: 1000px;
  width: 100%;
  text-align: center;
  color: white;
}

h1 {
  font-size: 4rem;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.tagline {
  font-size: 1.5rem;
  margin-bottom: 3rem;
  opacity: 0.9;
}

.welcome {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  font-weight: bold;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 4rem;
}

.button {
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
  border-radius: 0.5rem;
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
}

.button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.button.primary {
  background: white;
  color: #667eea;
}

.button.primary:hover {
  background: #f0f0f0;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 4rem;
}

.feature-card {
  background: rgba(255, 255, 255, 0.1);
  padding: 2rem;
  border-radius: 1rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.feature-card h3 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.feature-card p {
  opacity: 0.9;
  line-height: 1.6;
}

@media (max-width: 768px) {
  h1 {
    font-size: 2.5rem;
  }

  .tagline {
    font-size: 1.2rem;
  }

  .features {
    grid-template-columns: 1fr;
  }
}
</style>

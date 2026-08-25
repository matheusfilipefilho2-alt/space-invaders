<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const mobileMenuOpen = ref(false)

const isActive = (routeName: string) => {
  return route.name === routeName
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
  mobileMenuOpen.value = false
}

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
}

const username = computed(() => {
  return authStore.user?.username || 'Player'
})
</script>

<template>
  <nav class="main-nav" v-if="authStore.isAuthenticated">
    <div class="nav-container">
      <!-- Logo/Brand -->
      <div class="nav-brand">
        <router-link to="/" class="brand-link" @click="closeMobileMenu">
          👾 SPACE INVADERS
        </router-link>
      </div>

      <!-- Mobile Menu Toggle -->
      <button class="mobile-toggle" @click="toggleMobileMenu">
        {{ mobileMenuOpen ? '✕' : '☰' }}
      </button>

      <!-- Navigation Links -->
      <div class="nav-links" :class="{ open: mobileMenuOpen }">
        <!-- Game -->
        <router-link
          to="/game"
          class="nav-link"
          :class="{ active: isActive('game') }"
          @click="closeMobileMenu"
        >
          🎮 Play
        </router-link>

        <!-- Progression -->
        <div class="nav-dropdown">
          <span class="nav-link dropdown-trigger">
            🏆 Progression
          </span>
          <div class="dropdown-menu">
            <router-link
              to="/battle-pass"
              class="dropdown-item"
              :class="{ active: isActive('battlePass') }"
              @click="closeMobileMenu"
            >
              🎖️ Battle Pass
            </router-link>
            <router-link
              to="/achievements"
              class="dropdown-item"
              :class="{ active: isActive('achievements') }"
              @click="closeMobileMenu"
            >
              🏆 Achievements
            </router-link>
            <router-link
              to="/nfts"
              class="dropdown-item"
              :class="{ active: isActive('nfts') }"
              @click="closeMobileMenu"
            >
              🖼️ NFT Gallery
            </router-link>
          </div>
        </div>

        <!-- Economy -->
        <div class="nav-dropdown">
          <span class="nav-link dropdown-trigger">
            💰 Economy
          </span>
          <div class="dropdown-menu">
            <router-link
              to="/shop"
              class="dropdown-item"
              :class="{ active: isActive('shop') }"
              @click="closeMobileMenu"
            >
              🛒 Shop
            </router-link>
            <router-link
              to="/packages"
              class="dropdown-item"
              :class="{ active: isActive('packages') }"
              @click="closeMobileMenu"
            >
              💎 Packages
            </router-link>
            <router-link
              to="/conversion"
              class="dropdown-item"
              :class="{ active: isActive('conversion') }"
              @click="closeMobileMenu"
            >
              🔄 Conversion
            </router-link>
            <router-link
              to="/wallet"
              class="dropdown-item"
              :class="{ active: isActive('wallet') }"
              @click="closeMobileMenu"
            >
              👛 Wallet
            </router-link>
          </div>
        </div>

        <!-- Leaderboard -->
        <router-link
          to="/leaderboard"
          class="nav-link"
          :class="{ active: isActive('leaderboard') }"
          @click="closeMobileMenu"
        >
          📊 Leaderboard
        </router-link>

        <!-- User Menu -->
        <div class="nav-dropdown user-menu">
          <span class="nav-link dropdown-trigger">
            👤 {{ username }}
          </span>
          <div class="dropdown-menu dropdown-right">
            <router-link
              to="/profile"
              class="dropdown-item"
              :class="{ active: isActive('profile') }"
              @click="closeMobileMenu"
            >
              👤 Profile
            </router-link>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item logout-btn" @click="handleLogout">
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.main-nav {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  position: sticky;
  top: 0;
  z-index: 100;
  font-family: 'Press Start 2P', monospace;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.nav-brand {
  flex-shrink: 0;
}

.brand-link {
  color: #ffd700;
  text-decoration: none;
  font-size: 1em;
  text-shadow: 2px 2px 0 #000;
  transition: all 0.2s;
  display: block;
}

.brand-link:hover {
  color: #ffed4e;
  transform: scale(1.05);
}

.mobile-toggle {
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 1.5em;
  cursor: pointer;
  padding: 5px 10px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  justify-content: flex-end;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 10px 15px;
  border-radius: 5px;
  font-size: 0.7em;
  transition: all 0.2s;
  cursor: pointer;
  white-space: nowrap;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffd700;
}

.nav-link.active {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

/* Dropdown */
.nav-dropdown {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 5px;
}

.dropdown-trigger::after {
  content: '▼';
  font-size: 0.6em;
  margin-left: 5px;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: linear-gradient(135deg, #2a5298 0%, #1e3c72 100%);
  border-radius: 8px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
  min-width: 200px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.3s;
  margin-top: 5px;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.dropdown-right {
  left: auto;
  right: 0;
}

.nav-dropdown:hover .dropdown-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-item {
  display: block;
  color: white;
  text-decoration: none;
  padding: 12px 20px;
  font-size: 0.7em;
  transition: all 0.2s;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffd700;
}

.dropdown-item.active {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.dropdown-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 5px 0;
}

.logout-btn {
  color: #ff6b6b;
  font-family: inherit;
}

.logout-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
}

/* Mobile Styles */
@media (max-width: 968px) {
  .mobile-toggle {
    display: block;
  }

  .nav-links {
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    flex-direction: column;
    align-items: stretch;
    padding: 20px;
    gap: 10px;
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: all 0.3s;
  }

  .nav-links.open {
    max-height: 600px;
    opacity: 1;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  }

  .nav-link {
    width: 100%;
    text-align: left;
  }

  .nav-dropdown {
    width: 100%;
  }

  .dropdown-menu {
    position: static;
    opacity: 1;
    visibility: visible;
    transform: none;
    box-shadow: none;
    background: rgba(0, 0, 0, 0.2);
    margin-top: 5px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .user-menu {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 10px;
    margin-top: 10px;
  }
}

@media (max-width: 768px) {
  .brand-link {
    font-size: 0.8em;
  }

  .nav-container {
    padding: 12px 15px;
  }
}
</style>

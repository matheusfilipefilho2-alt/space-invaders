<template>
  <div>
    <!-- Fixed Navigation Bar -->
    <nav class="game-navbar">
      <div class="navbar-container">
        <router-link to="/game" class="navbar-btn navbar-btn-play">
          <span class="navbar-icon">🚀</span>
          <span class="navbar-text">JOGAR</span>
        </router-link>
        <router-link to="/profile" class="navbar-btn navbar-btn-profile">
          <span class="navbar-icon">👨‍🚀</span>
          <span class="navbar-text">PERFIL</span>
        </router-link>
        <router-link to="/shop" class="navbar-btn navbar-btn-shop">
          <span class="navbar-icon">🛍️</span>
          <span class="navbar-text">LOJA</span>
        </router-link>
        <router-link to="/" class="navbar-btn navbar-btn-home">
          <span class="navbar-icon">🏠</span>
          <span class="navbar-text">INÍCIO</span>
        </router-link>
      </div>
    </nav>

    <!-- Wallet UI Container -->
    <div class="header-wallet" style="position: fixed; top: 10px; right: 10px; z-index: 1000;">
      <button v-if="!walletConnected" @click="connectWallet" class="wallet-btn">
        <span>🔗</span> CONECTAR WALLET
      </button>
      <div v-else class="wallet-display">
        <span class="wallet-icon">👛</span>
        <span class="wallet-address">{{ shortenAddress(walletAddress) }}</span>
        <button @click="disconnectWallet" class="wallet-disconnect-btn">❌</button>
      </div>
    </div>

    <section class="start-screen">
      <div class="game-container">
        <div class="page-header-controls">
          <router-link to="/" class="navbar-btn navbar-btn-home back-btn-header">
            <span class="navbar-icon">←</span>
            <span class="navbar-text">VOLTAR</span>
          </router-link>
        </div>

        <h1 class="game-title">🏆 RANKING</h1>
        <p class="game-subtitle">Melhores pontuações da galáxia</p>

        <!-- Informações do usuário atual -->
        <div class="user-info-card">
          <div class="user-avatar">👨‍🚀</div>
          <div class="user-details">
            <h3>{{ authStore.user?.username || 'Carregando...' }}</h3>
            <p>Score: {{ authStore.user?.high_score || 0 }}</p>
          </div>
          <div class="user-status">
            <span class="online-indicator">🟢 Online</span>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="ranking-search-container">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Buscar jogador..."
            class="ranking-search-input"
            @input="handleSearch"
          />
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading">Carregando ranking...</div>

        <!-- Lista de ranking -->
        <div v-else class="ranking-container">
          <div class="ranking-list">
            <div v-if="filteredRankings.length === 0" class="loading">
              Nenhum ranking disponível
            </div>
            <div
              v-for="(player, index) in filteredRankings"
              :key="player.player_id"
              :class="['ranking-item', { 'current-user': player.player_id === authStore.user?.id }]"
              :id="`player-${player.player_id}`"
            >
              <div class="ranking-position">
                <span v-if="player.rank <= 3" class="medal">
                  {{ player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉' }}
                </span>
                <span v-else>{{ player.rank }}</span>
              </div>
              <div class="ranking-player">
                <div class="player-avatar">👨‍🚀</div>
                <div class="player-info">
                  <span class="player-name">{{ player.username }}</span>
                  <span class="player-level">{{ player.league_name }}</span>
                </div>
              </div>
              <div class="ranking-score">
                <span class="score-value">{{ formatScore(player.high_score) }}</span>
                <span class="score-label">pontos</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Scroll to Me Button -->
        <button
          v-if="showScrollToMe"
          @click="scrollToMyPosition"
          class="scroll-to-me-btn"
        >
          <span class="btn-icon">📍</span>
          <span>MINHA POSIÇÃO</span>
        </button>
      </div>

      <!-- Footer -->
      <div class="footer-container">
        <div class="footer-line"></div>
        <span class="footer-text">DEVELOPED BY MATHEUSIN v2.0</span>
        <div class="footer-stars">
          <span>✦</span><span>✧</span><span>✦</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { leaderboardAPI } from '@/services/api'

const authStore = useAuthStore()
const loading = ref(true)
const rankings = ref<any[]>([])
const searchQuery = ref('')
const showScrollToMe = ref(false)

// Wallet state
const walletConnected = ref(false)
const walletAddress = ref('')

const filteredRankings = computed(() => {
  if (!searchQuery.value) return rankings.value

  const query = searchQuery.value.toLowerCase()
  return rankings.value.filter((player: any) =>
    player.username.toLowerCase().includes(query)
  )
})

async function loadGlobalLeaderboard() {
  try {
    loading.value = true
    const response = await leaderboardAPI.global(100, 0)
    rankings.value = response.data.data

    // Check if user is in the visible rankings
    const userInView = rankings.value.some(
      (p: any) => p.player_id === authStore.user?.id
    )
    showScrollToMe.value = !userInView && rankings.value.length > 10
  } catch (err) {
    console.error('Failed to load leaderboard:', err)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  // Search is handled by computed property
}

function scrollToMyPosition() {
  const myElement = document.getElementById(`player-${authStore.user?.id}`)
  if (myElement) {
    myElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function formatScore(score: number): string {
  return score?.toLocaleString() || '0'
}

// Wallet functions
const connectWallet = async () => {
  try {
    if ((window as any).solana && (window as any).solana.isPhantom) {
      const response = await (window as any).solana.connect()
      walletAddress.value = response.publicKey.toString()
      walletConnected.value = true
      localStorage.setItem('wallet_address', walletAddress.value)
    } else {
      alert('Por favor, instale a Phantom Wallet para conectar!')
      window.open('https://phantom.app/', '_blank')
    }
  } catch (error) {
    console.error('Erro ao conectar wallet:', error)
    alert('Erro ao conectar wallet. Tente novamente.')
  }
}

const disconnectWallet = () => {
  walletConnected.value = false
  walletAddress.value = ''
  localStorage.removeItem('wallet_address')
  if ((window as any).solana) {
    (window as any).solana.disconnect()
  }
}

const shortenAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

onMounted(() => {
  loadGlobalLeaderboard()

  // Check if wallet was previously connected
  const savedWallet = localStorage.getItem('wallet_address')
  if (savedWallet) {
    walletAddress.value = savedWallet
    walletConnected.value = true
  }
})
</script>

<style scoped>
/* Wallet styles */
.wallet-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: 2px solid #fff;
  border-radius: 12px;
  padding: 10px 20px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.wallet-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.wallet-display {
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid #FFD700;
  border-radius: 12px;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: white;
}

.wallet-icon {
  font-size: 16px;
}

.wallet-address {
  color: #FFD700;
  font-size: 9px;
}

.wallet-disconnect-btn {
  background: #FF4757;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.wallet-disconnect-btn:hover {
  background: #ff6b7a;
  transform: scale(1.1);
}

.medal {
  font-size: 24px;
}
</style>

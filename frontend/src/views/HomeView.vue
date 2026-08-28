<template>
  <div class="start-screen screen">
    <!-- Wallet UI Container -->
    <div class="header-wallet" style="position: fixed; top: 10px; right: 10px; z-index: 1000">
      <button v-if="!walletConnected" @click="connectWallet" class="wallet-btn">
        <span>🔗</span> CONECTAR WALLET
      </button>
      <div v-else class="wallet-display">
        <span class="wallet-icon">👛</span>
        <span class="wallet-address">{{ shortenAddress(walletAddress) }}</span>
        <button @click="disconnectWallet" class="wallet-disconnect-btn">❌</button>
      </div>
    </div>

    <div class="game-container">
      <!-- Título com efeito neon -->
      <div class="title-container">
        <h1 class="main-title">
          <span
            class="title-word space-word"
            data-text="SPACE"
            style="font-size: 100px; display: block; margin-bottom: 20px"
            >SPACE</span
          >
          <span
            class="title-word invaders-word"
            data-text="INVADERS"
            style="font-size: 100px; display: block"
            >INVADERS</span
          >
        </h1>
        <div class="title-scanlines"></div>
        <div class="title-glow"></div>
      </div>

      <!-- Subtítulo -->
      <p class="game-subtitle">DEFEND EARTH FROM ALIEN INVASION</p>

      <!-- Menu de botões AUTENTICADO -->
      <div
        v-if="authStore.isAuthenticated"
        class="menu-buttons action-buttons menu-buttons-enhanced"
        id="main-menu-buttons"
      >
        <!-- Mensagem de boas-vindas -->
        <p
          style="
            color: #ffd700;
            font-size: 14px;
            margin-bottom: 20px;
            text-shadow: 0 0 10px #ffd700;
          "
        >
          WELCOME BACK, {{ authStore.user?.username?.toUpperCase() }}!
        </p>
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

        <!-- Botão PvP Arena -->
        <div class="button-with-badge">
          <router-link to="/pvp" class="button-pvp pvp-action">
            <span class="button-icon">⚔️</span>
            PVP ARENA
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
      <span class="footer-text"> DEVELOPED BY MATHEUSIN v2.0 </span>
      <div class="footer-stars"><span>✦</span><span>✧</span><span>✦</span></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

// Wallet state
const walletConnected = ref(false)
const walletAddress = ref('')

onMounted(() => {
  // If user is authenticated, fetch their profile
  if (authStore.isAuthenticated && !authStore.user) {
    authStore.fetchProfile()
  }

  // Check if wallet was previously connected
  const savedWallet = localStorage.getItem('wallet_address')
  if (savedWallet) {
    walletAddress.value = savedWallet
    walletConnected.value = true
  }
})

const connectWallet = async () => {
  try {
    // TODO: Implement Solana wallet connection
    // For now, just simulate connection
    if ((window as any).solana && (window as any).solana.isPhantom) {
      const response = await (window as any).solana.connect()
      walletAddress.value = response.publicKey.toString()
      walletConnected.value = true
      localStorage.setItem('wallet_address', walletAddress.value)
      console.log('Wallet connected:', walletAddress.value)
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
    ;(window as any).solana.disconnect()
  }
  console.log('Wallet desconectada')
}

const shortenAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

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
  max-width: 400px !important;
  margin-left: auto;
  margin-right: auto;
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

/* Ajustar largura dos botões */
.button-play {
  max-width: 300px !important;
  margin: 0 auto;
}

.button-view-ranking,
.secondary-action {
  max-width: 250px !important;
  margin: 0 auto;
}

/* Botão PvP Arena - Rosa/Magenta */
.button-pvp,
.pvp-action {
  background: transparent !important;
  border-color: #ff4081 !important;
  color: #ff4081 !important;
  text-shadow: 0 0 10px #ff4081 !important;
  box-shadow: 0 0 15px rgba(255, 64, 129, 0.3) !important;
  max-width: 280px !important;
  margin: 0 auto;
}

.button-pvp:hover,
.pvp-action:hover {
  background: rgba(255, 64, 129, 0.1) !important;
  box-shadow: 0 0 25px rgba(255, 64, 129, 0.6) !important;
  transform: translateY(-2px);
}

/* Wallet Button Styles */
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
  border: 2px solid #ffd700;
  border-radius: 12px;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: white;
  z-index: 999;
}

.wallet-icon {
  font-size: 16px;
}

.wallet-address {
  color: #ffd700;
  font-size: 9px;
}

.wallet-disconnect-btn {
  background: #ff4757;
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
</style>

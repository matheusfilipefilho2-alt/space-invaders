<template>
  <div class="profile-page">
    <!-- Fixed Navigation Bar -->
    <nav class="game-navbar">
      <div class="navbar-container">
        <router-link to="/game" class="navbar-btn navbar-btn-play">
          <span class="navbar-icon">🚀</span>
          <span class="navbar-text">JOGAR</span>
        </router-link>
        <router-link to="/shop" class="navbar-btn navbar-btn-shop">
          <span class="navbar-icon">🛍️</span>
          <span class="navbar-text">LOJA</span>
        </router-link>
        <router-link to="/leaderboard" class="navbar-btn navbar-btn-ranking">
          <span class="navbar-icon">🏆</span>
          <span class="navbar-text">RANKING</span>
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

    <div class="profile-container">
      <!-- Header do Perfil -->
      <div class="profile-header">
        <h1 class="profile-title">👨‍🚀 MEU PERFIL</h1>
      </div>

      <!-- Seção Avatar e Informações do Usuário -->
      <div class="profile-user-section">
        <div class="profile-avatar-container">
          <div class="profile-avatar">👨‍🚀</div>
          <div class="profile-avatar-badge">
            <span class="online-indicator">🟢</span>
          </div>
        </div>

        <div class="profile-user-info">
          <h2 class="profile-username">{{ player?.username || 'Carregando...' }}</h2>
          <p class="profile-email">{{ player?.email || 'email@exemplo.com' }}</p>
          <div class="profile-user-meta">
            <span class="profile-meta-item">
              <span class="meta-icon">⭐</span>
              <span class="meta-label">Nível:</span>
              <span class="meta-value">{{ currentLevel }}</span>
            </span>
            <span class="profile-meta-item">
              <span class="meta-icon">⚡</span>
              <span class="meta-label">XP:</span>
              <span class="meta-value">{{ currentXP }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Tabs Container -->
      <div class="ui-tabs">
        <div class="ui-tabs__header">
          <button
            :class="['ui-tabs__button', { 'ui-tabs__button--active': activeTab === 'stats' }]"
            @click="activeTab = 'stats'"
          >
            📊 ESTATÍSTICAS
          </button>
          <button
            :class="['ui-tabs__button', { 'ui-tabs__button--active': activeTab === 'achievements' }]"
            @click="activeTab = 'achievements'"
          >
            🏆 CONQUISTAS
          </button>
          <button
            :class="['ui-tabs__button', { 'ui-tabs__button--active': activeTab === 'inventory' }]"
            @click="activeTab = 'inventory'"
          >
            🎒 INVENTÁRIO
          </button>
          <button
            :class="['ui-tabs__button', { 'ui-tabs__button--active': activeTab === 'settings' }]"
            @click="activeTab = 'settings'"
          >
            ⚙️ CONFIGURAÇÕES
          </button>
          <div class="ui-tabs__underline"></div>
        </div>

        <div class="ui-tabs__content">
          <!-- Tab: Estatísticas -->
          <div
            :class="['ui-tabs__pane', { 'ui-tabs__pane--active': activeTab === 'stats' }]"
          >
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">🎮</div>
                <div class="stat-content">
                  <div class="stat-label">Partidas Jogadas</div>
                  <div class="stat-value">{{ player?.total_games || 0 }}</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">🏅</div>
                <div class="stat-content">
                  <div class="stat-label">Vitórias</div>
                  <div class="stat-value">0</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">⚔️</div>
                <div class="stat-content">
                  <div class="stat-label">Taxa de Vitória</div>
                  <div class="stat-value">0%</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">💯</div>
                <div class="stat-content">
                  <div class="stat-label">Melhor Score</div>
                  <div class="stat-value">{{ player?.high_score || 0 }}</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">👾</div>
                <div class="stat-content">
                  <div class="stat-label">Inimigos Destruídos</div>
                  <div class="stat-value">{{ player?.total_kills || 0 }}</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">⏱️</div>
                <div class="stat-content">
                  <div class="stat-label">Tempo Jogado</div>
                  <div class="stat-value">0h</div>
                </div>
              </div>
            </div>

            <div class="progress-section">
              <h3 class="progress-title">Progresso para Próximo Nível</h3>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
              </div>
              <div class="progress-info">
                <span>{{ currentXP }}</span>
                <span>/</span>
                <span>{{ nextLevelXP }}</span>
                <span>XP</span>
              </div>
            </div>
          </div>

          <!-- Tab: Conquistas -->
          <div
            :class="['ui-tabs__pane', { 'ui-tabs__pane--active': activeTab === 'achievements' }]"
          >
            <div class="achievements-container">
              <div class="achievements-grid">
                <div v-if="loadingAchievements" class="loading">Carregando conquistas...</div>
                <div v-else-if="achievements.length === 0" class="loading">
                  Nenhuma conquista desbloqueada ainda
                </div>
                <div
                  v-for="achievement in achievements"
                  :key="achievement.id"
                  class="achievement-card"
                >
                  <div class="achievement-icon">{{ achievement.icon || '🏆' }}</div>
                  <div class="achievement-info">
                    <h4 class="achievement-name">{{ achievement.name }}</h4>
                    <p class="achievement-description">{{ achievement.description }}</p>
                    <span class="achievement-rarity">{{ achievement.rarity }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Inventário -->
          <div
            :class="['ui-tabs__pane', { 'ui-tabs__pane--active': activeTab === 'inventory' }]"
          >
            <div class="inventory-container">
              <div class="inventory-grid">
                <div v-if="loadingInventory" class="loading">Carregando inventário...</div>
                <div v-else-if="inventory.length === 0" class="loading">
                  Seu inventário está vazio
                </div>
                <div
                  v-for="item in inventory"
                  :key="item.id"
                  class="inventory-item"
                >
                  <div class="item-icon">{{ getItemIcon(item.item?.category) }}</div>
                  <div class="item-info">
                    <h4 class="item-name">{{ item.item?.name }}</h4>
                    <p class="item-description">{{ item.item?.description }}</p>
                    <span v-if="item.equipped" class="item-equipped">✓ EQUIPADO</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Configurações -->
          <div
            :class="['ui-tabs__pane', { 'ui-tabs__pane--active': activeTab === 'settings' }]"
          >
            <div class="settings-container">
              <div class="settings-section">
                <h3 class="settings-title">Preferências de Áudio</h3>
                <div class="setting-item">
                  <label class="setting-label">Música</label>
                  <input
                    type="range"
                    class="setting-slider"
                    v-model="settings.musicVolume"
                    min="0"
                    max="100"
                  >
                </div>
                <div class="setting-item">
                  <label class="setting-label">Efeitos Sonoros</label>
                  <input
                    type="range"
                    class="setting-slider"
                    v-model="settings.sfxVolume"
                    min="0"
                    max="100"
                  >
                </div>
              </div>

              <div class="settings-section">
                <h3 class="settings-title">Preferências de Jogo</h3>
                <div class="setting-item">
                  <label class="setting-label">Dificuldade</label>
                  <select class="setting-select" v-model="settings.difficulty">
                    <option value="easy">Fácil</option>
                    <option value="normal">Normal</option>
                    <option value="hard">Difícil</option>
                  </select>
                </div>
                <div class="setting-item checkbox">
                  <input
                    type="checkbox"
                    id="fullscreen-toggle"
                    class="setting-checkbox"
                    v-model="settings.fullscreen"
                  >
                  <label class="setting-label" for="fullscreen-toggle">Modo Tela Cheia</label>
                </div>
              </div>

              <div class="settings-section">
                <h3 class="settings-title">Privacidade</h3>
                <div class="setting-item checkbox">
                  <input
                    type="checkbox"
                    id="public-profile-toggle"
                    class="setting-checkbox"
                    v-model="settings.publicProfile"
                  >
                  <label class="setting-label" for="public-profile-toggle">Perfil Público</label>
                </div>
                <div class="setting-item checkbox">
                  <input
                    type="checkbox"
                    id="show-score-toggle"
                    class="setting-checkbox"
                    v-model="settings.showScore"
                  >
                  <label class="setting-label" for="show-score-toggle">Mostrar Score no Ranking</label>
                </div>
              </div>

              <div class="settings-actions">
                <button class="ui-button ui-button--primary" @click="saveSettings">
                  💾 SALVAR CONFIGURAÇÕES
                </button>
                <button class="ui-button ui-button--secondary" @click="resetSettings">
                  🔄 RESTAURAR PADRÕES
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { playerAPI } from '@/services/api'

const player = ref<any>(null)
const achievements = ref<any[]>([])
const inventory = ref<any[]>([])
const loadingAchievements = ref(false)
const loadingInventory = ref(false)
const activeTab = ref<'stats' | 'achievements' | 'inventory' | 'settings'>('stats')

// Wallet state
const walletConnected = ref(false)
const walletAddress = ref('')

// Settings state
const settings = ref({
  musicVolume: 70,
  sfxVolume: 70,
  difficulty: 'normal',
  fullscreen: false,
  publicProfile: true,
  showScore: true
})

// Computed properties
const currentLevel = computed(() => {
  if (!player.value?.high_score) return 1
  return Math.floor(player.value.high_score / 1000) + 1
})

const currentXP = computed(() => {
  if (!player.value?.high_score) return 0
  return player.value.high_score % 1000
})

const nextLevelXP = computed(() => {
  return currentLevel.value * 1000
})

const progressPercentage = computed(() => {
  if (nextLevelXP.value === 0) return 0
  return (currentXP.value / 1000) * 100
})

async function loadProfile() {
  try {
    const response = await playerAPI.getProfile()
    player.value = response.data.data
  } catch (err) {
    console.error('Failed to load profile:', err)
  }
}

async function loadAchievements() {
  try {
    loadingAchievements.value = true
    const response = await playerAPI.getAchievements()
    achievements.value = response.data.data.map((pa: any) => pa.achievement)
  } catch (err) {
    console.error('Failed to load achievements:', err)
  } finally {
    loadingAchievements.value = false
  }
}

async function loadInventory() {
  try {
    loadingInventory.value = true
    const response = await playerAPI.getItems()
    inventory.value = response.data.data
  } catch (err) {
    console.error('Failed to load inventory:', err)
  } finally {
    loadingInventory.value = false
  }
}

function getItemIcon(category: string): string {
  const icons: Record<string, string> = {
    ship: '🚀',
    weapon: '🔫',
    shield: '🛡️',
    background: '🌌',
  }
  return icons[category?.toLowerCase()] || '📦'
}

function saveSettings() {
  localStorage.setItem('game_settings', JSON.stringify(settings.value))
  alert('Configurações salvas com sucesso!')
}

function resetSettings() {
  settings.value = {
    musicVolume: 70,
    sfxVolume: 70,
    difficulty: 'normal',
    fullscreen: false,
    publicProfile: true,
    showScore: true
  }
  localStorage.removeItem('game_settings')
  alert('Configurações restauradas para os padrões!')
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
  loadProfile()
  loadAchievements()
  loadInventory()

  // Load settings from localStorage
  const savedSettings = localStorage.getItem('game_settings')
  if (savedSettings) {
    settings.value = JSON.parse(savedSettings)
  }

  // Check if wallet was previously connected
  const savedWallet = localStorage.getItem('wallet_address')
  if (savedWallet) {
    walletAddress.value = savedWallet
    walletConnected.value = true
  }
})
</script>

<style>
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

/* Achievement card styles */
.achievement-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 215, 0, 0.15);
  border-radius: 10px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.achievement-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #FFD700;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.2);
  transform: translateY(-3px);
}

.achievement-info {
  width: 100%;
}

.achievement-rarity {
  display: inline-block;
  font-size: 9px;
  color: #4ECDC4;
  font-weight: bold;
  margin-top: 5px;
  text-transform: uppercase;
}

/* Item styles */
.item-icon {
  font-size: 36px;
}

.item-info {
  width: 100%;
}

.item-name {
  font-size: 10px;
  font-weight: bold;
  color: white;
  font-family: 'Press Start 2P', monospace;
  margin-bottom: 5px;
}

.item-description {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Orbitron', monospace;
}

.item-equipped {
  display: inline-block;
  background: #00ff88;
  color: #000;
  padding: 4px 8px;
  border-radius: 5px;
  font-size: 9px;
  font-weight: bold;
  margin-top: 8px;
}
</style>

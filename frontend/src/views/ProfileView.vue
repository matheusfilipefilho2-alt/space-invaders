<template>
  <div class="profile-page">
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
                  <div class="stat-value">{{ stats.totalGamesPlayed }}</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">🏅</div>
                <div class="stat-content">
                  <div class="stat-label">Vitórias</div>
                  <div class="stat-value">{{ stats.totalLevelsCompleted }}</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">⚔️</div>
                <div class="stat-content">
                  <div class="stat-label">Taxa de Vitória</div>
                  <div class="stat-value">{{ winRate }}%</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">💯</div>
                <div class="stat-content">
                  <div class="stat-label">Melhor Score</div>
                  <div class="stat-value">{{ stats.highestScore.toLocaleString() }}</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">👾</div>
                <div class="stat-content">
                  <div class="stat-label">Inimigos Destruídos</div>
                  <div class="stat-value">{{ stats.totalKills.toLocaleString() }}</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">⏱️</div>
                <div class="stat-content">
                  <div class="stat-label">Tempo Jogado</div>
                  <div class="stat-value">{{ formatPlayTime }}</div>
                </div>
              </div>
            </div>

            <!-- Additional Statistics -->
            <div class="stats-section">
              <h3 class="section-title">📊 Estatísticas Detalhadas</h3>
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-icon">🎯</div>
                  <div class="stat-content">
                    <div class="stat-label">Precisão Geral</div>
                    <div class="stat-value">{{ stats.overallAccuracy }}%</div>
                  </div>
                </div>

                <div class="stat-card">
                  <div class="stat-icon">⭐</div>
                  <div class="stat-content">
                    <div class="stat-label">Melhor Precisão</div>
                    <div class="stat-value">{{ stats.bestAccuracy }}%</div>
                  </div>
                </div>

                <div class="stat-card">
                  <div class="stat-icon">🔥</div>
                  <div class="stat-content">
                    <div class="stat-label">Melhor Combo</div>
                    <div class="stat-value">x{{ stats.bestCombo }}</div>
                  </div>
                </div>

                <div class="stat-card">
                  <div class="stat-icon">🐲</div>
                  <div class="stat-content">
                    <div class="stat-label">Bosses Derrotados</div>
                    <div class="stat-value">{{ stats.totalBossKills }}</div>
                  </div>
                </div>

                <div class="stat-card">
                  <div class="stat-icon">📊</div>
                  <div class="stat-content">
                    <div class="stat-label">Nível Mais Alto</div>
                    <div class="stat-value">{{ stats.highestLevel }}</div>
                  </div>
                </div>

                <div class="stat-card">
                  <div class="stat-icon">📈</div>
                  <div class="stat-content">
                    <div class="stat-label">Pontuação Média</div>
                    <div class="stat-value">{{ stats.averageScore.toLocaleString() }}</div>
                  </div>
                </div>

                <div class="stat-card">
                  <div class="stat-icon">🚀</div>
                  <div class="stat-content">
                    <div class="stat-label">Total de Disparos</div>
                    <div class="stat-value">{{ stats.totalShots.toLocaleString() }}</div>
                  </div>
                </div>

                <div class="stat-card">
                  <div class="stat-icon">✅</div>
                  <div class="stat-content">
                    <div class="stat-label">Total de Acertos</div>
                    <div class="stat-value">{{ stats.totalHits.toLocaleString() }}</div>
                  </div>
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
              <div class="achievements-summary">
                <div class="summary-stat">
                  <span class="summary-label">Total de Conquistas:</span>
                  <span class="summary-value">{{ localAchievements.length }}</span>
                </div>
                <div class="summary-stat">
                  <span class="summary-label">Desbloqueadas:</span>
                  <span class="summary-value unlocked">{{ unlockedAchievementsCount }}</span>
                </div>
                <div class="summary-stat">
                  <span class="summary-label">Progresso:</span>
                  <span class="summary-value">{{ achievementProgress }}%</span>
                </div>
              </div>

              <div class="achievements-grid">
                <div v-if="localAchievements.length === 0" class="loading">
                  Nenhuma conquista disponível
                </div>
                <div
                  v-for="achievement in localAchievements"
                  :key="achievement.id"
                  class="achievement-card"
                  :class="{ unlocked: achievement.unlocked, locked: !achievement.unlocked }"
                >
                  <div class="achievement-icon">{{ achievement.icon || '🏆' }}</div>
                  <div class="achievement-info">
                    <h4 class="achievement-name">{{ achievement.name }}</h4>
                    <p class="achievement-description">{{ achievement.description }}</p>
                    <div class="achievement-progress-info">
                      <span class="progress-text">{{ achievement.progress }} / {{ achievement.requirement }}</span>
                      <span class="gold-reward">💰 {{ achievement.rewardGold }}</span>
                    </div>
                    <div v-if="achievement.unlocked" class="achievement-unlocked">✓ DESBLOQUEADA</div>
                    <div v-else class="achievement-locked">🔒 BLOQUEADA</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Inventário (Skins) -->
          <div
            :class="['ui-tabs__pane', { 'ui-tabs__pane--active': activeTab === 'inventory' }]"
          >
            <div class="inventory-container">
              <div class="user-gold-display">
                💰 Seu Gold: <span class="gold-amount">{{ authStore.user?.gold_balance || 0 }}</span>
              </div>

              <div class="skins-grid">
                <div
                  v-for="skin in skins"
                  :key="skin.id"
                  class="skin-card"
                  :class="{
                    selected: skin.id === selectedSkinId,
                    locked: !skin.unlocked
                  }"
                  @click="handleSkinClick(skin)"
                >
                  <div class="skin-preview">
                    <img :src="skin.shipImage" :alt="skin.name" />
                    <div v-if="!skin.unlocked" class="lock-overlay">
                      <span class="lock-icon">🔒</span>
                    </div>
                    <div v-if="skin.id === selectedSkinId" class="selected-badge">
                      ✓ EQUIPADA
                    </div>
                  </div>

                  <div class="skin-info">
                    <h3 class="skin-name">{{ skin.name }}</h3>
                    <p class="skin-description">{{ skin.description }}</p>

                    <div class="skin-rarity">
                      <span :class="`rarity-badge ${skin.rarity}`">
                        {{ getRarityLabel(skin.rarity) }}
                      </span>
                    </div>

                    <div v-if="!skin.unlocked && skin.price" class="skin-price">
                      💰 {{ skin.price }} Gold
                    </div>
                  </div>

                  <div class="skin-actions">
                    <button
                      v-if="skin.unlocked && skin.id !== selectedSkinId"
                      class="btn btn-equip"
                      @click.stop="equipSkin(skin.id)"
                    >
                      Equipar
                    </button>
                    <button
                      v-else-if="!skin.unlocked && skin.price"
                      class="btn btn-purchase"
                      @click.stop="purchaseSkin(skin.id)"
                      :disabled="(authStore.user?.gold_balance || 0) < skin.price"
                    >
                      {{ (authStore.user?.gold_balance || 0) >= skin.price ? 'Comprar' : 'Sem Gold' }}
                    </button>
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
              <!-- Audio Settings -->
              <div class="settings-section">
                <h3 class="settings-section-title">🔊 ÁUDIO</h3>

                <div class="setting-item">
                  <label class="setting-label">
                    <span class="label-icon">🎵</span>
                    <span class="label-text">Volume da Música</span>
                    <span class="label-value">{{ musicVolume }}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    v-model.number="musicVolume"
                    @input="handleMusicVolumeChange"
                    class="volume-slider"
                  />
                </div>

                <div class="setting-item">
                  <label class="setting-label">
                    <span class="label-icon">🔔</span>
                    <span class="label-text">Volume dos Efeitos</span>
                    <span class="label-value">{{ sfxVolume }}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    v-model.number="sfxVolume"
                    @input="handleSfxVolumeChange"
                    class="volume-slider"
                  />
                </div>
              </div>

              <!-- Graphics Settings -->
              <div class="settings-section">
                <h3 class="settings-section-title">🎨 GRÁFICOS</h3>

                <div class="setting-item">
                  <label class="setting-label">
                    <span class="label-icon">✨</span>
                    <span class="label-text">Qualidade Gráfica</span>
                  </label>
                  <div class="quality-options">
                    <button
                      v-for="quality in graphicsQualities"
                      :key="quality.value"
                      :class="['quality-btn', { active: graphicsQuality === quality.value }]"
                      @click="setGraphicsQuality(quality.value)"
                    >
                      {{ quality.label }}
                    </button>
                  </div>
                </div>

                <div class="setting-item">
                  <label class="setting-label">
                    <span class="label-icon">⭐</span>
                    <span class="label-text">Partículas</span>
                  </label>
                  <button
                    :class="['toggle-btn', { active: particlesEnabled }]"
                    @click="particlesEnabled = !particlesEnabled; saveGameSettings()"
                  >
                    {{ particlesEnabled ? 'Ativado' : 'Desativado' }}
                  </button>
                </div>

                <div class="setting-item">
                  <label class="setting-label">
                    <span class="label-icon">💫</span>
                    <span class="label-text">Efeitos Visuais</span>
                  </label>
                  <button
                    :class="['toggle-btn', { active: visualEffects }]"
                    @click="visualEffects = !visualEffects; saveGameSettings()"
                  >
                    {{ visualEffects ? 'Ativado' : 'Desativado' }}
                  </button>
                </div>
              </div>

              <!-- Gameplay Settings -->
              <div class="settings-section">
                <h3 class="settings-section-title">🎮 GAMEPLAY</h3>

                <div class="setting-item">
                  <label class="setting-label">
                    <span class="label-icon">🎯</span>
                    <span class="label-text">Mostrar FPS</span>
                  </label>
                  <button
                    :class="['toggle-btn', { active: showFPS }]"
                    @click="showFPS = !showFPS; saveGameSettings()"
                  >
                    {{ showFPS ? 'Ativado' : 'Desativado' }}
                  </button>
                </div>

                <div class="setting-item">
                  <label class="setting-label">
                    <span class="label-icon">📊</span>
                    <span class="label-text">Mostrar Stats</span>
                  </label>
                  <button
                    :class="['toggle-btn', { active: showStats }]"
                    @click="showStats = !showStats; saveGameSettings()"
                  >
                    {{ showStats ? 'Ativado' : 'Desativado' }}
                  </button>
                </div>

                <div class="setting-item">
                  <label class="setting-label">
                    <span class="label-icon">⌨️</span>
                    <span class="label-text">Dificuldade</span>
                  </label>
                  <div class="quality-options">
                    <button
                      v-for="diff in difficulties"
                      :key="diff.value"
                      :class="['quality-btn', { active: gameDifficulty === diff.value }]"
                      @click="gameDifficulty = diff.value; saveGameSettings()"
                    >
                      {{ diff.label }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="settings-actions">
                <button class="ui-button ui-button--secondary" @click="resetToDefaults">
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
import { StatisticsManager, type GameStatistics } from '@/game/Statistics'
import { AchievementManager, type Achievement } from '@/game/Achievements'
import { SkinManager, type Skin } from '@/game/Skins'
import { SettingsManager, type GameSettings } from '@/game/Settings'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const player = ref<any>(null)
const achievements = ref<any[]>([])
const inventory = ref<any[]>([])
const loadingAchievements = ref(false)
const loadingInventory = ref(false)
const activeTab = ref<'stats' | 'achievements' | 'inventory' | 'settings'>('stats')
const stats = ref<GameStatistics>(StatisticsManager.getStatistics())
const localAchievements = ref<Achievement[]>([])

// Skins
const skins = ref<Skin[]>([])
const selectedSkinId = ref<string>('default')

// Settings
const musicVolume = ref(70)
const sfxVolume = ref(80)
const graphicsQuality = ref<'low' | 'medium' | 'high'>('high')
const particlesEnabled = ref(true)
const visualEffects = ref(true)
const showFPS = ref(false)
const showStats = ref(true)
const gameDifficulty = ref<'easy' | 'normal' | 'hard'>('normal')

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

const winRate = computed(() => {
  if (stats.value.totalGamesPlayed === 0) return 0
  return Math.round((stats.value.totalLevelsCompleted / stats.value.totalGamesPlayed) * 100)
})

const formatPlayTime = computed(() => {
  return StatisticsManager.formatTime(stats.value.totalPlayTime)
})

const unlockedAchievementsCount = computed(() => {
  return localAchievements.value.filter(a => a.unlocked).length
})

const achievementProgress = computed(() => {
  if (localAchievements.value.length === 0) return 0
  return Math.round((unlockedAchievementsCount.value / localAchievements.value.length) * 100)
})

// Graphics and Difficulty options
const graphicsQualities = [
  { value: 'low' as const, label: 'Baixa' },
  { value: 'medium' as const, label: 'Média' },
  { value: 'high' as const, label: 'Alta' }
]

const difficulties = [
  { value: 'easy' as const, label: 'Fácil' },
  { value: 'normal' as const, label: 'Normal' },
  { value: 'hard' as const, label: 'Difícil' }
]

async function loadProfile() {
  try {
    const response = await playerAPI.getProfile()
    player.value = response.data.data

    // Load local statistics
    stats.value = StatisticsManager.getStatistics()

    // Load local achievements
    localAchievements.value = AchievementManager.getAchievements()

    // Load skins
    loadSkins()

    // Load settings
    loadGameSettings()
  } catch (err) {
    console.error('Failed to load profile:', err)
  }
}

// Skins functions
function loadSkins() {
  skins.value = SkinManager.getAllSkins()
  const currentSkin = SkinManager.getSelectedSkin()
  selectedSkinId.value = currentSkin.id
}

function getRarityLabel(rarity: string): string {
  const labels: Record<string, string> = {
    common: 'COMUM',
    rare: 'RARA',
    epic: 'ÉPICA',
    legendary: 'LENDÁRIA'
  }
  return labels[rarity] || rarity.toUpperCase()
}

function handleSkinClick(skin: Skin) {
  if (skin.unlocked) {
    equipSkin(skin.id)
  }
}

function equipSkin(skinId: string) {
  if (SkinManager.selectSkin(skinId)) {
    selectedSkinId.value = skinId
    alert('Skin equipada com sucesso!')
  }
}

function purchaseSkin(skinId: string) {
  const skin = skins.value.find(s => s.id === skinId)
  if (skin && skin.price) {
    const currentGold = authStore.user?.gold_balance || 0
    const result = SkinManager.purchaseSkin(skinId, currentGold)

    if (result.success && result.newGold !== undefined) {
      // Update user's gold balance
      if (authStore.user) {
        authStore.user.gold_balance = result.newGold
      }
      alert(`Skin comprada com sucesso! Novo saldo: ${result.newGold} Gold`)
      loadSkins()
    } else {
      alert(result.error || 'Erro ao comprar skin')
    }
  }
}

// Settings functions
function loadGameSettings() {
  const settings = SettingsManager.getSettings()
  musicVolume.value = settings.musicVolume
  sfxVolume.value = settings.sfxVolume
  graphicsQuality.value = settings.graphicsQuality
  particlesEnabled.value = settings.particlesEnabled
  visualEffects.value = settings.visualEffects
  showFPS.value = settings.showFPS
  showStats.value = settings.showStats
  gameDifficulty.value = settings.difficulty
}

function saveGameSettings() {
  const settings: GameSettings = {
    musicVolume: musicVolume.value,
    sfxVolume: sfxVolume.value,
    graphicsQuality: graphicsQuality.value,
    particlesEnabled: particlesEnabled.value,
    visualEffects: visualEffects.value,
    showFPS: showFPS.value,
    showStats: showStats.value,
    difficulty: gameDifficulty.value
  }

  SettingsManager.saveSettings(settings)
}

function handleMusicVolumeChange() {
  saveGameSettings()
}

function handleSfxVolumeChange() {
  saveGameSettings()
}

function setGraphicsQuality(quality: 'low' | 'medium' | 'high') {
  graphicsQuality.value = quality
  saveGameSettings()
}

function resetToDefaults() {
  const defaults = SettingsManager.resetToDefaults()
  musicVolume.value = defaults.musicVolume
  sfxVolume.value = defaults.sfxVolume
  graphicsQuality.value = defaults.graphicsQuality
  particlesEnabled.value = defaults.particlesEnabled
  visualEffects.value = defaults.visualEffects
  showFPS.value = defaults.showFPS
  showStats.value = defaults.showStats
  gameDifficulty.value = defaults.difficulty
  alert('Configurações restauradas para os padrões!')
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

/* Stats Section */
.stats-section {
  margin-top: 30px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 12px;
  color: #FFD700;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(255, 215, 0, 0.3);
}

/* Achievements Summary */
.achievements-summary {
  display: flex;
  justify-content: space-around;
  background: rgba(255, 215, 0, 0.1);
  border: 2px solid rgba(255, 215, 0, 0.3);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 25px;
}

.summary-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.summary-label {
  font-size: 9px;
  color: #aaa;
}

.summary-value {
  font-size: 16px;
  color: #FFD700;
  font-weight: bold;
}

.summary-value.unlocked {
  color: #00ff88;
}

/* Achievement Card Updates */
.achievement-card {
  opacity: 1;
}

.achievement-card.locked {
  opacity: 0.5;
  filter: grayscale(50%);
}

.achievement-card.unlocked {
  border-color: rgba(0, 255, 136, 0.5);
  background: rgba(0, 255, 136, 0.05);
}

.achievement-progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.progress-text {
  font-size: 9px;
  color: #888;
}

.gold-reward {
  font-size: 9px;
  color: #FFD700;
  font-weight: bold;
}

.achievement-unlocked {
  font-size: 9px;
  color: #00ff88;
  font-weight: bold;
  margin-top: 8px;
}

.achievement-locked {
  font-size: 9px;
  color: #888;
  margin-top: 8px;
}

/* Skins Styles */
.user-gold-display {
  text-align: center;
  font-size: 14px;
  color: #fff;
  background: rgba(255, 215, 0, 0.1);
  border: 2px solid rgba(255, 215, 0, 0.3);
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 25px;
}

.gold-amount {
  color: #FFD700;
  font-weight: bold;
  font-size: 18px;
}

.skins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.skin-card {
  background: rgba(0, 255, 136, 0.05);
  border: 2px solid rgba(0, 255, 136, 0.3);
  border-radius: 12px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s;
}

.skin-card:hover {
  transform: translateY(-5px);
  border-color: #00ff88;
  box-shadow: 0 5px 20px rgba(0, 255, 136, 0.3);
}

.skin-card.selected {
  border-color: #FFD700;
  background: rgba(255, 215, 0, 0.1);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
}

.skin-card.locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.skin-card.locked:hover {
  transform: none;
}

.skin-preview {
  position: relative;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}

.skin-preview img {
  max-width: 80px;
  height: auto;
  filter: drop-shadow(0 0 10px rgba(0, 255, 136, 0.5));
}

.lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.lock-icon {
  font-size: 3rem;
}

.selected-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #FFD700;
  color: #000;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: bold;
}

.skin-name {
  font-size: 12px;
  color: #fff;
  margin: 0 0 8px 0;
}

.skin-description {
  font-size: 9px;
  color: #aaa;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.skin-rarity {
  margin-bottom: 10px;
}

.rarity-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 8px;
  font-weight: bold;
  text-transform: uppercase;
}

.rarity-badge.common {
  background: #888;
  color: #fff;
}

.rarity-badge.rare {
  background: #4169E1;
  color: #fff;
}

.rarity-badge.epic {
  background: #9370DB;
  color: #fff;
}

.rarity-badge.legendary {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
}

.skin-price {
  color: #FFD700;
  font-weight: bold;
  font-size: 11px;
}

.skin-actions {
  margin-top: 10px;
}

.btn-equip {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  background: linear-gradient(135deg, #00ff88, #00cc70);
  color: #000;
  font-size: 10px;
}

.btn-equip:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(0, 255, 136, 0.4);
}

.btn-purchase {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
  font-size: 10px;
}

.btn-purchase:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
}

.btn-purchase:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Settings Styles */
.settings-section-title {
  font-size: 12px;
  color: #00ff88;
  margin: 0 0 20px 0;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

.label-icon {
  font-size: 14px;
}

.label-value {
  color: #00ff88;
  font-weight: bold;
  min-width: 45px;
  text-align: right;
}

.volume-slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #00ff88;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.volume-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #00ff88;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.quality-options {
  display: flex;
  gap: 10px;
}

.quality-btn {
  flex: 1;
  padding: 10px;
  background: rgba(0, 255, 136, 0.1);
  border: 2px solid rgba(0, 255, 136, 0.3);
  color: #00ff88;
  border-radius: 8px;
  font-size: 9px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
}

.quality-btn:hover {
  background: rgba(0, 255, 136, 0.2);
  border-color: #00ff88;
}

.quality-btn.active {
  background: linear-gradient(135deg, #00ff88, #00cc70);
  border-color: #00ff88;
  color: #000;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
}

.toggle-btn {
  width: 120px;
  padding: 10px;
  background: rgba(255, 68, 68, 0.2);
  border: 2px solid rgba(255, 68, 68, 0.5);
  color: #ff4444;
  border-radius: 8px;
  font-size: 9px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
}

.toggle-btn:hover {
  background: rgba(255, 68, 68, 0.3);
  border-color: #ff4444;
}

.toggle-btn.active {
  background: rgba(0, 255, 136, 0.2);
  border-color: #00ff88;
  color: #00ff88;
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

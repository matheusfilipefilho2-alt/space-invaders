<template>
  <div class="statistics-overlay" @click.self="$emit('close')">
    <div class="statistics-modal">
      <div class="modal-header">
        <h1 class="modal-title">📊 ESTATÍSTICAS 📊</h1>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card highlight">
          <div class="card-icon">🎮</div>
          <div class="card-value">{{ stats.totalGamesPlayed }}</div>
          <div class="card-label">Jogos</div>
        </div>
        <div class="summary-card highlight">
          <div class="card-icon">⏱️</div>
          <div class="card-value">{{ formatTime(stats.totalPlayTime) }}</div>
          <div class="card-label">Tempo Total</div>
        </div>
        <div class="summary-card highlight">
          <div class="card-icon">🏆</div>
          <div class="card-value">{{ stats.highestScore.toLocaleString() }}</div>
          <div class="card-label">Melhor Score</div>
        </div>
        <div class="summary-card highlight">
          <div class="card-icon">📈</div>
          <div class="card-value">{{ stats.averageScore.toLocaleString() }}</div>
          <div class="card-label">Média de Score</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'combat' }"
          @click="activeTab = 'combat'"
        >
          ⚔️ Combate
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'enemies' }"
          @click="activeTab = 'enemies'"
        >
          👾 Inimigos
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'weapons' }"
          @click="activeTab = 'weapons'"
        >
          🔫 Armas
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'powerups' }"
          @click="activeTab = 'powerups'"
        >
          ⭐ Power-ups
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Combat Stats Tab -->
        <div v-if="activeTab === 'combat'" class="stats-grid">
          <div class="stat-item">
            <div class="stat-icon">💀</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalKills.toLocaleString() }}</div>
              <div class="stat-label">Total de Kills</div>
            </div>
          </div>

          <div class="stat-item">
            <div class="stat-icon">🎯</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.overallAccuracy }}%</div>
              <div class="stat-label">Precisão Geral</div>
            </div>
          </div>

          <div class="stat-item">
            <div class="stat-icon">🌟</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.bestAccuracy }}%</div>
              <div class="stat-label">Melhor Precisão</div>
            </div>
          </div>

          <div class="stat-item">
            <div class="stat-icon">🔥</div>
            <div class="stat-info">
              <div class="stat-value">x{{ stats.bestCombo }}</div>
              <div class="stat-label">Melhor Combo</div>
            </div>
          </div>

          <div class="stat-item">
            <div class="stat-icon">🐲</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalBossKills }}</div>
              <div class="stat-label">Bosses Derrotados</div>
            </div>
          </div>

          <div class="stat-item">
            <div class="stat-icon">🚀</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalShots.toLocaleString() }}</div>
              <div class="stat-label">Disparos Totais</div>
            </div>
          </div>

          <div class="stat-item">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalHits.toLocaleString() }}</div>
              <div class="stat-label">Acertos</div>
            </div>
          </div>

          <div class="stat-item">
            <div class="stat-icon">📊</div>
            <div class="stat-info">
              <div class="stat-value">Nv{{ stats.highestLevel }}</div>
              <div class="stat-label">Nível Mais Alto</div>
            </div>
          </div>
        </div>

        <!-- Enemy Stats Tab -->
        <div v-if="activeTab === 'enemies'" class="stats-grid">
          <div v-for="(count, type) in stats.enemyKills" :key="type" class="stat-item enemy-stat">
            <div class="stat-icon">{{ getEnemyIcon(type) }}</div>
            <div class="stat-info">
              <div class="stat-value">{{ count.toLocaleString() }}</div>
              <div class="stat-label">{{ getEnemyName(type) }}</div>
              <div class="stat-progress">
                <div class="progress-bar" :style="{ width: getEnemyPercentage(type, count) + '%', background: getEnemyColor(type) }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Weapon Stats Tab -->
        <div v-if="activeTab === 'weapons'" class="stats-grid">
          <div v-for="(weaponData, weaponType) in stats.weaponStats" :key="weaponType" class="stat-item weapon-stat">
            <div class="stat-icon">{{ getWeaponIcon(weaponType) }}</div>
            <div class="stat-info">
              <div class="stat-label">{{ getWeaponName(weaponType) }}</div>
              <div class="weapon-details">
                <span>Usos: {{ weaponData.timesUsed }}</span>
                <span>Kills: {{ weaponData.killsWithWeapon }}</span>
                <span>Disparos: {{ weaponData.shotsWithWeapon }}</span>
              </div>
              <div class="stat-progress">
                <div class="progress-bar" :style="{ width: getWeaponUsagePercentage(weaponData.timesUsed) + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Power-ups Stats Tab -->
        <div v-if="activeTab === 'powerups'" class="stats-grid">
          <div v-for="(count, type) in stats.powerUpStats" :key="type" class="stat-item powerup-stat">
            <div class="stat-icon">{{ getPowerUpIcon(type) }}</div>
            <div class="stat-info">
              <div class="stat-value">{{ count }}</div>
              <div class="stat-label">{{ getPowerUpName(type) }}</div>
              <div class="stat-progress">
                <div class="progress-bar" :style="{ width: getPowerUpPercentage(count) + '%', background: '#FFD700' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button class="btn btn-secondary" @click="confirmClearStats">
          <span class="btn-icon">🗑️</span>
          Limpar Dados
        </button>
        <button class="btn btn-primary" @click="$emit('close')">
          <span class="btn-icon">✓</span>
          Fechar
        </button>
      </div>

      <div class="hint-text">Press ESC to close</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { StatisticsManager, type GameStatistics } from '@/game/Statistics'

const emit = defineEmits<{
  close: []
}>()

// State
const stats = ref<GameStatistics>(StatisticsManager.getStatistics())
const activeTab = ref<'combat' | 'enemies' | 'weapons' | 'powerups'>('combat')

// Load stats on mount
onMounted(() => {
  stats.value = StatisticsManager.getStatistics()
})

// Format time
function formatTime(seconds: number): string {
  return StatisticsManager.formatTime(seconds)
}

// Enemy helpers
function getEnemyIcon(type: string): string {
  const icons: Record<string, string> = {
    BASIC: '👾',
    FAST: '⚡',
    TANK: '🛡️',
    SNIPER: '🎯',
    SHIELD: '💎'
  }
  return icons[type] || '👾'
}

function getEnemyName(type: string): string {
  const names: Record<string, string> = {
    BASIC: 'Básico',
    FAST: 'Rápido',
    TANK: 'Tanque',
    SNIPER: 'Atirador',
    SHIELD: 'Escudo'
  }
  return names[type] || type
}

function getEnemyColor(type: string): string {
  const colors: Record<string, string> = {
    BASIC: '#FFFFFF',
    FAST: '#00FFFF',
    TANK: '#FF0000',
    SNIPER: '#FFA500',
    SHIELD: '#FFD600'
  }
  return colors[type] || '#FFFFFF'
}

function getEnemyPercentage(type: string, count: number): number {
  const total = Object.values(stats.value.enemyKills).reduce((sum, val) => sum + val, 0)
  return total > 0 ? (count / total) * 100 : 0
}

// Weapon helpers
function getWeaponIcon(type: string): string {
  const icons: Record<string, string> = {
    NORMAL: '•',
    LASER: '━',
    SPREAD: '※',
    MISSILE: '⬆',
    BOMB: '💣',
    LIGHTNING: '⚡'
  }
  return icons[type] || '•'
}

function getWeaponName(type: string): string {
  const names: Record<string, string> = {
    NORMAL: 'Normal',
    LASER: 'Laser',
    SPREAD: 'Dispersão',
    MISSILE: 'Míssil',
    BOMB: 'Bomba',
    LIGHTNING: 'Raio'
  }
  return names[type] || type
}

function getWeaponUsagePercentage(timesUsed: number): number {
  const maxUsage = Math.max(...Object.values(stats.value.weaponStats).map(w => w.timesUsed))
  return maxUsage > 0 ? (timesUsed / maxUsage) * 100 : 0
}

// Power-up helpers
function getPowerUpIcon(type: string): string {
  const icons: Record<string, string> = {
    score: '💰',
    life: '❤️',
    shield: '🛡️',
    multishot: '🔫',
    rapidfire: '⚡',
    slowmo: '⏱️',
    multiplier: '✨',
    nuke: '💣',
    weapon_laser: '🔴',
    weapon_spread: '🟢',
    weapon_missile: '🟡',
    weapon_bomb: '🟠',
    weapon_lightning: '🟣'
  }
  return icons[type] || '⭐'
}

function getPowerUpName(type: string): string {
  const names: Record<string, string> = {
    score: 'Pontos',
    life: 'Vida Extra',
    shield: 'Escudo',
    multishot: 'Multi-Tiro',
    rapidfire: 'Tiro Rápido',
    slowmo: 'Câmera Lenta',
    multiplier: 'Multiplicador',
    nuke: 'Nuke',
    weapon_laser: 'Laser',
    weapon_spread: 'Dispersão',
    weapon_missile: 'Míssil',
    weapon_bomb: 'Bomba',
    weapon_lightning: 'Raio'
  }
  return names[type] || type
}

function getPowerUpPercentage(count: number): number {
  const maxCount = Math.max(...Object.values(stats.value.powerUpStats))
  return maxCount > 0 ? (count / maxCount) * 100 : 0
}

function confirmClearStats() {
  if (confirm('Tem certeza que deseja limpar todas as estatísticas? Esta ação não pode ser desfeita.')) {
    StatisticsManager.clearStatistics()
    stats.value = StatisticsManager.getStatistics()
  }
}

// Handle ESC key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    emit('close')
  }
})
</script>

<style scoped>
.statistics-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.statistics-modal {
  background: linear-gradient(135deg, #1a1a3e 0%, #0f0f2e 100%);
  border: 3px solid #00ff88;
  border-radius: 16px;
  padding: 30px;
  max-width: 1000px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 0 40px rgba(0, 255, 136, 0.5);
  animation: slideUp 0.4s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.modal-title {
  font-size: 2.5rem;
  font-weight: bold;
  text-align: center;
  color: #00ff88;
  text-shadow: 0 0 20px rgba(0, 255, 136, 0.8);
  letter-spacing: 2px;
  flex: 1;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: #fff;
  transform: rotate(90deg);
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.summary-card {
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(0, 255, 136, 0.3);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s ease;
}

.summary-card.highlight {
  border-color: #00ff88;
}

.summary-card:hover {
  background: rgba(0, 255, 136, 0.1);
  transform: translateY(-3px);
}

.card-icon {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.card-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #00ff88;
  margin-bottom: 5px;
}

.card-label {
  font-size: 0.85rem;
  color: #888;
  text-transform: uppercase;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid rgba(0, 255, 136, 0.3);
}

.tab {
  flex: 1;
  padding: 12px 20px;
  background: transparent;
  border: none;
  color: #888;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 3px solid transparent;
}

.tab:hover {
  color: #00ff88;
}

.tab.active {
  color: #00ff88;
  border-bottom-color: #00ff88;
}

.tab-content {
  min-height: 400px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.stat-item {
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(0, 255, 136, 0.2);
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: rgba(0, 255, 136, 0.05);
  border-color: rgba(0, 255, 136, 0.4);
  transform: translateX(5px);
}

.stat-icon {
  font-size: 2.5rem;
  min-width: 50px;
  text-align: center;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #00ff88;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 0.9rem;
  color: #888;
  margin-bottom: 8px;
}

.stat-progress {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #00ff88 0%, #00cc70 100%);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.weapon-details {
  display: flex;
  gap: 15px;
  font-size: 0.85rem;
  color: #aaa;
  margin-top: 5px;
}

.action-buttons {
  display: flex;
  gap: 15px;
  margin-top: 25px;
}

.btn {
  flex: 1;
  padding: 15px 30px;
  font-size: 1rem;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn-primary {
  background: linear-gradient(135deg, #00ff88 0%, #00cc70 100%);
  color: #000;
  box-shadow: 0 4px 15px rgba(0, 255, 136, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 255, 136, 0.6);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.btn-icon {
  font-size: 1.2rem;
}

.hint-text {
  text-align: center;
  margin-top: 15px;
  color: #666;
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .tabs {
    flex-wrap: wrap;
  }

  .tab {
    font-size: 0.85rem;
    padding: 10px;
  }
}
</style>

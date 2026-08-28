<template>
  <div class="leaderboard-overlay" @click.self="handleOverlayClick">
    <div class="leaderboard-modal">
      <div class="modal-header">
        <h1 class="modal-title">🏆 LEADERBOARD 🏆</h1>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="player-profile" v-if="playerProfile">
        <div class="profile-info">
          <span class="player-avatar">{{ playerProfile.avatar }}</span>
          <div class="player-details">
            <span class="player-name">{{ playerProfile.name }}</span>
            <span class="player-stats">{{ playerProfile.gamesPlayed }} jogos</span>
          </div>
        </div>
        <button class="edit-profile-btn" @click="showEditProfile = true">✏️</button>
      </div>

      <div class="stats-summary">
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-value">{{ stats.highestScore.toLocaleString() }}</div>
          <div class="stat-label">Melhor Score</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-value">{{ stats.averageScore.toLocaleString() }}</div>
          <div class="stat-label">Média</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎮</div>
          <div class="stat-value">{{ stats.totalGamesPlayed }}</div>
          <div class="stat-label">Total de Jogos</div>
        </div>
      </div>

      <div class="leaderboard-container">
        <div v-if="entries.length === 0" class="empty-state">
          <div class="empty-icon">📊</div>
          <p class="empty-text">Nenhuma pontuação registrada ainda.</p>
          <p class="empty-hint">Jogue para aparecer no leaderboard!</p>
        </div>

        <div v-else class="leaderboard-list">
          <div
            v-for="(entry, index) in entries"
            :key="entry.id"
            class="leaderboard-entry"
            :class="{
              'current-player': isCurrentPlayer(entry),
              'top-1': index === 0,
              'top-2': index === 1,
              'top-3': index === 2
            }"
          >
            <div class="entry-rank">
              <span class="rank-number" v-if="index < 3">
                {{ getRankEmoji(index) }}
              </span>
              <span class="rank-number" v-else>{{ index + 1 }}</span>
            </div>

            <div class="entry-player">
              <span class="player-name">{{ entry.playerName }}</span>
              <span class="entry-date">{{ formatDate(entry.date) }}</span>
            </div>

            <div class="entry-stats">
              <div class="entry-stat">
                <span class="stat-value">{{ entry.score.toLocaleString() }}</span>
                <span class="stat-label">pontos</span>
              </div>
              <div class="entry-stat">
                <span class="stat-value">Nv{{ entry.level }}</span>
                <span class="stat-label">nível</span>
              </div>
              <div class="entry-stat">
                <span class="stat-value">{{ entry.accuracy }}%</span>
                <span class="stat-label">acerto</span>
              </div>
              <div class="entry-stat">
                <span class="stat-value">x{{ entry.maxCombo }}</span>
                <span class="stat-label">combo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn btn-secondary" @click="clearLeaderboard">
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

    <!-- Edit Profile Modal -->
    <div v-if="showEditProfile" class="edit-profile-overlay" @click.self="showEditProfile = false">
      <div class="edit-profile-modal">
        <h2 class="modal-title">Editar Perfil</h2>

        <div class="form-group">
          <label>Nome do Jogador</label>
          <input
            v-model="editedName"
            type="text"
            class="text-input"
            maxlength="20"
            placeholder="Digite seu nome"
          />
        </div>

        <div class="form-group">
          <label>Avatar</label>
          <div class="avatar-selector">
            <button
              v-for="avatar in avatarOptions"
              :key="avatar"
              class="avatar-option"
              :class="{ active: editedAvatar === avatar }"
              @click="editedAvatar = avatar"
            >
              {{ avatar }}
            </button>
          </div>
        </div>

        <div class="action-buttons">
          <button class="btn btn-secondary" @click="showEditProfile = false">Cancelar</button>
          <button class="btn btn-primary" @click="saveProfile">Salvar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { LeaderboardEntry, PlayerProfile } from '@/game/Leaderboard'
import { LeaderboardManager } from '@/game/Leaderboard'

const emit = defineEmits<{
  close: []
}>()

// State
const entries = ref<LeaderboardEntry[]>([])
const playerProfile = ref<PlayerProfile | null>(null)
const stats = ref({
  totalEntries: 0,
  highestScore: 0,
  averageScore: 0,
  totalGamesPlayed: 0
})

const showEditProfile = ref(false)
const editedName = ref('')
const editedAvatar = ref('')

const avatarOptions = ['🚀', '👾', '🛸', '🤖', '👽', '🌟', '⚡', '🔥', '💎', '🎮']

// Load data
function loadData() {
  entries.value = LeaderboardManager.getLeaderboard()
  playerProfile.value = LeaderboardManager.getPlayerProfile()
  stats.value = LeaderboardManager.getStats()

  editedName.value = playerProfile.value.name
  editedAvatar.value = playerProfile.value.avatar
}

onMounted(() => {
  loadData()
})

// Methods
function isCurrentPlayer(entry: LeaderboardEntry): boolean {
  return playerProfile.value ? entry.playerName === playerProfile.value.name : false
}

function getRankEmoji(index: number): string {
  const emojis = ['🥇', '🥈', '🥉']
  return emojis[index] || String(index + 1)
}

function formatDate(timestamp: number): string {
  return LeaderboardManager.formatDate(timestamp)
}

function clearLeaderboard() {
  if (confirm('Tem certeza que deseja limpar todos os dados do leaderboard? Esta ação não pode ser desfeita.')) {
    LeaderboardManager.clearLeaderboard()
    loadData()
  }
}

function saveProfile() {
  if (editedName.value.trim() === '') {
    alert('Por favor, digite um nome válido.')
    return
  }

  LeaderboardManager.updatePlayerProfile({
    name: editedName.value.trim(),
    avatar: editedAvatar.value
  })

  loadData()
  showEditProfile.value = false
}

function handleOverlayClick() {
  emit('close')
}

// Handle ESC key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (showEditProfile.value) {
      showEditProfile.value = false
    } else {
      emit('close')
    }
  }
})
</script>

<style scoped>
.leaderboard-overlay {
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

.leaderboard-modal {
  background: linear-gradient(135deg, #1a1a3e 0%, #0f0f2e 100%);
  border: 3px solid #FFD700;
  border-radius: 16px;
  padding: 30px;
  max-width: 900px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 0 40px rgba(255, 215, 0, 0.5);
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
  color: #FFD700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
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

.player-profile {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 255, 136, 0.1);
  border: 2px solid rgba(0, 255, 136, 0.3);
  border-radius: 12px;
  padding: 15px 20px;
  margin-bottom: 20px;
}

.profile-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.player-avatar {
  font-size: 3rem;
}

.player-details {
  display: flex;
  flex-direction: column;
}

.player-name {
  font-size: 1.5rem;
  font-weight: bold;
  color: #00ff88;
}

.player-stats {
  font-size: 0.9rem;
  color: #888;
}

.edit-profile-btn {
  background: rgba(255, 215, 0, 0.2);
  border: 2px solid rgba(255, 215, 0, 0.4);
  color: #FFD700;
  font-size: 1.2rem;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.edit-profile-btn:hover {
  background: rgba(255, 215, 0, 0.3);
  border-color: #FFD700;
  transform: scale(1.1);
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 215, 0, 0.3);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #FFD700;
  transform: translateY(-3px);
}

.stat-icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #FFD700;
  display: block;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 0.85rem;
  color: #888;
  text-transform: uppercase;
}

.leaderboard-container {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  min-height: 300px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-text {
  font-size: 1.3rem;
  color: #888;
  margin-bottom: 10px;
}

.empty-hint {
  font-size: 1rem;
  color: #666;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.leaderboard-entry {
  display: flex;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 15px 20px;
  transition: all 0.3s ease;
}

.leaderboard-entry:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateX(5px);
}

.leaderboard-entry.current-player {
  background: rgba(0, 255, 136, 0.1);
  border-color: #00ff88;
}

.leaderboard-entry.top-1 {
  border-color: #FFD700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

.leaderboard-entry.top-2 {
  border-color: #C0C0C0;
}

.leaderboard-entry.top-3 {
  border-color: #CD7F32;
}

.entry-rank {
  min-width: 50px;
  text-align: center;
}

.rank-number {
  font-size: 2rem;
  font-weight: bold;
}

.entry-player {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 150px;
}

.entry-player .player-name {
  font-size: 1.2rem;
  font-weight: bold;
  color: #fff;
}

.entry-date {
  font-size: 0.75rem;
  color: #666;
  margin-top: 2px;
}

.entry-stats {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.entry-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 70px;
}

.entry-stat .stat-value {
  font-size: 1.1rem;
  font-weight: bold;
  color: #FFD700;
}

.entry-stat .stat-label {
  font-size: 0.7rem;
  color: #666;
  text-transform: uppercase;
}

.action-buttons {
  display: flex;
  gap: 15px;
  margin-top: 20px;
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

/* Edit Profile Modal */
.edit-profile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.edit-profile-modal {
  background: linear-gradient(135deg, #2a2a4e 0%, #1f1f3e 100%);
  border: 3px solid #00ff88;
  border-radius: 16px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 0 40px rgba(0, 255, 136, 0.5);
}

.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  font-size: 1rem;
  color: #00ff88;
  margin-bottom: 10px;
  font-weight: bold;
}

.text-input {
  width: 100%;
  padding: 12px;
  font-size: 1.1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(0, 255, 136, 0.3);
  border-radius: 8px;
  color: #fff;
  transition: all 0.3s ease;
}

.text-input:focus {
  outline: none;
  border-color: #00ff88;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.avatar-selector {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.avatar-option {
  font-size: 2rem;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.avatar-option:hover {
  background: rgba(0, 0, 0, 0.5);
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.1);
}

.avatar-option.active {
  background: rgba(0, 255, 136, 0.2);
  border-color: #00ff88;
  box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
}

@media (max-width: 768px) {
  .entry-stats {
    gap: 10px;
  }

  .entry-stat {
    min-width: 60px;
  }

  .stats-summary {
    grid-template-columns: 1fr;
  }
}
</style>

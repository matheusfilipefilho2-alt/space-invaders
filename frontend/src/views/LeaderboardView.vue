<template>
  <div class="leaderboard-page">
    <div class="game-container">
      <h1 class="game-title">RANKING</h1>
      <p class="game-subtitle">MELHORES JOGADORES</p>

      <div class="shop-categories">
        <button
          @click="switchTab('global')"
          :class="['category-btn', { active: activeTab === 'global' }]"
        >
          🌍 Ranking Global
        </button>
        <button
          @click="switchTab('league')"
          :class="['category-btn', { active: activeTab === 'league' }]"
        >
          🏆 Ranking da Liga
        </button>
      </div>

      <div v-if="activeTab === 'league'" class="league-selector">
        <label style="color: #ffa502; font-size: 12px;">Selecione a Liga:</label>
        <select v-model="selectedLeagueId" @change="loadLeagueLeaderboard" class="game-input" style="width: 200px; max-width: 200px;">
          <option :value="1">🥉 Bronze</option>
          <option :value="2">🥈 Silver</option>
          <option :value="3">🥇 Gold</option>
          <option :value="4">💎 Platinum</option>
          <option :value="5">💠 Diamond</option>
        </select>
      </div>

      <div v-if="loading" class="loading">Carregando ranking...</div>

      <div v-else class="ranking-container">
        <div class="ranking-list">
          <div v-if="rankings.length === 0" class="loading">
            Nenhum ranking disponível
          </div>
          <div
            v-for="(player, index) in rankings"
            :key="player.player_id"
            :class="['ranking-item', { 'current-user': player.player_id === authStore.user?.id }]"
          >
            <div class="ranking-position">
              {{ player.rank }}
            </div>
            <div class="ranking-player">
              <span class="player-name">{{ player.username }}</span>
              <span v-if="activeTab === 'global'" class="player-level">{{ player.league_name }}</span>
            </div>
            <div class="ranking-score">
              {{ player.total_score?.toLocaleString() || 0 }}
            </div>
          </div>
        </div>
      </div>

      <div class="pagination">
        <button @click="previousPage" :disabled="offset === 0" class="button-view-ranking">Anterior</button>
        <span style="color: #ffa502; font-size: 12px;">Página {{ currentPage }}</span>
        <button @click="nextPage" :disabled="rankings.length < limit" class="button-view-ranking">Próxima</button>
      </div>

      <div class="menu-buttons" style="margin-top: 40px;">
        <router-link to="/game" class="button-play">VOLTAR AO JOGO</router-link>
        <router-link to="/profile" class="button-view-ranking">VER PERFIL</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { leaderboardAPI } from '@/services/api'

const authStore = useAuthStore()
const loading = ref(true)
const activeTab = ref<'global' | 'league'>('global')
const rankings = ref<any[]>([])
const selectedLeagueId = ref(1)
const limit = ref(10)
const offset = ref(0)

const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1)

async function loadGlobalLeaderboard() {
  try {
    loading.value = true
    const response = await leaderboardAPI.global(limit.value, offset.value)
    rankings.value = response.data.data
  } catch (err) {
    console.error('Failed to load global leaderboard:', err)
    alert('Failed to load leaderboard')
  } finally {
    loading.value = false
  }
}

async function loadLeagueLeaderboard() {
  try {
    loading.value = true
    const response = await leaderboardAPI.league(
      selectedLeagueId.value,
      limit.value,
      offset.value
    )
    rankings.value = response.data.data
  } catch (err) {
    console.error('Failed to load league leaderboard:', err)
    alert('Failed to load leaderboard')
  } finally {
    loading.value = false
  }
}

function nextPage() {
  offset.value += limit.value
  if (activeTab.value === 'global') {
    loadGlobalLeaderboard()
  } else {
    loadLeagueLeaderboard()
  }
}

function previousPage() {
  offset.value = Math.max(0, offset.value - limit.value)
  if (activeTab.value === 'global') {
    loadGlobalLeaderboard()
  } else {
    loadLeagueLeaderboard()
  }
}

onMounted(() => {
  loadGlobalLeaderboard()
})

// Watch tab changes
function switchTab(tab: 'global' | 'league') {
  activeTab.value = tab
  offset.value = 0
  if (tab === 'global') {
    loadGlobalLeaderboard()
  } else {
    loadLeagueLeaderboard()
  }
}
</script>

<style scoped>
.leaderboard-page {
  min-height: 100vh;
  padding: 20px;
  padding-top: 100px;
}

.game-container {
  max-width: 800px;
}

.league-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin: 20px 0;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin: 30px 0;
}
</style>

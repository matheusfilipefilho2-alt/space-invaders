<template>
  <div class="leaderboard-container">
    <div class="leaderboard-card">
      <h1>Leaderboard</h1>

      <div class="leaderboard-tabs">
        <button
          @click="switchTab('global')"
          :class="{ active: activeTab === 'global' }"
        >
          Global Rankings
        </button>
        <button
          @click="switchTab('league')"
          :class="{ active: activeTab === 'league' }"
        >
          League Rankings
        </button>
      </div>

      <div v-if="activeTab === 'league'" class="league-selector">
        <label>Select League:</label>
        <select v-model="selectedLeagueId" @change="loadLeagueLeaderboard">
          <option :value="1">Bronze</option>
          <option :value="2">Silver</option>
          <option :value="3">Gold</option>
          <option :value="4">Platinum</option>
          <option :value="5">Diamond</option>
        </select>
      </div>

      <div v-if="loading" class="loading">Loading rankings...</div>

      <div v-else class="leaderboard-table">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
              <th v-if="activeTab === 'global'">League</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="rankings.length === 0">
              <td colspan="4" class="no-data">No rankings available</td>
            </tr>
            <tr
              v-for="(player, index) in rankings"
              :key="player.player_id"
              :class="{ 'current-player': player.player_id === authStore.user?.id }"
            >
              <td class="rank">
                <span v-if="index === 0" class="medal gold">🥇</span>
                <span v-else-if="index === 1" class="medal silver">🥈</span>
                <span v-else-if="index === 2" class="medal bronze">🥉</span>
                <span v-else>{{ player.rank }}</span>
              </td>
              <td class="player-name">{{ player.username }}</td>
              <td class="score">{{ player.total_score?.toLocaleString() || 0 }}</td>
              <td v-if="activeTab === 'global'" class="league">{{ player.league_name }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button @click="previousPage" :disabled="offset === 0">Previous</button>
        <span>Page {{ currentPage }}</span>
        <button @click="nextPage" :disabled="rankings.length < limit">Next</button>
      </div>

      <div class="leaderboard-actions">
        <router-link to="/game" class="button">Back to Game</router-link>
        <router-link to="/profile" class="button">View Profile</router-link>
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
.leaderboard-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.leaderboard-card {
  max-width: 1000px;
  margin: 0 auto;
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
}

.leaderboard-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  justify-content: center;
}

.leaderboard-tabs button {
  padding: 0.75rem 1.5rem;
  background: #e2e8f0;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s;
}

.leaderboard-tabs button.active {
  background: #667eea;
  color: white;
}

.league-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.league-selector label {
  font-weight: bold;
}

.league-selector select {
  padding: 0.5rem 1rem;
  border: 1px solid #cbd5e0;
  border-radius: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
}

.loading {
  text-align: center;
  padding: 2rem;
  font-size: 1.25rem;
}

.leaderboard-table {
  overflow-x: auto;
  margin-bottom: 2rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f7fafc;
}

th {
  padding: 1rem;
  text-align: left;
  font-weight: bold;
  color: #2d3748;
  border-bottom: 2px solid #e2e8f0;
}

tbody tr {
  border-bottom: 1px solid #e2e8f0;
  transition: background 0.2s;
}

tbody tr:hover {
  background: #f7fafc;
}

tbody tr.current-player {
  background: #edf2f7;
  font-weight: bold;
}

td {
  padding: 1rem;
}

.rank {
  font-weight: bold;
  text-align: center;
  width: 80px;
}

.medal {
  font-size: 1.5rem;
}

.player-name {
  color: #2d3748;
}

.score {
  font-weight: bold;
  color: #667eea;
  text-align: right;
}

.league {
  color: #718096;
}

.no-data {
  text-align: center;
  color: #a0aec0;
  padding: 2rem;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.pagination button {
  padding: 0.5rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.3s;
}

.pagination button:hover:not(:disabled) {
  background: #5568d3;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.leaderboard-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.button {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 0.5rem;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.3s;
}

.button:hover {
  background: #5568d3;
}
</style>

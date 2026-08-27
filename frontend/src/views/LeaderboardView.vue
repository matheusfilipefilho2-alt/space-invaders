<template>
  <div class="leaderboard-view">
    <div class="header">
      <h1>🏆 LEADERBOARD</h1>
      <p class="subtitle">Compete for the top spot!</p>
    </div>

    <!-- Current League Card -->
    <div v-if="leaderboardStore.currentLeague" class="current-league-card">
      <div class="league-header">
        <span class="league-icon">{{ leaderboardStore.currentLeague.icon }}</span>
        <div class="league-info">
          <h2>{{ leaderboardStore.currentLeague.name }} League</h2>
          <p>{{ leaderboardStore.rankPoints }} Rank Points</p>
        </div>
      </div>

      <div class="league-progress">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{
              width: leaderboardStore.progressInCurrentLeague + '%',
              backgroundColor: leaderboardStore.currentLeague.color
            }"
          ></div>
        </div>
        <div class="progress-labels">
          <span v-if="leaderboardStore.previousLeague">
            ⬇️ {{ leaderboardStore.pointsToPreviousLeague }}pts above {{ leaderboardStore.previousLeague.name }}
          </span>
          <span v-if="leaderboardStore.nextLeague">
            ⬆️ {{ leaderboardStore.pointsToNextLeague }}pts to {{ leaderboardStore.nextLeague.name }}
          </span>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="tabs">
      <button
        :class="{ active: activeTab === 'league' }"
        @click="activeTab = 'league'"
      >
        {{ leaderboardStore.currentLeague?.icon }} My League
      </button>
      <button
        :class="{ active: activeTab === 'global' }"
        @click="activeTab = 'global'"
      >
        🌍 Global
      </button>
      <button
        :class="{ active: activeTab === 'leagues' }"
        @click="activeTab = 'leagues'"
      >
        🏅 All Leagues
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="leaderboardStore.loading" class="loading">
      <div class="spinner"></div>
      <p>Loading rankings...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="leaderboardStore.error" class="error">
      <p>❌ {{ leaderboardStore.error }}</p>
      <button @click="leaderboardStore.initialize()" class="retry-btn">
        🔄 Retry
      </button>
    </div>

    <!-- League Leaderboard Tab -->
    <div v-else-if="activeTab === 'league'" class="leaderboard-content">
      <h3>{{ leaderboardStore.currentLeague?.name }} League Rankings</h3>
      <div class="leaderboard-table">
        <div class="table-header">
          <span class="rank-col">Rank</span>
          <span class="player-col">Player</span>
          <span class="score-col">High Score</span>
          <span class="games-col">Games</span>
        </div>
        <div
          v-for="player in leaderboardStore.leagueLeaderboard"
          :key="player.rank"
          class="table-row"
          :class="{ 'highlight': isCurrentUser(player.username) }"
        >
          <span class="rank-col">
            <span v-if="player.rank === 1" class="medal">🥇</span>
            <span v-else-if="player.rank === 2" class="medal">🥈</span>
            <span v-else-if="player.rank === 3" class="medal">🥉</span>
            <span v-else>#{{ player.rank }}</span>
          </span>
          <span class="player-col">
            {{ player.username }}
            <span v-if="isCurrentUser(player.username)" class="you-badge">YOU</span>
          </span>
          <span class="score-col">{{ formatNumber(player.highScore) }}</span>
          <span class="games-col">{{ player.totalGames }}</span>
        </div>
        <div v-if="leaderboardStore.leagueLeaderboard.length === 0" class="empty-state">
          <p>No players in this league yet.</p>
          <p>Be the first to climb the ranks!</p>
        </div>
      </div>
    </div>

    <!-- Global Leaderboard Tab -->
    <div v-else-if="activeTab === 'global'" class="leaderboard-content">
      <h3>🌍 Global Rankings</h3>
      <div class="leaderboard-table">
        <div class="table-header">
          <span class="rank-col">Rank</span>
          <span class="player-col">Player</span>
          <span class="league-col">League</span>
          <span class="score-col">High Score</span>
        </div>
        <div
          v-for="player in leaderboardStore.globalLeaderboard"
          :key="player.rank"
          class="table-row"
          :class="{ 'highlight': isCurrentUser(player.username) }"
        >
          <span class="rank-col">
            <span v-if="player.rank === 1" class="medal">🥇</span>
            <span v-else-if="player.rank === 2" class="medal">🥈</span>
            <span v-else-if="player.rank === 3" class="medal">🥉</span>
            <span v-else>#{{ player.rank }}</span>
          </span>
          <span class="player-col">
            {{ player.username }}
            <span v-if="isCurrentUser(player.username)" class="you-badge">YOU</span>
          </span>
          <span class="league-col">
            {{ getLeagueIcon(player.leagueId) }} {{ player.leagueName }}
          </span>
          <span class="score-col">{{ formatNumber(player.highScore) }}</span>
        </div>
        <div v-if="leaderboardStore.globalLeaderboard.length === 0" class="empty-state">
          <p>No players yet.</p>
          <p>Play your first game to appear here!</p>
        </div>
      </div>
    </div>

    <!-- All Leagues Tab -->
    <div v-else-if="activeTab === 'leagues'" class="leaderboard-content">
      <h3>🏅 League System</h3>
      <div class="leagues-grid">
        <div
          v-for="league in leaderboardStore.getAllLeagues()"
          :key="league.id"
          class="league-card"
          :class="{ 'current': league.id === leaderboardStore.currentLeague?.id }"
          @click="switchToLeague(league.id)"
        >
          <div class="league-icon-large" :style="{ color: league.color }">
            {{ league.icon }}
          </div>
          <h4>{{ league.name }}</h4>
          <p class="points-range">
            {{ formatNumber(league.minPoints) }} - {{ formatNumber(league.maxPoints) }} pts
          </p>
          <span v-if="league.id === leaderboardStore.currentLeague?.id" class="current-badge">
            ⭐ Your League
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLeaderboardStore } from '@/stores/leaderboard'
import { useAuthStore } from '@/stores/auth'

const leaderboardStore = useLeaderboardStore()
const authStore = useAuthStore()
const activeTab = ref<'league' | 'global' | 'leagues'>('league')

onMounted(async () => {
  await leaderboardStore.initialize()
})

function isCurrentUser(username: string): boolean {
  return authStore.user?.username === username
}

function getLeagueIcon(leagueId: number | undefined): string {
  if (!leagueId) return '🥉'
  return leaderboardStore.getLeagueInfo(leagueId).icon
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num)
}

function switchToLeague(leagueId: number) {
  activeTab.value = 'league'
  leaderboardStore.fetchLeagueLeaderboard(leagueId)
}
</script>

<style scoped>
.leaderboard-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 3rem;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5),
               0 0 20px rgba(255, 215, 0, 0.3);
  margin: 0;
}

.subtitle {
  color: #a0aec0;
  font-size: 1.1rem;
  margin-top: 0.5rem;
}

/* Current League Card */
.current-league-card {
  background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
  border: 2px solid #4a5568;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.league-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.league-icon {
  font-size: 3rem;
}

.league-info h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #f7fafc;
}

.league-info p {
  margin: 0.25rem 0 0;
  color: #cbd5e0;
  font-size: 0.9rem;
}

.league-progress {
  margin-top: 1rem;
}

.progress-bar {
  height: 20px;
  background: #1a202c;
  border: 2px solid #4a5568;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px currentColor;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #a0aec0;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #4a5568;
}

.tabs button {
  background: transparent;
  border: none;
  color: #a0aec0;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
}

.tabs button:hover {
  color: #f7fafc;
  background: rgba(74, 85, 104, 0.3);
}

.tabs button.active {
  color: #ffd700;
  border-bottom-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

/* Loading & Error */
.loading, .error {
  text-align: center;
  padding: 3rem;
}

.spinner {
  border: 4px solid #4a5568;
  border-top-color: #ffd700;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  margin: 0 auto 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 1rem;
}

/* Leaderboard Table */
.leaderboard-content h3 {
  text-align: center;
  color: #f7fafc;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.leaderboard-table {
  background: #2d3748;
  border: 2px solid #4a5568;
  border-radius: 12px;
  overflow: hidden;
}

.table-header, .table-row {
  display: grid;
  grid-template-columns: 80px 1fr 150px 100px;
  padding: 1rem;
  gap: 1rem;
  align-items: center;
}

.table-header {
  background: #1a202c;
  color: #ffd700;
  font-weight: bold;
  border-bottom: 2px solid #4a5568;
}

.table-row {
  border-bottom: 1px solid #4a5568;
  transition: background 0.2s ease;
}

.table-row:hover {
  background: #374151;
}

.table-row.highlight {
  background: rgba(102, 126, 234, 0.2);
  border-left: 4px solid #667eea;
}

.rank-col {
  text-align: center;
  font-weight: bold;
}

.medal {
  font-size: 1.5rem;
}

.player-col {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.you-badge {
  background: #667eea;
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
}

.score-col, .games-col, .league-col {
  text-align: center;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #a0aec0;
}

/* Leagues Grid */
.leagues-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.league-card {
  background: #2d3748;
  border: 2px solid #4a5568;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.league-card:hover {
  transform: translateY(-5px);
  border-color: #667eea;
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.3);
}

.league-card.current {
  border-color: #ffd700;
  background: linear-gradient(135deg, #2d3748 0%, #3d4758 100%);
}

.league-icon-large {
  font-size: 4rem;
  margin-bottom: 0.5rem;
}

.league-card h4 {
  margin: 0.5rem 0;
  color: #f7fafc;
  font-size: 1.3rem;
}

.points-range {
  color: #a0aec0;
  font-size: 0.9rem;
}

.current-badge {
  display: inline-block;
  background: #ffd700;
  color: #1a202c;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
  margin-top: 0.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .leaderboard-view {
    padding: 1rem;
  }

  .header h1 {
    font-size: 2rem;
  }

  .tabs {
    flex-direction: column;
    gap: 0;
  }

  .table-header, .table-row {
    grid-template-columns: 60px 1fr 120px 80px;
    padding: 0.75rem;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .leagues-grid {
    grid-template-columns: 1fr;
  }
}
</style>

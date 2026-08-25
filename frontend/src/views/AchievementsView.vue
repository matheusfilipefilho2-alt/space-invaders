<script setup lang="ts">
import { onMounted } from 'vue'
import { useAchievementStore } from '@/stores/achievement'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const achievementStore = useAchievementStore()
const authStore = useAuthStore()
const router = useRouter()

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }

  await achievementStore.initialize()
})

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
</script>

<template>
  <div class="achievements-container">
    <!-- Header -->
    <div class="achievements-header">
      <h1 class="achievements-title">🏆 ACHIEVEMENTS 🏆</h1>
      <p class="achievements-subtitle">Track Your Gaming Milestones</p>
    </div>

    <!-- Progress Summary -->
    <div class="progress-summary">
      <div class="summary-card">
        <div class="completion-circle">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8" />
            <circle 
              cx="50" cy="50" r="45" fill="none" stroke="#ffd700" stroke-width="8"
              stroke-dasharray="283" 
              :stroke-dashoffset="283 - (283 * achievementStore.completionPercentage / 100)"
              transform="rotate(-90 50 50)"
              style="transition: stroke-dashoffset 1s ease"
            />
          </svg>
          <div class="circle-content">
            <div class="percentage">{{ achievementStore.completionPercentage }}%</div>
            <div class="label">Complete</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ achievementStore.unlockedCount }}</div>
            <div class="stat-label">Unlocked</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ achievementStore.totalCount }}</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat-item gold">
            <div class="stat-value">🪙 {{ achievementStore.totalGoldEarned }}</div>
            <div class="stat-label">Gold Earned</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="filter-group">
        <label>Status:</label>
        <button 
          v-for="status in ['all', 'unlocked', 'locked']" 
          :key="status"
          :class="{ active: achievementStore.filterStatus === status }"
          @click="achievementStore.setFilterStatus(status)"
          class="filter-button"
        >
          {{ status.charAt(0).toUpperCase() + status.slice(1) }}
        </button>
      </div>

      <div class="filter-group">
        <label>Rarity:</label>
        <button 
          v-for="rarity in ['all', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY']" 
          :key="rarity"
          :class="{ active: achievementStore.filterRarity === rarity }"
          @click="achievementStore.setFilterRarity(rarity)"
          class="filter-button"
        >
          {{ rarity === 'all' ? 'All' : achievementStore.getRarityIcon(rarity) + ' ' + rarity }}
        </button>
      </div>
    </div>

    <!-- Achievements Grid -->
    <div class="achievements-grid">
      <div
        v-for="achievement in achievementStore.filteredAchievements"
        :key="achievement.id"
        class="achievement-card"
        :class="{ 
          unlocked: achievementStore.isUnlocked(achievement.id),
          locked: !achievementStore.isUnlocked(achievement.id)
        }"
      >
        <!-- Rarity Badge -->
        <div class="rarity-badge" :style="{ background: achievementStore.getRarityColor(achievement.rarity) }">
          {{ achievementStore.getRarityIcon(achievement.rarity) }} {{ achievement.rarity }}
        </div>

        <!-- Icon -->
        <div class="achievement-icon" :class="{ locked: !achievementStore.isUnlocked(achievement.id) }">
          {{ achievement.icon }}
        </div>

        <!-- Info -->
        <div class="achievement-info">
          <h3 class="achievement-name">{{ achievement.name }}</h3>
          <p class="achievement-description">{{ achievement.description }}</p>
          
          <div class="achievement-reward">
            🪙 {{ achievement.reward_gold }} Gold
          </div>

          <div v-if="achievementStore.isUnlocked(achievement.id)" class="unlocked-date">
            ✅ Unlocked {{ formatDate(achievementStore.getUnlockedDate(achievement.id) || '') }}
          </div>
          <div v-else class="locked-overlay">
            🔒 Locked
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="achievementStore.filteredAchievements.length === 0" class="empty-state">
      <div class="empty-icon">🏆</div>
      <h3>No Achievements Found</h3>
      <p>Try changing your filters</p>
    </div>
  </div>
</template>

<style scoped>
.achievements-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Press Start 2P', monospace;
}

.achievements-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.achievements-title {
  font-size: 2em;
  color: #fff;
  text-shadow: 3px 3px 0 #000;
  margin: 0 0 10px 0;
}

.achievements-subtitle {
  font-size: 0.7em;
  color: #ffd700;
  margin: 0;
}

.progress-summary {
  margin-bottom: 30px;
}

.summary-card {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  padding: 30px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 40px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.completion-circle {
  position: relative;
  width: 150px;
  height: 150px;
}

.completion-circle svg {
  width: 100%;
  height: 100%;
}

.circle-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
}

.percentage {
  font-size: 2em;
  color: #ffd700;
  margin-bottom: 5px;
}

.label {
  font-size: 0.6em;
  color: #aaa;
}

.stats-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.stat-item {
  text-align: center;
  color: white;
}

.stat-value {
  font-size: 1.8em;
  color: #ffd700;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.6em;
  color: #aaa;
}

.filters-bar {
  display: flex;
  gap: 30px;
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-group label {
  color: #fff;
  font-size: 0.7em;
}

.filter-button {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.6em;
  transition: all 0.2s;
}

.filter-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.filter-button.active {
  background: #667eea;
  border-color: #667eea;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.achievement-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 20px;
  position: relative;
  transition: all 0.3s;
}

.achievement-card.unlocked {
  border-color: rgba(0, 255, 0, 0.5);
  background: rgba(0, 255, 0, 0.05);
}

.achievement-card.unlocked:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 255, 0, 0.2);
}

.achievement-card.locked {
  opacity: 0.6;
}

.rarity-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 0.5em;
  color: white;
  font-weight: bold;
}

.achievement-icon {
  font-size: 4em;
  text-align: center;
  margin: 20px 0;
  filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5));
}

.achievement-icon.locked {
  filter: grayscale(100%) brightness(0.5);
}

.achievement-info {
  text-align: center;
}

.achievement-name {
  font-size: 0.8em;
  color: #ffd700;
  margin: 0 0 10px 0;
}

.achievement-description {
  font-size: 0.6em;
  color: #aaa;
  line-height: 1.5;
  margin: 0 0 15px 0;
}

.achievement-reward {
  font-size: 0.7em;
  color: #fff;
  padding: 8px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 5px;
  margin-bottom: 10px;
}

.unlocked-date {
  font-size: 0.5em;
  color: #00ff00;
  margin-top: 10px;
}

.locked-overlay {
  font-size: 0.6em;
  color: #888;
  margin-top: 10px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  grid-column: 1 / -1;
}

.empty-icon {
  font-size: 5em;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  color: #fff;
  margin-bottom: 10px;
}

.empty-state p {
  color: #aaa;
  font-size: 0.7em;
}

@media (max-width: 768px) {
  .achievements-title {
    font-size: 1.3em;
  }

  .summary-card {
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .achievements-grid {
    grid-template-columns: 1fr;
  }

  .filters-bar {
    flex-direction: column;
  }
}
</style>

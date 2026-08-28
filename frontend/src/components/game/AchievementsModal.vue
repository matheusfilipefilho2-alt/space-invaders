<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>🏆 Achievements</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="stats-summary">
        <div class="stat-item">
          <span class="stat-value">{{ unlockedCount }}/{{ totalCount }}</span>
          <span class="stat-label">Unlocked</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ totalGoldEarned }}</span>
          <span class="stat-label">Gold Earned</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ completionPercentage }}%</span>
          <span class="stat-label">Completion</span>
        </div>
      </div>

      <div class="category-tabs">
        <button
          v-for="category in categories"
          :key="category.id"
          :class="['tab', { active: selectedCategory === category.id }]"
          @click="selectedCategory = category.id"
        >
          {{ category.icon }} {{ category.name }}
        </button>
      </div>

      <div class="achievements-grid">
        <div
          v-for="achievement in filteredAchievements"
          :key="achievement.id"
          :class="['achievement-card', { unlocked: achievement.unlocked }]"
        >
          <div class="achievement-icon-large">{{ achievement.icon }}</div>
          <div class="achievement-details">
            <div class="achievement-name">{{ achievement.name }}</div>
            <div class="achievement-description">{{ achievement.description }}</div>

            <div v-if="!achievement.unlocked" class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercentage(achievement) + '%' }"></div>
              <div class="progress-text">{{ achievement.progress }} / {{ achievement.requirement }}</div>
            </div>

            <div class="achievement-footer">
              <span class="achievement-reward">+{{ achievement.rewardGold }} Gold</span>
              <span v-if="achievement.unlocked" class="unlocked-badge">✓ UNLOCKED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AchievementManager, type Achievement } from '@/game/Achievements'

defineEmits<{
  (e: 'close'): void
}>()

const achievements = ref<Achievement[]>([])
const selectedCategory = ref<string>('all')
const loading = ref(true)

onMounted(async () => {
  try {
    achievements.value = await AchievementManager.loadAchievementsFromBackend()
  } catch (error) {
    console.error('Failed to load achievements:', error)
    // Fallback to local
    achievements.value = AchievementManager.getAchievements()
  } finally {
    loading.value = false
  }
})

const categories = [
  { id: 'all', name: 'All', icon: '🌟' },
  { id: 'score', name: 'Score', icon: '🎯' },
  { id: 'kills', name: 'Kills', icon: '💥' },
  { id: 'combo', name: 'Combo', icon: '🔥' },
  { id: 'survival', name: 'Survival', icon: '🛡️' },
  { id: 'special', name: 'Special', icon: '⭐' }
]

const filteredAchievements = computed(() => {
  if (selectedCategory.value === 'all') {
    return achievements.value
  }
  return achievements.value.filter(a => a.category === selectedCategory.value)
})

const unlockedCount = computed(() => AchievementManager.getUnlockedCount())
const totalCount = computed(() => AchievementManager.getTotalCount())
const totalGoldEarned = computed(() => AchievementManager.getTotalGoldEarned())
const completionPercentage = computed(() =>
  Math.round((unlockedCount.value / totalCount.value) * 100)
)

function progressPercentage(achievement: Achievement): number {
  return Math.min(100, (achievement.progress / achievement.requirement) * 100)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: linear-gradient(135deg, #0a0a2e 0%, #16213e 100%);
  border: 2px solid #00ff88;
  border-radius: 16px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 0 40px rgba(0, 255, 136, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 2px solid #00ff88;
}

.modal-header h2 {
  margin: 0;
  color: #00ff88;
  font-size: 2rem;
}

.close-btn {
  background: none;
  border: 2px solid #ff0044;
  color: #ff0044;
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
}

.close-btn:hover {
  background: #ff0044;
  color: white;
  transform: rotate(90deg);
}

.stats-summary {
  display: flex;
  justify-content: space-around;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  margin: 20px;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #FFD700;
}

.stat-label {
  font-size: 0.9rem;
  color: #888;
}

.category-tabs {
  display: flex;
  gap: 10px;
  padding: 0 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tab {
  background: rgba(0, 255, 136, 0.1);
  border: 2px solid #00ff88;
  color: #00ff88;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.tab:hover {
  background: rgba(0, 255, 136, 0.2);
  transform: translateY(-2px);
}

.tab.active {
  background: #00ff88;
  color: #0a0a2e;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 15px;
  padding: 20px;
}

.achievement-card {
  display: flex;
  gap: 15px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid #444;
  border-radius: 12px;
  padding: 15px;
  transition: all 0.3s;
  opacity: 0.6;
}

.achievement-card.unlocked {
  background: rgba(0, 255, 136, 0.1);
  border-color: #00ff88;
  opacity: 1;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
}

.achievement-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.achievement-icon-large {
  font-size: 3.5rem;
  min-width: 60px;
  text-align: center;
}

.achievement-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.achievement-name {
  font-size: 1.2rem;
  font-weight: bold;
  color: #fff;
}

.achievement-description {
  font-size: 0.9rem;
  color: #aaa;
}

.progress-bar {
  position: relative;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  height: 24px;
  overflow: hidden;
  border: 1px solid #444;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ff88, #00cc70);
  transition: width 0.3s;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75rem;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
}

.achievement-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.achievement-reward {
  font-size: 0.9rem;
  font-weight: bold;
  color: #FFD700;
}

.unlocked-badge {
  font-size: 0.75rem;
  font-weight: bold;
  color: #00ff88;
  background: rgba(0, 255, 136, 0.2);
  padding: 4px 10px;
  border-radius: 4px;
}
</style>

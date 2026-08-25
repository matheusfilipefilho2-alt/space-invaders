<template>
  <div class="profile-container">
    <div class="profile-card">
      <h1>Player Profile</h1>

      <div v-if="loading" class="loading">Loading...</div>

      <div v-else-if="profile" class="profile-content">
        <div class="profile-section">
          <h2>Account Information</h2>
          <div class="info-row">
            <span class="label">Username:</span>
            <span class="value">{{ profile.username }}</span>
          </div>
          <div class="info-row">
            <span class="label">Email:</span>
            <span class="value">{{ profile.email }}</span>
          </div>
          <div class="info-row">
            <span class="label">League:</span>
            <span class="value">{{ profile.league_name || 'No League' }}</span>
          </div>
        </div>

        <div class="profile-section">
          <h2>Stats</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ profile.gold_balance || 0 }}</div>
              <div class="stat-label">Gold</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ profile.total_score || 0 }}</div>
              <div class="stat-label">Total Score</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ profile.games_played || 0 }}</div>
              <div class="stat-label">Games Played</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ profile.highest_score || 0 }}</div>
              <div class="stat-label">Highest Score</div>
            </div>
          </div>
        </div>

        <div class="profile-section">
          <h2>Achievements</h2>
          <div v-if="achievements.length === 0" class="no-data">
            No achievements yet. Keep playing!
          </div>
          <div v-else class="achievements-list">
            <div v-for="achievement in achievements" :key="achievement.id" class="achievement-card">
              <h3>{{ achievement.name }}</h3>
              <p>{{ achievement.description }}</p>
              <span class="achievement-reward">+{{ achievement.gold_reward }} Gold</span>
            </div>
          </div>
        </div>

        <div class="profile-section">
          <h2>Equipped Items</h2>
          <div v-if="equippedItems.length === 0" class="no-data">
            No items equipped. Visit the shop!
          </div>
          <div v-else class="items-list">
            <div v-for="item in equippedItems" :key="item.id" class="item-card">
              <h3>{{ item.name }}</h3>
              <p>{{ item.description }}</p>
              <span class="item-type">{{ item.item_type }}</span>
            </div>
          </div>
        </div>

        <div class="profile-actions">
          <router-link to="/game" class="button">Back to Game</router-link>
          <router-link to="/shop" class="button">Visit Shop</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { playerAPI } from '@/services/api'

const loading = ref(true)
const profile = ref<any>(null)
const achievements = ref<any[]>([])
const equippedItems = ref<any[]>([])

async function loadProfile() {
  try {
    loading.value = true
    const [profileRes, achievementsRes, itemsRes] = await Promise.all([
      playerAPI.getProfile(),
      playerAPI.getAchievements(),
      playerAPI.getItems()
    ])

    profile.value = profileRes.data.data
    achievements.value = achievementsRes.data.data
    equippedItems.value = itemsRes.data.data.filter((item: any) => item.is_equipped)
  } catch (err) {
    console.error('Failed to load profile:', err)
    alert('Failed to load profile data')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.profile-card {
  max-width: 1200px;
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

.loading {
  text-align: center;
  padding: 2rem;
  font-size: 1.25rem;
}

.profile-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f7fafc;
  border-radius: 0.5rem;
}

h2 {
  margin-bottom: 1rem;
  color: #667eea;
}

.info-row {
  display: flex;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e2e8f0;
}

.label {
  font-weight: bold;
  width: 150px;
}

.value {
  color: #4a5568;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
}

.stat-label {
  color: #718096;
  margin-top: 0.5rem;
}

.achievements-list, .items-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.achievement-card, .item-card {
  background: white;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.achievement-card h3, .item-card h3 {
  margin: 0 0 0.5rem 0;
  color: #2d3748;
}

.achievement-card p, .item-card p {
  margin: 0 0 0.5rem 0;
  color: #718096;
  font-size: 0.875rem;
}

.achievement-reward {
  display: inline-block;
  background: #ffd700;
  color: #744210;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: bold;
}

.item-type {
  display: inline-block;
  background: #667eea;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.no-data {
  text-align: center;
  color: #a0aec0;
  padding: 2rem;
}

.profile-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
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

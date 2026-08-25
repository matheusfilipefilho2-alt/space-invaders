<template>
  <div class="profile-page">
    <div class="game-container">
      <h1 class="game-title">PERFIL</h1>
      <p class="game-subtitle">SUAS ESTATÍSTICAS</p>

      <div v-if="loading" class="loading">Carregando...</div>

      <div v-else-if="profile" class="profile-content">
        <div class="user-info-card">
          <div class="user-avatar">👤</div>
          <div class="user-details">
            <h3>{{ profile.username }}</h3>
            <p>{{ profile.email }}</p>
            <p style="color: #FFD700;">🏆 {{ profile.league_name || 'Sem Liga' }}</p>
          </div>
        </div>

        <div class="profile-section">
          <h2 class="section-title">ESTATÍSTICAS</h2>
          <div class="game-stats" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; background: transparent; border: none; padding: 0; box-shadow: none;">
            <div class="score-item" style="background: rgba(0, 0, 0, 0.6); border: 2px solid #FFD700; border-radius: 10px; padding: 20px; border-right: none;">
              <span class="score-label">💰 GOLD</span>
              <span class="score-value" style="color: #FFD700;">{{ profile.gold_balance || 0 }}</span>
            </div>
            <div class="score-item" style="background: rgba(0, 0, 0, 0.6); border: 2px solid #ffa502; border-radius: 10px; padding: 20px; border-right: none;">
              <span class="score-label">📊 PONTUAÇÃO TOTAL</span>
              <span class="score-value" style="color: #ffa502;">{{ profile.total_score || 0 }}</span>
            </div>
            <div class="score-item" style="background: rgba(0, 0, 0, 0.6); border: 2px solid #4ECDC4; border-radius: 10px; padding: 20px; border-right: none;">
              <span class="score-label">🎮 JOGOS</span>
              <span class="score-value" style="color: #4ECDC4;">{{ profile.games_played || 0 }}</span>
            </div>
            <div class="score-item" style="background: rgba(0, 0, 0, 0.6); border: 2px solid #00ff88; border-radius: 10px; padding: 20px; border-right: none;">
              <span class="score-label">⭐ RECORDE</span>
              <span class="score-value" style="color: #00ff88;">{{ profile.highest_score || 0 }}</span>
            </div>
          </div>
        </div>

        <div class="profile-section">
          <h2 class="section-title">🏅 CONQUISTAS</h2>
          <div v-if="achievements.length === 0" class="loading">
            Nenhuma conquista ainda. Continue jogando!
          </div>
          <div v-else class="items-grid">
            <div v-for="achievement in achievements" :key="achievement.id" class="shop-item legendary">
              <div class="item-header">
                <div class="item-icon">🏆</div>
              </div>
              <h3 class="item-name">{{ achievement.name }}</h3>
              <p class="item-description">{{ achievement.description }}</p>
              <div class="item-footer">
                <div class="item-price">
                  <span>💰 +{{ achievement.gold_reward }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="profile-section">
          <h2 class="section-title">⚔️ ITENS EQUIPADOS</h2>
          <div v-if="equippedItems.length === 0" class="loading">
            Nenhum item equipado. Visite a loja!
          </div>
          <div v-else class="items-grid">
            <div v-for="item in equippedItems" :key="item.id" :class="['shop-item', item.rarity?.toLowerCase() || 'common']">
              <div class="item-header">
                <div class="item-icon">{{ getItemIcon(item.item_type) }}</div>
                <span class="item-rarity">{{ item.rarity || 'COMMON' }}</span>
              </div>
              <h3 class="item-name">{{ item.name }}</h3>
              <p class="item-description">{{ item.description }}</p>
              <div class="item-footer">
                <span class="owned-badge">✓ Equipado</span>
              </div>
            </div>
          </div>
        </div>

        <div class="menu-buttons" style="margin-top: 40px;">
          <router-link to="/game" class="button-play">VOLTAR AO JOGO</router-link>
          <router-link to="/shop" class="button-view-ranking">VISITAR LOJA</router-link>
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

function getItemIcon(itemType: string): string {
  const icons: Record<string, string> = {
    weapon: '⚔️',
    armor: '🛡️',
    shield: '🛡️',
    power: '⚡',
    speed: '💨',
    bonus: '✨',
    special: '🌟',
  }
  return icons[itemType?.toLowerCase()] || '📦'
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: 20px;
  padding-top: 100px;
}

.game-container {
  max-width: 1000px;
}

.profile-section {
  margin: 30px 0;
}

.profile-content {
  width: 100%;
}
</style>

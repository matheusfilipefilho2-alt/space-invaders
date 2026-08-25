<template>
  <div class="shop-container">
    <div class="shop-card">
      <h1>Item Shop</h1>

      <div class="player-gold">
        <span>Your Gold:</span>
        <span class="gold-amount">{{ authStore.user?.gold_balance || 0 }}</span>
      </div>

      <div v-if="loading" class="loading">Loading items...</div>

      <div v-else class="shop-content">
        <div class="shop-tabs">
          <button
            @click="activeTab = 'available'"
            :class="{ active: activeTab === 'available' }"
          >
            Available Items
          </button>
          <button
            @click="activeTab = 'owned'"
            :class="{ active: activeTab === 'owned' }"
          >
            Your Items
          </button>
        </div>

        <div v-if="activeTab === 'available'" class="items-grid">
          <div v-if="availableItems.length === 0" class="no-data">
            No items available for purchase
          </div>
          <div
            v-for="item in availableItems"
            :key="item.id"
            class="item-card"
          >
            <h3>{{ item.name }}</h3>
            <p class="item-description">{{ item.description }}</p>
            <div class="item-stats">
              <span class="item-type">{{ item.item_type }}</span>
              <span class="item-rarity">{{ item.rarity }}</span>
            </div>
            <div v-if="item.attack_bonus" class="bonus">
              Attack: +{{ item.attack_bonus }}
            </div>
            <div v-if="item.defense_bonus" class="bonus">
              Defense: +{{ item.defense_bonus }}
            </div>
            <div v-if="item.speed_bonus" class="bonus">
              Speed: +{{ item.speed_bonus }}
            </div>
            <div class="item-footer">
              <span class="price">{{ item.gold_cost }} Gold</span>
              <button
                @click="purchaseItem(item.id, item.gold_cost)"
                :disabled="purchasing || (authStore.user?.gold_balance || 0) < item.gold_cost"
                class="purchase-btn"
              >
                {{ purchasing ? 'Buying...' : 'Purchase' }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="items-grid">
          <div v-if="ownedItems.length === 0" class="no-data">
            You don't own any items yet
          </div>
          <div
            v-for="item in ownedItems"
            :key="item.id"
            class="item-card owned"
          >
            <h3>{{ item.name }}</h3>
            <p class="item-description">{{ item.description }}</p>
            <div class="item-stats">
              <span class="item-type">{{ item.item_type }}</span>
              <span class="item-rarity">{{ item.rarity }}</span>
            </div>
            <div v-if="item.attack_bonus" class="bonus">
              Attack: +{{ item.attack_bonus }}
            </div>
            <div v-if="item.defense_bonus" class="bonus">
              Defense: +{{ item.defense_bonus }}
            </div>
            <div v-if="item.speed_bonus" class="bonus">
              Speed: +{{ item.speed_bonus }}
            </div>
            <div class="item-footer">
              <span v-if="item.is_equipped" class="equipped-badge">Equipped</span>
              <button
                v-if="!item.is_equipped"
                @click="equipItem(item.id)"
                :disabled="equipping"
                class="equip-btn"
              >
                {{ equipping ? 'Equipping...' : 'Equip' }}
              </button>
              <button
                v-else
                @click="unequipItem(item.id)"
                :disabled="equipping"
                class="unequip-btn"
              >
                {{ equipping ? 'Unequipping...' : 'Unequip' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="shop-actions">
        <router-link to="/game" class="button">Back to Game</router-link>
        <router-link to="/profile" class="button">View Profile</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { itemAPI, playerAPI } from '@/services/api'

const authStore = useAuthStore()
const loading = ref(true)
const purchasing = ref(false)
const equipping = ref(false)
const activeTab = ref<'available' | 'owned'>('available')
const allItems = ref<any[]>([])
const playerItems = ref<any[]>([])

const availableItems = computed(() => {
  const ownedIds = new Set(playerItems.value.map(item => item.id))
  return allItems.value.filter(item => !ownedIds.has(item.id))
})

const ownedItems = computed(() => playerItems.value)

async function loadItems() {
  try {
    loading.value = true
    const [allItemsRes, playerItemsRes] = await Promise.all([
      itemAPI.list(),
      playerAPI.getItems()
    ])

    allItems.value = allItemsRes.data.data
    playerItems.value = playerItemsRes.data.data
  } catch (err) {
    console.error('Failed to load items:', err)
    alert('Failed to load shop items')
  } finally {
    loading.value = false
  }
}

async function purchaseItem(itemId: number, cost: number) {
  if ((authStore.user?.gold_balance || 0) < cost) {
    alert('Not enough gold!')
    return
  }

  try {
    purchasing.value = true
    await itemAPI.purchase(itemId)
    alert('Item purchased successfully!')
    await Promise.all([
      loadItems(),
      authStore.fetchProfile()
    ])
  } catch (err: any) {
    console.error('Failed to purchase item:', err)
    alert(err.response?.data?.error || 'Failed to purchase item')
  } finally {
    purchasing.value = false
  }
}

async function equipItem(itemId: number) {
  try {
    equipping.value = true
    await itemAPI.equip(itemId)
    alert('Item equipped!')
    await loadItems()
  } catch (err: any) {
    console.error('Failed to equip item:', err)
    alert(err.response?.data?.error || 'Failed to equip item')
  } finally {
    equipping.value = false
  }
}

async function unequipItem(itemId: number) {
  try {
    equipping.value = true
    await itemAPI.unequip(itemId)
    alert('Item unequipped!')
    await loadItems()
  } catch (err: any) {
    console.error('Failed to unequip item:', err)
    alert(err.response?.data?.error || 'Failed to unequip item')
  } finally {
    equipping.value = false
  }
}

onMounted(() => {
  loadItems()
})
</script>

<style scoped>
.shop-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.shop-card {
  max-width: 1400px;
  margin: 0 auto;
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}

h1 {
  text-align: center;
  margin-bottom: 1rem;
}

.player-gold {
  text-align: center;
  margin-bottom: 2rem;
  font-size: 1.5rem;
}

.gold-amount {
  font-weight: bold;
  color: #ffd700;
  margin-left: 0.5rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  font-size: 1.25rem;
}

.shop-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  justify-content: center;
}

.shop-tabs button {
  padding: 0.75rem 1.5rem;
  background: #e2e8f0;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s;
}

.shop-tabs button.active {
  background: #667eea;
  color: white;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.item-card {
  background: #f7fafc;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.item-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.item-card.owned {
  border: 2px solid #667eea;
}

.item-card h3 {
  margin: 0 0 0.5rem 0;
  color: #2d3748;
}

.item-description {
  color: #718096;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  min-height: 40px;
}

.item-stats {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.item-type {
  background: #667eea;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.item-rarity {
  background: #48bb78;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.bonus {
  font-size: 0.875rem;
  color: #2d3748;
  margin-bottom: 0.25rem;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.price {
  font-weight: bold;
  color: #ffd700;
}

.purchase-btn, .equip-btn, .unequip-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: opacity 0.3s;
}

.purchase-btn {
  background: #48bb78;
  color: white;
}

.purchase-btn:hover:not(:disabled) {
  background: #38a169;
}

.purchase-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.equip-btn {
  background: #667eea;
  color: white;
}

.equip-btn:hover:not(:disabled) {
  background: #5568d3;
}

.unequip-btn {
  background: #e53e3e;
  color: white;
}

.unequip-btn:hover:not(:disabled) {
  background: #c53030;
}

.equipped-badge {
  background: #ffd700;
  color: #744210;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: bold;
}

.no-data {
  grid-column: 1 / -1;
  text-align: center;
  color: #a0aec0;
  padding: 2rem;
}

.shop-actions {
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

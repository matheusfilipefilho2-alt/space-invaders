<template>
  <div class="shop-page">
    <div class="shop-container">
      <div class="shop-header">
        <h1 class="shop-title">LOJA DE ITENS</h1>
        <div class="user-coins">
          <span>💰 {{ authStore.user?.gold_balance || 0 }} GOLD</span>
        </div>
      </div>

      <div v-if="loading" class="loading">Carregando itens...</div>

      <div v-else class="shop-content">
        <div class="shop-categories">
          <button
            @click="activeTab = 'available'"
            :class="['category-btn', { active: activeTab === 'available' }]"
          >
            📦 Itens Disponíveis
          </button>
          <button
            @click="activeTab = 'owned'"
            :class="['category-btn', { active: activeTab === 'owned' }]"
          >
            🎒 Seus Itens
          </button>
        </div>

        <div v-if="activeTab === 'available'" class="items-grid">
          <div v-if="availableItems.length === 0" class="loading">
            Nenhum item disponível
          </div>
          <div
            v-for="item in availableItems"
            :key="item.id"
            :class="['shop-item', item.rarity?.toLowerCase() || 'common']"
          >
            <div class="item-header">
              <div class="item-icon">{{ getItemIcon(item.item_type) }}</div>
              <span class="item-rarity">{{ item.rarity || 'COMMON' }}</span>
            </div>
            <h3 class="item-name">{{ item.name }}</h3>
            <p class="item-description">{{ item.description }}</p>
            <div v-if="item.attack_bonus" class="bonus">
              ⚔️ Ataque: +{{ item.attack_bonus }}
            </div>
            <div v-if="item.defense_bonus" class="bonus">
              🛡️ Defesa: +{{ item.defense_bonus }}
            </div>
            <div v-if="item.speed_bonus" class="bonus">
              ⚡ Velocidade: +{{ item.speed_bonus }}
            </div>
            <div class="item-footer">
              <div class="item-price">
                <span>💰 {{ item.gold_cost }}</span>
              </div>
              <button
                @click="purchaseItem(item.id, item.gold_cost)"
                :disabled="purchasing || (authStore.user?.gold_balance || 0) < item.gold_cost"
                class="buy-btn"
              >
                {{ purchasing ? 'Comprando...' : 'Comprar' }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="items-grid">
          <div v-if="ownedItems.length === 0" class="loading">
            Você não possui itens ainda
          </div>
          <div
            v-for="item in ownedItems"
            :key="item.id"
            :class="['shop-item', item.rarity?.toLowerCase() || 'common']"
          >
            <div class="item-header">
              <div class="item-icon">{{ getItemIcon(item.item_type) }}</div>
              <span class="item-rarity">{{ item.rarity || 'COMMON' }}</span>
            </div>
            <h3 class="item-name">{{ item.name }}</h3>
            <p class="item-description">{{ item.description }}</p>
            <div v-if="item.attack_bonus" class="bonus">
              ⚔️ Ataque: +{{ item.attack_bonus }}
            </div>
            <div v-if="item.defense_bonus" class="bonus">
              🛡️ Defesa: +{{ item.defense_bonus }}
            </div>
            <div v-if="item.speed_bonus" class="bonus">
              ⚡ Velocidade: +{{ item.speed_bonus }}
            </div>
            <div class="item-footer">
              <span v-if="item.is_equipped" class="owned-badge">✓ Equipado</span>
              <button
                v-if="!item.is_equipped"
                @click="equipItem(item.id)"
                :disabled="equipping"
                class="buy-btn"
              >
                {{ equipping ? 'Equipando...' : 'Equipar' }}
              </button>
              <button
                v-else
                @click="unequipItem(item.id)"
                :disabled="equipping"
                class="buy-btn"
                style="background: #ff4757;"
              >
                {{ equipping ? 'Desequipando...' : 'Desequipar' }}
              </button>
            </div>
          </div>
        </div>
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
  loadItems()
})
</script>

<style scoped>
.shop-page {
  min-height: 100vh;
  padding: 20px;
  padding-top: 100px;
}

.bonus {
  font-size: 10px;
  color: #4ECDC4;
  margin: 5px 0;
}
</style>

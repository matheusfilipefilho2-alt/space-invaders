<template>
  <div class="shop-page">
    <!-- Wallet UI Container -->
    <div class="header-wallet" style="position: fixed; top: 10px; right: 10px; z-index: 1000;">
      <button v-if="!walletConnected" @click="connectWallet" class="wallet-btn">
        <span>🔗</span> CONECTAR WALLET
      </button>
      <div v-else class="wallet-display">
        <span class="wallet-icon">👛</span>
        <span class="wallet-address">{{ shortenAddress(walletAddress) }}</span>
        <button @click="disconnectWallet" class="wallet-disconnect-btn">❌</button>
      </div>
    </div>

    <div class="shop-container">
      <!-- Header da Loja -->
      <div class="shop-header">
        <h1 class="shop-title">🛍️ LOJA GALÁCTICA</h1>
        <div class="user-coins" id="user-coins">
          🪙 {{ authStore.user?.gold_balance || 0 }} GOLD
        </div>
      </div>

      <!-- Categorias -->
      <div class="shop-categories" id="categories">
        <button
          @click="activeTab = 'all'"
          :class="['category-btn', { active: activeTab === 'all' }]"
        >
          🛍️ Todos os Itens
        </button>
        <button
          @click="activeTab = 'inventory'"
          :class="['category-btn', { active: activeTab === 'inventory' }]"
        >
          🎒 Meu Inventário
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading">Carregando itens...</div>

      <!-- Todos os Itens -->
      <div v-else-if="activeTab === 'all'" class="all-items">
        <h2 class="section-title">🛍️ TODOS OS ITENS</h2>
        <div class="items-grid" id="items-grid">
          <div v-if="availableItems.length === 0" class="loading">
            Nenhum item disponível
          </div>
          <div
            v-for="item in availableItems"
            :key="item.id"
            class="shop-item"
          >
            <div class="item-icon">{{ getItemIcon(item.category) }}</div>
            <h3 class="item-name">{{ item.name }}</h3>
            <p class="item-description">{{ item.description }}</p>
            <div class="item-price">💰 {{ item.price_gold }} GOLD</div>
            <button
              @click="purchaseItem(item)"
              :disabled="purchasing || (authStore.user?.gold_balance || 0) < item.price_gold"
              class="buy-btn"
            >
              {{ purchasing ? 'COMPRANDO...' : 'COMPRAR' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Inventário do Usuario -->
      <div v-else-if="activeTab === 'inventory'" class="inventory-section">
        <h2 class="section-title">🎒 MEU INVENTÁRIO</h2>
        <div class="inventory-grid" id="inventory-grid">
          <div v-if="ownedItems.length === 0" class="loading">
            Você não possui itens ainda
          </div>
          <div
            v-for="item in ownedItems"
            :key="item.id"
            class="shop-item inventory-item"
          >
            <div class="item-icon">{{ getItemIcon(item.item?.category) }}</div>
            <h3 class="item-name">{{ item.item?.name }}</h3>
            <p class="item-description">{{ item.item?.description }}</p>
            <div v-if="item.equipped" class="equipped-badge">✓ EQUIPADO</div>
            <button
              v-if="!item.equipped"
              @click="equipItem(item.id)"
              :disabled="equipping"
              class="buy-btn"
            >
              {{ equipping ? 'EQUIPANDO...' : 'EQUIPAR' }}
            </button>
            <button
              v-else
              @click="unequipItem(item.id)"
              :disabled="equipping"
              class="buy-btn unequip-btn"
            >
              {{ equipping ? 'DESEQUIPANDO...' : 'DESEQUIPAR' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmação -->
    <div v-if="showPurchaseModal" class="modal" @click="closePurchaseModal">
      <div class="modal-content" @click.stop>
        <h3>Confirmar Compra</h3>
        <p>Deseja comprar {{ selectedItem?.name }} por {{ selectedItem?.price_gold }} GOLD?</p>
        <div class="modal-buttons">
          <button class="modal-btn confirm" @click="confirmPurchase">COMPRAR</button>
          <button class="modal-btn cancel" @click="closePurchaseModal">CANCELAR</button>
        </div>
      </div>
    </div>

    <!-- Modal de Resultado -->
    <div v-if="showResultModal" class="modal" @click="closeResultModal">
      <div class="modal-content" @click.stop>
        <h3>{{ resultTitle }}</h3>
        <p>{{ resultMessage }}</p>
        <div class="modal-buttons">
          <button class="modal-btn confirm" @click="closeResultModal">OK</button>
        </div>
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
const activeTab = ref<'all' | 'inventory'>('all')
const allItems = ref<any[]>([])
const playerItems = ref<any[]>([])

// Wallet state
const walletConnected = ref(false)
const walletAddress = ref('')

// Modal state
const showPurchaseModal = ref(false)
const showResultModal = ref(false)
const selectedItem = ref<any>(null)
const resultTitle = ref('')
const resultMessage = ref('')

const availableItems = computed(() => allItems.value)
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
    showResult('Erro', 'Falha ao carregar itens da loja')
  } finally {
    loading.value = false
  }
}

function purchaseItem(item: any) {
  selectedItem.value = item
  showPurchaseModal.value = true
}

async function confirmPurchase() {
  if (!selectedItem.value) return

  try {
    purchasing.value = true
    closePurchaseModal()
    await itemAPI.purchase(selectedItem.value.id)

    await Promise.all([
      loadItems(),
      authStore.fetchProfile()
    ])

    showResult('Sucesso!', `${selectedItem.value.name} comprado com sucesso!`)
  } catch (err: any) {
    console.error('Failed to purchase item:', err)
    showResult('Erro', err.response?.data?.error || 'Falha ao comprar item')
  } finally {
    purchasing.value = false
    selectedItem.value = null
  }
}

function closePurchaseModal() {
  showPurchaseModal.value = false
  selectedItem.value = null
}

async function equipItem(itemId: number) {
  try {
    equipping.value = true
    await itemAPI.equip(itemId)
    await loadItems()
    showResult('Sucesso!', 'Item equipado!')
  } catch (err: any) {
    console.error('Failed to equip item:', err)
    showResult('Erro', err.response?.data?.error || 'Falha ao equipar item')
  } finally {
    equipping.value = false
  }
}

async function unequipItem(itemId: number) {
  try {
    equipping.value = true
    await itemAPI.unequip(itemId)
    await loadItems()
    showResult('Sucesso!', 'Item desequipado!')
  } catch (err: any) {
    console.error('Failed to unequip item:', err)
    showResult('Erro', err.response?.data?.error || 'Falha ao desequipar item')
  } finally {
    equipping.value = false
  }
}

function showResult(title: string, message: string) {
  resultTitle.value = title
  resultMessage.value = message
  showResultModal.value = true
}

function closeResultModal() {
  showResultModal.value = false
  resultTitle.value = ''
  resultMessage.value = ''
}

function getItemIcon(category: string): string {
  const icons: Record<string, string> = {
    ship: '🚀',
    weapon: '🔫',
    shield: '🛡️',
    background: '🌌',
  }
  return icons[category?.toLowerCase()] || '📦'
}

// Wallet functions
const connectWallet = async () => {
  try {
    if ((window as any).solana && (window as any).solana.isPhantom) {
      const response = await (window as any).solana.connect()
      walletAddress.value = response.publicKey.toString()
      walletConnected.value = true
      localStorage.setItem('wallet_address', walletAddress.value)
    } else {
      alert('Por favor, instale a Phantom Wallet para conectar!')
      window.open('https://phantom.app/', '_blank')
    }
  } catch (error) {
    console.error('Erro ao conectar wallet:', error)
    alert('Erro ao conectar wallet. Tente novamente.')
  }
}

const disconnectWallet = () => {
  walletConnected.value = false
  walletAddress.value = ''
  localStorage.removeItem('wallet_address')
  if ((window as any).solana) {
    (window as any).solana.disconnect()
  }
}

const shortenAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

onMounted(() => {
  loadItems()

  // Check if wallet was previously connected
  const savedWallet = localStorage.getItem('wallet_address')
  if (savedWallet) {
    walletAddress.value = savedWallet
    walletConnected.value = true
  }
})
</script>

<style scoped>
/* Remove custom styles - use global style.css */
.unequip-btn {
  background: #ff4757 !important;
  border-color: #ff4757 !important;
}

.equipped-badge {
  background: #00ff88;
  color: #000;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: bold;
  margin: 10px 0;
  display: inline-block;
}

/* Wallet styles */
.wallet-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: 2px solid #fff;
  border-radius: 12px;
  padding: 10px 20px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.wallet-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.wallet-display {
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid #FFD700;
  border-radius: 12px;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: white;
}

.wallet-icon {
  font-size: 16px;
}

.wallet-address {
  color: #FFD700;
  font-size: 9px;
}

.wallet-disconnect-btn {
  background: #FF4757;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.wallet-disconnect-btn:hover {
  background: #ff6b7a;
  transform: scale(1.1);
}
</style>

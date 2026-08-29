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
        <button
          @click="activeTab = 'orders'"
          :class="['category-btn', { active: activeTab === 'orders' }]"
        >
          📦 Meus Pedidos
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
            :class="{ 'has-skin-image': item.skinFile }"
          >
            <div class="item-icon-container">
              <img
                v-if="item.skinFile"
                :src="`/assets/skins/${item.skinFile}`"
                :alt="item.name"
                class="skin-image"
                @error="handleImageError"
              />
              <div v-else class="item-icon">{{ item.image }}</div>
            </div>
            <div v-if="item.rarity" class="rarity-badge" :class="`rarity-${item.rarity}`">
              {{ getRarityName(item.rarity) }}
            </div>
            <h3 class="item-name">{{ item.name }}</h3>
            <p class="item-description">{{ item.description }}</p>
            <div v-if="item.comingSoon" class="coming-soon-badge">EM BREVE</div>
            <div v-else-if="item.priceReal" class="item-price">
              💵 R$ {{ item.priceReal.toFixed(2) }}
              <span v-if="item.coinAmount" class="coin-bonus">
                ({{ item.coinAmount }} moedas)
              </span>
            </div>
            <div v-else class="item-price">💰 {{ item.priceGold }} GOLD</div>
            <div v-if="item.duration" class="item-duration">⏱️ {{ item.duration }}</div>
            <div v-if="item.permanent" class="item-permanent">♾️ Permanente</div>
            <button
              v-if="!item.disabled && !item.comingSoon"
              @click="purchaseItem(item)"
              :disabled="purchasing || (!item.priceReal && (authStore.user?.gold_balance || 0) < (item.priceGold || 0))"
              class="buy-btn"
            >
              {{ purchasing ? 'COMPRANDO...' : 'COMPRAR' }}
            </button>
            <button v-else-if="item.disabled || item.comingSoon" class="buy-btn" disabled>
              INDISPONÍVEL
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
            :class="{ 'has-skin-image': item.item?.skinFile }"
          >
            <div class="item-icon-container">
              <img
                v-if="item.item?.skinFile"
                :src="`/assets/skins/${item.item.skinFile}`"
                :alt="item.item.name"
                class="skin-image"
                @error="handleImageError"
              />
              <div v-else class="item-icon">{{ getItemIcon(item.item?.category) }}</div>
            </div>
            <h3 class="item-name">{{ item.item?.name }}</h3>
            <p class="item-description">{{ item.item?.description }}</p>
            <div v-if="item.equipped" class="equipped-badge">✓ EQUIPADO</div>
            <button
              v-if="!item.equipped"
              @click="equipItem(item.item.id)"
              :disabled="equipping"
              class="buy-btn"
            >
              {{ equipping ? 'EQUIPANDO...' : 'EQUIPAR' }}
            </button>
            <button
              v-else
              @click="unequipItem(item.item.id)"
              :disabled="equipping"
              class="buy-btn unequip-btn"
            >
              {{ equipping ? 'DESEQUIPANDO...' : 'DESEQUIPAR' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmação (Itens com GOLD) -->
    <div v-if="showPurchaseModal" class="modal" :style="{ display: 'flex' }" @click="closePurchaseModal">
      <div class="modal-content" @click.stop>
        <h3>Confirmar Compra</h3>
        <p>Deseja comprar {{ selectedItem?.name }} por {{ selectedItem?.priceGold }} GOLD?</p>
        <div class="modal-buttons">
          <button class="modal-btn confirm" @click="confirmPurchase">COMPRAR</button>
          <button class="modal-btn cancel" @click="closePurchaseModal">CANCELAR</button>
        </div>
      </div>
    </div>

    <!-- Modal PIX/QR Code (Pacotes de Moedas) -->
    <div v-if="showPixModal" class="modal" :style="{ display: 'flex' }" @click="closePixModal">
      <div class="modal-content pix-modal" @click.stop>
        <h3>💰 {{ pixOrder?.name }}</h3>
        <p class="pix-description">{{ pixOrder?.description }}</p>

        <div v-if="pixLoading" class="pix-loading">
          <div class="spinner"></div>
          <p>Gerando QR Code PIX...</p>
        </div>

        <div v-else-if="pixOrder" class="pix-content">
          <!-- QR Code -->
          <div class="qr-code-container">
            <img v-if="pixOrder.qrCodeUrl" :src="pixOrder.qrCodeUrl" alt="QR Code PIX" class="qr-code-image" />
          </div>

          <!-- PIX Copia e Cola -->
          <div class="pix-code-section">
            <p class="pix-label">Código PIX (Copia e Cola):</p>
            <div class="pix-code-box">
              <input
                type="text"
                :value="pixOrder.pixCode"
                readonly
                class="pix-code-input"
                ref="pixCodeInput"
              />
              <button @click="copyPixCode" class="copy-btn">
                {{ pixCopied ? '✓ Copiado!' : '📋 Copiar' }}
              </button>
            </div>
          </div>

          <!-- Informações -->
          <div class="pix-info">
            <p class="pix-price">Valor: {{ pixOrder.priceDisplay }}</p>
            <p class="pix-expires">Expira em: {{ pixOrder.expiresIn }}</p>
            <p v-if="paymentStatus === 'PENDING'" class="pix-status pending">
              ⏳ Aguardando pagamento...
            </p>
          </div>

          <!-- Botão de Simulação (apenas dev) -->
          <div v-if="isDevelopment" class="dev-section">
            <p class="dev-label">🛠️ Modo Desenvolvimento</p>
            <button class="modal-btn simulate" @click="simulatePayment">
              Simular Pagamento
            </button>
          </div>

          <!-- Botões -->
          <div class="modal-buttons">
            <button v-if="pixOrder.paymentUrl" class="modal-btn confirm" @click="openPaymentUrl">
              Abrir Pagamento
            </button>
            <button class="modal-btn cancel" @click="closePixModal">Fechar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Resultado -->
    <div v-if="showResultModal" class="modal" :style="{ display: 'flex' }" @click="closeResultModal">
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
import { itemAPI, playerAPI, shopAPI } from '@/services/api'
import { SHOP_ITEMS, getRarityName as getItemRarityName } from '@/data/shopItems'

const authStore = useAuthStore()
const loading = ref(true)
const purchasing = ref(false)
const equipping = ref(false)
const activeTab = ref<'all' | 'inventory' | 'orders'>('all')
const allItems = ref<any[]>([])
const playerItems = ref<any[]>([])
const useLocalData = ref(false) // Flag para usar dados locais

// Wallet state
const walletConnected = ref(false)
const walletAddress = ref('')

// Modal state
const showPurchaseModal = ref(false)
const showPixModal = ref(false)
const showResultModal = ref(false)
const selectedItem = ref<any>(null)
const resultTitle = ref('')
const resultMessage = ref('')

// PIX Modal state
const pixLoading = ref(false)
const pixOrder = ref<any>(null)
const pixCopied = ref(false)
const pixCodeInput = ref<HTMLInputElement | null>(null)
const pixPollingInterval = ref<number | null>(null)
const currentOrderId = ref<number | null>(null)
const paymentStatus = ref<string>('')
const isDevelopment = import.meta.env.DEV

// Orders state
const orders = ref<any[]>([])
const ordersLoading = ref(false)
const ordersPage = ref(0)
const hasMoreOrders = ref(true)

const availableItems = computed(() => allItems.value)
const ownedItems = computed(() => playerItems.value)

async function loadItems() {
  try {
    loading.value = true

    // Tentar carregar da API
    const [allItemsRes, playerItemsRes] = await Promise.all([
      itemAPI.list().catch(() => null),
      playerAPI.getItems().catch(() => null)
    ])

    // Se API funcionar, usar dados da API
    if (allItemsRes && allItemsRes.data) {
      allItems.value = allItemsRes.data.data
      playerItems.value = playerItemsRes?.data?.data || []
      useLocalData.value = false
    } else {
      // Usar dados locais se API falhar
      console.log('API indisponível, usando dados locais')
      allItems.value = SHOP_ITEMS

      // Carregar itens do inventário do localStorage
      const savedInventory = localStorage.getItem('player_inventory')
      if (savedInventory) {
        playerItems.value = JSON.parse(savedInventory)
      } else {
        playerItems.value = []
      }

      useLocalData.value = true
    }
  } catch (err) {
    console.error('Failed to load items:', err)
    // Fallback para dados locais
    allItems.value = SHOP_ITEMS
    const savedInventory = localStorage.getItem('player_inventory')
    playerItems.value = savedInventory ? JSON.parse(savedInventory) : []
    useLocalData.value = true
  } finally {
    loading.value = false
  }
}

function purchaseItem(item: any) {
  // Check if it's a coin pack (paid with real money via PIX)
  if (item.category === 'coin_pack' && item.priceReal) {
    purchaseCoinPack(item)
  } else {
    // Regular item (paid with GOLD)
    selectedItem.value = item
    showPurchaseModal.value = true
  }
}

async function purchaseCoinPack(item: any) {
  try {
    pixLoading.value = true
    showPixModal.value = true
    pixOrder.value = null

    // Create order via shop API
    const response = await shopAPI.createOrder(item.id)
    const order = response.data.data

    // Format the order for display
    const formattedOrder = {
      name: item.name,
      description: item.description,
      pixCode: order.pixCode,
      qrCodeUrl: order.qrCodeUrl,
      paymentUrl: order.paymentUrl,
      priceDisplay: `R$ ${item.priceReal.toFixed(2)}`,
      expiresIn: calculateExpiresIn(order.expiresAt)
    }

    pixOrder.value = formattedOrder

    // Store order ID and start polling
    currentOrderId.value = order.id
    paymentStatus.value = 'PENDING'
    startPollingPaymentStatus()

    console.log('Order created:', order.id, '- Polling started')
  } catch (err: any) {
    console.error('Failed to create PIX order:', err)
    showPixModal.value = false
    showResult('Erro', err.response?.data?.error || 'Falha ao gerar QR Code PIX')
  } finally {
    pixLoading.value = false
  }
}

// Start polling to check payment status
function startPollingPaymentStatus() {
  // Clear any existing polling
  stopPollingPaymentStatus()

  // Poll every 3 seconds
  pixPollingInterval.value = window.setInterval(async () => {
    await checkPaymentStatus()
  }, 3000)

  console.log('Started polling payment status')
}

// Stop polling
function stopPollingPaymentStatus() {
  if (pixPollingInterval.value) {
    clearInterval(pixPollingInterval.value)
    pixPollingInterval.value = null
    console.log('Stopped polling payment status')
  }
}

// Check payment status
async function checkPaymentStatus() {
  if (!currentOrderId.value) return

  try {
    const response = await shopAPI.getOrder(currentOrderId.value)
    const order = response.data.data

    console.log('Payment status:', order.status)

    if (order.status === 'COMPLETED') {
      // Payment confirmed!
      stopPollingPaymentStatus()
      paymentStatus.value = 'COMPLETED'

      // Update player balance
      await authStore.fetchProfile()

      // Close modal and show success
      closePixModal()
      showResult('Pagamento Confirmado! 🎉', `${order.goldAmount} Gold foi creditado na sua conta!`)

      // Reload items to update balance display
      await loadItems()
    } else if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
      // Order expired or cancelled
      stopPollingPaymentStatus()
      paymentStatus.value = order.status
      closePixModal()
      showResult('Pedido Expirado', 'O pedido expirou ou foi cancelado. Por favor, crie um novo pedido.')
    }
  } catch (err) {
    console.error('Failed to check payment status:', err)
  }
}

// Simulate payment (development only)
async function simulatePayment() {
  if (!currentOrderId.value) return

  try {
    console.log('Simulating payment for order:', currentOrderId.value)
    await shopAPI.simulatePayment(currentOrderId.value)
    console.log('Payment simulated successfully')
    // The polling will detect the status change
  } catch (err: any) {
    console.error('Failed to simulate payment:', err)
    showResult('Erro', err.response?.data?.error || 'Falha ao simular pagamento')
  }
}

function calculateExpiresIn(expiresAt: string): string {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diffMinutes = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60))

  if (diffMinutes <= 0) return 'Expirado'
  if (diffMinutes < 60) return `${diffMinutes} minutos`

  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours} hora${hours > 1 ? 's' : ''}`
}

function copyPixCode() {
  if (pixCodeInput.value) {
    pixCodeInput.value.select()
    document.execCommand('copy')
    pixCopied.value = true
    setTimeout(() => {
      pixCopied.value = false
    }, 2000)
  } else if (pixOrder.value?.pixCode) {
    // Fallback using navigator clipboard API
    navigator.clipboard.writeText(pixOrder.value.pixCode).then(() => {
      pixCopied.value = true
      setTimeout(() => {
        pixCopied.value = false
      }, 2000)
    }).catch(err => {
      console.error('Failed to copy PIX code:', err)
    })
  }
}

function openPaymentUrl() {
  if (pixOrder.value?.paymentUrl) {
    window.open(pixOrder.value.paymentUrl, '_blank')
  }
}

function closePixModal() {
  stopPollingPaymentStatus()
  showPixModal.value = false
  pixOrder.value = null
  pixCopied.value = false
  currentOrderId.value = null
  paymentStatus.value = ''
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

async function equipItem(itemId: string) {
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

async function unequipItem(itemId: string) {
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
    skin: '🚀',
    powerup: '⚡',
    boost: '📈',
    special: '✨',
    utility: '🛠️',
    cosmetic: '✨',
    theme: '🎨',
    coin_pack: '💰',
    ship: '🚀',
    weapon: '🔫',
    shield: '🛡️',
    background: '🌌',
  }
  return icons[category?.toLowerCase()] || '📦'
}

function getRarityName(rarity: string): string {
  return getItemRarityName(rarity)
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  // Hide image and show fallback emoji
  if (img && img.parentElement) {
    img.style.display = 'none'
    const fallback = document.createElement('div')
    fallback.className = 'item-icon'
    fallback.textContent = '🚀'
    img.parentElement.appendChild(fallback)
  }
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

/* Shop item badges */
.coming-soon-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 9px;
  font-weight: bold;
  margin: 10px 0;
  display: inline-block;
  text-transform: uppercase;
}

.item-duration {
  font-size: 10px;
  color: #4ECDC4;
  margin: 8px 0;
}

.item-permanent {
  font-size: 10px;
  color: #FFD700;
  margin: 8px 0;
  font-weight: bold;
}

.coin-bonus {
  display: block;
  font-size: 10px;
  color: #4ECDC4;
  margin-top: 4px;
}

.item-icon {
  font-size: 48px;
  margin-bottom: 15px;
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
}

/* Skin Images */
.item-icon-container {
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
}

.skin-image {
  width: 80px;
  height: 80px;
  object-fit: contain;
  filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.5));
  transition: transform 0.3s ease;
}

.shop-item:hover .skin-image {
  transform: scale(1.1) rotate(5deg);
}

.has-skin-image .item-icon-container {
  background: radial-gradient(circle, rgba(0, 255, 136, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  padding: 10px;
}

/* Rarity Badges */
.rarity-badge {
  font-size: 9px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  margin-bottom: 10px;
  display: inline-block;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.rarity-common {
  background: linear-gradient(135deg, #808080 0%, #606060 100%);
  color: white;
}

.rarity-uncommon {
  background: linear-gradient(135deg, #1eff00 0%, #0dd100 100%);
  color: black;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.rarity-rare {
  background: linear-gradient(135deg, #0080ff 0%, #0060cc 100%);
  color: white;
}

.rarity-epic {
  background: linear-gradient(135deg, #8000ff 0%, #6000cc 100%);
  color: white;
}

.rarity-legendary {
  background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%);
  color: black;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
  animation: glow-legendary 2s ease-in-out infinite;
}

@keyframes glow-legendary {
  0%, 100% {
    box-shadow: 0 2px 10px rgba(255, 215, 0, 0.5);
  }
  50% {
    box-shadow: 0 2px 20px rgba(255, 215, 0, 0.8);
  }
}

/* PIX Modal Styles */
.pix-modal {
  max-width: 500px;
  width: 90%;
}

.pix-description {
  color: #4ECDC4;
  font-size: 12px;
  margin-bottom: 20px;
}

.pix-loading {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-left-color: #00ff88;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.pix-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.qr-code-container {
  background: white;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
}

.qr-code-image {
  width: 250px;
  height: 250px;
  display: block;
}

.pix-code-section {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.pix-label {
  color: #4ECDC4;
  font-size: 10px;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.pix-code-box {
  display: flex;
  gap: 10px;
}

.pix-code-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(0, 255, 136, 0.5);
  border-radius: 6px;
  padding: 10px;
  color: white;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  word-break: break-all;
}

.copy-btn {
  background: #00ff88;
  color: black;
  border: none;
  border-radius: 6px;
  padding: 10px 15px;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.copy-btn:hover {
  background: #00cc6f;
  transform: translateY(-2px);
}

.pix-info {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.pix-price {
  color: #FFD700;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
}

.pix-expires {
  color: #FF6B6B;
  font-size: 11px;
}

.pix-status {
  font-size: 12px;
  margin-top: 10px;
  padding: 8px;
  border-radius: 6px;
  text-align: center;
}

.pix-status.pending {
  background: rgba(255, 215, 0, 0.1);
  color: #FFD700;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

/* Dev Section */
.dev-section {
  background: rgba(255, 165, 0, 0.1);
  border: 2px dashed rgba(255, 165, 0, 0.5);
  border-radius: 8px;
  padding: 15px;
  text-align: center;
}

.dev-label {
  color: #FFA500;
  font-size: 10px;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.modal-btn.simulate {
  background: #FFA500;
  color: #000;
  width: 100%;
  padding: 12px;
  font-size: 9px;
}

.modal-btn.simulate:hover {
  background: #FF8C00;
  transform: translateY(-2px);
}
</style>

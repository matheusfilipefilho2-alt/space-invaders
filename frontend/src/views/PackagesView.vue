<template>
  <div class="packages-view">
    <div class="container">
      <h1 class="retro-title">💰 Gold Packages - PIX Payment</h1>

      <!-- Gold Balance -->
      <div class="balance-card">
        <div class="balance-header">
          <span class="icon">🪙</span>
          <h3>Your Gold Balance</h3>
        </div>
        <div class="balance-body">
          <p class="balance-amount">{{ formatNumber(player?.gold_balance || 0) }}</p>
          <p class="balance-label">GOLD</p>
        </div>
      </div>

      <!-- Gold Packages -->
      <div class="packages-section">
        <h2>Available Packages</h2>

        <div v-if="shopStore.loading && packages.length === 0" class="loading">
          Loading packages...
        </div>

        <div v-else class="packages-grid">
          <div
            v-for="pkg in packages"
            :key="pkg.id"
            class="package-card"
            :class="{ recommended: pkg.bonus_percentage && pkg.bonus_percentage > 0 }"
          >
            <div v-if="pkg.bonusPercentage && pkg.bonusPercentage > 0" class="bonus-badge">
              +{{ pkg.bonusPercentage }}% BONUS
            </div>

            <div class="package-icon">🪙</div>
            <h3 class="package-name">{{ pkg.name }}</h3>
            <div class="package-gold">
              <span class="gold-amount">{{ formatNumber(pkg.goldAmount) }}</span>
              <span class="gold-label">GOLD</span>
            </div>
            <div class="package-price">{{ pkg.priceDisplay }}</div>

            <button
              @click="selectPackage(pkg)"
              :disabled="shopStore.loading"
              class="btn-buy"
            >
              Buy with PIX
            </button>
          </div>
        </div>
      </div>

      <!-- PIX Payment Modal -->
      <div v-if="showPixModal" class="modal-overlay" @click.self="closePixModal">
        <div class="modal-content pix-modal">
          <button class="modal-close" @click="closePixModal">×</button>

          <h2>PIX Payment</h2>

          <div v-if="currentOrder">
            <!-- Order Info -->
            <div class="order-info">
              <p><strong>Package:</strong> {{ selectedPackage?.name }}</p>
              <p><strong>Gold:</strong> {{ formatNumber(selectedPackage?.goldAmount || 0) }}</p>
              <p>
                <strong>Price:</strong> {{ selectedPackage?.priceDisplay || shopStore.formatPrice(currentOrder.amount) }}
              </p>
              <p v-if="!shopStore.isPixExpired(currentOrder.pix_expiration)">
                <strong>Time Remaining:</strong>
                <span class="time-remaining">
                  {{ timeRemaining }}
                </span>
              </p>
              <p v-else class="expired-text">PIX code expired. Please create a new order.</p>
            </div>

            <!-- PIX QR Code -->
            <div
              v-if="currentOrder.pix_qr_code && !shopStore.isPixExpired(currentOrder.pix_expiration)"
              class="qr-code-section"
            >
              <h3>Scan QR Code</h3>
              <img :src="currentOrder.pix_qr_code" alt="PIX QR Code" class="qr-code" />
            </div>

            <!-- PIX Copy-Paste Code -->
            <div
              v-if="currentOrder.pix_code && !shopStore.isPixExpired(currentOrder.pix_expiration)"
              class="pix-code-section"
            >
              <h3>Or Copy PIX Code</h3>
              <div class="pix-code-container">
                <input
                  v-model="currentOrder.pix_code"
                  readonly
                  class="pix-code-input"
                  @click="selectPixCode"
                />
                <button @click="copyPixCode" class="btn-copy">
                  {{ pixCodeCopied ? '✓ Copied!' : 'Copy' }}
                </button>
              </div>
            </div>

            <!-- Payment Status -->
            <div class="payment-status">
              <p v-if="currentOrder.status === 'pending'" class="status-pending">
                ⏳ Waiting for payment...
              </p>
              <p v-else-if="currentOrder.status === 'completed'" class="status-completed">
                ✓ Payment received! Gold credited to your account.
              </p>
              <p v-else-if="currentOrder.status === 'expired'" class="status-expired">
                ⌛ Payment expired. Please create a new order.
              </p>
            </div>

            <!-- Payment Instructions -->
            <div v-if="currentOrder.status === 'pending'" class="payment-instructions">
              <h3>Payment Instructions:</h3>
              <ol>
                <li>Open your bank app</li>
                <li>Go to PIX payment section</li>
                <li>Scan the QR code or paste the PIX code</li>
                <li>Confirm the payment</li>
                <li>Gold will be credited automatically</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <!-- Order History -->
      <div class="history-section">
        <h2>Purchase History</h2>

        <div v-if="shopStore.loading && orders.length === 0" class="loading">
          Loading order history...
        </div>

        <div v-else-if="orders.length === 0" class="empty-state">
          <p>No purchases yet. Buy your first Gold package!</p>
        </div>

        <div v-else class="history-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Package</th>
                <th>Gold</th>
                <th>Price</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orders" :key="order.id" :class="'status-' + order.status">
                <td>{{ formatDate(order.created_at) }}</td>
                <td>{{ getPackageName(order.package_id) }}</td>
                <td class="gold-amount">{{ formatNumber(order.gold_amount) }} 🪙</td>
                <td>{{ shopStore.formatPrice(order.amount) }}</td>
                <td>
                  <span class="status-badge" :class="order.status">
                    {{ order.status }}
                  </span>
                </td>
                <td>
                  <button
                    v-if="order.status === 'pending' && !shopStore.isPixExpired(order.pix_expiration)"
                    @click="viewOrder(order)"
                    class="btn-view"
                  >
                    View PIX
                  </button>
                  <span v-else-if="order.status === 'completed'" class="completed-text">
                    Completed ✓
                  </span>
                  <span v-else class="expired-text">Expired</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useShopStore } from '../stores/shop'
import type { ShopPackage, Order } from '../types'

// Stores
const authStore = useAuthStore()
const shopStore = useShopStore()

// Data
const showPixModal = ref(false)
const selectedPackage = ref<ShopPackage | null>(null)
const pixCodeCopied = ref(false)
const timeRemaining = ref('')
const pollingInterval = ref<number | null>(null)
const countdownInterval = ref<number | null>(null)

// Computed
const player = computed(() => authStore.user)
const packages = computed(() => shopStore.packages)
const orders = computed(() => shopStore.orders)
const currentOrder = computed(() => shopStore.currentOrder)

// Methods
function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatDate(dateString: string): string {
  if (!dateString) return '-'

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function getPackageName(packageId: string): string {
  const pkg = packages.value.find((p) => p.id === packageId)
  return pkg?.name || packageId
}

async function selectPackage(pkg: ShopPackage) {
  selectedPackage.value = pkg

  try {
    const order = await shopStore.createOrder(pkg.id)

    if (order) {
      showPixModal.value = true
      startPolling(order.id)
      startCountdown()
    }
  } catch (error: any) {
    alert(error.response?.data?.error || 'Failed to create order')
  }
}

function viewOrder(order: Order) {
  shopStore.currentOrder = order
  selectedPackage.value = packages.value.find((p) => p.id === order.package_id) || null
  showPixModal.value = true
  startPolling(order.id)
  startCountdown()
}

function closePixModal() {
  showPixModal.value = false
  selectedPackage.value = null
  pixCodeCopied.value = false
  stopPolling()
  stopCountdown()
}

function selectPixCode(event: Event) {
  const input = event.target as HTMLInputElement
  input.select()
}

async function copyPixCode() {
  if (currentOrder.value?.pix_code) {
    const success = await shopStore.copyPixCode(currentOrder.value.pix_code)
    if (success) {
      pixCodeCopied.value = true
      setTimeout(() => {
        pixCodeCopied.value = false
      }, 2000)
    }
  }
}

function startPolling(orderId: number) {
  stopPolling()

  // Poll every 5 seconds for up to 15 minutes
  pollingInterval.value = window.setInterval(async () => {
    const order = await shopStore.pollOrderStatus(orderId)

    if (order && order.status !== 'pending') {
      stopPolling()

      // Refresh player data to update Gold balance
      await authStore.fetchProfile()

      if (order.status === 'completed') {
        // Show success for 3 seconds then close modal
        setTimeout(() => {
          closePixModal()
          alert(`Payment received! ${order.gold_amount} Gold has been added to your account.`)
        }, 3000)
      }
    }
  }, 5000)
}

function stopPolling() {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

function startCountdown() {
  stopCountdown()

  const updateCountdown = () => {
    if (currentOrder.value?.pix_expiration) {
      timeRemaining.value = shopStore.getTimeRemaining(currentOrder.value.pix_expiration)

      if (shopStore.isPixExpired(currentOrder.value.pix_expiration)) {
        stopCountdown()
        stopPolling()
      }
    }
  }

  updateCountdown()
  countdownInterval.value = window.setInterval(updateCountdown, 1000)
}

function stopCountdown() {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
    countdownInterval.value = null
  }
}

// Lifecycle
onMounted(async () => {
  // Fetch player profile
  if (!player.value) {
    await authStore.fetchProfile()
  }

  // Fetch packages
  await shopStore.fetchPackages()

  // Fetch order history
  await shopStore.fetchOrders(20)
})

onUnmounted(() => {
  stopPolling()
  stopCountdown()
})
</script>

<style scoped>
.packages-view {
  min-height: 100vh;
  background: #000;
  color: #0f0;
  font-family: 'Press Start 2P', monospace;
  padding: 2rem 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.retro-title {
  font-size: 2rem;
  text-align: center;
  margin-bottom: 2rem;
  text-shadow: 0 0 10px #0f0, 0 0 20px #0f0;
}

/* Balance Card */
.balance-card {
  background: #111;
  border: 3px solid #ffd700;
  padding: 1.5rem;
  margin-bottom: 3rem;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.balance-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.balance-header .icon {
  font-size: 1.5rem;
}

.balance-header h3 {
  font-size: 0.875rem;
  color: #ffd700;
  margin: 0;
}

.balance-body {
  text-align: center;
}

.balance-amount {
  font-size: 2rem;
  color: #ffd700;
  margin: 0.5rem 0;
  text-shadow: 0 0 10px #ffd700;
}

.balance-label {
  font-size: 0.75rem;
  color: #888;
  margin: 0;
}

/* Packages Section */
.packages-section {
  margin-bottom: 3rem;
}

.packages-section h2 {
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.packages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.package-card {
  position: relative;
  background: #111;
  border: 3px solid #0f0;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
  transition: all 0.3s;
}

.package-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 0 30px rgba(0, 255, 0, 0.5);
}

.package-card.recommended {
  border-color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.bonus-badge {
  position: absolute;
  top: -10px;
  right: -10px;
  background: #f00;
  color: #fff;
  padding: 0.5rem;
  font-size: 0.625rem;
  transform: rotate(15deg);
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
}

.package-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.package-name {
  font-size: 1rem;
  margin-bottom: 1rem;
}

.package-gold {
  margin: 1.5rem 0;
}

.gold-amount {
  font-size: 2rem;
  color: #ffd700;
  display: block;
  text-shadow: 0 0 10px #ffd700;
}

.gold-label {
  font-size: 0.75rem;
  color: #888;
  display: block;
  margin-top: 0.5rem;
}

.package-price {
  font-size: 1.25rem;
  color: #0f0;
  margin-bottom: 1.5rem;
}

.btn-buy {
  width: 100%;
  padding: 1rem;
  background: #0f0;
  color: #000;
  border: none;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-buy:hover:not(:disabled) {
  background: #00ff00;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
}

.btn-buy:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: #111;
  border: 3px solid #0f0;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 0 30px rgba(0, 255, 0, 0.5);
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: #f00;
  font-size: 2rem;
  cursor: pointer;
  line-height: 1;
}

.modal-content h2 {
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.modal-content h3 {
  font-size: 0.875rem;
  margin: 1.5rem 0 0.75rem;
}

/* Order Info */
.order-info {
  background: #000;
  border: 2px solid #0f0;
  padding: 1rem;
  margin-bottom: 1.5rem;
  font-size: 0.75rem;
}

.order-info p {
  margin: 0.5rem 0;
}

.time-remaining {
  color: #ff0;
  font-weight: bold;
}

/* QR Code */
.qr-code-section {
  text-align: center;
  margin-bottom: 1.5rem;
}

.qr-code {
  max-width: 300px;
  width: 100%;
  border: 3px solid #0f0;
  margin-top: 1rem;
}

/* PIX Code */
.pix-code-section {
  margin-bottom: 1.5rem;
}

.pix-code-container {
  display: flex;
  gap: 0.5rem;
}

.pix-code-input {
  flex: 1;
  padding: 0.75rem;
  background: #000;
  border: 2px solid #0f0;
  color: #0f0;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
}

.btn-copy {
  padding: 0.75rem 1.5rem;
  background: #0f0;
  color: #000;
  border: none;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.625rem;
  cursor: pointer;
}

.btn-copy:hover {
  background: #00ff00;
}

/* Payment Status */
.payment-status {
  text-align: center;
  padding: 1rem;
  margin: 1.5rem 0;
  border: 2px solid;
  font-size: 0.875rem;
}

.status-pending {
  border-color: #ff0;
  color: #ff0;
  background: rgba(255, 255, 0, 0.1);
}

.status-completed {
  border-color: #0f0;
  color: #0f0;
  background: rgba(0, 255, 0, 0.1);
}

.status-expired {
  border-color: #f00;
  color: #f00;
  background: rgba(255, 0, 0, 0.1);
}

/* Payment Instructions */
.payment-instructions {
  font-size: 0.75rem;
}

.payment-instructions ol {
  padding-left: 1.5rem;
}

.payment-instructions li {
  margin: 0.5rem 0;
}

/* History Section */
.history-section {
  margin-top: 3rem;
}

.history-section h2 {
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
}

.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 0.75rem;
}

.history-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: #111;
  border: 3px solid #0f0;
}

th {
  background: #0f0;
  color: #000;
  padding: 1rem;
  font-size: 0.75rem;
  text-align: left;
}

td {
  padding: 1rem;
  border-bottom: 1px solid #333;
  font-size: 0.75rem;
}

tr:last-child td {
  border-bottom: none;
}

tr.status-pending {
  background: rgba(255, 255, 0, 0.1);
}

tr.status-completed {
  background: rgba(0, 255, 0, 0.1);
}

tr.status-expired {
  background: rgba(255, 0, 0, 0.1);
}

.gold-amount {
  color: #ffd700;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.625rem;
  text-transform: uppercase;
}

.status-badge.pending {
  background: #ff0;
  color: #000;
}

.status-badge.completed {
  background: #0f0;
  color: #000;
}

.status-badge.expired,
.status-badge.cancelled {
  background: #f00;
  color: #fff;
}

.btn-view {
  padding: 0.5rem 1rem;
  background: #0f0;
  color: #000;
  border: none;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.625rem;
  cursor: pointer;
}

.btn-view:hover {
  background: #00ff00;
}

.completed-text {
  color: #0f0;
}

.expired-text {
  color: #f00;
}

/* Responsive */
@media (max-width: 768px) {
  .retro-title {
    font-size: 1.25rem;
  }

  .packages-grid {
    grid-template-columns: 1fr;
  }

  table {
    font-size: 0.625rem;
  }

  th,
  td {
    padding: 0.5rem;
  }
}
</style>

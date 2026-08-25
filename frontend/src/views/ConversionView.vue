<template>
  <div class="conversion-view">
    <div class="container">
      <h1 class="retro-title">Gold → SPACE Conversion</h1>

      <!-- Balance Cards -->
      <div class="balance-section">
        <div class="balance-card gold-card">
          <div class="card-header">
            <span class="icon">🪙</span>
            <h3>Gold Balance</h3>
          </div>
          <div class="card-body">
            <p class="balance-amount">{{ formatNumber(player?.gold_balance || 0) }}</p>
            <p class="balance-label">GOLD</p>
          </div>
        </div>

        <div class="balance-card space-card">
          <div class="card-header">
            <span class="icon">⭐</span>
            <h3>SPACE Balance</h3>
          </div>
          <div class="card-body">
            <p class="balance-amount">
              {{ formatNumber(conversionStore.lamportsToSpace(player?.space_balance || 0), 4) }}
            </p>
            <p class="balance-label">SPACE</p>
            <p class="balance-sub">
              {{ formatNumber(player?.space_balance || 0) }} lamports
            </p>
          </div>
        </div>
      </div>

      <!-- Conversion Form -->
      <div class="conversion-form-section">
        <div class="form-card">
          <h2>Convert Gold to SPACE</h2>
          <p class="conversion-rate">
            Exchange Rate: {{ conversionStore.CONVERSION_RATIO }} Gold = 1 SPACE
          </p>

          <form @submit.prevent="handleConvert">
            <div class="form-group">
              <label for="gold-amount">Gold Amount</label>
              <input
                id="gold-amount"
                v-model.number="goldAmount"
                type="number"
                :min="conversionStore.MIN_CONVERSION"
                :step="conversionStore.CONVERSION_RATIO"
                placeholder="Enter amount (multiples of 100)"
                :disabled="conversionStore.loading"
                @input="updatePreview"
              />
              <p class="input-hint">
                Minimum: {{ conversionStore.MIN_CONVERSION }} Gold (must be multiples of
                {{ conversionStore.CONVERSION_RATIO }})
              </p>
            </div>

            <!-- Conversion Preview -->
            <div v-if="preview" class="conversion-preview">
              <div class="preview-row">
                <span>You will send:</span>
                <span class="preview-value gold">{{ formatNumber(preview.goldAmount) }} Gold</span>
              </div>
              <div class="preview-arrow">↓</div>
              <div class="preview-row">
                <span>You will receive:</span>
                <span class="preview-value space"
                  >{{ formatNumber(preview.spaceTokens, 4) }} SPACE</span
                >
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="validationError" class="error-message">
              {{ validationError }}
            </div>

            <!-- Success Message -->
            <div v-if="successMessage" class="success-message">
              {{ successMessage }}
            </div>

            <button type="submit" class="btn-primary" :disabled="conversionStore.loading || !canConvert">
              <span v-if="conversionStore.loading">Converting...</span>
              <span v-else>Convert to SPACE</span>
            </button>
          </form>
        </div>
      </div>

      <!-- Conversion History -->
      <div class="history-section">
        <h2>Conversion History</h2>

        <div v-if="conversionStore.loading && conversions.length === 0" class="loading">
          Loading conversion history...
        </div>

        <div v-else-if="conversions.length === 0" class="empty-state">
          <p>No conversions yet. Convert your Gold to SPACE to get started!</p>
        </div>

        <div v-else class="history-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Gold</th>
                <th>SPACE</th>
                <th>Status</th>
                <th>Transaction</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="conversion in conversions" :key="conversion.id" :class="'status-' + conversion.status">
                <td>{{ formatDate(conversion.created_at) }}</td>
                <td class="gold-amount">{{ formatNumber(conversion.gold_amount) }} 🪙</td>
                <td class="space-amount">
                  {{ formatNumber(conversionStore.lamportsToSpace(conversion.space_amount), 4) }} ⭐
                </td>
                <td>
                  <span class="status-badge" :class="conversion.status">
                    {{ conversion.status }}
                  </span>
                </td>
                <td>
                  <a
                    v-if="conversion.tx_hash && conversion.status === 'completed'"
                    :href="`https://explorer.solana.com/tx/${conversion.tx_hash}?cluster=devnet`"
                    target="_blank"
                    class="tx-link"
                  >
                    View on Explorer →
                  </a>
                  <span v-else-if="conversion.status === 'pending'" class="pending-text">
                    Processing...
                  </span>
                  <span v-else class="error-text">{{ conversion.error_msg || 'Failed' }}</span>
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
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useConversionStore } from '../stores/conversion'

// Stores
const authStore = useAuthStore()
const conversionStore = useConversionStore()

// Data
const goldAmount = ref<number>(100)
const validationError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const preview = ref<{ goldAmount: number; spaceAmount: number; spaceTokens: number } | null>(null)

// Computed
const player = computed(() => authStore.user)
const conversions = computed(() => conversionStore.conversions)

const canConvert = computed(() => {
  if (!goldAmount.value || goldAmount.value < conversionStore.MIN_CONVERSION) {
    return false
  }
  if (!player.value) {
    return false
  }
  return goldAmount.value <= player.value.gold_balance
})

// Methods
function updatePreview() {
  validationError.value = null
  successMessage.value = null

  if (!goldAmount.value || goldAmount.value < conversionStore.MIN_CONVERSION) {
    preview.value = null
    return
  }

  preview.value = conversionStore.calculateConversionPreview(goldAmount.value)
}

async function handleConvert() {
  if (!player.value) {
    validationError.value = 'Please log in to convert'
    return
  }

  // Validate
  const validation = conversionStore.validateConversion(goldAmount.value, player.value.gold_balance)
  if (!validation.valid) {
    validationError.value = validation.error || 'Invalid conversion amount'
    return
  }

  try {
    validationError.value = null
    successMessage.value = null

    const conversion = await conversionStore.convertGoldToSpace(goldAmount.value)

    if (conversion) {
      successMessage.value = `Successfully converted ${goldAmount.value} Gold to ${conversionStore.goldToSpace(goldAmount.value)} SPACE! Transaction is being processed on-chain.`

      // Refresh player data to update balances
      await authStore.fetchProfile()

      // Reset form
      goldAmount.value = conversionStore.MIN_CONVERSION
      preview.value = null

      // Poll for status updates (pending conversions)
      if (conversion.status === 'pending') {
        pollConversionStatus(conversion.id)
      }
    }
  } catch (error: any) {
    validationError.value = error.response?.data?.error || 'Failed to convert Gold to SPACE'
  }
}

async function pollConversionStatus(conversionId: number) {
  // Poll every 5 seconds for up to 2 minutes
  const maxAttempts = 24
  let attempts = 0

  const interval = setInterval(async () => {
    attempts++

    const conversion = await conversionStore.pollConversionStatus(conversionId)

    if (conversion && conversion.status !== 'pending') {
      clearInterval(interval)

      // Refresh player data to update SPACE balance
      await authStore.fetchProfile()

      if (conversion.status === 'completed') {
        successMessage.value = `Conversion completed! ${conversionStore.goldToSpace(conversion.gold_amount)} SPACE has been added to your wallet.`
      } else if (conversion.status === 'failed') {
        validationError.value = `Conversion failed: ${conversion.error_msg || 'Unknown error'}`
      }
    }

    if (attempts >= maxAttempts) {
      clearInterval(interval)
    }
  }, 5000)
}

function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Lifecycle
onMounted(async () => {
  // Fetch player profile to get balances
  if (!player.value) {
    await authStore.fetchProfile()
  }

  // Fetch conversion history
  await conversionStore.fetchConversionHistory(20)

  // Initialize preview
  updatePreview()
})
</script>

<style scoped>
.conversion-view {
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

/* Balance Section */
.balance-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.balance-card {
  background: #111;
  border: 3px solid #0f0;
  padding: 1.5rem;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
}

.gold-card {
  border-color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

.gold-card .card-header h3,
.gold-card .balance-amount {
  color: #ffd700;
  text-shadow: 0 0 10px #ffd700;
}

.space-card {
  border-color: #00ffff;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
}

.space-card .card-header h3,
.space-card .balance-amount {
  color: #00ffff;
  text-shadow: 0 0 10px #00ffff;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.card-header .icon {
  font-size: 1.5rem;
}

.card-header h3 {
  font-size: 0.875rem;
  margin: 0;
}

.card-body {
  text-align: center;
}

.balance-amount {
  font-size: 2rem;
  margin: 0.5rem 0;
}

.balance-label {
  font-size: 0.75rem;
  color: #888;
  margin: 0;
}

.balance-sub {
  font-size: 0.625rem;
  color: #666;
  margin-top: 0.5rem;
}

/* Form Section */
.conversion-form-section {
  margin-bottom: 3rem;
}

.form-card {
  background: #111;
  border: 3px solid #0f0;
  padding: 2rem;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
}

.form-card h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.conversion-rate {
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
  color: #0f0;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  background: #000;
  border: 2px solid #0f0;
  color: #0f0;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.875rem;
}

.form-group input:focus {
  outline: none;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
}

.form-group input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-hint {
  font-size: 0.625rem;
  color: #666;
  margin-top: 0.5rem;
}

/* Conversion Preview */
.conversion-preview {
  background: #000;
  border: 2px solid #0f0;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
}

.preview-value {
  font-size: 1rem;
  font-weight: bold;
}

.preview-value.gold {
  color: #ffd700;
}

.preview-value.space {
  color: #00ffff;
}

.preview-arrow {
  text-align: center;
  font-size: 1.5rem;
  color: #0f0;
  margin: 0.5rem 0;
}

/* Messages */
.error-message {
  background: rgba(255, 0, 0, 0.2);
  border: 2px solid #f00;
  color: #f00;
  padding: 1rem;
  font-size: 0.75rem;
  margin-bottom: 1rem;
}

.success-message {
  background: rgba(0, 255, 0, 0.2);
  border: 2px solid #0f0;
  color: #0f0;
  padding: 1rem;
  font-size: 0.75rem;
  margin-bottom: 1rem;
}

/* Button */
.btn-primary {
  width: 100%;
  padding: 1rem;
  background: #0f0;
  color: #000;
  border: none;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover:not(:disabled) {
  background: #00ff00;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* History Section */
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

tr.status-failed {
  background: rgba(255, 0, 0, 0.1);
}

.gold-amount {
  color: #ffd700;
}

.space-amount {
  color: #00ffff;
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

.status-badge.failed {
  background: #f00;
  color: #fff;
}

.tx-link {
  color: #00ffff;
  text-decoration: none;
}

.tx-link:hover {
  text-decoration: underline;
}

.pending-text {
  color: #ff0;
}

.error-text {
  color: #f00;
  font-size: 0.625rem;
}

/* Responsive */
@media (max-width: 768px) {
  .retro-title {
    font-size: 1.25rem;
  }

  .balance-section {
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

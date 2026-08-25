<template>
  <div class="wallet-view">
    <div class="container">
      <h1 class="retro-title">👛 Solana Wallet</h1>

      <!-- Wallet Connection -->
      <div class="wallet-section">
        <div class="wallet-card">
          <h2>Connect Your Phantom Wallet</h2>
          <p class="wallet-description">
            Connect your Solana wallet to receive SPACE tokens from Gold conversions.
          </p>

          <!-- Wallet Status -->
          <div v-if="!isConnected" class="wallet-status disconnected">
            <div class="status-icon">🔌</div>
            <p>Wallet Not Connected</p>
            <button
              @click="handleConnect"
              :disabled="connecting"
              class="btn-connect"
            >
              {{ connecting ? 'Connecting...' : 'Connect Phantom Wallet' }}
            </button>

            <div class="install-note">
              <p>Don't have Phantom?</p>
              <a href="https://phantom.app/" target="_blank" class="btn-install">
                Install Phantom Extension
              </a>
            </div>
          </div>

          <div v-else class="wallet-status connected">
            <div class="status-icon">✅</div>
            <p>Wallet Connected</p>

            <div class="wallet-details">
              <div class="detail-row">
                <span class="detail-label">Address:</span>
                <span class="detail-value">{{ walletAddress }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Short Address:</span>
                <span class="detail-value">{{ shortAddress }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">SOL Balance:</span>
                <span class="detail-value">{{ formatBalance(balance) }} SOL</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Network:</span>
                <span class="detail-value">Solana Devnet</span>
              </div>
            </div>

            <div class="wallet-actions">
              <button @click="handleRefreshBalance" class="btn-refresh">
                Refresh Balance
              </button>
              <button @click="handleDisconnect" class="btn-disconnect">
                Disconnect
              </button>
            </div>
          </div>

          <!-- Error Display -->
          <div v-if="error" class="error-message">
            <p>{{ error }}</p>
            <button @click="clearError" class="btn-close">×</button>
          </div>
        </div>
      </div>

      <!-- Integration Info -->
      <div class="info-section">
        <h2>How It Works</h2>

        <div class="info-grid">
          <div class="info-card">
            <div class="info-icon">🎮</div>
            <h3>1. Play & Earn Gold</h3>
            <p>Play Space Invaders to earn Gold coins in-game.</p>
          </div>

          <div class="info-card">
            <div class="info-icon">💱</div>
            <h3>2. Convert to SPACE</h3>
            <p>Exchange your Gold for SPACE tokens (100 Gold = 1 SPACE).</p>
          </div>

          <div class="info-card">
            <div class="info-icon">👛</div>
            <h3>3. Receive Tokens</h3>
            <p>SPACE tokens are minted directly to your connected Solana wallet.</p>
          </div>

          <div class="info-card">
            <div class="info-icon">🚀</div>
            <h3>4. Use On-Chain</h3>
            <p>Trade, stake, or use your SPACE tokens in the Solana ecosystem.</p>
          </div>
        </div>
      </div>

      <!-- Player Integration -->
      <div v-if="player" class="player-section">
        <h2>Your Account</h2>

        <div class="player-card">
          <div class="player-info">
            <p><strong>Username:</strong> {{ player.username }}</p>
            <p><strong>Gold Balance:</strong> {{ formatNumber(player.gold_balance) }} 🪙</p>
            <p>
              <strong>SPACE Balance:</strong>
              {{ formatNumber(lamportsToSpace(player.space_balance), 4) }} ⭐
            </p>
            <p v-if="player.solana_wallet">
              <strong>Linked Wallet:</strong> {{ shortenWallet(player.solana_wallet) }}
            </p>
            <p v-else class="warning-text">
              ⚠️ No wallet linked. Connect your wallet to receive SPACE tokens.
            </p>
          </div>

          <div v-if="isConnected && !player.solana_wallet" class="link-wallet-section">
            <p>Link your Phantom wallet to your account to receive SPACE tokens:</p>
            <button @click="handleLinkWallet" class="btn-link">
              Link Wallet to Account
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Links -->
      <div class="quick-links">
        <h2>Quick Links</h2>
        <div class="links-grid">
          <router-link to="/conversion" class="link-card">
            <span class="link-icon">💱</span>
            <span class="link-text">Convert Gold → SPACE</span>
          </router-link>
          <router-link to="/packages" class="link-card">
            <span class="link-icon">🛍️</span>
            <span class="link-text">Buy Gold Packages</span>
          </router-link>
          <router-link to="/profile" class="link-card">
            <span class="link-icon">👤</span>
            <span class="link-text">View Profile</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWallet } from '../composables/useWallet'
import { useAuthStore } from '../stores/auth'

// Composables & Stores
const wallet = useWallet()
const authStore = useAuthStore()

// Destructure wallet
const {
  isConnected,
  connecting,
  error,
  balance,
  walletAddress,
  shortAddress,
  connect,
  disconnect,
  fetchBalance,
  isPhantomInstalled,
  formatBalance,
  clearError
} = wallet

// Computed
const player = computed(() => authStore.user)

// Methods
function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

function lamportsToSpace(lamports: number): number {
  return lamports / 1_000_000_000
}

function shortenWallet(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 8)}...${address.slice(-8)}`
}

async function handleConnect() {
  if (!isPhantomInstalled()) {
    alert('Phantom wallet not detected. Please install the Phantom browser extension.')
    return
  }

  await connect()
}

async function handleDisconnect() {
  if (confirm('Disconnect your Phantom wallet?')) {
    await disconnect()
  }
}

async function handleRefreshBalance() {
  await fetchBalance()
}

async function handleLinkWallet() {
  if (!walletAddress.value) {
    alert('Please connect your wallet first.')
    return
  }

  // In a real implementation, you would:
  // 1. Sign a message to prove wallet ownership
  // 2. Send the signature to the backend
  // 3. Backend verifies and links the wallet to the player account

  const confirmed = confirm(
    `Link wallet ${shortAddress.value} to your account?\n\nThis will allow you to receive SPACE tokens from conversions.`
  )

  if (confirmed) {
    // Placeholder: In production, call API to link wallet
    alert('Wallet linking is not yet implemented in this demo.')
  }
}
</script>

<style scoped>
.wallet-view {
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

/* Wallet Section */
.wallet-section {
  margin-bottom: 3rem;
}

.wallet-card {
  background: #111;
  border: 3px solid #0f0;
  padding: 2rem;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
}

.wallet-card h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.wallet-description {
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 2rem;
  line-height: 1.6;
}

/* Wallet Status */
.wallet-status {
  text-align: center;
  padding: 2rem;
  border: 2px solid;
  margin-bottom: 1rem;
}

.wallet-status.disconnected {
  border-color: #f00;
  background: rgba(255, 0, 0, 0.1);
}

.wallet-status.connected {
  border-color: #0f0;
  background: rgba(0, 255, 0, 0.1);
}

.status-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.wallet-status p {
  font-size: 1rem;
  margin-bottom: 1.5rem;
}

/* Buttons */
.btn-connect,
.btn-disconnect,
.btn-refresh,
.btn-link {
  padding: 1rem 2rem;
  background: #0f0;
  color: #000;
  border: none;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s;
  margin: 0.5rem;
}

.btn-connect:hover,
.btn-refresh:hover,
.btn-link:hover {
  background: #00ff00;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
}

.btn-connect:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-disconnect {
  background: #f00;
  color: #fff;
}

.btn-disconnect:hover {
  background: #ff0000;
  box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
}

.install-note {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #333;
}

.install-note p {
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 1rem;
}

.btn-install {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: #111;
  color: #0f0;
  border: 2px solid #0f0;
  text-decoration: none;
  font-size: 0.625rem;
  transition: all 0.3s;
}

.btn-install:hover {
  background: #0f0;
  color: #000;
}

/* Wallet Details */
.wallet-details {
  margin: 2rem 0;
  text-align: left;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  border-bottom: 1px solid #333;
  font-size: 0.75rem;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  color: #888;
}

.detail-value {
  color: #0f0;
  word-break: break-all;
}

.wallet-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* Error Message */
.error-message {
  background: rgba(255, 0, 0, 0.2);
  border: 2px solid #f00;
  color: #f00;
  padding: 1rem;
  font-size: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-message p {
  margin: 0;
  flex: 1;
}

.btn-close {
  background: none;
  border: none;
  color: #f00;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}

/* Info Section */
.info-section {
  margin-bottom: 3rem;
}

.info-section h2 {
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.info-card {
  background: #111;
  border: 2px solid #0f0;
  padding: 1.5rem;
  text-align: center;
}

.info-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.info-card h3 {
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.info-card p {
  font-size: 0.625rem;
  color: #888;
  line-height: 1.6;
}

/* Player Section */
.player-section {
  margin-bottom: 3rem;
}

.player-section h2 {
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
}

.player-card {
  background: #111;
  border: 3px solid #0f0;
  padding: 2rem;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
}

.player-info {
  font-size: 0.75rem;
  margin-bottom: 2rem;
}

.player-info p {
  margin: 0.75rem 0;
}

.warning-text {
  color: #ff0;
}

.link-wallet-section {
  border-top: 2px solid #333;
  padding-top: 1.5rem;
  text-align: center;
}

.link-wallet-section p {
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 1rem;
  line-height: 1.6;
}

/* Quick Links */
.quick-links {
  margin-bottom: 3rem;
}

.quick-links h2 {
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.link-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: #111;
  border: 2px solid #0f0;
  text-decoration: none;
  color: #0f0;
  transition: all 0.3s;
}

.link-card:hover {
  background: rgba(0, 255, 0, 0.1);
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
  transform: translateY(-5px);
}

.link-icon {
  font-size: 2rem;
}

.link-text {
  font-size: 0.75rem;
  text-align: center;
}

/* Responsive */
@media (max-width: 768px) {
  .retro-title {
    font-size: 1.25rem;
  }

  .info-grid,
  .links-grid {
    grid-template-columns: 1fr;
  }

  .wallet-actions {
    flex-direction: column;
  }

  .btn-connect,
  .btn-disconnect,
  .btn-refresh,
  .btn-link {
    width: 100%;
  }
}
</style>

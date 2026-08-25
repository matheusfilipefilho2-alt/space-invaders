<template>
  <div class="wallet-button-container">
    <!-- Not Connected -->
    <button
      v-if="!isConnected"
      @click="handleConnect"
      :disabled="connecting"
      class="wallet-btn wallet-btn-connect"
    >
      <span class="wallet-icon">👛</span>
      <span class="wallet-text">
        {{ connecting ? 'Connecting...' : 'Connect Wallet' }}
      </span>
    </button>

    <!-- Connected -->
    <div v-else class="wallet-connected">
      <div class="wallet-info">
        <span class="wallet-icon">👛</span>
        <span class="wallet-address">{{ shortAddress }}</span>
        <span v-if="balance > 0" class="wallet-balance">
          {{ formatBalance(balance) }} SOL
        </span>
      </div>
      <button @click="handleDisconnect" class="wallet-btn-disconnect" title="Disconnect">
        ✕
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="wallet-error">
      <p>{{ error }}</p>
      <button @click="clearError" class="btn-close-error">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWallet } from '../composables/useWallet'

const {
  isConnected,
  connecting,
  error,
  balance,
  shortAddress,
  connect,
  disconnect,
  isPhantomInstalled,
  formatBalance,
  clearError
} = useWallet()

async function handleConnect() {
  if (!isPhantomInstalled()) {
    alert('Phantom wallet not detected. Please install the Phantom browser extension.')
    return
  }

  await connect()
}

async function handleDisconnect() {
  if (confirm('Disconnect wallet?')) {
    await disconnect()
  }
}
</script>

<style scoped>
.wallet-button-container {
  position: relative;
}

/* Connect Button */
.wallet-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #0f0;
  color: #000;
  border: 2px solid #0f0;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
}

.wallet-btn:hover:not(:disabled) {
  background: #00ff00;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
  transform: translateY(-2px);
}

.wallet-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wallet-icon {
  font-size: 1.25rem;
}

.wallet-text {
  font-size: 0.75rem;
}

/* Connected State */
.wallet-connected {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #111;
  border: 2px solid #0f0;
  padding: 0.75rem;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
}

.wallet-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #0f0;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.75rem;
}

.wallet-address {
  color: #0f0;
}

.wallet-balance {
  color: #ffd700;
  font-size: 0.625rem;
}

.wallet-btn-disconnect {
  padding: 0.5rem;
  background: #f00;
  color: #fff;
  border: none;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s;
  line-height: 1;
}

.wallet-btn-disconnect:hover {
  background: #ff0000;
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
}

/* Error Message */
.wallet-error {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: rgba(255, 0, 0, 0.2);
  border: 2px solid #f00;
  color: #f00;
  padding: 0.75rem;
  font-size: 0.625rem;
  max-width: 300px;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.wallet-error p {
  margin: 0;
  flex: 1;
}

.btn-close-error {
  background: none;
  border: none;
  color: #f00;
  font-size: 1rem;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .wallet-btn,
  .wallet-info {
    font-size: 0.625rem;
  }

  .wallet-icon {
    font-size: 1rem;
  }

  .wallet-balance {
    display: none;
  }
}
</style>

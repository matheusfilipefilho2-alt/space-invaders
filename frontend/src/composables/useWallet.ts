import { onMounted, onUnmounted } from 'vue'
import { useWalletStore } from '../stores/wallet'
import { storeToRefs } from 'pinia'

/**
 * Composable for Phantom wallet integration
 * Provides easy access to wallet functionality in components
 */
export function useWallet() {
  const walletStore = useWalletStore()

  // Reactive refs from store
  const {
    walletAddress,
    connected,
    connecting,
    error,
    balance,
    isConnected,
    shortAddress
  } = storeToRefs(walletStore)

  // Actions
  const {
    connect,
    disconnect,
    fetchBalance,
    signMessage,
    autoConnect,
    isPhantomInstalled,
    formatBalance,
    clearError
  } = walletStore

  // Auto-connect on mount if previously connected
  onMounted(async () => {
    await autoConnect()
  })

  // Cleanup on unmount
  onUnmounted(() => {
    // No cleanup needed for now
    // Event listeners are managed by the store
  })

  return {
    // State
    walletAddress,
    connected,
    connecting,
    error,
    balance,
    isConnected,
    shortAddress,

    // Actions
    connect,
    disconnect,
    fetchBalance,
    signMessage,
    isPhantomInstalled,
    formatBalance,
    clearError
  }
}

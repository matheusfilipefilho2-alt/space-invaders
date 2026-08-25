import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Phantom wallet interface
interface PhantomProvider {
  isPhantom?: boolean
  publicKey?: { toString(): string }
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>
  disconnect(): Promise<void>
  signMessage?(message: Uint8Array): Promise<{ signature: Uint8Array }>
  on(event: string, callback: (...args: any[]) => void): void
  removeListener(event: string, callback: (...args: any[]) => void): void
}

declare global {
  interface Window {
    solana?: PhantomProvider
    phantom?: {
      solana?: PhantomProvider
    }
  }
}

export const useWalletStore = defineStore('wallet', () => {
  // State
  const walletAddress = ref<string | null>(null)
  const connected = ref(false)
  const connecting = ref(false)
  const error = ref<string | null>(null)
  const balance = ref<number>(0) // SOL balance in lamports

  // Computed
  const isConnected = computed(() => connected.value && !!walletAddress.value)

  const shortAddress = computed(() => {
    if (!walletAddress.value) return ''
    return `${walletAddress.value.slice(0, 4)}...${walletAddress.value.slice(-4)}`
  })

  // Get Phantom provider
  function getProvider(): PhantomProvider | null {
    if (typeof window !== 'undefined') {
      if (window.phantom?.solana?.isPhantom) {
        return window.phantom.solana
      }
      if (window.solana?.isPhantom) {
        return window.solana
      }
    }
    return null
  }

  // Check if Phantom is installed
  function isPhantomInstalled(): boolean {
    return !!getProvider()
  }

  // Connect wallet
  async function connect(): Promise<boolean> {
    connecting.value = true
    error.value = null

    try {
      const provider = getProvider()

      if (!provider) {
        error.value = 'Phantom wallet not found. Please install Phantom extension.'
        window.open('https://phantom.app/', '_blank')
        return false
      }

      const response = await provider.connect()
      walletAddress.value = response.publicKey.toString()
      connected.value = true

      // Set up event listeners
      provider.on('disconnect', handleDisconnect)
      provider.on('accountChanged', handleAccountChanged)

      // Fetch balance
      await fetchBalance()

      return true
    } catch (err: any) {
      if (err.code === 4001) {
        error.value = 'Connection rejected by user'
      } else {
        error.value = err.message || 'Failed to connect wallet'
      }
      console.error('Wallet connection error:', err)
      return false
    } finally {
      connecting.value = false
    }
  }

  // Disconnect wallet
  async function disconnect(): Promise<void> {
    try {
      const provider = getProvider()
      if (provider) {
        await provider.disconnect()
      }
    } catch (err) {
      console.error('Disconnect error:', err)
    } finally {
      handleDisconnect()
    }
  }

  // Handle disconnect event
  function handleDisconnect() {
    walletAddress.value = null
    connected.value = false
    balance.value = 0
    error.value = null
  }

  // Handle account changed event
  function handleAccountChanged(publicKey: any) {
    if (publicKey) {
      walletAddress.value = publicKey.toString()
      fetchBalance()
    } else {
      handleDisconnect()
    }
  }

  // Fetch SOL balance
  async function fetchBalance(): Promise<void> {
    if (!walletAddress.value) return

    try {
      // In a real implementation, you would query the Solana RPC
      // For now, this is a placeholder
      // const connection = new Connection(RPC_URL)
      // const publicKey = new PublicKey(walletAddress.value)
      // const balanceInLamports = await connection.getBalance(publicKey)
      // balance.value = balanceInLamports

      // Placeholder: set to 0
      balance.value = 0
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    }
  }

  // Sign message (for authentication)
  async function signMessage(message: string): Promise<string | null> {
    try {
      const provider = getProvider()
      if (!provider || !provider.signMessage) {
        throw new Error('Wallet does not support message signing')
      }

      const encodedMessage = new TextEncoder().encode(message)
      const signedMessage = await provider.signMessage(encodedMessage)

      // Convert signature to base64
      return btoa(String.fromCharCode(...signedMessage.signature))
    } catch (err: any) {
      error.value = err.message || 'Failed to sign message'
      console.error('Sign message error:', err)
      return null
    }
  }

  // Format balance (lamports to SOL)
  function formatBalance(lamports: number): string {
    const sol = lamports / 1_000_000_000
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(sol)
  }

  // Auto-connect if previously connected
  async function autoConnect(): Promise<void> {
    const provider = getProvider()
    if (!provider) return

    try {
      // Check if wallet was previously connected
      const response = await provider.connect({ onlyIfTrusted: true })
      if (response.publicKey) {
        walletAddress.value = response.publicKey.toString()
        connected.value = true

        // Set up event listeners
        provider.on('disconnect', handleDisconnect)
        provider.on('accountChanged', handleAccountChanged)

        // Fetch balance
        await fetchBalance()
      }
    } catch (err) {
      // User hasn't granted permission yet
      console.log('Auto-connect skipped:', err)
    }
  }

  // Clear error
  function clearError() {
    error.value = null
  }

  // Reset store
  function $reset() {
    walletAddress.value = null
    connected.value = false
    connecting.value = false
    error.value = null
    balance.value = 0
  }

  return {
    // State
    walletAddress,
    connected,
    connecting,
    error,
    balance,

    // Computed
    isConnected,
    shortAddress,

    // Actions
    connect,
    disconnect,
    fetchBalance,
    signMessage,
    autoConnect,
    isPhantomInstalled,
    formatBalance,
    clearError,
    $reset
  }
})

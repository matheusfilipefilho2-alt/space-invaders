import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { shopAPI } from '../services/api'
import type { ShopPackage, Order } from '../types'

export const useShopStore = defineStore('shop', () => {
  // State
  const packages = ref<ShopPackage[]>([])
  const orders = ref<Order[]>([])
  const currentOrder = ref<Order | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const pendingOrders = computed(() =>
    orders.value.filter((o) => o.status === 'pending')
  )

  const completedOrders = computed(() =>
    orders.value.filter((o) => o.status === 'completed')
  )

  const expiredOrders = computed(() =>
    orders.value.filter((o) => o.status === 'expired')
  )

  // Helper: Format price in BRL
  const formatPrice = (cents: number): string => {
    const reais = cents / 100
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(reais)
  }

  // Actions

  /**
   * Fetch available Gold packages
   */
  async function fetchPackages(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const response = await shopAPI.getPackages()
      packages.value = response.data.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch packages'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create PIX order for Gold package
   */
  async function createOrder(packageId: string): Promise<Order | null> {
    loading.value = true
    error.value = null

    try {
      const response = await shopAPI.createOrder(packageId)
      const order: Order = response.data.data

      // Add to orders list
      orders.value.unshift(order)
      currentOrder.value = order

      return order
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create order'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch order history
   */
  async function fetchOrders(limit = 20, offset = 0): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const response = await shopAPI.getOrders(limit, offset)
      orders.value = response.data.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch orders'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch order by ID
   */
  async function fetchOrderById(id: number): Promise<Order | null> {
    loading.value = true
    error.value = null

    try {
      const response = await shopAPI.getOrder(id)
      const order: Order = response.data.data
      currentOrder.value = order

      // Update in list if exists
      const index = orders.value.findIndex((o) => o.id === id)
      if (index !== -1) {
        orders.value[index] = order
      }

      return order
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch order'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Poll order status (for pending orders)
   */
  async function pollOrderStatus(id: number): Promise<Order | null> {
    try {
      const order = await fetchOrderById(id)
      return order
    } catch (err) {
      console.error('Failed to poll order status:', err)
      return null
    }
  }

  /**
   * Check if PIX code is expired
   */
  function isPixExpired(expirationDate: string | undefined): boolean {
    if (!expirationDate) return false
    return new Date(expirationDate) < new Date()
  }

  /**
   * Get time remaining for PIX payment
   */
  function getTimeRemaining(expirationDate: string | undefined): string {
    if (!expirationDate) return 'N/A'

    const now = new Date()
    const expiration = new Date(expirationDate)
    const diff = expiration.getTime() - now.getTime()

    if (diff <= 0) return 'Expirado'

    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)

    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  /**
   * Copy PIX code to clipboard
   */
  async function copyPixCode(pixCode: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(pixCode)
      return true
    } catch (err) {
      console.error('Failed to copy PIX code:', err)
      return false
    }
  }

  /**
   * Clear error
   */
  function clearError() {
    error.value = null
  }

  /**
   * Reset store
   */
  function $reset() {
    packages.value = []
    orders.value = []
    currentOrder.value = null
    loading.value = false
    error.value = null
  }

  return {
    // State
    packages,
    orders,
    currentOrder,
    loading,
    error,

    // Computed
    pendingOrders,
    completedOrders,
    expiredOrders,

    // Helpers
    formatPrice,
    isPixExpired,
    getTimeRemaining,
    copyPixCode,

    // Actions
    fetchPackages,
    createOrder,
    fetchOrders,
    fetchOrderById,
    pollOrderStatus,
    clearError,
    $reset
  }
})

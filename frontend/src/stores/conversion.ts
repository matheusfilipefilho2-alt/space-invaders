import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { conversionAPI } from '../services/api'
import type { Conversion } from '../types'

export const useConversionStore = defineStore('conversion', () => {
  // State
  const conversions = ref<Conversion[]>([])
  const currentConversion = ref<Conversion | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Constants
  const CONVERSION_RATIO = 100 // 100 Gold = 1 SPACE
  const MIN_CONVERSION = 100 // Minimum 100 Gold
  const LAMPORTS_PER_SPACE = 1_000_000_000 // 10^9

  // Computed
  const pendingConversions = computed(() =>
    conversions.value.filter((c) => c.status === 'pending')
  )

  const completedConversions = computed(() =>
    conversions.value.filter((c) => c.status === 'completed')
  )

  const failedConversions = computed(() =>
    conversions.value.filter((c) => c.status === 'failed')
  )

  // Helper: Convert lamports to SPACE tokens
  const lamportsToSpace = (lamports: number): number => {
    return lamports / LAMPORTS_PER_SPACE
  }

  // Helper: Convert Gold to SPACE
  const goldToSpace = (gold: number): number => {
    return gold / CONVERSION_RATIO
  }

  // Helper: Convert Gold to lamports
  const goldToLamports = (gold: number): number => {
    return (gold / CONVERSION_RATIO) * LAMPORTS_PER_SPACE
  }

  // Actions

  /**
   * Convert Gold to SPACE
   */
  async function convertGoldToSpace(goldAmount: number): Promise<Conversion | null> {
    loading.value = true
    error.value = null

    try {
      const response = await conversionAPI.convert(goldAmount)
      const conversion: Conversion = response.data.data

      // Add to conversions list
      conversions.value.unshift(conversion)
      currentConversion.value = conversion

      return conversion
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to convert Gold to SPACE'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch conversion history
   */
  async function fetchConversionHistory(limit = 20, offset = 0): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const response = await conversionAPI.getHistory(limit, offset)
      conversions.value = response.data.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch conversion history'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch conversion by ID
   */
  async function fetchConversionById(id: number): Promise<Conversion | null> {
    loading.value = true
    error.value = null

    try {
      const response = await conversionAPI.getById(id)
      const conversion: Conversion = response.data.data
      currentConversion.value = conversion

      // Update in list if exists
      const index = conversions.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        conversions.value[index] = conversion
      }

      return conversion
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch conversion'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Poll conversion status (for pending conversions)
   */
  async function pollConversionStatus(id: number): Promise<Conversion | null> {
    try {
      const conversion = await fetchConversionById(id)
      return conversion
    } catch (err) {
      console.error('Failed to poll conversion status:', err)
      return null
    }
  }

  /**
   * Validate conversion amount
   */
  function validateConversion(goldAmount: number, playerGoldBalance: number): {
    valid: boolean
    error?: string
  } {
    if (goldAmount < MIN_CONVERSION) {
      return {
        valid: false,
        error: `Minimum conversion is ${MIN_CONVERSION} Gold (${goldToSpace(MIN_CONVERSION)} SPACE)`
      }
    }

    if (goldAmount > playerGoldBalance) {
      return {
        valid: false,
        error: 'Insufficient Gold balance'
      }
    }

    if (goldAmount % CONVERSION_RATIO !== 0) {
      return {
        valid: false,
        error: `Amount must be a multiple of ${CONVERSION_RATIO} Gold`
      }
    }

    return { valid: true }
  }

  /**
   * Calculate conversion preview
   */
  function calculateConversionPreview(goldAmount: number): {
    goldAmount: number
    spaceAmount: number
    spaceTokens: number
  } {
    const spaceLamports = goldToLamports(goldAmount)
    const spaceTokens = goldToSpace(goldAmount)

    return {
      goldAmount,
      spaceAmount: spaceLamports,
      spaceTokens
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
    conversions.value = []
    currentConversion.value = null
    loading.value = false
    error.value = null
  }

  return {
    // State
    conversions,
    currentConversion,
    loading,
    error,

    // Constants
    CONVERSION_RATIO,
    MIN_CONVERSION,
    LAMPORTS_PER_SPACE,

    // Computed
    pendingConversions,
    completedConversions,
    failedConversions,

    // Helpers
    lamportsToSpace,
    goldToSpace,
    goldToLamports,

    // Actions
    convertGoldToSpace,
    fetchConversionHistory,
    fetchConversionById,
    pollConversionStatus,
    validateConversion,
    calculateConversionPreview,
    clearError,
    $reset
  }
})

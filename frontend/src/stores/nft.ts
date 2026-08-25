import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export interface NFT {
  id: number
  player_id: number
  name: string
  description: string
  image_url: string
  rarity: string // common, rare, epic, legendary
  attributes: string // JSON string
  mint_address: string
  metadata_uri: string
  tx_hash: string
  status: string // pending, minted, failed
  minted_at?: string
  failed_at?: string
  error_msg?: string
  created_at: string
  updated_at: string
}

export interface NFTAttribute {
  trait_type: string
  value: string | number
}

export const useNFTStore = defineStore('nft', () => {
  // State
  const nfts = ref<NFT[]>([])
  const selectedNFT = ref<NFT | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filterRarity = ref<string>('all')
  const sortBy = ref<string>('recent') // recent, rarity, name

  // Computed
  const filteredNFTs = computed(() => {
    let filtered = [...nfts.value]

    // Filter by rarity
    if (filterRarity.value !== 'all') {
      filtered = filtered.filter(nft => nft.rarity === filterRarity.value)
    }

    // Sort
    switch (sortBy.value) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'rarity':
        const rarityOrder: { [key: string]: number } = {
          legendary: 4,
          epic: 3,
          rare: 2,
          common: 1
        }
        filtered.sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0))
        break
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    return filtered
  })

  const nftCount = computed(() => nfts.value.length)

  const rarityStats = computed(() => {
    const stats: { [key: string]: number } = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0
    }

    nfts.value.forEach(nft => {
      if (stats[nft.rarity] !== undefined) {
        stats[nft.rarity]++
      }
    })

    return stats
  })

  const mintedCount = computed(() => {
    return nfts.value.filter(nft => nft.status === 'minted').length
  })

  const pendingCount = computed(() => {
    return nfts.value.filter(nft => nft.status === 'pending').length
  })

  // Helpers
  const getRarityColor = (rarity: string): string => {
    const colors: { [key: string]: string } = {
      common: '#a0aec0',
      rare: '#4299e1',
      epic: '#9f7aea',
      legendary: '#f6ad55'
    }
    return colors[rarity] || '#a0aec0'
  }

  const getRarityIcon = (rarity: string): string => {
    const icons: { [key: string]: string } = {
      common: '⚪',
      rare: '🔵',
      epic: '🟣',
      legendary: '🟠'
    }
    return icons[rarity] || '⚪'
  }

  const parseAttributes = (attributesJson: string): NFTAttribute[] => {
    try {
      return JSON.parse(attributesJson)
    } catch {
      return []
    }
  }

  // Actions
  async function fetchPlayerNFTs() {
    loading.value = true
    error.value = null

    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/api/v1/nfts`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success && response.data.data) {
        nfts.value = response.data.data
      } else {
        nfts.value = []
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch NFTs'
      console.error('Error fetching NFTs:', err)
      nfts.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchNFTDetails(nftId: number) {
    loading.value = true
    error.value = null

    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/api/v1/nfts/${nftId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success && response.data.data) {
        selectedNFT.value = response.data.data
        return response.data.data
      }
      return null
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch NFT details'
      console.error('Error fetching NFT details:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  async function mintNFT(name: string, description: string, rarity: string, attributes: { [key: string]: any }) {
    loading.value = true
    error.value = null

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/nfts/mint`,
        {
          name,
          description,
          rarity,
          attributes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success && response.data.data.nft) {
        // Add new NFT to the list
        nfts.value.unshift(response.data.data.nft)
        return response.data.data.nft
      }
      return null
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to mint NFT'
      console.error('Error minting NFT:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  function setFilterRarity(rarity: string) {
    filterRarity.value = rarity
  }

  function setSortBy(sort: string) {
    sortBy.value = sort
  }

  function selectNFT(nft: NFT) {
    selectedNFT.value = nft
  }

  function clearSelection() {
    selectedNFT.value = null
  }

  return {
    // State
    nfts,
    selectedNFT,
    loading,
    error,
    filterRarity,
    sortBy,

    // Computed
    filteredNFTs,
    nftCount,
    rarityStats,
    mintedCount,
    pendingCount,

    // Helpers
    getRarityColor,
    getRarityIcon,
    parseAttributes,

    // Actions
    fetchPlayerNFTs,
    fetchNFTDetails,
    mintNFT,
    setFilterRarity,
    setSortBy,
    selectNFT,
    clearSelection
  }
})

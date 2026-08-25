<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useNFTStore, type NFT } from '@/stores/nft'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const nftStore = useNFTStore()
const authStore = useAuthStore()
const router = useRouter()

const showDetailModal = ref(false)

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }

  await nftStore.fetchPlayerNFTs()
})

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleNFTClick = (nft: NFT) => {
  nftStore.selectNFT(nft)
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  nftStore.clearSelection()
}

const viewOnSolscan = (mintAddress: string) => {
  const network = import.meta.env.VITE_SOLANA_NETWORK || 'devnet'
  const url = `https://solscan.io/token/${mintAddress}?cluster=${network}`
  window.open(url, '_blank')
}

const copyMintAddress = (mintAddress: string) => {
  navigator.clipboard.writeText(mintAddress)
  // Could add a toast notification here
}
</script>

<template>
  <div class="nft-gallery-container">
    <!-- Header -->
    <div class="gallery-header">
      <h1 class="gallery-title">🖼️ NFT GALLERY 🖼️</h1>
      <p class="gallery-subtitle">Your Collectible Space Invaders NFTs</p>
    </div>

    <!-- Loading State -->
    <div v-if="nftStore.loading && nftStore.nfts.length === 0" class="loading-state">
      <div class="loading-spinner">⌛</div>
      <p>Loading NFT Collection...</p>
    </div>

    <!-- Error State -->
    <div v-if="nftStore.error" class="error-state">
      <p>❌ {{ nftStore.error }}</p>
      <button @click="nftStore.fetchPlayerNFTs()" class="retry-button">
        🔄 Retry
      </button>
    </div>

    <!-- Main Content -->
    <div v-if="!nftStore.loading || nftStore.nfts.length > 0" class="gallery-content">
      <!-- Collection Stats -->
      <div class="collection-stats">
        <div class="stat-card">
          <div class="stat-icon">🎨</div>
          <div class="stat-value">{{ nftStore.nftCount }}</div>
          <div class="stat-label">Total NFTs</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-value">{{ nftStore.mintedCount }}</div>
          <div class="stat-label">Minted</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-value">{{ nftStore.pendingCount }}</div>
          <div class="stat-label">Pending</div>
        </div>
      </div>

      <!-- Rarity Stats -->
      <div class="rarity-stats">
        <h3>Collection by Rarity</h3>
        <div class="rarity-bars">
          <div class="rarity-bar">
            <span class="rarity-name">⚪ Common</span>
            <div class="bar-container">
              <div class="bar-fill common" :style="{ width: `${(nftStore.rarityStats.common / nftStore.nftCount) * 100}%` }"></div>
            </div>
            <span class="rarity-count">{{ nftStore.rarityStats.common }}</span>
          </div>

          <div class="rarity-bar">
            <span class="rarity-name">🔵 Rare</span>
            <div class="bar-container">
              <div class="bar-fill rare" :style="{ width: `${(nftStore.rarityStats.rare / nftStore.nftCount) * 100}%` }"></div>
            </div>
            <span class="rarity-count">{{ nftStore.rarityStats.rare }}</span>
          </div>

          <div class="rarity-bar">
            <span class="rarity-name">🟣 Epic</span>
            <div class="bar-container">
              <div class="bar-fill epic" :style="{ width: `${(nftStore.rarityStats.epic / nftStore.nftCount) * 100}%` }"></div>
            </div>
            <span class="rarity-count">{{ nftStore.rarityStats.epic }}</span>
          </div>

          <div class="rarity-bar">
            <span class="rarity-name">🟠 Legendary</span>
            <div class="bar-container">
              <div class="bar-fill legendary" :style="{ width: `${(nftStore.rarityStats.legendary / nftStore.nftCount) * 100}%` }"></div>
            </div>
            <span class="rarity-count">{{ nftStore.rarityStats.legendary }}</span>
          </div>
        </div>
      </div>

      <!-- Filters and Sorting -->
      <div class="controls-bar">
        <div class="filters">
          <label>Filter by Rarity:</label>
          <select v-model="nftStore.filterRarity" @change="nftStore.setFilterRarity(nftStore.filterRarity)">
            <option value="all">All</option>
            <option value="common">Common</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
          </select>
        </div>

        <div class="sorting">
          <label>Sort by:</label>
          <select v-model="nftStore.sortBy" @change="nftStore.setSortBy(nftStore.sortBy)">
            <option value="recent">Recent</option>
            <option value="rarity">Rarity</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="nftStore.filteredNFTs.length === 0 && !nftStore.loading" class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>No NFTs Found</h3>
        <p v-if="nftStore.filterRarity !== 'all'">Try changing the rarity filter</p>
        <p v-else>You don't have any NFTs yet. Complete Battle Pass tiers to earn NFT rewards!</p>
      </div>

      <!-- NFT Grid -->
      <div v-else class="nft-grid">
        <div
          v-for="nft in nftStore.filteredNFTs"
          :key="nft.id"
          class="nft-card"
          :class="`rarity-${nft.rarity}`"
          @click="handleNFTClick(nft)"
        >
          <!-- Rarity Badge -->
          <div class="rarity-badge" :style="{ background: nftStore.getRarityColor(nft.rarity) }">
            {{ nftStore.getRarityIcon(nft.rarity) }} {{ nft.rarity.toUpperCase() }}
          </div>

          <!-- Status Badge -->
          <div v-if="nft.status === 'pending'" class="status-badge pending">
            ⏳ Minting...
          </div>
          <div v-else-if="nft.status === 'failed'" class="status-badge failed">
            ❌ Failed
          </div>

          <!-- NFT Image -->
          <div class="nft-image">
            <div class="image-placeholder">
              🖼️
            </div>
          </div>

          <!-- NFT Info -->
          <div class="nft-info">
            <h3 class="nft-name">{{ nft.name }}</h3>
            <p class="nft-description">{{ nft.description }}</p>
            <div class="nft-meta">
              <span class="meta-item">ID: #{{ nft.id }}</span>
              <span v-if="nft.status === 'minted'" class="meta-item">✅ Minted</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal && nftStore.selectedNFT" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content nft-detail-modal" @click.stop>
        <button class="close-button" @click="closeDetailModal">✕</button>

        <div class="modal-header">
          <h2>{{ nftStore.selectedNFT.name }}</h2>
          <div class="rarity-badge large" :style="{ background: nftStore.getRarityColor(nftStore.selectedNFT.rarity) }">
            {{ nftStore.getRarityIcon(nftStore.selectedNFT.rarity) }} {{ nftStore.selectedNFT.rarity.toUpperCase() }}
          </div>
        </div>

        <div class="modal-body">
          <!-- Image -->
          <div class="detail-image">
            <div class="image-placeholder large">
              🖼️
            </div>
          </div>

          <!-- Description -->
          <div class="detail-section">
            <h3>Description</h3>
            <p>{{ nftStore.selectedNFT.description }}</p>
          </div>

          <!-- Attributes -->
          <div v-if="nftStore.selectedNFT.attributes && nftStore.selectedNFT.attributes !== '{}'" class="detail-section">
            <h3>Attributes</h3>
            <div class="attributes-grid">
              <div
                v-for="attr in nftStore.parseAttributes(nftStore.selectedNFT.attributes)"
                :key="attr.trait_type"
                class="attribute-card"
              >
                <div class="attr-label">{{ attr.trait_type }}</div>
                <div class="attr-value">{{ attr.value }}</div>
              </div>
            </div>
          </div>

          <!-- Blockchain Info -->
          <div class="detail-section">
            <h3>Blockchain Info</h3>
            <div class="blockchain-info">
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value" :class="nftStore.selectedNFT.status">
                  {{ nftStore.selectedNFT.status.toUpperCase() }}
                </span>
              </div>

              <div v-if="nftStore.selectedNFT.mint_address" class="info-row">
                <span class="info-label">Mint Address:</span>
                <div class="address-actions">
                  <span class="info-value monospace">{{ nftStore.selectedNFT.mint_address.slice(0, 8) }}...{{ nftStore.selectedNFT.mint_address.slice(-8) }}</span>
                  <button @click="copyMintAddress(nftStore.selectedNFT.mint_address)" class="icon-button" title="Copy">
                    📋
                  </button>
                  <button @click="viewOnSolscan(nftStore.selectedNFT.mint_address)" class="icon-button" title="View on Solscan">
                    🔍
                  </button>
                </div>
              </div>

              <div v-if="nftStore.selectedNFT.minted_at" class="info-row">
                <span class="info-label">Minted At:</span>
                <span class="info-value">{{ formatDate(nftStore.selectedNFT.minted_at) }}</span>
              </div>

              <div class="info-row">
                <span class="info-label">Created At:</span>
                <span class="info-value">{{ formatDate(nftStore.selectedNFT.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nft-gallery-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Press Start 2P', monospace;
}

.gallery-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.gallery-title {
  font-size: 2em;
  color: #fff;
  text-shadow: 3px 3px 0 #000;
  margin: 0 0 10px 0;
}

.gallery-subtitle {
  font-size: 0.7em;
  color: #ffd700;
  margin: 0;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  margin: 20px 0;
}

.loading-spinner {
  font-size: 4em;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-button {
  margin-top: 15px;
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.8em;
  transition: all 0.2s;
}

.retry-button:hover {
  background: #5568d3;
  transform: scale(1.05);
}

.collection-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  padding: 25px;
  border-radius: 10px;
  text-align: center;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.stat-icon {
  font-size: 2.5em;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 2em;
  color: #ffd700;
  margin: 10px 0;
}

.stat-label {
  font-size: 0.7em;
  color: #aaa;
}

.rarity-stats {
  background: rgba(255, 255, 255, 0.05);
  padding: 25px;
  border-radius: 10px;
  margin-bottom: 30px;
}

.rarity-stats h3 {
  color: #fff;
  margin-bottom: 20px;
  font-size: 1em;
}

.rarity-bars {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.rarity-bar {
  display: grid;
  grid-template-columns: 150px 1fr 60px;
  align-items: center;
  gap: 15px;
  font-size: 0.7em;
}

.rarity-name {
  color: #fff;
}

.bar-container {
  background: rgba(0, 0, 0, 0.3);
  height: 25px;
  border-radius: 12px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.5s ease;
  border-radius: 12px;
}

.bar-fill.common { background: #a0aec0; }
.bar-fill.rare { background: #4299e1; }
.bar-fill.epic { background: #9f7aea; }
.bar-fill.legendary { background: #f6ad55; }

.rarity-count {
  color: #ffd700;
  text-align: right;
}

.controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  gap: 20px;
  flex-wrap: wrap;
}

.filters,
.sorting {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.7em;
}

.controls-bar label {
  color: #fff;
}

.controls-bar select {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 5px;
  font-family: inherit;
  font-size: 1em;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.empty-icon {
  font-size: 5em;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  color: #fff;
  margin-bottom: 10px;
}

.empty-state p {
  color: #aaa;
  font-size: 0.7em;
}

.nft-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 25px;
}

.nft-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.nft-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.3);
}

.nft-card.rarity-legendary {
  border-color: rgba(246, 173, 85, 0.5);
  box-shadow: 0 0 15px rgba(246, 173, 85, 0.3);
}

.nft-card.rarity-epic {
  border-color: rgba(159, 122, 234, 0.5);
}

.rarity-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.5em;
  font-weight: bold;
  color: white;
  z-index: 1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.rarity-badge.large {
  position: static;
  font-size: 0.7em;
  padding: 8px 16px;
  display: inline-block;
}

.status-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.5em;
  font-weight: bold;
  z-index: 1;
  animation: pulse 2s ease-in-out infinite;
}

.status-badge.pending {
  background: rgba(255, 193, 7, 0.9);
  color: #000;
}

.status-badge.failed {
  background: rgba(220, 53, 69, 0.9);
  color: #fff;
}

.nft-image {
  aspect-ratio: 1;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-placeholder {
  font-size: 5em;
  opacity: 0.5;
}

.image-placeholder.large {
  font-size: 8em;
}

.nft-info {
  padding: 20px;
}

.nft-name {
  font-size: 0.8em;
  color: #fff;
  margin: 0 0 10px 0;
}

.nft-description {
  font-size: 0.6em;
  color: #aaa;
  margin: 0 0 15px 0;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.nft-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.5em;
  color: #888;
}

.meta-item {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

/* Modal Styles */
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
  padding: 20px;
}

.modal-content {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  border-radius: 15px;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  color: white;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  position: relative;
}

.close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  font-size: 1.5em;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 1;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.modal-header {
  padding: 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0 0 15px 0;
  color: #ffd700;
  font-size: 1.2em;
}

.modal-body {
  padding: 30px;
}

.detail-image {
  margin-bottom: 30px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 40px;
  text-align: center;
}

.detail-section {
  margin-bottom: 30px;
}

.detail-section h3 {
  color: #ffd700;
  font-size: 0.9em;
  margin-bottom: 15px;
}

.detail-section p {
  font-size: 0.7em;
  line-height: 1.6;
  color: #ddd;
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.attribute-card {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}

.attr-label {
  font-size: 0.6em;
  color: #aaa;
  margin-bottom: 8px;
}

.attr-value {
  font-size: 0.8em;
  color: #ffd700;
  font-weight: bold;
}

.blockchain-info {
  background: rgba(0, 0, 0, 0.3);
  padding: 20px;
  border-radius: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.6em;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: #aaa;
}

.info-value {
  color: #fff;
  font-weight: bold;
}

.info-value.minted {
  color: #00ff00;
}

.info-value.pending {
  color: #ffc107;
}

.info-value.failed {
  color: #dc3545;
}

.address-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.monospace {
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.icon-button {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  padding: 6px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1.2em;
  transition: all 0.2s;
}

.icon-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

@media (max-width: 768px) {
  .gallery-title {
    font-size: 1.3em;
  }

  .nft-grid {
    grid-template-columns: 1fr;
  }

  .controls-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filters,
  .sorting {
    width: 100%;
  }

  .rarity-bar {
    grid-template-columns: 100px 1fr 50px;
    font-size: 0.6em;
  }
}
</style>

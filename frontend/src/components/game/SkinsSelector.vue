<template>
  <div class="skins-overlay" @click.self="$emit('close')">
    <div class="skins-modal">
      <div class="modal-header">
        <h2>🎨 SKINS</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="skins-grid">
        <div
          v-for="skin in skins"
          :key="skin.id"
          class="skin-card"
          :class="{
            selected: skin.id === selectedSkinId,
            locked: !skin.unlocked,
            [skin.rarity]: true
          }"
          @click="handleSkinClick(skin)"
        >
          <div class="skin-preview">
            <img :src="skin.shipImage" :alt="skin.name" />
            <div v-if="!skin.unlocked" class="lock-overlay">
              <span class="lock-icon">🔒</span>
            </div>
            <div v-if="skin.id === selectedSkinId" class="selected-badge">
              ✓ EQUIPADA
            </div>
          </div>

          <div class="skin-info">
            <h3 class="skin-name">{{ skin.name }}</h3>
            <p class="skin-description">{{ skin.description }}</p>

            <div class="skin-rarity">
              <span :class="`rarity-badge ${skin.rarity}`">
                {{ getRarityLabel(skin.rarity) }}
              </span>
            </div>

            <div v-if="!skin.unlocked && skin.price" class="skin-price">
              💰 {{ skin.price }} Gold
            </div>
          </div>

          <div class="skin-actions">
            <button
              v-if="skin.unlocked && skin.id !== selectedSkinId"
              class="btn btn-equip"
              @click.stop="equipSkin(skin.id)"
            >
              Equipar
            </button>
            <button
              v-else-if="!skin.unlocked && skin.price"
              class="btn btn-purchase"
              @click.stop="purchaseSkin(skin.id)"
              :disabled="userGold < skin.price"
            >
              {{ userGold >= skin.price ? 'Comprar' : 'Sem Gold' }}
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="user-gold">
          💰 Seu Gold: <span class="gold-amount">{{ userGold }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SkinManager } from '@/game/Skins'
import type { Skin } from '@/game/Skins'

interface Props {
  userGold: number
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  skinChanged: []
  purchaseSkin: [skinId: string, price: number]
}>()

const skins = ref<Skin[]>([])
const selectedSkinId = ref<string>('default')

onMounted(() => {
  loadSkins()
})

function loadSkins() {
  skins.value = SkinManager.getAllSkins()
  const currentSkin = SkinManager.getSelectedSkin()
  selectedSkinId.value = currentSkin.id
}

function getRarityLabel(rarity: string): string {
  const labels: Record<string, string> = {
    common: 'COMUM',
    rare: 'RARA',
    epic: 'ÉPICA',
    legendary: 'LENDÁRIA'
  }
  return labels[rarity] || rarity.toUpperCase()
}

function handleSkinClick(skin: Skin) {
  if (skin.unlocked) {
    equipSkin(skin.id)
  }
}

function equipSkin(skinId: string) {
  if (SkinManager.selectSkin(skinId)) {
    selectedSkinId.value = skinId
    emit('skinChanged')
  }
}

function purchaseSkin(skinId: string) {
  const skin = skins.value.find(s => s.id === skinId)
  if (skin && skin.price) {
    emit('purchaseSkin', skinId, skin.price)
    // Reload skins after purchase
    setTimeout(() => loadSkins(), 100)
  }
}
</script>

<style scoped>
.skins-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease-out;
}

.skins-modal {
  background: linear-gradient(135deg, #1a1a3e 0%, #0f0f2e 100%);
  border: 3px solid #00ff88;
  border-radius: 16px;
  padding: 30px;
  max-width: 1000px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 0 40px rgba(0, 255, 136, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.modal-header h2 {
  font-size: 2rem;
  color: #00ff88;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
  margin: 0;
}

.close-btn {
  background: none;
  border: 2px solid #ff4444;
  color: #ff4444;
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
}

.close-btn:hover {
  background: #ff4444;
  color: #fff;
  transform: rotate(90deg);
}

.skins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.skin-card {
  background: rgba(0, 255, 136, 0.05);
  border: 2px solid rgba(0, 255, 136, 0.3);
  border-radius: 12px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.skin-card:hover {
  transform: translateY(-5px);
  border-color: #00ff88;
  box-shadow: 0 5px 20px rgba(0, 255, 136, 0.3);
}

.skin-card.selected {
  border-color: #FFD700;
  background: rgba(255, 215, 0, 0.1);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
}

.skin-card.locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.skin-card.locked:hover {
  transform: none;
}

.skin-preview {
  position: relative;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}

.skin-preview img {
  max-width: 80px;
  height: auto;
  filter: drop-shadow(0 0 10px rgba(0, 255, 136, 0.5));
}

.lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.lock-icon {
  font-size: 3rem;
}

.selected-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #FFD700;
  color: #000;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
}

.skin-info {
  margin-bottom: 15px;
}

.skin-name {
  font-size: 1.2rem;
  color: #fff;
  margin: 0 0 8px 0;
}

.skin-description {
  font-size: 0.85rem;
  color: #aaa;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.skin-rarity {
  margin-bottom: 10px;
}

.rarity-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
}

.rarity-badge.common {
  background: #888;
  color: #fff;
}

.rarity-badge.rare {
  background: #4169E1;
  color: #fff;
}

.rarity-badge.epic {
  background: #9370DB;
  color: #fff;
}

.rarity-badge.legendary {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
}

.skin-price {
  color: #FFD700;
  font-weight: bold;
  font-size: 1.1rem;
}

.skin-actions {
  margin-top: 10px;
}

.btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-equip {
  background: linear-gradient(135deg, #00ff88, #00cc70);
  color: #000;
}

.btn-equip:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(0, 255, 136, 0.4);
}

.btn-purchase {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
}

.btn-purchase:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
}

.btn-purchase:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-footer {
  border-top: 2px solid rgba(0, 255, 136, 0.3);
  padding-top: 20px;
  margin-top: 20px;
}

.user-gold {
  text-align: center;
  font-size: 1.2rem;
  color: #fff;
}

.gold-amount {
  color: #FFD700;
  font-weight: bold;
  font-size: 1.5rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>

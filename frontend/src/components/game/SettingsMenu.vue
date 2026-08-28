<template>
  <div class="settings-overlay" @click.self="$emit('close')">
    <div class="settings-modal">
      <div class="modal-header">
        <h2>⚙️ CONFIGURAÇÕES</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="settings-content">
        <!-- Audio Settings -->
        <div class="settings-section">
          <h3 class="section-title">🔊 ÁUDIO</h3>

          <div class="setting-item">
            <label class="setting-label">
              <span class="label-icon">🎵</span>
              <span class="label-text">Volume da Música</span>
              <span class="label-value">{{ musicVolume }}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              v-model.number="musicVolume"
              @input="handleMusicVolumeChange"
              class="volume-slider"
            />
          </div>

          <div class="setting-item">
            <label class="setting-label">
              <span class="label-icon">🔔</span>
              <span class="label-text">Volume dos Efeitos</span>
              <span class="label-value">{{ sfxVolume }}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              v-model.number="sfxVolume"
              @input="handleSfxVolumeChange"
              class="volume-slider"
            />
          </div>

          <div class="setting-item">
            <button
              class="test-sound-btn"
              @click="testSound"
            >
              🔊 Testar Som
            </button>
          </div>
        </div>

        <!-- Graphics Settings -->
        <div class="settings-section">
          <h3 class="section-title">🎨 GRÁFICOS</h3>

          <div class="setting-item">
            <label class="setting-label">
              <span class="label-icon">✨</span>
              <span class="label-text">Qualidade Gráfica</span>
            </label>
            <div class="quality-options">
              <button
                v-for="quality in graphicsQualities"
                :key="quality.value"
                :class="['quality-btn', { active: graphicsQuality === quality.value }]"
                @click="setGraphicsQuality(quality.value)"
              >
                {{ quality.label }}
              </button>
            </div>
          </div>

          <div class="setting-item">
            <label class="setting-label">
              <span class="label-icon">⭐</span>
              <span class="label-text">Partículas</span>
            </label>
            <button
              :class="['toggle-btn', { active: particlesEnabled }]"
              @click="particlesEnabled = !particlesEnabled"
            >
              {{ particlesEnabled ? 'Ativado' : 'Desativado' }}
            </button>
          </div>

          <div class="setting-item">
            <label class="setting-label">
              <span class="label-icon">💫</span>
              <span class="label-text">Efeitos Visuais</span>
            </label>
            <button
              :class="['toggle-btn', { active: visualEffects }]"
              @click="visualEffects = !visualEffects"
            >
              {{ visualEffects ? 'Ativado' : 'Desativado' }}
            </button>
          </div>
        </div>

        <!-- Gameplay Settings -->
        <div class="settings-section">
          <h3 class="section-title">🎮 GAMEPLAY</h3>

          <div class="setting-item">
            <label class="setting-label">
              <span class="label-icon">🎯</span>
              <span class="label-text">Mostrar FPS</span>
            </label>
            <button
              :class="['toggle-btn', { active: showFPS }]"
              @click="showFPS = !showFPS"
            >
              {{ showFPS ? 'Ativado' : 'Desativado' }}
            </button>
          </div>

          <div class="setting-item">
            <label class="setting-label">
              <span class="label-icon">📊</span>
              <span class="label-text">Mostrar Stats</span>
            </label>
            <button
              :class="['toggle-btn', { active: showStats }]"
              @click="showStats = !showStats"
            >
              {{ showStats ? 'Ativado' : 'Desativado' }}
            </button>
          </div>

          <div class="setting-item">
            <label class="setting-label">
              <span class="label-icon">⌨️</span>
              <span class="label-text">Dificuldade</span>
            </label>
            <div class="quality-options">
              <button
                v-for="diff in difficulties"
                :key="diff.value"
                :class="['quality-btn', { active: difficulty === diff.value }]"
                @click="difficulty = diff.value"
              >
                {{ diff.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-reset" @click="resetToDefaults">
          🔄 Restaurar Padrões
        </button>
        <button class="btn btn-save" @click="saveAndClose">
          💾 Salvar e Fechar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SettingsManager, type GameSettings } from '@/game/Settings'

const emit = defineEmits<{
  close: []
  settingsChanged: [settings: GameSettings]
  testSound: []
}>()

// Audio
const musicVolume = ref(70)
const sfxVolume = ref(80)

// Graphics
const graphicsQuality = ref<'low' | 'medium' | 'high'>('high')
const particlesEnabled = ref(true)
const visualEffects = ref(true)

// Gameplay
const showFPS = ref(false)
const showStats = ref(true)
const difficulty = ref<'easy' | 'normal' | 'hard'>('normal')

const graphicsQualities = [
  { value: 'low' as const, label: 'Baixa' },
  { value: 'medium' as const, label: 'Média' },
  { value: 'high' as const, label: 'Alta' }
]

const difficulties = [
  { value: 'easy' as const, label: 'Fácil' },
  { value: 'normal' as const, label: 'Normal' },
  { value: 'hard' as const, label: 'Difícil' }
]

onMounted(() => {
  loadSettings()
})

function loadSettings() {
  const settings = SettingsManager.getSettings()
  musicVolume.value = settings.musicVolume
  sfxVolume.value = settings.sfxVolume
  graphicsQuality.value = settings.graphicsQuality
  particlesEnabled.value = settings.particlesEnabled
  visualEffects.value = settings.visualEffects
  showFPS.value = settings.showFPS
  showStats.value = settings.showStats
  difficulty.value = settings.difficulty
}

function saveSettings() {
  const settings: GameSettings = {
    musicVolume: musicVolume.value,
    sfxVolume: sfxVolume.value,
    graphicsQuality: graphicsQuality.value,
    particlesEnabled: particlesEnabled.value,
    visualEffects: visualEffects.value,
    showFPS: showFPS.value,
    showStats: showStats.value,
    difficulty: difficulty.value
  }

  SettingsManager.saveSettings(settings)
  emit('settingsChanged', settings)
}

function handleMusicVolumeChange() {
  saveSettings()
}

function handleSfxVolumeChange() {
  saveSettings()
}

function setGraphicsQuality(quality: 'low' | 'medium' | 'high') {
  graphicsQuality.value = quality
  saveSettings()
}

function testSound() {
  emit('testSound')
}

function resetToDefaults() {
  const defaults = SettingsManager.resetToDefaults()
  musicVolume.value = defaults.musicVolume
  sfxVolume.value = defaults.sfxVolume
  graphicsQuality.value = defaults.graphicsQuality
  particlesEnabled.value = defaults.particlesEnabled
  visualEffects.value = defaults.visualEffects
  showFPS.value = defaults.showFPS
  showStats.value = defaults.showStats
  difficulty.value = defaults.difficulty
  emit('settingsChanged', defaults)
}

function saveAndClose() {
  saveSettings()
  emit('close')
}
</script>

<style scoped>
.settings-overlay {
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

.settings-modal {
  background: linear-gradient(135deg, #1a1a3e 0%, #0f0f2e 100%);
  border: 3px solid #00ff88;
  border-radius: 16px;
  padding: 30px;
  max-width: 700px;
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

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.settings-section {
  background: rgba(0, 255, 136, 0.05);
  border: 1px solid rgba(0, 255, 136, 0.2);
  border-radius: 12px;
  padding: 20px;
}

.section-title {
  font-size: 1.3rem;
  color: #00ff88;
  margin: 0 0 20px 0;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

.setting-item {
  margin-bottom: 20px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  font-size: 1rem;
  margin-bottom: 10px;
}

.label-icon {
  font-size: 1.2rem;
}

.label-text {
  flex: 1;
}

.label-value {
  color: #00ff88;
  font-weight: bold;
  min-width: 45px;
  text-align: right;
}

.volume-slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #00ff88;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.volume-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #00ff88;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.test-sound-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #4169E1, #1E90FF);
  border: 2px solid #4169E1;
  color: #fff;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.test-sound-btn:hover {
  background: linear-gradient(135deg, #1E90FF, #4169E1);
  box-shadow: 0 4px 15px rgba(65, 105, 225, 0.4);
  transform: translateY(-2px);
}

.quality-options {
  display: flex;
  gap: 10px;
}

.quality-btn {
  flex: 1;
  padding: 10px;
  background: rgba(0, 255, 136, 0.1);
  border: 2px solid rgba(0, 255, 136, 0.3);
  color: #00ff88;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.quality-btn:hover {
  background: rgba(0, 255, 136, 0.2);
  border-color: #00ff88;
}

.quality-btn.active {
  background: linear-gradient(135deg, #00ff88, #00cc70);
  border-color: #00ff88;
  color: #000;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
}

.toggle-btn {
  width: 120px;
  padding: 10px;
  background: rgba(255, 68, 68, 0.2);
  border: 2px solid rgba(255, 68, 68, 0.5);
  color: #ff4444;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.toggle-btn:hover {
  background: rgba(255, 68, 68, 0.3);
  border-color: #ff4444;
}

.toggle-btn.active {
  background: rgba(0, 255, 136, 0.2);
  border-color: #00ff88;
  color: #00ff88;
}

.modal-footer {
  display: flex;
  gap: 15px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 2px solid rgba(0, 255, 136, 0.3);
}

.btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-reset {
  background: linear-gradient(135deg, #666, #888);
  color: #fff;
}

.btn-reset:hover {
  background: linear-gradient(135deg, #888, #666);
  box-shadow: 0 4px 15px rgba(136, 136, 136, 0.4);
}

.btn-save {
  background: linear-gradient(135deg, #00ff88, #00cc70);
  color: #000;
}

.btn-save:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(0, 255, 136, 0.4);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Scrollbar customization */
.settings-modal::-webkit-scrollbar {
  width: 10px;
}

.settings-modal::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}

.settings-modal::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 136, 0.5);
  border-radius: 10px;
}

.settings-modal::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 136, 0.7);
}
</style>

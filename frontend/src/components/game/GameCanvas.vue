<template>
  <div class="game-canvas-wrapper">
    <canvas ref="canvasRef" class="game-canvas"></canvas>

    <div v-if="!isPlaying" class="game-overlay">
      <div class="overlay-content">
        <h2 v-if="gameState === 'MENU'">READY TO PLAY?</h2>
        <h2 v-else-if="gameState === 'GAME_OVER'">GAME OVER</h2>
        <h2 v-else-if="gameState === 'LEVEL_COMPLETE'">LEVEL COMPLETE!</h2>

        <button v-if="gameState === 'MENU'" @click="startGame" class="start-btn">
          START GAME
        </button>
        <button v-else-if="gameState === 'GAME_OVER'" @click="restartGame" class="start-btn">
          PLAY AGAIN
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { GameEngine } from '@/game/GameEngine'
import type { GameStats } from '@/game/types'

const emit = defineEmits<{
  scoreChange: [score: number]
  livesChange: [lives: number]
  levelChange: [level: number]
  gameOver: [stats: GameStats]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const gameEngine = ref<GameEngine | null>(null)
const gameState = ref<string>('MENU')

const isPlaying = computed(() => gameState.value === 'PLAYING')

onMounted(() => {
  if (canvasRef.value) {
    gameEngine.value = new GameEngine(canvasRef.value)

    // Listen to game events
    gameEngine.value.on('scoreChange', (score: number) => {
      emit('scoreChange', score)
    })

    gameEngine.value.on('livesChange', (lives: number) => {
      emit('livesChange', lives)
    })

    gameEngine.value.on('levelChange', (level: number) => {
      emit('levelChange', level)
    })

    gameEngine.value.on('gameOver', (stats: GameStats) => {
      gameState.value = 'GAME_OVER'
      emit('gameOver', stats)
    })
  }
})

onUnmounted(() => {
  gameEngine.value?.destroy()
})

function startGame() {
  gameState.value = 'PLAYING'
  gameEngine.value?.start()
}

function restartGame() {
  gameState.value = 'MENU'
  // Reset will happen when user clicks start again
}

defineExpose({
  startGame,
  restartGame
})
</script>

<style scoped>
.game-canvas-wrapper {
  position: relative;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.game-canvas {
  display: block;
  width: 100%;
  height: auto;
  background: #000;
  border: 2px solid #00ff88;
  border-radius: 8px;
}

.game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.overlay-content {
  text-align: center;
  color: #fff;
}

.overlay-content h2 {
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #00ff88;
  text-shadow: 0 0 10px #00ff88;
}

.start-btn {
  background: #00ff88;
  color: #000;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
}

.start-btn:hover {
  background: #00cc6a;
  transform: scale(1.05);
}

.start-btn:active {
  transform: scale(0.95);
}
</style>

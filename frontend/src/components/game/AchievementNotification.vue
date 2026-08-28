<template>
  <transition-group name="achievement-slide" tag="div" class="achievement-container">
    <div
      v-for="achievement in visibleAchievements"
      :key="achievement.id"
      class="achievement-notification"
    >
      <div class="achievement-icon">{{ achievement.icon }}</div>
      <div class="achievement-content">
        <div class="achievement-header">
          <span class="achievement-badge">🏆 ACHIEVEMENT UNLOCKED</span>
        </div>
        <div class="achievement-name">{{ achievement.name }}</div>
        <div class="achievement-description">{{ achievement.description }}</div>
        <div class="achievement-reward">+{{ achievement.rewardGold }} Gold</div>
      </div>
    </div>
  </transition-group>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Achievement } from '@/game/Achievements'

interface Props {
  achievements: Achievement[]
}

const props = defineProps<Props>()
const visibleAchievements = ref<Achievement[]>([])

watch(() => props.achievements, (newAchievements) => {
  if (newAchievements.length > 0) {
    // Show achievements one by one with delay
    newAchievements.forEach((achievement, index) => {
      setTimeout(() => {
        visibleAchievements.value.push(achievement)

        // Auto-hide after 5 seconds
        setTimeout(() => {
          const idx = visibleAchievements.value.findIndex(a => a.id === achievement.id)
          if (idx !== -1) {
            visibleAchievements.value.splice(idx, 1)
          }
        }, 5000)
      }, index * 500) // Stagger by 500ms
    })
  }
}, { deep: true })
</script>

<style scoped>
.achievement-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.achievement-notification {
  display: flex;
  align-items: center;
  gap: 15px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 165, 0, 0.95));
  border: 3px solid #FFD700;
  border-radius: 12px;
  padding: 15px 20px;
  min-width: 350px;
  box-shadow: 0 8px 32px rgba(255, 215, 0, 0.4), 0 0 20px rgba(255, 215, 0, 0.6);
  animation: glow 2s ease-in-out infinite alternate;
}

.achievement-icon {
  font-size: 3rem;
  animation: bounce 1s ease-in-out infinite;
}

.achievement-content {
  flex: 1;
  color: #000;
}

.achievement-header {
  margin-bottom: 5px;
}

.achievement-badge {
  font-size: 0.7rem;
  font-weight: bold;
  color: #8B4513;
  letter-spacing: 1px;
}

.achievement-name {
  font-size: 1.2rem;
  font-weight: bold;
  color: #000;
  margin-bottom: 3px;
}

.achievement-description {
  font-size: 0.9rem;
  color: #333;
  margin-bottom: 5px;
}

.achievement-reward {
  font-size: 0.85rem;
  font-weight: bold;
  color: #8B4513;
}

/* Animations */
@keyframes glow {
  from {
    box-shadow: 0 8px 32px rgba(255, 215, 0, 0.4), 0 0 20px rgba(255, 215, 0, 0.6);
  }
  to {
    box-shadow: 0 8px 32px rgba(255, 215, 0, 0.6), 0 0 30px rgba(255, 215, 0, 0.8);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

/* Transition animations */
.achievement-slide-enter-active {
  animation: slideIn 0.5s ease-out;
}

.achievement-slide-leave-active {
  animation: slideOut 0.5s ease-in;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(400px);
    opacity: 0;
  }
}
</style>

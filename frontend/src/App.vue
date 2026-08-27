<template>
  <div id="stars-background"></div>
  <MainNav v-if="route.name !== 'game'" />
  <div :class="{ 'app-content': true, 'game-page': route.name === 'game' }">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import MainNav from '@/components/MainNav.vue'

const route = useRoute()
</script>

<style>
/* Global styles are imported from style.css */

.app-content {
  padding-top: 70px; /* Space for fixed navbar */
}

.app-content.game-page {
  padding-top: 0; /* Remove padding on game page */
}
</style>

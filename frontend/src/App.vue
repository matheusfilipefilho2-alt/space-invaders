<template>
  <div id="stars-background"></div>
  <MainNav v-if="route.name !== 'game'" />
  <router-view />
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import MainNav from '@/components/MainNav.vue'

const route = useRoute()
</script>

<style>
/* Global styles are imported from style.css */
</style>

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI, playerAPI } from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const user = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  async function register(username: string, email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const response = await authAPI.register(username, email, password)
      token.value = response.data.data.token
      user.value = response.data.data.player
      localStorage.setItem('auth_token', token.value!)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Registration failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function login(username: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const response = await authAPI.login(username, password)
      token.value = response.data.data.token
      user.value = response.data.data.player
      localStorage.setItem('auth_token', token.value!)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Login failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile() {
    try {
      const response = await playerAPI.getProfile()
      user.value = response.data.data
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('auth_token')
  }

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    fetchProfile
  }
})

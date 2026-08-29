import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_BASE_URL + '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
})

// API instance for new routes (without v1)
const apiV2 = axios.create({
  baseURL: API_BASE_URL + '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para adicionar JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Log request details for debugging
  if (config.url?.includes('/shop/orders')) {
    console.log('API Request:', {
      method: config.method,
      url: config.url,
      data: config.data,
      headers: config.headers
    })
  }

  return config
})

// Interceptor para adicionar JWT token (apiV2)
apiV2.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para capturar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.config?.url?.includes('/shop/orders') && error.response?.status === 400) {
      console.error('Shop Orders Error 400:', {
        url: error.config.url,
        data: error.config.data,
        responseData: error.response.data,
        responseHeaders: error.response.headers
      })
    }
    return Promise.reject(error)
  }
)

export default api

// Auth endpoints
export const authAPI = {
  register: (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password }),
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password })
}

// Player endpoints
export const playerAPI = {
  getProfile: () => api.get('/players/me'),
  updateProfile: (data: any) => api.put('/players/me', data),
  getAchievements: () => api.get('/players/me/achievements'),
  getItems: () => api.get('/players/me/items')
}

// Game endpoints
export const gameAPI = {
  start: () => api.post('/game/start'),
  end: (score: number, kills: number) => api.post('/game/end', { score, kills })
}

// Achievements endpoints
export const achievementAPI = {
  list: () => api.get('/achievements'),
  check: () => api.post('/achievements/check'),
  // New endpoints
  getWithStatus: () => apiV2.get('/achievements'),
  checkGameStats: (stats: {
    score: number
    killCount: number
    maxCombo: number
    level: number
    bossKills: number
    accuracy: number
  }) => apiV2.post('/achievements/check-game-stats', stats)
}

// Items endpoints
export const itemAPI = {
  list: () => api.get('/items'),
  purchase: (itemId: string) => api.post(`/items/${itemId}/purchase`),
  equip: (itemId: string) => api.post(`/items/${itemId}/equip`),
  unequip: (itemId: string) => api.post(`/items/${itemId}/unequip`)
}

// Leaderboard endpoints
export const leaderboardAPI = {
  global: (limit = 10, offset = 0) =>
    api.get('/leaderboard/global', { params: { limit, offset } }),
  league: (leagueId: number, limit = 10, offset = 0) =>
    api.get(`/leaderboard/league/${leagueId}`, { params: { limit, offset } })
}

// Conversion endpoints (Gold → SPACE)
export const conversionAPI = {
  convert: (goldAmount: number) =>
    api.post('/conversions', { gold_amount: goldAmount }),
  getHistory: (limit = 20, offset = 0) =>
    api.get('/conversions/history', { params: { limit, offset } }),
  getById: (id: number) => api.get(`/conversions/${id}`)
}

// Shop endpoints (Gold purchase via PIX)
export const shopAPI = {
  getPackages: () => api.get('/shop/packages'),
  createOrder: (packageId: string) => {
    console.log('shopAPI.createOrder called with packageId:', packageId)
    console.log('Request payload:', { packageId })
    return api.post('/shop/orders', { packageId })
  },
  getOrders: (limit = 10, offset = 0) =>
    api.get('/shop/orders', { params: { limit, offset } }),
  getOrder: (id: number) => api.get(`/shop/orders/${id}`),
  simulatePayment: (orderId: number) => api.post(`/shop/orders/${orderId}/simulate-payment`)
}

// NFT endpoints
export const nftAPI = {
  list: () => api.get('/nfts'),
  getById: (id: number) => api.get(`/nfts/${id}`),
  mint: (data: { name: string; description: string; rarity: string; attributes: any }) =>
    api.post('/nfts/mint', data)
}

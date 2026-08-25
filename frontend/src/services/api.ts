import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_BASE_URL + '/api/v1',
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
  return config
})

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
  end: (score: number) => api.post('/game/end', { score })
}

// Achievements endpoints
export const achievementAPI = {
  list: () => api.get('/achievements'),
  check: () => api.post('/achievements/check')
}

// Items endpoints
export const itemAPI = {
  list: () => api.get('/items'),
  purchase: (itemId: number) => api.post(`/items/${itemId}/purchase`),
  equip: (itemId: number) => api.post(`/items/${itemId}/equip`),
  unequip: (itemId: number) => api.post(`/items/${itemId}/unequip`)
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
  createOrder: (packageId: string) =>
    api.post('/shop/orders', { package_id: packageId }),
  getOrders: (limit = 10, offset = 0) =>
    api.get('/shop/orders', { params: { limit, offset } }),
  getOrder: (id: number) => api.get(`/shop/orders/${id}`)
}

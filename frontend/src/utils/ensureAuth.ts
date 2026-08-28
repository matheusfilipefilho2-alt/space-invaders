import { authAPI } from '../services/api'

/**
 * Ensures the user is authenticated before playing
 * If no token exists, performs auto-login with test user
 */
export async function ensureAuthenticated(): Promise<boolean> {
  const token = localStorage.getItem('auth_token')

  if (token) {
    console.log('✅ Already authenticated')
    return true
  }

  console.log('🔐 No auth token found, performing auto-login with test user...')

  try {
    const response = await authAPI.login('test', 'password123')
    const newToken = response.data.data.token

    localStorage.setItem('auth_token', newToken)
    console.log('✅ Auto-login successful')
    return true
  } catch (error) {
    console.error('❌ Auto-login failed:', error)
    console.log('💡 You can manually login or play in offline mode')
    return false
  }
}

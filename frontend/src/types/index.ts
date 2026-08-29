// Player types
export interface Player {
  id: number
  username: string
  email: string
  gold_balance: number
  space_balance: number // SPACE token balance in lamports
  total_score: number
  games_played: number
  highest_score: number
  league_id?: number
  league_name?: string
  solana_wallet?: string
  created_at: string
  updated_at: string
}

// Auth response types
export interface AuthResponse {
  token: string
  player: Player
}

// Item types
export interface Item {
  id: number
  name: string
  description: string
  item_type: string
  rarity: string
  gold_cost: number
  attack_bonus?: number
  defense_bonus?: number
  speed_bonus?: number
  is_equipped?: boolean
  created_at: string
}

// Achievement types
export interface Achievement {
  id: number
  name: string
  description: string
  requirement_type: string
  requirement_value: number
  gold_reward: number
  unlocked_at?: string
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number
  player_id: number
  username: string
  total_score: number
  league_name?: string
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

// Game session types
export interface GameSession {
  session_id: number
  player_id: number
  score: number
  gold_earned: number
  started_at: string
  ended_at?: string
}

// Conversion types (Gold → SPACE)
export interface Conversion {
  id: number
  player_id: number
  gold_amount: number
  space_amount: number // in lamports (1 SPACE = 1,000,000,000 lamports)
  status: 'pending' | 'completed' | 'failed'
  tx_hash?: string // Solana transaction hash
  block_height?: number
  completed_at?: string
  failed_at?: string
  error_msg?: string
  created_at: string
  updated_at: string
}

// Shop types (Gold purchase via PIX)
export interface ShopPackage {
  id: string
  name: string
  description: string
  goldAmount: number
  priceInCents: number
  priceDisplay: string
  bonusPercentage?: number
}

export interface Order {
  id: number
  playerId: number
  packageId: string
  amount: number // Price in cents
  goldAmount: number
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'
  pixCode?: string // PIX copy-paste code
  qrCodeUrl?: string // PIX QR code URL
  expiresAt?: string
  externalId?: string // AbacatePay order ID
  completedAt?: string
  createdAt: string
  updatedAt: string
  created_at: string
  updated_at: string
}

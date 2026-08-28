export interface Position {
  x: number
  y: number
}

export interface Velocity {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rectangle extends Position, Size {}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE'
}

export interface GameStats {
  score: number
  level: number
  lives: number
  killCount: number
  accuracy: number
  startTime: number
  // Advanced stats
  combo: number
  maxCombo: number
  rapidKills: number
  shotsFired: number
  shotsHit: number
  lastKillTime: number
  bossKills: number
}

export interface GameConfig {
  canvasWidth: number
  canvasHeight: number
  backgroundColor: string
  fps: number
}

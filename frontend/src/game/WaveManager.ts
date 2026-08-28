import { InvaderGrid } from './InvaderGrid'

export interface WaveConfig {
  waveNumber: number
  totalWaves: number
  invaderRows: number
  invaderColumns: number
  speedMultiplier: number
  shootMultiplier: number
  bonusEnemies: number // Extra invaders beyond normal grid
}

export class WaveManager {
  private currentWave: number
  private totalWaves: number
  private level: number
  private canvasWidth: number
  private waveComplete: boolean
  private waveStartTime: number
  private waveDelay: number = 3000 // 3 seconds between waves

  constructor(level: number, canvasWidth: number) {
    this.level = level
    this.canvasWidth = canvasWidth
    this.currentWave = 1
    this.totalWaves = this.calculateTotalWaves(level)
    this.waveComplete = false
    this.waveStartTime = Date.now()
  }

  private calculateTotalWaves(level: number): number {
    // More waves as level increases
    if (level <= 2) return 2
    if (level <= 4) return 3
    if (level <= 7) return 4
    return 5 // Max 5 waves per level
  }

  getCurrentWave(): number {
    return this.currentWave
  }

  getTotalWaves(): number {
    return this.totalWaves
  }

  isWaveComplete(): boolean {
    return this.waveComplete
  }

  setWaveComplete(complete: boolean): void {
    this.waveComplete = complete
    if (complete) {
      this.waveStartTime = Date.now()
    }
  }

  canStartNextWave(): boolean {
    if (!this.waveComplete) return false
    const timeSinceComplete = Date.now() - this.waveStartTime
    return timeSinceComplete >= this.waveDelay
  }

  nextWave(): boolean {
    if (this.currentWave >= this.totalWaves) {
      return false // No more waves, level complete
    }

    this.currentWave++
    this.waveComplete = false
    return true
  }

  hasMoreWaves(): boolean {
    return this.currentWave < this.totalWaves
  }

  getWaveConfig(): WaveConfig {
    const baseRows = 3
    const baseColumns = 6

    // Each wave gets progressively harder
    const waveMultiplier = 1 + (this.currentWave - 1) * 0.15

    return {
      waveNumber: this.currentWave,
      totalWaves: this.totalWaves,
      invaderRows: Math.min(baseRows + Math.floor(this.currentWave / 2), 5), // Max 5 rows
      invaderColumns: Math.min(baseColumns + Math.floor(this.currentWave / 3), 10), // Max 10 columns
      speedMultiplier: 1 + (this.currentWave - 1) * 0.1, // 10% faster each wave
      shootMultiplier: 1 + (this.currentWave - 1) * 0.15, // 15% more shooting each wave
      bonusEnemies: Math.floor((this.currentWave - 1) * 2) // +2 bonus invaders per wave after first
    }
  }

  createWaveGrid(): InvaderGrid {
    const config = this.getWaveConfig()

    // Create grid with wave-specific configuration including level for enemy type distribution
    const grid = new InvaderGrid(this.canvasWidth, config.invaderRows, config.invaderColumns, this.level)

    // Apply wave difficulty modifiers
    // Note: Speed and shoot rate will be applied by GameEngine based on getWaveConfig()

    return grid
  }

  getWaveProgress(aliveInvaders: number, totalInvaders: number): number {
    if (totalInvaders === 0) return 100
    const killed = totalInvaders - aliveInvaders
    return Math.floor((killed / totalInvaders) * 100)
  }

  getTimeUntilNextWave(): number {
    if (!this.waveComplete) return 0
    const elapsed = Date.now() - this.waveStartTime
    return Math.max(0, this.waveDelay - elapsed)
  }

  reset(): void {
    this.currentWave = 1
    this.totalWaves = this.calculateTotalWaves(this.level)
    this.waveComplete = false
    this.waveStartTime = Date.now()
  }
}

import type { Position, Velocity } from './types'
import { Invader, InvaderType } from './Invader'
import { Projectile } from './Projectile'
import {
  INVADER_ROWS,
  INVADER_COLUMNS,
  INVADER_WIDTH,
  INVADER_HEIGHT,
  INVADER_SPACING,
  INVADER_VELOCITY_X,
  INVADER_VELOCITY_Y,
  INVADER_SHOOT_PROBABILITY
} from './constants'

type FormationPattern = 'standard' | 'diamond' | 'triangle' | 'wave' | 'scattered' | 'cross' | 'circle'

export class InvaderGrid {
  invaders: Invader[]
  velocity: Velocity
  position: Position
  targetY: number
  isEntering: boolean
  formationPattern: FormationPattern
  level: number
  rows: number
  columns: number

  constructor(canvasWidth: number = 800, rows: number = INVADER_ROWS, columns: number = INVADER_COLUMNS, level: number = 1) {
    this.invaders = []
    this.velocity = { x: INVADER_VELOCITY_X, y: 0 }
    this.level = level
    this.rows = rows
    this.columns = columns

    // Choose random formation pattern
    this.formationPattern = this.getRandomFormationPattern()

    // Start at upper left corner like original (not centered)
    const startX = 20

    // Calculate grid height
    const gridHeight = this.rows * (INVADER_HEIGHT + INVADER_SPACING)

    // Start above the screen and animate down to 85px
    this.targetY = 85
    this.position = { x: startX, y: -gridHeight }
    this.isEntering = true

    this.initializeGrid()
  }

  private getRandomFormationPattern(): FormationPattern {
    const patterns: FormationPattern[] = [
      'standard',   // Standard rectangular formation
      'diamond',    // Diamond formation
      'triangle',   // Triangle formation
      'wave',       // Wave formation
      'cross',      // Cross formation
      'circle',     // Circle formation
      'scattered'   // Completely random formation
    ]
    return patterns[Math.floor(Math.random() * patterns.length)]
  }

  private shouldCreateInvader(row: number, col: number): boolean {
    // Check if position is valid first
    if (row < 0 || row >= this.rows || col < 0 || col >= this.columns) {
      return false
    }

    const centerRow = Math.floor(this.rows / 2)
    const centerCol = Math.floor(this.columns / 2)

    switch (this.formationPattern) {
      case 'standard':
        return true

      case 'diamond':
        const distanceFromCenter = Math.abs(row - centerRow) + Math.abs(col - centerCol)
        return distanceFromCenter <= Math.min(centerRow, centerCol)

      case 'triangle':
        return col >= row && col < this.columns - row

      case 'wave':
        const waveOffset = Math.sin(col * 0.5) * 1.5
        return Math.abs(row - (centerRow + waveOffset)) <= 1

      case 'scattered':
        return Math.random() > 0.3 // 70% chance to create invader

      case 'cross':
        return row === centerRow || col === centerCol

      case 'circle':
        const radius = Math.min(centerRow, centerCol)
        const distance = Math.sqrt(
          Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
        )
        return distance <= radius && distance >= radius - 1

      default:
        return true
    }
  }

  private getInvaderPosition(row: number, col: number): Position {
    let baseX = this.position.x + col * (INVADER_WIDTH + INVADER_SPACING)
    let baseY = this.position.y + row * (INVADER_HEIGHT + INVADER_SPACING)

    // Add position variations based on pattern
    switch (this.formationPattern) {
      case 'wave':
        baseX += Math.sin(row * 0.5) * 15
        break

      case 'scattered':
        baseX += (Math.random() - 0.5) * 20
        baseY += (Math.random() - 0.5) * 15
        break

      case 'diamond':
      case 'circle':
        // Small adjustment for geometric formations
        baseX += (Math.random() - 0.5) * 5
        baseY += (Math.random() - 0.5) * 5
        break

      default:
        // Minimal variation for standard formations
        baseX += (Math.random() - 0.5) * 3
        break
    }

    return { x: baseX, y: baseY }
  }

  private getInvaderTypeForPosition(row: number, col: number, level: number = 1): InvaderType {
    // Mix different invader types based on position and level
    const allTypes = [
      InvaderType.BASIC,
      InvaderType.FAST,
      InvaderType.TANK,
      InvaderType.SNIPER,
      InvaderType.SHIELD
    ]

    // Different strategies for type distribution
    const strategies = [
      // Strategy 1: Row-based (harder enemies at top) - TANK/SHIELD only after level 5
      () => {
        if (level > 5) {
          if (row === 0) return Math.random() < 0.5 ? InvaderType.TANK : InvaderType.SNIPER
          if (row === 1) return Math.random() < 0.5 ? InvaderType.SHIELD : InvaderType.FAST
        } else {
          if (row === 0) return Math.random() < 0.5 ? InvaderType.SNIPER : InvaderType.FAST
          if (row === 1) return InvaderType.FAST
        }
        return Math.random() < 0.7 ? InvaderType.BASIC : InvaderType.FAST
      },

      // Strategy 2: Edge guards (stronger on edges) - TANK/SHIELD only after level 5
      () => {
        if (col === 0 || col === INVADER_COLUMNS - 1) {
          if (level > 5) {
            return Math.random() < 0.6 ? InvaderType.TANK : InvaderType.SHIELD
          } else {
            return Math.random() < 0.6 ? InvaderType.SNIPER : InvaderType.FAST
          }
        }
        // For non-edge positions, use level-appropriate random selection
        if (level > 5) {
          return allTypes[Math.floor(Math.random() * allTypes.length)]
        } else {
          // Only BASIC, FAST, SNIPER before level 6
          const earlyTypes = [InvaderType.BASIC, InvaderType.FAST, InvaderType.SNIPER]
          return earlyTypes[Math.floor(Math.random() * earlyTypes.length)]
        }
      },

      // Strategy 3: Random with level scaling (ENHANCED for progressive difficulty)
      // IMPORTANT: TANK and SHIELD only spawn AFTER level 5
      () => {
        const rand = Math.random()

        // Very high levels (10+) - mostly elite enemies
        if (level >= 10) {
          if (rand < 0.05) return InvaderType.BASIC  // 5% basic
          if (rand < 0.20) return InvaderType.FAST   // 15% fast
          if (rand < 0.45) return InvaderType.TANK   // 25% tank
          if (rand < 0.70) return InvaderType.SNIPER // 25% sniper
          return InvaderType.SHIELD                   // 30% shield
        }
        // High levels (6-9) - TANK and SHIELD introduced
        else if (level > 5) {
          if (rand < 0.15) return InvaderType.BASIC  // 15% basic
          if (rand < 0.35) return InvaderType.FAST   // 20% fast
          if (rand < 0.60) return InvaderType.TANK   // 25% tank
          if (rand < 0.80) return InvaderType.SNIPER // 20% sniper
          return InvaderType.SHIELD                   // 20% shield
        }
        // Mid levels (3-5) - NO TANK/SHIELD yet, introduce SNIPER
        else if (level >= 3) {
          if (rand < 0.40) return InvaderType.BASIC  // 40% basic
          if (rand < 0.70) return InvaderType.FAST   // 30% fast
          return InvaderType.SNIPER                   // 30% sniper
        }
        // Low levels (1-2) - Only BASIC and FAST
        else {
          if (rand < 0.60) return InvaderType.BASIC  // 60% basic
          return InvaderType.FAST                     // 40% fast
        }
      },

      // Strategy 4: Pattern-based (alternating)
      () => {
        const sum = row + col
        if (sum % 3 === 0) return InvaderType.FAST
        if (sum % 3 === 1) return InvaderType.BASIC
        return [InvaderType.SHIELD, InvaderType.SNIPER, InvaderType.TANK][sum % 3]
      }
    ]

    const strategy = strategies[Math.floor(Math.random() * strategies.length)]
    return strategy()
  }

  private initializeGrid(): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        // Check if should create invader at this position based on formation pattern
        if (this.shouldCreateInvader(row, col)) {
          const position = this.getInvaderPosition(row, col)
          const invaderType = this.getInvaderTypeForPosition(row, col, this.level)
          this.invaders.push(new Invader(position.x, position.y, invaderType, row, col))
        }
      }
    }
  }

  update(canvasWidth: number, canvasHeight: number): void {
    // Handle entrance animation
    if (this.isEntering) {
      const entranceSpeed = 3
      this.position.y += entranceSpeed

      // Update all invader positions during entrance using their stored grid row
      this.invaders.forEach((invader) => {
        invader.position.y = this.position.y + invader.gridRow * (INVADER_HEIGHT + INVADER_SPACING)
      })

      // Stop entering when reached target
      if (this.position.y >= this.targetY) {
        this.position.y = this.targetY
        this.isEntering = false
      }

      return // Don't do normal movement during entrance
    }

    // Check if grid hits canvas edges
    const rightEdge = this.invaders
      .filter(inv => inv.alive)
      .reduce((max, inv) => Math.max(max, inv.position.x + inv.width), 0)

    const leftEdge = this.invaders
      .filter(inv => inv.alive)
      .reduce((min, inv) => Math.min(min, inv.position.x), canvasWidth)

    // Reverse direction and move down if hit edge
    if (rightEdge >= canvasWidth || leftEdge <= 0) {
      this.velocity.x *= -1
      this.invaders.forEach(invader => {
        if (invader.alive) {
          invader.position.y += INVADER_VELOCITY_Y
        }
      })
    }

    // Move all invaders horizontally
    this.invaders.forEach(invader => {
      if (invader.alive) {
        invader.position.x += this.velocity.x
      }
    })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.invaders.forEach(invader => invader.draw(ctx))
  }

  shoot(): Projectile | null {
    const aliveInvaders = this.invaders.filter(inv => inv.alive)
    if (aliveInvaders.length === 0) return null

    // Random chance to shoot
    if (Math.random() < INVADER_SHOOT_PROBABILITY) {
      const randomInvader = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)]
      return new Projectile(
        randomInvader.position.x + randomInvader.width / 2,
        randomInvader.position.y + randomInvader.height,
        false // enemy projectile
      )
    }

    return null
  }

  getAliveCount(): number {
    return this.invaders.filter(inv => inv.alive).length
  }

  isAllDead(): boolean {
    return this.getAliveCount() === 0
  }

  reset(canvasWidth: number = 800): void {
    this.invaders = []
    this.velocity = { x: INVADER_VELOCITY_X, y: 0 }

    // Choose new random formation pattern
    this.formationPattern = this.getRandomFormationPattern()

    // Start at upper left corner like original
    const startX = 20

    // Calculate grid height for entrance animation
    const gridHeight = this.rows * (INVADER_HEIGHT + INVADER_SPACING)

    // Start above screen and animate down
    this.targetY = 85
    this.position = { x: startX, y: -gridHeight }
    this.isEntering = true

    this.initializeGrid()
  }

  // Get invader at specific position for shooting logic
  getInvaderForShooting(): Invader | null {
    const aliveInvaders = this.invaders.filter(inv => inv.alive)
    if (aliveInvaders.length === 0) return null

    // Snipers have higher priority for shooting
    const snipers = aliveInvaders.filter(inv => inv.type === InvaderType.SNIPER)
    if (snipers.length > 0 && Math.random() < 0.4) {
      return snipers[Math.floor(Math.random() * snipers.length)]
    }

    // Otherwise random alive invader
    return aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)]
  }
}

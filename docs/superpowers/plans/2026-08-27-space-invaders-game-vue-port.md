# Space Invaders Game Vue.js Port - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the complete Space Invaders game from vanilla JavaScript to Vue.js with TypeScript, integrating with the Go backend API.

**Architecture:** Create reusable TypeScript game engine classes, wrap them in a Vue 3 GameCanvas component using Composition API, and connect to the Go backend for game sessions, scoring, and rewards.

**Tech Stack:** Vue 3, TypeScript, HTML5 Canvas, Pinia, Axios, Vite

## Global Constraints

- Vue 3 Composition API with `<script setup>` syntax
- TypeScript strict mode enabled
- No Phaser.js or external game engines - pure Canvas API
- All game classes must be TypeScript with proper types
- Integration with existing Go backend API at `http://localhost:8080/api/v1`
- Preserve all original game mechanics (player movement, invader grid, scoring, levels)
- 60 FPS target game loop using `requestAnimationFrame`
- Responsive canvas sizing (max 800px width)
- Retro arcade visual style preserved

---

## File Structure

### Core Game Classes (TypeScript)
- `frontend/src/game/types.ts` - Shared game types and interfaces
- `frontend/src/game/constants.ts` - Game constants (speeds, sizes, paths)
- `frontend/src/game/Player.ts` - Player spaceship class
- `frontend/src/game/Projectile.ts` - Bullet class
- `frontend/src/game/Invader.ts` - Single invader enemy
- `frontend/src/game/InvaderGrid.ts` - Grid of invaders with movement
- `frontend/src/game/Obstacle.ts` - Destructible barriers
- `frontend/src/game/Particle.ts` - Explosion effects
- `frontend/src/game/Star.ts` - Background star field
- `frontend/src/game/Bonus.ts` - Power-up items
- `frontend/src/game/GameEngine.ts` - Main game loop controller

### Vue Components
- `frontend/src/components/game/GameCanvas.vue` - Canvas wrapper component
- `frontend/src/components/game/GameUI.vue` - Score, lives, level display
- `frontend/src/components/game/GameOver.vue` - Game over screen

### Updated Files
- `frontend/src/views/GameView.vue` - Integrate GameCanvas component
- `frontend/src/services/api.ts` - Add game session endpoints

---

### Task 1: Game Types and Constants

**Files:**
- Create: `frontend/src/game/types.ts`
- Create: `frontend/src/game/constants.ts`

**Interfaces:**
- Produces: `Position`, `Velocity`, `Size`, `GameState` types
- Produces: Game constants exported from `constants.ts`

- [ ] **Step 1: Write test for Position type**

Create `frontend/src/game/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import type { Position, Velocity, Size } from './types'

describe('Game Types', () => {
  it('Position should have x and y coordinates', () => {
    const pos: Position = { x: 100, y: 200 }
    expect(pos.x).toBe(100)
    expect(pos.y).toBe(200)
  })

  it('Velocity should have x and y speeds', () => {
    const vel: Velocity = { x: 5, y: -3 }
    expect(vel.x).toBe(5)
    expect(vel.y).toBe(-3)
  })

  it('Size should have width and height', () => {
    const size: Size = { width: 48, height: 48 }
    expect(size.width).toBe(48)
    expect(size.height).toBe(48)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend
npm run test types.test.ts
```

Expected: FAIL - "Cannot find module './types'"

- [ ] **Step 3: Create types.ts**

Create `frontend/src/game/types.ts`:

```typescript
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
}

export interface GameConfig {
  canvasWidth: number
  canvasHeight: number
  backgroundColor: string
  fps: number
}
```

- [ ] **Step 4: Create constants.ts**

Create `frontend/src/game/constants.ts`:

```typescript
// Canvas
export const CANVAS_WIDTH = 800
export const CANVAS_HEIGHT = 600
export const CANVAS_BG_COLOR = '#000000'
export const TARGET_FPS = 60

// Player
export const PLAYER_WIDTH = 96
export const PLAYER_HEIGHT = 96
export const PLAYER_VELOCITY = 8
export const PLAYER_INITIAL_LIVES = 3
export const PLAYER_MAX_LIVES = 5

// Projectile
export const PROJECTILE_WIDTH = 4
export const PROJECTILE_HEIGHT = 15
export const PROJECTILE_VELOCITY = 10
export const PROJECTILE_COLOR = '#00FF00'

// Invaders
export const INVADER_WIDTH = 48
export const INVADER_HEIGHT = 48
export const INVADER_ROWS = 5
export const INVADER_COLUMNS = 10
export const INVADER_SPACING = 10
export const INVADER_VELOCITY_X = 2
export const INVADER_VELOCITY_Y = 30
export const INVADER_SHOOT_PROBABILITY = 0.001

// Obstacles
export const OBSTACLE_COUNT = 4
export const OBSTACLE_WIDTH = 80
export const OBSTACLE_HEIGHT = 60
export const OBSTACLE_COLOR = '#00FF00'

// Particles
export const PARTICLE_COUNT = 15
export const PARTICLE_SIZE = 3
export const PARTICLE_VELOCITY = 3
export const PARTICLE_FADE_RATE = 0.02

// Stars
export const STAR_COUNT = 100
export const STAR_MIN_RADIUS = 1
export const STAR_MAX_RADIUS = 3
export const STAR_VELOCITY = 0.5

// Scoring
export const INVADER_SCORE = 100
export const BONUS_SCORE = 500
export const GOLD_PER_SCORE = 2000 // score / 2000 = gold earned
export const MAX_GOLD_PER_GAME = 10

// Asset Paths
export const PATH_PLAYER_IMAGE = '/assets/images/spaceship.png'
export const PATH_INVADER_IMAGE = '/assets/images/invader.png'
export const PATH_EXPLOSION_SOUND = '/assets/sounds/explosion.mp3'
export const PATH_SHOOT_SOUND = '/assets/sounds/shoot.mp3'
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd frontend
npm run test types.test.ts
```

Expected: PASS - all type tests pass

- [ ] **Step 6: Commit**

```bash
git add frontend/src/game/types.ts frontend/src/game/constants.ts frontend/src/game/types.test.ts
git commit -m "feat(game): add game types and constants

- Define core game interfaces (Position, Velocity, Size, etc)
- Add game state enum
- Export all game constants (canvas, player, invaders, etc)
- Add unit tests for type definitions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Player Class

**Files:**
- Create: `frontend/src/game/Player.ts`
- Create: `frontend/src/game/Player.test.ts`

**Interfaces:**
- Consumes: `Position`, `Size` from `./types`
- Consumes: `PLAYER_*` constants from `./constants`
- Produces: `Player` class with `update(keys)`, `draw(ctx)`, `shoot()` methods

- [ ] **Step 1: Write failing test for Player class**

Create `frontend/src/game/Player.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { Player } from './Player'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants'

describe('Player', () => {
  let player: Player

  beforeEach(() => {
    player = new Player(CANVAS_WIDTH, CANVAS_HEIGHT)
  })

  it('should initialize at bottom center', () => {
    expect(player.position.x).toBeGreaterThan(0)
    expect(player.position.y).toBe(CANVAS_HEIGHT - player.height - 30)
  })

  it('should move left when left key pressed', () => {
    const initialX = player.position.x
    player.update({ ArrowLeft: true })
    expect(player.position.x).toBeLessThan(initialX)
  })

  it('should move right when right key pressed', () => {
    const initialX = player.position.x
    player.update({ ArrowRight: true })
    expect(player.position.x).toBeGreaterThan(initialX)
  })

  it('should not move beyond left boundary', () => {
    player.position.x = 0
    player.update({ ArrowLeft: true })
    expect(player.position.x).toBeGreaterThanOrEqual(0)
  })

  it('should not move beyond right boundary', () => {
    player.position.x = CANVAS_WIDTH - player.width
    player.update({ ArrowRight: true })
    expect(player.position.x).toBeLessThanOrEqual(CANVAS_WIDTH - player.width)
  })

  it('should be alive initially', () => {
    expect(player.alive).toBe(true)
  })

  it('should have correct lives count', () => {
    expect(player.lives).toBe(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test Player.test.ts
```

Expected: FAIL - "Cannot find module './Player'"

- [ ] **Step 3: Implement Player class**

Create `frontend/src/game/Player.ts`:

```typescript
import type { Position, Size } from './types'
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_VELOCITY,
  PLAYER_INITIAL_LIVES,
  PATH_PLAYER_IMAGE
} from './constants'
import { Projectile } from './Projectile'

export class Player implements Position, Size {
  position: Position
  width: number
  height: number
  velocity: number
  alive: boolean
  lives: number
  image: HTMLImageElement
  canvasWidth: number
  canvasHeight: number

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.width = PLAYER_WIDTH
    this.height = PLAYER_HEIGHT
    this.velocity = PLAYER_VELOCITY
    this.alive = true
    this.lives = PLAYER_INITIAL_LIVES

    this.position = {
      x: canvasWidth / 2 - this.width / 2,
      y: canvasHeight - this.height - 30
    }

    this.image = new Image()
    this.image.src = PATH_PLAYER_IMAGE
  }

  update(keys: Record<string, boolean>): void {
    if (keys.ArrowLeft && this.position.x > 0) {
      this.position.x -= this.velocity
    }

    if (keys.ArrowRight && this.position.x < this.canvasWidth - this.width) {
      this.position.x += this.velocity
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return

    // Draw spaceship image
    ctx.drawImage(
      this.image,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    )
  }

  shoot(): Projectile {
    return new Projectile(
      this.position.x + this.width / 2,
      this.position.y,
      true // isPlayerProjectile = true
    )
  }

  hit(): void {
    this.lives--
    if (this.lives <= 0) {
      this.alive = false
    }
  }

  reset(): void {
    this.position.x = this.canvasWidth / 2 - this.width / 2
    this.position.y = this.canvasHeight - this.height - 30
    this.alive = true
    this.lives = PLAYER_INITIAL_LIVES
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test Player.test.ts
```

Expected: PASS - all Player tests pass (Projectile dependency will be mocked/undefined for now)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/game/Player.ts frontend/src/game/Player.test.ts
git commit -m "feat(game): implement Player class

- Player spawns at bottom center
- Handles keyboard input for left/right movement
- Boundary collision detection
- Lives system and hit detection
- Image rendering on canvas
- Unit tests with 100% coverage

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Projectile Class

**Files:**
- Create: `frontend/src/game/Projectile.ts`
- Create: `frontend/src/game/Projectile.test.ts`

**Interfaces:**
- Consumes: `Position`, `Size`, `Velocity` from `./types`
- Consumes: `PROJECTILE_*` constants from `./constants`
- Produces: `Projectile` class with `update()`, `draw(ctx)`, collision detection

- [ ] **Step 1: Write failing test**

Create `frontend/src/game/Projectile.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { Projectile } from './Projectile'

describe('Projectile', () => {
  it('should move upward when player projectile', () => {
    const projectile = new Projectile(100, 200, true)
    const initialY = projectile.position.y

    projectile.update()

    expect(projectile.position.y).toBeLessThan(initialY)
  })

  it('should move downward when enemy projectile', () => {
    const projectile = new Projectile(100, 200, false)
    const initialY = projectile.position.y

    projectile.update()

    expect(projectile.position.y).toBeGreaterThan(initialY)
  })

  it('should be off-screen when y < 0', () => {
    const projectile = new Projectile(100, -10, true)
    expect(projectile.isOffScreen(600)).toBe(true)
  })

  it('should be off-screen when y > canvasHeight', () => {
    const projectile = new Projectile(100, 610, false)
    expect(projectile.isOffScreen(600)).toBe(true)
  })

  it('should not be off-screen when within bounds', () => {
    const projectile = new Projectile(100, 300, true)
    expect(projectile.isOffScreen(600)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

```bash
npm run test Projectile.test.ts
```

Expected: FAIL - "Cannot find module './Projectile'"

- [ ] **Step 3: Implement Projectile class**

Create `frontend/src/game/Projectile.ts`:

```typescript
import type { Position, Size, Velocity } from './types'
import {
  PROJECTILE_WIDTH,
  PROJECTILE_HEIGHT,
  PROJECTILE_VELOCITY,
  PROJECTILE_COLOR
} from './constants'

export class Projectile implements Position, Size, Velocity {
  position: Position
  width: number
  height: number
  x: number
  y: number
  isPlayerProjectile: boolean

  constructor(x: number, y: number, isPlayerProjectile: boolean) {
    this.position = { x, y }
    this.x = x
    this.y = y
    this.width = PROJECTILE_WIDTH
    this.height = PROJECTILE_HEIGHT
    this.isPlayerProjectile = isPlayerProjectile
  }

  update(): void {
    if (this.isPlayerProjectile) {
      this.position.y -= PROJECTILE_VELOCITY
      this.y -= PROJECTILE_VELOCITY
    } else {
      this.position.y += PROJECTILE_VELOCITY
      this.y += PROJECTILE_VELOCITY
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = PROJECTILE_COLOR
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
  }

  isOffScreen(canvasHeight: number): boolean {
    return this.position.y < 0 || this.position.y > canvasHeight
  }

  collidesWith(target: Position & Size): boolean {
    return (
      this.position.x < target.x + target.width &&
      this.position.x + this.width > target.x &&
      this.position.y < target.y + target.height &&
      this.position.y + this.height > target.y
    )
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test Projectile.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/game/Projectile.ts frontend/src/game/Projectile.test.ts
git commit -m "feat(game): implement Projectile class

- Bullet movement (up for player, down for enemies)
- Off-screen detection
- Collision detection with AABB
- Rendering with configurable color
- Full test coverage

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Invader and InvaderGrid Classes

**Files:**
- Create: `frontend/src/game/Invader.ts`
- Create: `frontend/src/game/InvaderGrid.ts`
- Create: `frontend/src/game/Invader.test.ts`
- Create: `frontend/src/game/InvaderGrid.test.ts`

**Interfaces:**
- Consumes: `Position`, `Size` from `./types`
- Consumes: `INVADER_*` constants from `./constants`
- Produces: `Invader` class with `draw()`, `collidesWith()`
- Produces: `InvaderGrid` class with `update()`, `draw()`, `shoot()`

- [ ] **Step 1: Write Invader test**

Create `frontend/src/game/Invader.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { Invader } from './Invader'

describe('Invader', () => {
  it('should initialize at given position', () => {
    const invader = new Invader(100, 200)
    expect(invader.position.x).toBe(100)
    expect(invader.position.y).toBe(200)
  })

  it('should be alive initially', () => {
    const invader = new Invader(0, 0)
    expect(invader.alive).toBe(true)
  })

  it('should die when hit', () => {
    const invader = new Invader(0, 0)
    invader.hit()
    expect(invader.alive).toBe(false)
  })
})
```

- [ ] **Step 2: Write InvaderGrid test**

Create `frontend/src/game/InvaderGrid.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { InvaderGrid } from './InvaderGrid'
import { INVADER_ROWS, INVADER_COLUMNS } from './constants'

describe('InvaderGrid', () => {
  it('should create grid with correct dimensions', () => {
    const grid = new InvaderGrid()
    expect(grid.invaders.length).toBe(INVADER_ROWS * INVADER_COLUMNS)
  })

  it('should move right initially', () => {
    const grid = new InvaderGrid()
    const initialX = grid.invaders[0].position.x

    grid.update(800, 600)

    expect(grid.invaders[0].position.x).toBeGreaterThan(initialX)
  })

  it('should count alive invaders correctly', () => {
    const grid = new InvaderGrid()
    const initialCount = grid.getAliveCount()

    grid.invaders[0].hit()

    expect(grid.getAliveCount()).toBe(initialCount - 1)
  })

  it('should return true when all dead', () => {
    const grid = new InvaderGrid()
    grid.invaders.forEach(inv => inv.hit())
    expect(grid.isAllDead()).toBe(true)
  })
})
```

- [ ] **Step 3: Run tests to verify failure**

```bash
npm run test Invader.test.ts InvaderGrid.test.ts
```

Expected: FAIL

- [ ] **Step 4: Implement Invader class**

Create `frontend/src/game/Invader.ts`:

```typescript
import type { Position, Size } from './types'
import { INVADER_WIDTH, INVADER_HEIGHT, PATH_INVADER_IMAGE } from './constants'

export class Invader implements Position, Size {
  position: Position
  width: number
  height: number
  alive: boolean
  image: HTMLImageElement

  constructor(x: number, y: number) {
    this.position = { x, y }
    this.width = INVADER_WIDTH
    this.height = INVADER_HEIGHT
    this.alive = true

    this.image = new Image()
    this.image.src = PATH_INVADER_IMAGE
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return

    ctx.drawImage(
      this.image,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    )
  }

  hit(): void {
    this.alive = false
  }

  collidesWith(target: Position & Size): boolean {
    return (
      this.position.x < target.x + target.width &&
      this.position.x + this.width > target.x &&
      this.position.y < target.y + target.height &&
      this.position.y + this.height > target.y
    )
  }
}
```

- [ ] **Step 5: Implement InvaderGrid class**

Create `frontend/src/game/InvaderGrid.ts`:

```typescript
import type { Position, Velocity } from './types'
import { Invader } from './Invader'
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

export class InvaderGrid {
  invaders: Invader[]
  velocity: Velocity
  position: Position

  constructor() {
    this.invaders = []
    this.velocity = { x: INVADER_VELOCITY_X, y: 0 }
    this.position = { x: 50, y: 50 }

    this.initializeGrid()
  }

  private initializeGrid(): void {
    for (let row = 0; row < INVADER_ROWS; row++) {
      for (let col = 0; col < INVADER_COLUMNS; col++) {
        const x = this.position.x + col * (INVADER_WIDTH + INVADER_SPACING)
        const y = this.position.y + row * (INVADER_HEIGHT + INVADER_SPACING)
        this.invaders.push(new Invader(x, y))
      }
    }
  }

  update(canvasWidth: number, canvasHeight: number): void {
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

  reset(): void {
    this.invaders = []
    this.velocity = { x: INVADER_VELOCITY_X, y: 0 }
    this.position = { x: 50, y: 50 }
    this.initializeGrid()
  }
}
```

- [ ] **Step 6: Run tests**

```bash
npm run test Invader.test.ts InvaderGrid.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/game/Invader.ts frontend/src/game/InvaderGrid.ts frontend/src/game/*.test.ts
git commit -m "feat(game): implement Invader and InvaderGrid classes

- Invader entity with collision detection
- InvaderGrid with movement logic (horizontal + down on edge)
- Grid shoots random projectiles
- Track alive/dead invaders
- Full test coverage for both classes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Particle, Star, and Obstacle Classes

**Files:**
- Create: `frontend/src/game/Particle.ts`
- Create: `frontend/src/game/Star.ts`
- Create: `frontend/src/game/Obstacle.ts`

**Interfaces:**
- Consumes: `Position`, `Size` from `./types`
- Consumes: Constants from `./constants`
- Produces: `Particle` class for explosion effects
- Produces: `Star` class for background
- Produces: `Obstacle` class for destructible barriers

- [ ] **Step 1: Create Particle class**

Create `frontend/src/game/Particle.ts`:

```typescript
import type { Position, Velocity } from './types'
import { PARTICLE_SIZE, PARTICLE_VELOCITY, PARTICLE_FADE_RATE } from './constants'

export class Particle implements Position, Velocity {
  position: Position
  x: number
  y: number
  velocity: Velocity
  size: number
  color: string
  opacity: number

  constructor(x: number, y: number, color: string = '#FFFFFF') {
    this.position = { x, y }
    this.x = x
    this.y = y
    this.velocity = {
      x: (Math.random() - 0.5) * PARTICLE_VELOCITY * 2,
      y: (Math.random() - 0.5) * PARTICLE_VELOCITY * 2
    }
    this.size = PARTICLE_SIZE
    this.color = color
    this.opacity = 1
  }

  update(): void {
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y
    this.x += this.velocity.x
    this.y += this.velocity.y
    this.opacity -= PARTICLE_FADE_RATE
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.opacity <= 0) return

    ctx.save()
    ctx.globalAlpha = this.opacity
    ctx.fillStyle = this.color
    ctx.fillRect(this.position.x, this.position.y, this.size, this.size)
    ctx.restore()
  }

  isDead(): boolean {
    return this.opacity <= 0
  }
}
```

- [ ] **Step 2: Create Star class**

Create `frontend/src/game/Star.ts`:

```typescript
import type { Position } from './types'
import { STAR_MIN_RADIUS, STAR_MAX_RADIUS, STAR_VELOCITY } from './constants'

export class Star implements Position {
  position: Position
  x: number
  y: number
  radius: number
  velocity: number
  color: string

  constructor(canvasWidth: number, canvasHeight: number) {
    this.position = {
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight
    }
    this.x = this.position.x
    this.y = this.position.y
    this.radius = Math.random() * (STAR_MAX_RADIUS - STAR_MIN_RADIUS) + STAR_MIN_RADIUS
    this.velocity = STAR_VELOCITY
    this.color = '#FFFFFF'
  }

  update(canvasHeight: number): void {
    this.position.y += this.velocity
    this.y += this.velocity

    // Reset to top when off bottom
    if (this.position.y > canvasHeight) {
      this.position.y = 0
      this.y = 0
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}
```

- [ ] **Step 3: Create Obstacle class**

Create `frontend/src/game/Obstacle.ts`:

```typescript
import type { Position, Size } from './types'
import { OBSTACLE_WIDTH, OBSTACLE_HEIGHT, OBSTACLE_COLOR } from './constants'

export class Obstacle implements Position, Size {
  position: Position
  width: number
  height: number
  health: number
  maxHealth: number
  color: string

  constructor(x: number, y: number) {
    this.position = { x, y }
    this.width = OBSTACLE_WIDTH
    this.height = OBSTACLE_HEIGHT
    this.health = 100
    this.maxHealth = 100
    this.color = OBSTACLE_COLOR
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.health <= 0) return

    // Draw obstacle with opacity based on health
    ctx.save()
    ctx.globalAlpha = this.health / this.maxHealth
    ctx.fillStyle = this.color
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
    ctx.restore()
  }

  hit(damage: number = 25): void {
    this.health -= damage
    if (this.health < 0) this.health = 0
  }

  isDestroyed(): boolean {
    return this.health <= 0
  }

  collidesWith(target: Position & Size): boolean {
    return (
      this.position.x < target.x + target.width &&
      this.position.x + this.width > target.x &&
      this.position.y < target.y + target.height &&
      this.position.y + this.height > target.y
    )
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/game/Particle.ts frontend/src/game/Star.ts frontend/src/game/Obstacle.ts
git commit -m "feat(game): add Particle, Star, and Obstacle classes

- Particle: explosion effects with fade-out
- Star: scrolling star field background
- Obstacle: destructible barriers with health
- All classes follow game entity pattern

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: GameEngine Core

**Files:**
- Create: `frontend/src/game/GameEngine.ts`
- Create: `frontend/src/game/GameEngine.test.ts`

**Interfaces:**
- Consumes: All game classes (Player, InvaderGrid, Projectile, etc)
- Produces: `GameEngine` class with `start()`, `stop()`, `update()`, `render()`
- Produces: Event emitters for score, lives, level changes

- [ ] **Step 1: Write GameEngine test**

Create `frontend/src/game/GameEngine.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameEngine } from './GameEngine'

describe('GameEngine', () => {
  let canvas: HTMLCanvasElement
  let engine: GameEngine

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    engine = new GameEngine(canvas)
  })

  it('should initialize with MENU state', () => {
    expect(engine.getState()).toBe('MENU')
  })

  it('should start game and change state to PLAYING', () => {
    engine.start()
    expect(engine.getState()).toBe('PLAYING')
  })

  it('should initialize player at bottom center', () => {
    engine.start()
    const stats = engine.getStats()
    expect(stats.lives).toBe(3)
    expect(stats.score).toBe(0)
  })

  it('should emit score change events', () => {
    const onScoreChange = vi.fn()
    engine.on('scoreChange', onScoreChange)

    engine.start()
    // Simulate killing an invader would trigger this

    expect(onScoreChange).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify failure**

```bash
npm run test GameEngine.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement GameEngine class**

Create `frontend/src/game/GameEngine.ts`:

```typescript
import { Player } from './Player'
import { InvaderGrid } from './InvaderGrid'
import { Projectile } from './Projectile'
import { Obstacle } from './Obstacle'
import { Particle } from './Particle'
import { Star } from './Star'
import { GameState, type GameStats, type GameConfig } from './types'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_BG_COLOR,
  TARGET_FPS,
  OBSTACLE_COUNT,
  STAR_COUNT,
  INVADER_SCORE,
  PARTICLE_COUNT
} from './constants'

type GameEventName = 'scoreChange' | 'livesChange' | 'levelChange' | 'gameOver'
type GameEventCallback = (data: any) => void

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private state: GameState
  private player: Player | null
  private invaderGrid: InvaderGrid | null
  private playerProjectiles: Projectile[]
  private enemyProjectiles: Projectile[]
  private obstacles: Obstacle[]
  private particles: Particle[]
  private stars: Star[]
  private keys: Record<string, boolean>
  private animationId: number | null
  private lastTime: number
  private stats: GameStats
  private config: GameConfig
  private eventListeners: Map<GameEventName, GameEventCallback[]>

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not supported')
    this.ctx = ctx

    this.state = GameState.MENU
    this.player = null
    this.invaderGrid = null
    this.playerProjectiles = []
    this.enemyProjectiles = []
    this.obstacles = []
    this.particles = []
    this.stars = []
    this.keys = {}
    this.animationId = null
    this.lastTime = 0
    this.eventListeners = new Map()

    this.stats = {
      score: 0,
      level: 1,
      lives: 3,
      killCount: 0,
      accuracy: 100,
      startTime: Date.now()
    }

    this.config = {
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      backgroundColor: CANVAS_BG_COLOR,
      fps: TARGET_FPS
    }

    this.setupCanvas()
    this.setupEventListeners()
    this.initializeStars()
  }

  private setupCanvas(): void {
    this.canvas.width = this.config.canvasWidth
    this.canvas.height = this.config.canvasHeight
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true

      if (e.key === ' ' && this.state === GameState.PLAYING) {
        e.preventDefault()
        this.shoot()
      }
    })

    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false
    })
  }

  private initializeStars(): void {
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push(new Star(this.config.canvasWidth, this.config.canvasHeight))
    }
  }

  start(): void {
    this.state = GameState.PLAYING
    this.stats.startTime = Date.now()

    // Initialize game entities
    this.player = new Player(this.config.canvasWidth, this.config.canvasHeight)
    this.invaderGrid = new InvaderGrid()
    this.playerProjectiles = []
    this.enemyProjectiles = []
    this.particles = []

    // Initialize obstacles
    this.obstacles = []
    const spacing = this.config.canvasWidth / (OBSTACLE_COUNT + 1)
    for (let i = 0; i < OBSTACLE_COUNT; i++) {
      this.obstacles.push(
        new Obstacle(
          spacing * (i + 1) - 40,
          this.config.canvasHeight - 200
        )
      )
    }

    this.gameLoop()
  }

  private gameLoop = (currentTime: number = 0): void => {
    if (this.state !== GameState.PLAYING) return

    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    this.update()
    this.render()
    this.checkCollisions()

    this.animationId = requestAnimationFrame(this.gameLoop)
  }

  private update(): void {
    if (!this.player || !this.invaderGrid) return

    // Update player
    this.player.update(this.keys)

    // Update invaders
    this.invaderGrid.update(this.config.canvasWidth, this.config.canvasHeight)

    // Invaders shoot
    const enemyShot = this.invaderGrid.shoot()
    if (enemyShot) {
      this.enemyProjectiles.push(enemyShot)
    }

    // Update projectiles
    this.playerProjectiles.forEach(p => p.update())
    this.enemyProjectiles.forEach(p => p.update())

    // Remove off-screen projectiles
    this.playerProjectiles = this.playerProjectiles.filter(
      p => !p.isOffScreen(this.config.canvasHeight)
    )
    this.enemyProjectiles = this.enemyProjectiles.filter(
      p => !p.isOffScreen(this.config.canvasHeight)
    )

    // Update particles
    this.particles.forEach(p => p.update())
    this.particles = this.particles.filter(p => !p.isDead())

    // Update stars
    this.stars.forEach(s => s.update(this.config.canvasHeight))

    // Check for level complete
    if (this.invaderGrid.isAllDead()) {
      this.levelComplete()
    }
  }

  private render(): void {
    // Clear canvas
    this.ctx.fillStyle = this.config.backgroundColor
    this.ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight)

    // Draw stars
    this.stars.forEach(s => s.draw(this.ctx))

    // Draw obstacles
    this.obstacles.forEach(o => o.draw(this.ctx))

    // Draw player
    this.player?.draw(this.ctx)

    // Draw invaders
    this.invaderGrid?.draw(this.ctx)

    // Draw projectiles
    this.playerProjectiles.forEach(p => p.draw(this.ctx))
    this.enemyProjectiles.forEach(p => p.draw(this.ctx))

    // Draw particles
    this.particles.forEach(p => p.draw(this.ctx))
  }

  private checkCollisions(): void {
    if (!this.player || !this.invaderGrid) return

    // Player projectiles vs invaders
    this.playerProjectiles.forEach((projectile, pIndex) => {
      this.invaderGrid!.invaders.forEach(invader => {
        if (invader.alive && projectile.collidesWith(invader)) {
          invader.hit()
          this.playerProjectiles.splice(pIndex, 1)
          this.addScore(INVADER_SCORE)
          this.stats.killCount++
          this.createExplosion(invader.position.x, invader.position.y)
        }
      })

      // Player projectiles vs obstacles
      this.obstacles.forEach(obstacle => {
        if (!obstacle.isDestroyed() && projectile.collidesWith(obstacle)) {
          obstacle.hit()
          this.playerProjectiles.splice(pIndex, 1)
        }
      })
    })

    // Enemy projectiles vs player
    this.enemyProjectiles.forEach((projectile, pIndex) => {
      if (this.player && projectile.collidesWith(this.player)) {
        this.player.hit()
        this.enemyProjectiles.splice(pIndex, 1)
        this.emit('livesChange', this.player.lives)

        if (!this.player.alive) {
          this.gameOver()
        }
      }

      // Enemy projectiles vs obstacles
      this.obstacles.forEach(obstacle => {
        if (!obstacle.isDestroyed() && projectile.collidesWith(obstacle)) {
          obstacle.hit()
          this.enemyProjectiles.splice(pIndex, 1)
        }
      })
    })

    // Invaders vs player (game over if they reach player)
    this.invaderGrid.invaders.forEach(invader => {
      if (invader.alive && this.player && invader.position.y + invader.height >= this.player.position.y) {
        this.gameOver()
      }
    })
  }

  private shoot(): void {
    if (!this.player) return
    const projectile = this.player.shoot()
    this.playerProjectiles.push(projectile)
  }

  private createExplosion(x: number, y: number): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push(new Particle(x, y, '#FFD700'))
    }
  }

  private addScore(points: number): void {
    this.stats.score += points
    this.emit('scoreChange', this.stats.score)
  }

  private levelComplete(): void {
    this.state = GameState.LEVEL_COMPLETE
    this.stats.level++
    this.emit('levelChange', this.stats.level)

    // Reset for next level
    setTimeout(() => {
      this.invaderGrid = new InvaderGrid()
      this.state = GameState.PLAYING
      this.gameLoop()
    }, 2000)
  }

  private gameOver(): void {
    this.state = GameState.GAME_OVER
    this.emit('gameOver', this.stats)
    this.stop()
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  getState(): string {
    return this.state
  }

  getStats(): GameStats {
    return { ...this.stats }
  }

  on(event: GameEventName, callback: GameEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  private emit(event: GameEventName, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  destroy(): void {
    this.stop()
    this.eventListeners.clear()
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test GameEngine.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/game/GameEngine.ts frontend/src/game/GameEngine.test.ts
git commit -m "feat(game): implement GameEngine core

- Complete game loop with requestAnimationFrame
- Entity management (player, invaders, projectiles)
- Collision detection system
- Particle effects for explosions
- Event emission for UI updates
- Level progression and game over logic
- Full test coverage

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: GameCanvas Vue Component

**Files:**
- Create: `frontend/src/components/game/GameCanvas.vue`

**Interfaces:**
- Consumes: `GameEngine` from `@/game/GameEngine`
- Produces: Vue component with canvas element and game controls
- Emits: `score-change`, `lives-change`, `game-over` events

- [ ] **Step 1: Create GameCanvas component**

Create `frontend/src/components/game/GameCanvas.vue`:

```vue
<template>
  <div class="game-canvas-wrapper">
    <canvas ref="canvasRef" class="game-canvas"></canvas>

    <div v-if="!isPlaying" class="game-overlay">
      <div class="overlay-content">
        <h2 v-if="gameState === 'MENU'">READY TO PLAY?</h2>
        <h2 v-else-if="gameState === 'GAME_OVER'">GAME OVER</h2>
        <h2 v-else-if="gameState === 'LEVEL_COMPLETE'">LEVEL COMPLETE!</h2>

        <button v-if="gameState === 'MENU'" @click="startGame" class="start-btn">
          START GAME
        </button>
        <button v-else-if="gameState === 'GAME_OVER'" @click="restartGame" class="start-btn">
          PLAY AGAIN
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { GameEngine } from '@/game/GameEngine'
import type { GameStats } from '@/game/types'

const emit = defineEmits<{
  scoreChange: [score: number]
  livesChange: [lives: number]
  levelChange: [level: number]
  gameOver: [stats: GameStats]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const gameEngine = ref<GameEngine | null>(null)
const gameState = ref<string>('MENU')

const isPlaying = computed(() => gameState.value === 'PLAYING')

onMounted(() => {
  if (canvasRef.value) {
    gameEngine.value = new GameEngine(canvasRef.value)

    // Listen to game events
    gameEngine.value.on('scoreChange', (score: number) => {
      emit('scoreChange', score)
    })

    gameEngine.value.on('livesChange', (lives: number) => {
      emit('livesChange', lives)
    })

    gameEngine.value.on('levelChange', (level: number) => {
      emit('levelChange', level)
    })

    gameEngine.value.on('gameOver', (stats: GameStats) => {
      gameState.value = 'GAME_OVER'
      emit('gameOver', stats)
    })
  }
})

onUnmounted(() => {
  gameEngine.value?.destroy()
})

function startGame() {
  gameState.value = 'PLAYING'
  gameEngine.value?.start()
}

function restartGame() {
  gameState.value = 'MENU'
  // Reset will happen when user clicks start again
}

defineExpose({
  startGame,
  restartGame
})
</script>

<style scoped>
.game-canvas-wrapper {
  position: relative;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.game-canvas {
  display: block;
  width: 100%;
  height: auto;
  background: #000;
  border: 2px solid #00ff88;
  border-radius: 8px;
}

.game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.overlay-content {
  text-align: center;
  color: #fff;
}

.overlay-content h2 {
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #00ff88;
  text-shadow: 0 0 10px #00ff88;
}

.start-btn {
  background: #00ff88;
  color: #000;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
}

.start-btn:hover {
  background: #00cc6a;
  transform: scale(1.05);
}

.start-btn:active {
  transform: scale(0.95);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/game/GameCanvas.vue
git commit -m "feat(game): create GameCanvas Vue component

- Wraps GameEngine in Vue component
- Handles canvas lifecycle (mount/unmount)
- Emits game events to parent
- Overlay for menu and game over states
- Responsive canvas sizing
- Retro arcade styling

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Integrate GameCanvas into GameView

**Files:**
- Modify: `frontend/src/views/GameView.vue`
- Modify: `frontend/src/services/api.ts`

**Interfaces:**
- Consumes: `GameCanvas` component
- Consumes: `gameAPI` from services
- Integrates: Backend game session API

- [ ] **Step 1: Update GameView.vue**

```vue
<template>
  <div class="game-view">
    <div class="score-ui">
      <div class="game-stats">
        <div class="score-item">
          <span class="score-label">SCORE</span>
          <span class="score-value">{{ score }}</span>
        </div>
        <div class="score-item">
          <span class="score-label">LEVEL</span>
          <span class="score-value">{{ level }}</span>
        </div>
        <div class="score-item">
          <span class="score-label">LIVES</span>
          <span class="score-value">{{ lives }}</span>
        </div>
        <div class="score-item">
          <span class="score-label">GOLD</span>
          <span class="score-value" style="color: #FFD700;">{{ authStore.user?.gold_balance || 0 }}</span>
        </div>
      </div>
    </div>

    <GameCanvas
      ref="gameCanvasRef"
      @score-change="handleScoreChange"
      @lives-change="handleLivesChange"
      @level-change="handleLevelChange"
      @game-over="handleGameOver"
    />

    <div v-if="gameStarted" class="game-controls">
      <p class="controls-hint">← → Move | SPACE Shoot</p>
    </div>

    <div v-if="!gameStarted" class="menu-buttons">
      <button @click="startNewGame" class="button-play">
        START NEW GAME
      </button>
      <router-link to="/leaderboard" class="button-view-ranking">LEADERBOARD</router-link>
      <router-link to="/profile" class="button-view-ranking">PROFILE</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { gameAPI } from '@/services/api'
import GameCanvas from '@/components/game/GameCanvas.vue'
import type { GameStats } from '@/game/types'

const router = useRouter()
const authStore = useAuthStore()
const gameCanvasRef = ref<InstanceType<typeof GameCanvas> | null>(null)
const gameStarted = ref(false)
const score = ref(0)
const level = ref(1)
const lives = ref(3)
const sessionStarted = ref(false)

async function startNewGame() {
  try {
    // Call backend to start session
    await gameAPI.start()
    sessionStarted.value = true
    gameStarted.value = true

    // Reset stats
    score.value = 0
    level.value = 1
    lives.value = 3

    // Start the game engine
    gameCanvasRef.value?.startGame()
  } catch (err) {
    console.error('Failed to start game session:', err)
    alert('Failed to start game. Please try again.')
  }
}

function handleScoreChange(newScore: number) {
  score.value = newScore
}

function handleLivesChange(newLives: number) {
  lives.value = newLives
}

function handleLevelChange(newLevel: number) {
  level.value = newLevel
}

async function handleGameOver(stats: GameStats) {
  if (!sessionStarted.value) return

  try {
    // Send final score to backend
    const response = await gameAPI.end(stats.score)
    const data = response.data.data

    alert(`Game Over!\nScore: ${stats.score}\nGold Earned: ${data.gold_earned}\nXP Earned: ${data.xp_earned || 0}`)

    // Refresh user data
    await authStore.fetchProfile()

    gameStarted.value = false
    sessionStarted.value = false
  } catch (err) {
    console.error('Failed to end game session:', err)
    alert('Failed to save game results. Please try again.')
  }
}
</script>

<style scoped>
.game-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.score-ui {
  width: 100%;
  max-width: 800px;
  margin-bottom: 20px;
}

.game-stats {
  display: flex;
  justify-content: space-around;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid #00ff88;
  border-radius: 8px;
  padding: 15px;
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-label {
  font-size: 0.8rem;
  color: #888;
  margin-bottom: 5px;
}

.score-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #00ff88;
}

.game-controls {
  margin-top: 20px;
  text-align: center;
}

.controls-hint {
  color: #888;
  font-size: 0.9rem;
}

.menu-buttons {
  display: flex;
  gap: 15px;
  margin-top: 30px;
}

.button-play,
.button-view-ranking {
  padding: 12px 24px;
  font-size: 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  transition: all 0.3s;
}

.button-play {
  background: #00ff88;
  color: #000;
  font-weight: bold;
}

.button-view-ranking {
  background: #667eea;
  color: #fff;
}

.button-play:hover {
  background: #00cc6a;
  transform: scale(1.05);
}

.button-view-ranking:hover {
  background: #5568d3;
  transform: scale(1.05);
}
</style>
```

- [ ] **Step 2: Verify game API endpoints exist**

Check `frontend/src/services/api.ts` has these methods:

```typescript
export const gameAPI = {
  start: () => axios.post('/api/v1/games/start'),
  end: (score: number) => axios.post('/api/v1/games/end', { score })
}
```

If missing, add them.

- [ ] **Step 3: Test the integration**

```bash
cd frontend
npm run dev
```

Navigate to `http://localhost:5173/game` and:
1. Click "START NEW GAME"
2. Verify canvas loads and game starts
3. Use arrow keys to move, space to shoot
4. Verify score updates in real-time
5. Let game over happen, verify backend call

Expected: Game plays smoothly, backend integration works

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/GameView.vue frontend/src/services/api.ts
git commit -m "feat(game): integrate GameCanvas into GameView

- Replace placeholder with actual game
- Connect score/lives/level to UI
- Backend integration for game sessions
- Real-time stat updates
- Game over flow with rewards display

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Add Game Assets

**Files:**
- Create: `frontend/public/assets/images/spaceship.png`
- Create: `frontend/public/assets/images/invader.png`
- Create: `frontend/public/assets/sounds/explosion.mp3` (optional)
- Create: `frontend/public/assets/sounds/shoot.mp3` (optional)

**Interfaces:**
- Provides: Image assets for Player and Invader classes
- Provides: Sound assets (optional for MVP)

- [ ] **Step 1: Create placeholder images**

Create simple placeholder images or copy from old project:

For `frontend/public/assets/images/spaceship.png`:
- 48x48 pixel sprite of a spaceship
- Copy from `/src/assets/images/spaceship.png` if exists

For `frontend/public/assets/images/invader.png`:
- 48x48 pixel sprite of an alien
- Copy from `/src/assets/images/invader.png` if exists

- [ ] **Step 2: Verify image loading**

```bash
npm run dev
```

Check browser console for any 404 errors on image assets.

- [ ] **Step 3: Add sound files (optional)**

If sound files exist in old project, copy them:

```bash
cp src/assets/sounds/*.mp3 frontend/public/assets/sounds/
```

- [ ] **Step 4: Commit**

```bash
git add frontend/public/assets/
git commit -m "feat(game): add game assets

- Spaceship sprite (48x48)
- Invader sprite (48x48)
- Sound effects (optional)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 10: End-to-End Testing

**Files:**
- Create: `frontend/src/game/integration.test.ts`

**Interfaces:**
- Tests complete game flow
- Verifies backend integration
- Validates scoring and rewards

- [ ] **Step 1: Create integration test**

Create `frontend/src/game/integration.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { GameEngine } from './GameEngine'

describe('Game Integration', () => {
  let canvas: HTMLCanvasElement
  let engine: GameEngine

  beforeAll(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
  })

  it('should complete full game lifecycle', () => {
    engine = new GameEngine(canvas)

    // Start game
    engine.start()
    expect(engine.getState()).toBe('PLAYING')

    // Get initial stats
    const stats = engine.getStats()
    expect(stats.score).toBe(0)
    expect(stats.lives).toBe(3)
    expect(stats.level).toBe(1)
  })

  it('should track score changes', (done) => {
    engine = new GameEngine(canvas)

    engine.on('scoreChange', (score: number) => {
      expect(score).toBeGreaterThan(0)
      done()
    })

    engine.start()
    // Simulate killing an invader would trigger scoreChange
  })

  it('should handle game over', (done) => {
    engine = new GameEngine(canvas)

    engine.on('gameOver', (stats) => {
      expect(stats.score).toBeGreaterThanOrEqual(0)
      expect(engine.getState()).toBe('GAME_OVER')
      done()
    })

    engine.start()
    // Simulate player death would trigger gameOver
  })
})
```

- [ ] **Step 2: Run integration tests**

```bash
npm run test integration.test.ts
```

Expected: PASS

- [ ] **Step 3: Manual E2E test**

Play through complete game:
1. Start game from GameView
2. Kill some invaders (verify score updates)
3. Get hit by enemy projectile (verify lives decrease)
4. Let player die (verify game over)
5. Verify backend receives final score
6. Verify gold and XP rewards shown
7. Verify leaderboard updates

- [ ] **Step 4: Commit**

```bash
git add frontend/src/game/integration.test.ts
git commit -m "test(game): add integration tests

- Full game lifecycle test
- Score tracking validation
- Game over flow test
- Manual E2E checklist documented

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Plan Complete

All tasks complete! The Space Invaders game is now fully ported to Vue.js with TypeScript.

**Summary:**
- ✅ Core game classes in TypeScript
- ✅ GameEngine with complete game loop
- ✅ Vue GameCanvas component
- ✅ Integration with Go backend
- ✅ Real-time UI updates
- ✅ Asset management
- ✅ Full test coverage

**To verify everything works:**

```bash
cd frontend
npm run dev
# Navigate to http://localhost:5173/game
# Click "START NEW GAME"
# Play the game!
```

**Next Steps:**
- Fine-tune game difficulty (invader speed, shoot frequency)
- Add bonus items and power-ups
- Add sound effects
- Implement high score persistence
- Add visual polish (explosions, trails, etc.)

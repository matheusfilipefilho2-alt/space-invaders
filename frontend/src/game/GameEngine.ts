import { Player } from './Player'
import { InvaderGrid } from './InvaderGrid'
import { Projectile } from './Projectile'
import { Obstacle } from './Obstacle'
import { Particle } from './Particle'
import { Star } from './Star'
import { GameState, type GameStats, type GameConfig } from './types'
import {
  CANVAS_BG_COLOR,
  TARGET_FPS,
  OBSTACLE_COUNT,
  OBSTACLE_WIDTH,
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
      canvasWidth: window.innerWidth,
      canvasHeight: window.innerHeight,
      backgroundColor: CANVAS_BG_COLOR,
      fps: TARGET_FPS
    }

    this.setupCanvas()
    this.setupEventListeners()
    this.initializeStars()
    this.handleResize()
  }

  private setupCanvas(): void {
    this.canvas.width = this.config.canvasWidth
    this.canvas.height = this.config.canvasHeight
    this.ctx.imageSmoothingEnabled = false
  }

  private handleResize(): void {
    window.addEventListener('resize', () => {
      this.config.canvasWidth = window.innerWidth
      this.config.canvasHeight = window.innerHeight
      this.setupCanvas()

      // Reinitialize stars with new dimensions
      this.stars = []
      this.initializeStars()
    })
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
    this.invaderGrid = new InvaderGrid(this.config.canvasWidth)
    this.playerProjectiles = []
    this.enemyProjectiles = []
    this.particles = []

    // Initialize obstacles
    this.obstacles = []
    const spacing = this.config.canvasWidth / (OBSTACLE_COUNT + 1)
    for (let i = 0; i < OBSTACLE_COUNT; i++) {
      this.obstacles.push(
        new Obstacle(
          spacing * (i + 1) - (OBSTACLE_WIDTH / 2),
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

    // Update projectiles (with null check)
    this.playerProjectiles = this.playerProjectiles.filter(p => p !== null && p !== undefined)
    this.enemyProjectiles = this.enemyProjectiles.filter(p => p !== null && p !== undefined)

    this.playerProjectiles.forEach(p => p.update())
    this.enemyProjectiles.forEach(p => p.update())

    // Remove off-screen projectiles
    this.playerProjectiles = this.playerProjectiles.filter(
      p => !p.isOffScreen(this.config.canvasHeight)
    )
    this.enemyProjectiles = this.enemyProjectiles.filter(
      p => !p.isOffScreen(this.config.canvasHeight)
    )

    // Update particles (with null check)
    this.particles = this.particles.filter(p => p !== null && p !== undefined)
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

    const playerProjectilesToRemove = new Set<number>()
    const enemyProjectilesToRemove = new Set<number>()

    // Player projectiles vs invaders
    this.playerProjectiles.forEach((projectile, pIndex) => {
      if (playerProjectilesToRemove.has(pIndex)) return

      this.invaderGrid!.invaders.forEach(invader => {
        if (invader.alive && projectile.collidesWith(invader)) {
          invader.hit()
          playerProjectilesToRemove.add(pIndex)
          this.addScore(INVADER_SCORE)
          this.stats.killCount++
          this.createExplosion(invader.position.x, invader.position.y)
        }
      })

      // Player projectiles vs obstacles
      if (!playerProjectilesToRemove.has(pIndex)) {
        this.obstacles.forEach(obstacle => {
          if (obstacle.collidesWithProjectile(projectile)) {
            playerProjectilesToRemove.add(pIndex)
            this.createExplosion(projectile.position.x, projectile.position.y, obstacle.color)
          }
        })
      }
    })

    // Enemy projectiles vs player
    this.enemyProjectiles.forEach((projectile, pIndex) => {
      if (enemyProjectilesToRemove.has(pIndex)) return

      if (this.player && projectile.collidesWith(this.player)) {
        this.player.hit()
        enemyProjectilesToRemove.add(pIndex)
        this.emit('livesChange', this.player.lives)

        if (!this.player.alive) {
          this.gameOver()
        }
      }

      // Enemy projectiles vs obstacles
      if (!enemyProjectilesToRemove.has(pIndex)) {
        this.obstacles.forEach(obstacle => {
          if (obstacle.collidesWithProjectile(projectile)) {
            enemyProjectilesToRemove.add(pIndex)
            this.createExplosion(projectile.position.x, projectile.position.y, obstacle.color)
          }
        })
      }
    })

    // Remove marked projectiles
    this.playerProjectiles = this.playerProjectiles.filter((_, index) => !playerProjectilesToRemove.has(index))
    this.enemyProjectiles = this.enemyProjectiles.filter((_, index) => !enemyProjectilesToRemove.has(index))

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

  private createExplosion(x: number, y: number, color: string = '#FFD700'): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push(new Particle(x, y, color))
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
      this.invaderGrid = new InvaderGrid(this.config.canvasWidth)
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

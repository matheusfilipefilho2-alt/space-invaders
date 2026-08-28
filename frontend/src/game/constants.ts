// Canvas
export const CANVAS_WIDTH = 800
export const CANVAS_HEIGHT = 600
export const CANVAS_BG_COLOR = '#050519'
export const TARGET_FPS = 60

// Player
export const PLAYER_WIDTH = 96
export const PLAYER_HEIGHT = 96
export const PLAYER_VELOCITY = 10
export const PLAYER_INITIAL_LIVES = 1
export const PLAYER_MAX_LIVES = 1

// Projectile
export const PROJECTILE_WIDTH = 2
export const PROJECTILE_HEIGHT = 20
export const PROJECTILE_VELOCITY = 10
export const PROJECTILE_COLOR = 'white'

// Invaders
export const INVADER_WIDTH = 48
export const INVADER_HEIGHT = 48
export const INVADER_ROWS = 3
export const INVADER_COLUMNS = 6
export const INVADER_SPACING = 12
export const INVADER_VELOCITY_X = 3
export const INVADER_VELOCITY_Y = 30
export const INVADER_SHOOT_PROBABILITY = 0.002

// Obstacles
export const OBSTACLE_COUNT = 3
export const OBSTACLE_WIDTH = 100
export const OBSTACLE_HEIGHT = 20
export const OBSTACLE_COLOR = 'crimson'

// Particles
export const PARTICLE_COUNT = 15
export const PARTICLE_SIZE = 2
export const PARTICLE_VELOCITY = 1.5
export const PARTICLE_FADE_RATE = 0.02

// Stars
export const STAR_COUNT = 100
export const STAR_MIN_RADIUS = 0.3
export const STAR_MAX_RADIUS = 1.3

// Scoring
export const INVADER_SCORE = 100
export const BONUS_SCORE = 500
export const GOLD_PER_SCORE = 2000 // score / 2000 = gold earned
export const MAX_GOLD_PER_GAME = 10

// Asset Paths
export const PATH_PLAYER_IMAGE = '/assets/images/spaceship.png'
export const PATH_ENGINE_IMAGE = '/assets/images/engine.png'
export const PATH_ENGINE_SPRITES = '/assets/images/engine_sprites.png'
export const PATH_INVADER_IMAGES = [
  '/assets/images/invader.png',
  '/assets/images/invader_blue.gif',
  '/assets/images/invader_green.gif',
  '/assets/images/invader_purple.gif',
  '/assets/images/invader_red.gif'
]
export const PATH_EXPLOSION_SOUND = '/assets/sounds/explosion.mp3'
export const PATH_SHOOT_SOUND = '/assets/sounds/shoot.mp3'
export const PATH_HIT_SOUND = '/assets/sounds/hit.mp3'
export const PATH_BONUS_SOUND = '/assets/sounds/bonus.mp3'
export const PATH_NEXT_LEVEL_SOUND = '/assets/sounds/next_level.mp3'
export const PATH_LEVEL_MUSIC = [
  '/assets/sounds/music/musica_phase1_space_invaders.mp3',
  '/assets/sounds/music/musica_phase2_space_invaders.mp3',
  '/assets/sounds/music/musica_phase3_space_invaders.mp3'
]
export const PATH_MENU_MUSIC = '/assets/sounds/music/space_menu_full_mix.wav'

// Animation
export const INITIAL_FRAMES = 10

// Difficulty Modifiers
export const DIFFICULTY_MODIFIERS = {
  easy: {
    invaderSpeedMultiplier: 0.7,
    shootProbabilityMultiplier: 0.5,
    enemyProjectileSpeedMultiplier: 0.8
  },
  normal: {
    invaderSpeedMultiplier: 1.0,
    shootProbabilityMultiplier: 1.0,
    enemyProjectileSpeedMultiplier: 1.0
  },
  hard: {
    invaderSpeedMultiplier: 1.5,
    shootProbabilityMultiplier: 2.0,
    enemyProjectileSpeedMultiplier: 1.3
  }
} as const

// Graphics Quality Settings
export const GRAPHICS_QUALITY_SETTINGS = {
  low: {
    particleCount: 5,
    enableVisualEffects: false,
    starCount: 50
  },
  medium: {
    particleCount: 10,
    enableVisualEffects: true,
    starCount: 75
  },
  high: {
    particleCount: 15,
    enableVisualEffects: true,
    starCount: 100
  }
} as const

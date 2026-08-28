import type { Position } from './types'
import { Projectile } from './Projectile'

export enum WeaponType {
  NORMAL = 'normal',
  LASER = 'laser',
  SPREAD = 'spread',
  MISSILE = 'missile',
  BOMB = 'bomb',
  LIGHTNING = 'lightning'
}

export interface WeaponStats {
  name: string
  damage: number
  cooldown: number // milliseconds
  duration: number // milliseconds (how long the weapon lasts)
  ammo: number // -1 for infinite (power-up based weapons)
  description: string
  color: string
  icon: string
}

export const WEAPON_STATS: Record<WeaponType, WeaponStats> = {
  [WeaponType.NORMAL]: {
    name: 'Normal Shot',
    damage: 1,
    cooldown: 333, // 3 shots per second
    duration: -1, // infinite
    ammo: -1, // infinite
    description: 'Standard weapon',
    color: '#FFFFFF',
    icon: '•'
  },
  [WeaponType.LASER]: {
    name: 'Laser Beam',
    damage: 2,
    cooldown: 100, // very fast firing
    duration: 15000, // 10 seconds
    ammo: -1, // time-based
    description: 'Continuous beam that pierces enemies',
    color: '#FF0000',
    icon: '━'
  },
  [WeaponType.SPREAD]: {
    name: 'Spread Shot',
    damage: 1,
    cooldown: 300,
    duration: 15000, // 15 seconds
    ammo: -1, // time-based
    description: 'Fires 5 projectiles in a spread pattern',
    color: '#00FFFF',
    icon: '※'
  },
  [WeaponType.MISSILE]: {
    name: 'Homing Missile',
    damage: 3,
    cooldown: 1000,
    duration: -1,
    ammo: 10, // limited ammo
    description: 'Seeks and destroys nearest enemy',
    color: '#FFA500',
    icon: '⬆'
  },
  [WeaponType.BOMB]: {
    name: 'Area Bomb',
    damage: 5,
    cooldown: 300,
    duration: -1,
    ammo: 5, // limited ammo
    description: 'Explodes in a large area',
    color: '#FF00FF',
    icon: '💣'
  },
  [WeaponType.LIGHTNING]: {
    name: 'Chain Lightning',
    damage: 2,
    cooldown: 300,
    duration: 15000, // 12 seconds
    ammo: -1, // time-based
    description: 'Electricity chains between enemies',
    color: '#FFFF00',
    icon: '⚡'
  }
}

export class Weapon {
  type: WeaponType
  stats: WeaponStats
  currentAmmo: number
  activatedAt: number
  lastFireTime: number

  constructor(type: WeaponType) {
    this.type = type
    this.stats = WEAPON_STATS[type]
    this.currentAmmo = this.stats.ammo
    this.activatedAt = Date.now()
    this.lastFireTime = 0
  }

  canFire(): boolean {
    const now = Date.now()

    // Check cooldown
    if (now - this.lastFireTime < this.stats.cooldown) {
      return false
    }

    // Check duration (for time-based weapons)
    if (this.stats.duration > 0 && now - this.activatedAt > this.stats.duration) {
      return false
    }

    // Check ammo (for ammo-based weapons)
    if (this.stats.ammo > 0 && this.currentAmmo <= 0) {
      return false
    }

    return true
  }

  fire(playerX: number, playerY: number): Projectile[] {
    if (!this.canFire()) {
      return []
    }

    this.lastFireTime = Date.now()

    // Decrease ammo if applicable
    if (this.stats.ammo > 0) {
      this.currentAmmo--
    }

    return this.createProjectiles(playerX, playerY)
  }

  private createProjectiles(playerX: number, playerY: number): Projectile[] {
    const projectiles: Projectile[] = []
    const centerX = playerX + 48 // Player width / 2

    switch (this.type) {
      case WeaponType.NORMAL:
        // Single straight shot
        projectiles.push(new Projectile(centerX, playerY, true, 'normal'))
        break

      case WeaponType.LASER:
        // Fast straight shot (laser effect achieved by rapid fire)
        projectiles.push(new Projectile(centerX, playerY, true, 'laser'))
        break

      case WeaponType.SPREAD:
        // 5 projectiles in a spread pattern
        const angles = [-30, -15, 0, 15, 30]
        angles.forEach(angle => {
          const projectile = new Projectile(centerX, playerY, true, 'spread')
          projectile.angle = angle
          projectiles.push(projectile)
        })
        break

      case WeaponType.MISSILE:
        // Homing missile
        projectiles.push(new Projectile(centerX, playerY, true, 'missile'))
        break

      case WeaponType.BOMB:
        // Bomb projectile
        projectiles.push(new Projectile(centerX, playerY, true, 'bomb'))
        break

      case WeaponType.LIGHTNING:
        // Lightning projectile
        projectiles.push(new Projectile(centerX, playerY, true, 'lightning'))
        break
    }

    return projectiles
  }

  isExpired(): boolean {
    const now = Date.now()

    // Time-based expiration
    if (this.stats.duration > 0 && now - this.activatedAt > this.stats.duration) {
      return true
    }

    // Ammo-based expiration
    if (this.stats.ammo > 0 && this.currentAmmo <= 0) {
      return true
    }

    return false
  }

  getTimeLeft(): number {
    if (this.stats.duration <= 0) return -1
    const elapsed = Date.now() - this.activatedAt
    return Math.max(0, this.stats.duration - elapsed)
  }

  getAmmoLeft(): number {
    return this.currentAmmo
  }

  getRemainingPercent(): number {
    if (this.stats.duration > 0) {
      const timeLeft = this.getTimeLeft()
      return (timeLeft / this.stats.duration) * 100
    }

    if (this.stats.ammo > 0) {
      return (this.currentAmmo / this.stats.ammo) * 100
    }

    return 100
  }
}

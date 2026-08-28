export interface Skin {
  id: string
  name: string
  description: string
  shipImage: string
  engineImage: string
  engineSprites: string
  projectileColor: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlocked: boolean
  price?: number // Gold price to unlock (undefined if free)
}

export const AVAILABLE_SKINS: Skin[] = [
  {
    id: 'default',
    name: 'Classic',
    description: 'A nave clássica do Space Invaders',
    shipImage: '/assets/images/spaceship.png',
    engineImage: '/assets/images/engine.png',
    engineSprites: '/assets/images/engine_sprites.png',
    projectileColor: '#FFFFFF',
    rarity: 'common',
    unlocked: true
  },
  {
    id: 'blue',
    name: 'Blue Comet',
    description: 'Nave azul com rastro cósmico',
    shipImage: '/assets/images/spaceship.png', // TODO: Add blue variant
    engineImage: '/assets/images/engine.png',
    engineSprites: '/assets/images/engine_sprites.png',
    projectileColor: '#00D4FF',
    rarity: 'common',
    unlocked: true
  },
  {
    id: 'red',
    name: 'Red Phoenix',
    description: 'Nave vermelha com poder de fogo intenso',
    shipImage: '/assets/images/spaceship.png', // TODO: Add red variant
    engineImage: '/assets/images/engine.png',
    engineSprites: '/assets/images/engine_sprites.png',
    projectileColor: '#FF0044',
    rarity: 'rare',
    unlocked: false,
    price: 500
  },
  {
    id: 'gold',
    name: 'Golden Eagle',
    description: 'Nave dourada de elite',
    shipImage: '/assets/images/spaceship.png', // TODO: Add gold variant
    engineImage: '/assets/images/engine.png',
    engineSprites: '/assets/images/engine_sprites.png',
    projectileColor: '#FFD700',
    rarity: 'epic',
    unlocked: false,
    price: 1000
  },
  {
    id: 'rainbow',
    name: 'Rainbow Star',
    description: 'Nave lendária com efeitos especiais',
    shipImage: '/assets/images/spaceship.png', // TODO: Add rainbow variant
    engineImage: '/assets/images/engine.png',
    engineSprites: '/assets/images/engine_sprites.png',
    projectileColor: '#FF00FF',
    rarity: 'legendary',
    unlocked: false,
    price: 2500
  }
]

export class SkinManager {
  private static readonly STORAGE_KEY = 'space_invaders_selected_skin'
  private static readonly UNLOCKED_SKINS_KEY = 'space_invaders_unlocked_skins'

  static getSelectedSkin(): Skin {
    try {
      const savedSkinId = localStorage.getItem(this.STORAGE_KEY)
      if (savedSkinId) {
        const skin = AVAILABLE_SKINS.find(s => s.id === savedSkinId)
        if (skin && this.isSkinUnlocked(skin.id)) {
          return skin
        }
      }
    } catch (err) {
      console.warn('Failed to load selected skin:', err)
    }

    // Return default skin if nothing saved or skin not found
    return AVAILABLE_SKINS[0]
  }

  static selectSkin(skinId: string): boolean {
    const skin = AVAILABLE_SKINS.find(s => s.id === skinId)
    if (!skin || !this.isSkinUnlocked(skinId)) {
      return false
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, skinId)
      return true
    } catch (err) {
      console.warn('Failed to save selected skin:', err)
      return false
    }
  }

  static isSkinUnlocked(skinId: string): boolean {
    const skin = AVAILABLE_SKINS.find(s => s.id === skinId)
    if (!skin) return false

    // Default unlocked skins
    if (skin.unlocked) return true

    // Check unlocked skins in localStorage
    try {
      const unlockedSkins = this.getUnlockedSkins()
      return unlockedSkins.includes(skinId)
    } catch (err) {
      return false
    }
  }

  static getUnlockedSkins(): string[] {
    try {
      const stored = localStorage.getItem(this.UNLOCKED_SKINS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (err) {
      console.warn('Failed to load unlocked skins:', err)
      return []
    }
  }

  static unlockSkin(skinId: string): boolean {
    const skin = AVAILABLE_SKINS.find(s => s.id === skinId)
    if (!skin) return false

    try {
      const unlocked = this.getUnlockedSkins()
      if (!unlocked.includes(skinId)) {
        unlocked.push(skinId)
        localStorage.setItem(this.UNLOCKED_SKINS_KEY, JSON.stringify(unlocked))
      }
      return true
    } catch (err) {
      console.warn('Failed to unlock skin:', err)
      return false
    }
  }

  static purchaseSkin(skinId: string, currentGold: number): { success: boolean; newGold?: number; error?: string } {
    const skin = AVAILABLE_SKINS.find(s => s.id === skinId)

    if (!skin) {
      return { success: false, error: 'Skin não encontrada' }
    }

    if (this.isSkinUnlocked(skinId)) {
      return { success: false, error: 'Skin já desbloqueada' }
    }

    if (!skin.price) {
      return { success: false, error: 'Skin não disponível para compra' }
    }

    if (currentGold < skin.price) {
      return { success: false, error: 'Gold insuficiente' }
    }

    if (this.unlockSkin(skinId)) {
      return { success: true, newGold: currentGold - skin.price }
    }

    return { success: false, error: 'Erro ao desbloquear skin' }
  }

  static getAllSkins(): Skin[] {
    return AVAILABLE_SKINS.map(skin => ({
      ...skin,
      unlocked: skin.unlocked || this.isSkinUnlocked(skin.id)
    }))
  }
}

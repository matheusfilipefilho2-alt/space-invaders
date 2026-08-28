export interface GameSettings {
  musicVolume: number
  sfxVolume: number
  graphicsQuality: 'low' | 'medium' | 'high'
  particlesEnabled: boolean
  visualEffects: boolean
  showFPS: boolean
  showStats: boolean
  difficulty: 'easy' | 'normal' | 'hard'
}

const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 70,
  sfxVolume: 80,
  graphicsQuality: 'high',
  particlesEnabled: true,
  visualEffects: true,
  showFPS: false,
  showStats: true,
  difficulty: 'normal'
}

export class SettingsManager {
  private static readonly STORAGE_KEY = 'space_invaders_settings'

  static getSettings(): GameSettings {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY)
      if (saved) {
        const settings = JSON.parse(saved) as GameSettings
        // Merge with defaults to ensure all fields exist
        return { ...DEFAULT_SETTINGS, ...settings }
      }
    } catch (err) {
      console.warn('Failed to load settings:', err)
    }
    return { ...DEFAULT_SETTINGS }
  }

  static saveSettings(settings: GameSettings): boolean {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings))
      return true
    } catch (err) {
      console.warn('Failed to save settings:', err)
      return false
    }
  }

  static resetToDefaults(): GameSettings {
    const defaults = { ...DEFAULT_SETTINGS }
    this.saveSettings(defaults)
    return defaults
  }

  static updateSetting<K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K]
  ): GameSettings {
    const settings = this.getSettings()
    settings[key] = value
    this.saveSettings(settings)
    return settings
  }
}

import {
  PATH_SHOOT_SOUND,
  PATH_EXPLOSION_SOUND,
  PATH_HIT_SOUND,
  PATH_BONUS_SOUND,
  PATH_NEXT_LEVEL_SOUND,
  PATH_LEVEL_MUSIC,
  PATH_MENU_MUSIC
} from './constants'

export type SoundType = 'shoot' | 'explosion' | 'hit' | 'bonus' | 'nextLevel'

export class SoundEffects {
  private sounds: Map<SoundType, HTMLAudioElement>
  private currentMusic: HTMLAudioElement | null
  private musicVolume: number
  private effectsVolume: number
  private musicEnabled: boolean
  private effectsEnabled: boolean

  constructor(musicVolume: number = 0.3, effectsVolume: number = 0.5) {
    this.sounds = new Map()
    this.currentMusic = null
    this.musicVolume = musicVolume
    this.effectsVolume = effectsVolume
    this.musicEnabled = true
    this.effectsEnabled = true

    this.loadSounds()
  }

  private loadSounds(): void {
    const soundPaths: Record<SoundType, string> = {
      shoot: PATH_SHOOT_SOUND,
      explosion: PATH_EXPLOSION_SOUND,
      hit: PATH_HIT_SOUND,
      bonus: PATH_BONUS_SOUND,
      nextLevel: PATH_NEXT_LEVEL_SOUND
    }

    Object.entries(soundPaths).forEach(([type, path]) => {
      const audio = new Audio(path)
      audio.volume = this.effectsVolume
      this.sounds.set(type as SoundType, audio)
    })
  }

  playSound(type: SoundType): void {
    if (!this.effectsEnabled) return

    const sound = this.sounds.get(type)
    if (sound) {
      // Clone the audio to allow multiple simultaneous plays
      const clone = sound.cloneNode() as HTMLAudioElement
      clone.volume = this.effectsVolume
      const playPromise = clone.play()
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn(`Failed to play sound ${type}:`, err)
        })
      }
    }
  }

  playLevelMusic(level: number): void {
    if (!this.musicEnabled) return

    // Stop current music if playing
    this.stopMusic()

    // Choose music based on level (cycle through 3 music tracks)
    const musicIndex = (level - 1) % PATH_LEVEL_MUSIC.length
    const musicPath = PATH_LEVEL_MUSIC[musicIndex]

    this.currentMusic = new Audio(musicPath)
    this.currentMusic.volume = this.musicVolume
    this.currentMusic.loop = true
    const playPromise = this.currentMusic.play()
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Failed to play level music:', err)
      })
    }
  }

  playMenuMusic(): void {
    if (!this.musicEnabled) return

    this.stopMusic()

    this.currentMusic = new Audio(PATH_MENU_MUSIC)
    this.currentMusic.volume = this.musicVolume
    this.currentMusic.loop = true
    const playPromise = this.currentMusic.play()
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Failed to play menu music:', err)
      })
    }
  }

  pauseMusic(): void {
    if (this.currentMusic && !this.currentMusic.paused) {
      this.currentMusic.pause()
    }
  }

  resumeMusic(): void {
    if (this.currentMusic && this.currentMusic.paused) {
      const playPromise = this.currentMusic.play()
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Failed to resume music:', err)
        })
      }
    }
  }

  stopMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.pause()
      this.currentMusic.currentTime = 0
      this.currentMusic = null
    }
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume))
    if (this.currentMusic) {
      this.currentMusic.volume = this.musicVolume
    }
  }

  setEffectsVolume(volume: number): void {
    this.effectsVolume = Math.max(0, Math.min(1, volume))
    this.sounds.forEach(sound => {
      sound.volume = this.effectsVolume
    })
  }

  toggleMusic(): void {
    this.musicEnabled = !this.musicEnabled
    if (!this.musicEnabled) {
      this.stopMusic()
    }
  }

  toggleEffects(): void {
    this.effectsEnabled = !this.effectsEnabled
  }

  isMusicEnabled(): boolean {
    return this.musicEnabled
  }

  isEffectsEnabled(): boolean {
    return this.effectsEnabled
  }
}

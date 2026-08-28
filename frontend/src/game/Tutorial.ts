export type TutorialStage =
  | 'welcome'
  | 'movement'
  | 'shooting'
  | 'enemies'
  | 'powerups'
  | 'complete'
  | 'skipped'

export interface TutorialMessage {
  title: string
  message: string
  highlight?: string
}

export class Tutorial {
  private stage: TutorialStage
  private isActive: boolean
  private hasSeenTutorial: boolean
  private readonly STORAGE_KEY = 'space_invaders_tutorial_completed'
  private currentMessage: TutorialMessage | null
  private messageTimeout: number | null

  constructor() {
    this.stage = 'welcome'
    this.isActive = false
    this.hasSeenTutorial = this.checkTutorialCompleted()
    this.currentMessage = null
    this.messageTimeout = null
  }

  private checkTutorialCompleted(): boolean {
    try {
      const completed = localStorage.getItem(this.STORAGE_KEY) === 'true'
      console.log(`Tutorial completion check: ${completed ? 'Already completed' : 'Not completed yet'}`)
      return completed
    } catch {
      console.warn('Failed to check tutorial completion status')
      return false
    }
  }

  private saveTutorialCompleted(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, 'true')
      console.log('Tutorial completion saved to localStorage')
    } catch (error) {
      console.warn('Failed to save tutorial completion status:', error)
    }
  }

  shouldShowTutorial(): boolean {
    return !this.hasSeenTutorial
  }

  start(): void {
    // Double-check: don't start if already completed
    if (this.hasSeenTutorial) {
      console.log('Tutorial already completed, skipping...')
      return
    }

    console.log('Starting tutorial for first-time player')
    this.isActive = true
    this.stage = 'welcome'
    this.showWelcomeMessage()
  }

  skip(): void {
    console.log('Tutorial skipped by player')
    this.isActive = false
    this.stage = 'skipped'
    this.saveTutorialCompleted()
    this.hasSeenTutorial = true
    this.currentMessage = null
  }

  complete(): void {
    console.log('Tutorial completed!')
    this.isActive = false
    this.stage = 'complete'
    this.saveTutorialCompleted()
    this.hasSeenTutorial = true
    this.showMessage({
      title: 'Tutorial Complete!',
      message: 'You\'re ready to defend Earth from the invasion!'
    }, 3000)
  }

  getStage(): TutorialStage {
    return this.stage
  }

  isRunning(): boolean {
    return this.isActive
  }

  getCurrentMessage(): TutorialMessage | null {
    return this.currentMessage
  }

  private showWelcomeMessage(): void {
    this.currentMessage = {
      title: 'Welcome to Space Invaders!',
      message: 'Earth is under attack! Use Arrow Keys or A/D to move, Spacebar to shoot.\nPress ENTER to continue or ESC to skip tutorial.',
      highlight: 'Movement: ← → or A D  |  Shoot: SPACE'
    }
  }

  advanceStage(shotsFired: number = 0, kills: number = 0): void {
    if (!this.isActive) return

    switch (this.stage) {
      case 'welcome':
        this.stage = 'movement'
        this.showMessage({
          title: 'Movement',
          message: 'Use Arrow Keys (← →) or A/D keys to move left and right.',
          highlight: 'Try moving now!'
        })
        break

      case 'movement':
        if (shotsFired > 0) {
          this.stage = 'shooting'
          this.showMessage({
            title: 'Shooting',
            message: 'Great! Press SPACEBAR to shoot at the invaders.',
            highlight: 'Destroy the enemies to protect Earth!'
          })
        }
        break

      case 'shooting':
        if (kills >= 1) {
          this.stage = 'enemies'
          this.showMessage({
            title: 'Enemy Types',
            message: 'Different enemies have unique abilities:\n• BASIC (white) - Standard enemy\n• FAST (cyan) - Moves quickly\n• TANK (red) - Takes multiple hits\n• SNIPER (orange) - Shoots frequently\n• SHIELD (yellow) - Has protective shield',
            highlight: 'Learn their patterns!'
          }, 5000)
        }
        break

      case 'enemies':
        if (kills >= 5) {
          this.stage = 'powerups'
          this.showMessage({
            title: 'Power-ups',
            message: 'Collect falling power-ups for special abilities:\n• Extra Life, Shield, Weapons, Score Multipliers, and more!',
            highlight: 'Watch for falling bonuses!'
          }, 4000)
        }
        break

      case 'powerups':
        // Complete tutorial after player gets more experience (10 kills)
        if (kills >= 10) {
          this.complete()
        }
        break
    }
  }

  showContextualTip(type: 'firstDeath' | 'firstPowerup' | 'bossWarning' | 'comboStreak'): void {
    // Don't show tips if currently in tutorial mode
    if (this.isActive) return

    switch (type) {
      case 'firstDeath':
        this.showMessage({
          title: 'Life Lost!',
          message: 'Don\'t give up! Learn enemy patterns and use obstacles for cover.\nCollect Extra Life power-ups to continue fighting!',
          highlight: 'You can do this! 💪'
        }, 4000)
        break

      case 'firstPowerup':
        if (this.stage === 'powerups') {
          this.complete()
        } else {
          this.showMessage({
            title: 'Power-up Collected!',
            message: 'Power-ups give you temporary advantages. Look for weapon upgrades, shields, and score multipliers!',
            highlight: 'Use them wisely!'
          }, 3000)
        }
        break

      case 'bossWarning':
        this.showMessage({
          title: 'BOSS APPROACHING!',
          message: 'Every 5 levels, you\'ll face a powerful boss. They have high HP and devastating attacks!',
          highlight: 'Prepare for battle! ⚔️'
        }, 4000)
        break

      case 'comboStreak':
        this.showMessage({
          title: 'Combo Streak!',
          message: 'Keep hitting enemies without missing to maintain your combo multiplier!',
          highlight: 'Don\'t miss! 🎯'
        }, 2500)
        break
    }
  }

  private showMessage(message: TutorialMessage, duration: number = 3000): void {
    this.currentMessage = message

    // Clear existing timeout
    if (this.messageTimeout !== null) {
      clearTimeout(this.messageTimeout)
    }

    // Auto-hide message after duration
    this.messageTimeout = window.setTimeout(() => {
      this.currentMessage = null
      this.messageTimeout = null
    }, duration)
  }

  handleEnterKey(): void {
    if (!this.isActive) return

    if (this.stage === 'welcome') {
      this.advanceStage()
    }
  }

  handleEscapeKey(): void {
    if (this.stage === 'welcome') {
      this.skip()
    }
  }

  reset(): void {
    this.stage = 'welcome'
    this.isActive = false
    this.currentMessage = null
    if (this.messageTimeout !== null) {
      clearTimeout(this.messageTimeout)
      this.messageTimeout = null
    }
  }

  // For testing: reset tutorial completion flag
  resetCompletionFlag(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      this.hasSeenTutorial = false
      console.log('Tutorial completion flag reset - tutorial will show again')
    } catch (error) {
      console.warn('Failed to reset tutorial completion flag:', error)
    }
  }
}

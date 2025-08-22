class SoundEffects {
    constructor() {
        this.shootSounds = [
             new Audio("src/assets/audios/shoot.mp3"),
             new Audio("src/assets/audios/shoot.mp3"),
             new Audio("src/assets/audios/shoot.mp3"),
             new Audio("src/assets/audios/shoot.mp3"),
             new Audio("src/assets/audios/shoot.mp3"),
        ]

        this.hitSounds = [
             new Audio("src/assets/audios/hit.mp3"),
             new Audio("src/assets/audios/hit.mp3"),
             new Audio("src/assets/audios/hit.mp3"),
             new Audio("src/assets/audios/hit.mp3"),
             new Audio("src/assets/audios/hit.mp3"),
        ]

        this.explosionSounds = new Audio("src/assets/audios/explosion.mp3")
        this.nextLevelSound = new Audio("src/assets/audios/next_level.mp3")
        this.bonusSound = new Audio("src/assets/audios/bonus.mp3")
        
        // Caminhos das músicas de nível (carregamento sob demanda)
        this.levelMusicPaths = {
            1: "src/assets/audios/level/musicas/musica_phase1_space_invaders.mp3",
            2: "src/assets/audios/level/musicas/musica_phase2_space_invaders.mp3",
            3: "src/assets/audios/level/musicas/musica_phase3_space_invaders.mp3",
            default: "src/assets/audios/level/musicas/musica_full_space_invaders.mp3"
        }
        
        this.levelMusics = {}
        this.currentLevelMusic = null
        
        // Música de menu
        this.menuMusic = null
        this.menuMusicPath = "src/assets/audios/level/musicas/space_menu_full_mix.wav"

        this.currentShootSound = 0
        this.currentHitSound = 0

        this.adjustVolumes();
    }

    playShootSound() {
        this.shootSounds [this.currentShootSound].currentTime = 0
        this.shootSounds [this.currentShootSound].play()
        this.currentShootSound = 
        (this.currentShootSound + 1) % this.shootSounds.length
    }

    playHitSound() {
        this.hitSounds [this.currentHitSound].currentTime = 0
        this.hitSounds [this.currentHitSound].play()
        this.currentHitSound = 
        (this.currentHitSound + 1) % this.hitSounds.length
    }

    playExplosionSound() {
        this.explosionSounds.play()
    }

    playNextLevelSound() {
        this.nextLevelSound.play()
    }

    playBonusSound() {
        this.bonusSound.play()
    }

    playLevelMusic(level) {
        // Parar música atual se estiver tocando
        if (this.currentLevelMusic) {
            this.currentLevelMusic.pause()
            this.currentLevelMusic.currentTime = 0
        }
        
        // Carregar música se ainda não foi carregada
        const musicKey = this.levelMusicPaths[level] ? level : 'default'
        if (!this.levelMusics[musicKey]) {
            this.levelMusics[musicKey] = new Audio(this.levelMusicPaths[musicKey])
            this.levelMusics[musicKey].loop = true
            this.levelMusics[musicKey].volume = 0.3
        }
        
        // Selecionar música baseada no nível
        const music = this.levelMusics[musicKey]
        
        // Tocar nova música
        music.play().catch(error => {
            console.warn('Erro ao tocar música do nível:', error)
        })
        
        this.currentLevelMusic = music
    }
    
    stopLevelMusic() {
        if (this.currentLevelMusic) {
            this.currentLevelMusic.pause()
            this.currentLevelMusic.currentTime = 0
            this.currentLevelMusic = null
        }
    }
    
    playMenuMusic() {
        // Parar música de nível se estiver tocando
        this.stopLevelMusic()
        
        // Carregar música de menu se ainda não foi carregada
        if (!this.menuMusic) {
            this.menuMusic = new Audio(this.menuMusicPath)
            this.menuMusic.loop = true
            this.menuMusic.volume = 0.4
        }
        
        // Tocar música de menu
        this.menuMusic.play().catch(error => {
            console.warn('Erro ao tocar música de menu:', error)
        })
    }
    
    stopMenuMusic() {
        if (this.menuMusic) {
            this.menuMusic.pause()
            this.menuMusic.currentTime = 0
        }
    }
    
    stopAllMusic() {
        this.stopLevelMusic()
        this.stopMenuMusic()
    }

    playSound(soundType) {
        switch(soundType) {
            case 'shoot':
                this.playShootSound();
                break;
            case 'hit':
                this.playHitSound();
                break;
            case 'explosion':
                this.playExplosionSound();
                break;
            case 'nextLevel':
                this.playNextLevelSound();
                break;
            case 'bonus':
                this.playBonusSound();
                break;
            case 'levelMusic':
                // Este caso será tratado diretamente pelo método playLevelMusic
                break;
            default:
                console.warn(`Som não encontrado: ${soundType}`);
        }
    }

    adjustVolumes()  {
        this.hitSounds.forEach(sound => (sound.volume = 0.2))
        this.shootSounds.forEach(sound => (sound.volume = 0.5))
        this.explosionSounds.volume = 0.2
        this.nextLevelSound.volume = 0.4
        this.bonusSound.volume = 0.3
        
        // As músicas de nível serão configuradas quando carregadas
    }
}

export default SoundEffects
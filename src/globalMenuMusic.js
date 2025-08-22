import SoundEffects from "./classes/SoundEffects.js";

// Sistema global de música de menu
class GlobalMenuMusic {
    constructor() {
        this.soundEffects = new SoundEffects();
        this.isInitialized = false;
        this.initializeMusic();
    }

    initializeMusic() {
        // Iniciar música quando a página carregar
        if (document.readyState === 'loading') {
            window.addEventListener('load', () => {
                this.playMenuMusic();
            });
        } else {
            // Se a página já carregou
            this.playMenuMusic();
        }

        // Fallback para navegadores que requerem interação do usuário
        document.addEventListener('click', () => {
            this.playMenuMusic();
        }, { once: true });

        // Garantir que a música continue tocando quando a página ganhar foco
        window.addEventListener('focus', () => {
            this.playMenuMusic();
        });
    }

    playMenuMusic() {
        if (!this.isInitialized) {
            this.soundEffects.playMenuMusic();
            this.isInitialized = true;
        }
    }

    stopMenuMusic() {
        this.soundEffects.stopMenuMusic();
        this.isInitialized = false;
    }
}

// Criar instância global
const globalMenuMusic = new GlobalMenuMusic();

// Exportar para uso em outras páginas
export default globalMenuMusic;

// Também disponibilizar globalmente
window.globalMenuMusic = globalMenuMusic;
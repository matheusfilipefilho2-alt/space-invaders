import {
  PATH_SPACESHIP_IMAGE,
  PATH_ENGINE_IMAGE,
  PATH_ENGINE_SPRITES,
  INITIAL_FRAMES,
} from "../../utils/constantes.js";
import Projectile from "./Projectile.js";
import RainbowTrail from "./RainbowTrail.js";

class Player {
  constructor(canvasWidth, canvasHeight) {
    this.alive = true;
    // Reduzir tamanho da nave em dispositivos móveis - subatômico
    const isMobile = window.innerWidth <= 480;
    const sizeMultiplier = isMobile ? 0.0125 : 2; // 99.375% menor em mobile (0.0125 vs 2)
    this.width = 48 * sizeMultiplier;
    this.height = 48 * sizeMultiplier;
    this.velocity = 10;

    this.position = {
      x: canvasWidth / 2 - this.width / 2,
      y: canvasHeight - this.height - 30,
    };

    this.image = this.getImage(PATH_SPACESHIP_IMAGE);
    this.engineImage = this.getImage(PATH_ENGINE_IMAGE);
    this.engineSprites = this.getImage(PATH_ENGINE_SPRITES);

    this.sx = 0;
    this.framesCounter = INITIAL_FRAMES;
    
    // Inicializar rastro arco-íris
    this.rainbowTrail = new RainbowTrail();
    this.trailEnabled = false; // Desativar por padrão
    this.rainbowTrail.setActive(false);
    
    // Inicializar nave dourada
    this.goldenShipEnabled = false;
    
    // Sistema de vidas extras
    this.lives = 1; // Vidas iniciais
    this.maxLives = 3; // Máximo de vidas possíveis
    this.invulnerable = false; // Estado de invulnerabilidade temporária
    this.invulnerabilityTime = 0; // Tempo restante de invulnerabilidade
    this.invulnerabilityDuration = 2000; // 2 segundos de invulnerabilidade
    
    // Sistema de skins
    this.currentSkin = 'default'; // Skin padrão
    this.skinImages = new Map(); // Cache de imagens de skins
    this.loadDefaultSkin();
    this.loadUserSelectedSkin();
  }

  getImage(path) {
    const image = new Image();
    image.src = path;
    return image;
  }

  // Carregar skin padrão
  loadDefaultSkin() {
    this.skinImages.set('default', this.image);
  }

  // Carregar skin selecionada pelo usuário (FONTE ÚNICA DE DADOS)
  loadUserSelectedSkin() {
    try {
      // Verificar se há um usuário logado
      const currentUser = JSON.parse(localStorage.getItem('spaceInvaders_currentUser') || 'null');
      if (!currentUser) {
        console.log('🎨 Nenhum usuário logado, usando skin padrão');
        return;
      }

      // Buscar APENAS selectedSkin no localStorage (fonte única)
      const selectedSkinData = localStorage.getItem(`selectedSkin_${currentUser.id}`);
      if (!selectedSkinData) {
        console.log('🎨 Nenhuma skin selecionada, usando skin padrão');
        return;
      }

      // Validar JSON antes de usar
      let skinData;
      try {
        skinData = JSON.parse(selectedSkinData);
      } catch (parseError) {
        console.error('❌ JSON inválido em selectedSkin, removendo dados corrompidos:', parseError);
        localStorage.removeItem(`selectedSkin_${currentUser.id}`);
        return;
      }

      // Verificar se os dados são válidos
      if (skinData && skinData.skinId && skinData.skinFile) {
        console.log(`🎨 Carregando skin selecionada: ${skinData.skinName || skinData.skinId} (${skinData.skinFile})`);
        this.loadSkin(skinData.skinId, skinData.skinFile);
        this.applySkin(skinData.skinId);
      } else {
        console.warn('⚠️ Dados de skin inválidos, usando skin padrão');
        console.log('Dados recebidos:', skinData);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar skin do usuário:', error);
      // Em caso de erro, garantir que usamos a skin padrão
      this.currentSkin = 'default';
    }
  }

  // Carregar uma nova skin
  loadSkin(skinId, skinFile) {
    if (!this.skinImages.has(skinId)) {
      const skinImage = new Image();
      skinImage.src = `src/assets/images/skins/${skinFile}`;
      this.skinImages.set(skinId, skinImage);
    }
  }

  // Aplicar skin
  applySkin(skinId, skinFile = null) {
    if (skinId === 'default') {
      this.currentSkin = 'default';
      console.log('🚀 Skin aplicada: Nave Padrão');
      return true;
    }

    if (skinFile) {
      this.loadSkin(skinId, skinFile);
    }

    if (this.skinImages.has(skinId)) {
      this.currentSkin = skinId;
      console.log(`🚀 Skin aplicada: ${skinId}`);
      return true;
    }

    console.warn(`⚠️ Skin não encontrada: ${skinId}`);
    return false;
  }

  // Obter skin atual
  getCurrentSkin() {
    return this.currentSkin;
  }

  // Obter imagem da skin atual
  getCurrentSkinImage() {
    return this.skinImages.get(this.currentSkin) || this.image;
  }

  moveLeft() {
    this.position.x -= this.velocity;
  }

  moveRight() {
    this.position.x += this.velocity;
  }

  draw(ctx) {
    // Atualizar invulnerabilidade
    this.updateInvulnerability();
    
    // Desenhar rastro arco-íris primeiro (atrás da nave)
    if (this.trailEnabled) {
      this.rainbowTrail.addTrailParticles(this.position, this.width, this.height);
      this.rainbowTrail.update();
      this.rainbowTrail.draw(ctx);
    }

    // Efeito de piscar quando invulnerável
    if (this.invulnerable) {
      const blinkRate = 200; // Piscar a cada 200ms
      const shouldShow = Math.floor(Date.now() / blinkRate) % 2 === 0;
      if (!shouldShow) {
        this.update();
        return; // Não desenhar a nave neste frame
      }
    }

    // Salvar estado do contexto
    ctx.save();
    
    // Aplicar filtro dourado se ativado
    if (this.goldenShipEnabled) {
      ctx.filter = 'hue-rotate(45deg) saturate(2) brightness(1.2)';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 10;
    }
    
    // Aplicar efeito visual de invulnerabilidade
    if (this.invulnerable) {
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 15;
      ctx.filter = (ctx.filter || 'none') + ' brightness(1.3) saturate(1.5)';
    }

    // Desenhar nave principal (usando skin atual)
    const currentImage = this.getCurrentSkinImage();
    ctx.drawImage(
      currentImage,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    );

    // Desenhar sprites do motor
    ctx.drawImage(
      this.engineSprites,
      this.sx,
      0,
      48,
      48,
      this.position.x,
      this.position.y + 3,
      this.width,
      this.height
    );

    // Desenhar imagem do motor
    ctx.drawImage(
      this.engineImage,
      this.position.x,
      this.position.y + 1,
      this.width,
      this.height
    );
    
    // Restaurar estado do contexto
    ctx.restore();

    this.update();
  }

  update() {
    if (this.framesCounter === 0) {
      this.sx = this.sx === 96 ? 0 : this.sx + 48;
      this.framesCounter = INITIAL_FRAMES;
    }

    this.framesCounter--;
  }

  shoot(projectiles, type = 'normal') {
    const p = new Projectile(
      {
        x: this.position.x + this.width / 2 - (type === 'destruction' ? 2 : 1),
        y: this.position.y + 2,
      },
      -10,
      type
    );

    projectiles.push(p);
  }

  hit(projectile) {
        return (
          projectile.position.x >= this.position.x + 20 &&
          projectile.position.x <= this.position.x + 20 + this.width - 38 &&
          projectile.position.y >= this.position.y + 22 &&
          projectile.position.y <= this.position.y + 22 + this.height - 34
        );
    }

  // Ativar/desativar rastro arco-íris
  toggleRainbowTrail() {
    this.trailEnabled = !this.trailEnabled;
    this.rainbowTrail.setActive(this.trailEnabled);
    console.log('🌈 Rastro arco-íris:', this.trailEnabled ? 'ATIVADO' : 'DESATIVADO');
  }

  // Ativar rastro arco-íris
  enableRainbowTrail() {
    this.trailEnabled = true;
    this.rainbowTrail.setActive(true);
  }

  // Desativar rastro arco-íris
  disableRainbowTrail() {
    this.trailEnabled = false;
    this.rainbowTrail.setActive(false);
  }

  // Ativar/desativar nave dourada
  toggleGoldenShip() {
    this.goldenShipEnabled = !this.goldenShipEnabled;
    console.log('✨ Nave dourada:', this.goldenShipEnabled ? 'ATIVADA' : 'DESATIVADA');
  }

  // Ativar nave dourada
  enableGoldenShip() {
    this.goldenShipEnabled = true;
  }

  // Desativar nave dourada
  disableGoldenShip() {
    this.goldenShipEnabled = false;
  }

  // === SISTEMA DE VIDAS EXTRAS ===
  
  // Atualizar sistema de invulnerabilidade
  updateInvulnerability(deltaTime = 16) {
    if (this.invulnerable) {
      this.invulnerabilityTime -= deltaTime;
      if (this.invulnerabilityTime <= 0) {
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
      }
    }
  }

  // Perder uma vida
  loseLife() {
    if (this.invulnerable) {
      return false; // Não perde vida se invulnerável
    }

    this.lives--;
    console.log(`💔 Vida perdida! Vidas restantes: ${this.lives}`);
    
    if (this.lives > 0) {
      // Ativar invulnerabilidade temporária
      this.invulnerable = true;
      this.invulnerabilityTime = this.invulnerabilityDuration;
      console.log('🛡️ Invulnerabilidade ativada por 2 segundos');
      return false; // Ainda tem vidas
    } else {
      this.alive = false;
      console.log('💀 Game Over - Sem vidas restantes');
      return true; // Morreu definitivamente
    }
  }

  // Ganhar uma vida extra
  gainLife() {
    if (this.lives < this.maxLives) {
      this.lives++;
      console.log(`💚 Vida extra ganha! Vidas: ${this.lives}`);
      return true;
    } else {
      console.log(`💚 Vida extra ignorada - máximo atingido (${this.maxLives})`);
      return false;
    }
  }

  // Obter número de vidas
  getLives() {
    return this.lives;
  }

  // Verificar se está invulnerável
  isInvulnerable() {
    return this.invulnerable;
  }

  // Resetar vidas (para novo jogo)
  resetLives() {
    this.lives = 1;
    this.alive = true;
    this.invulnerable = false;
    this.invulnerabilityTime = 0;
    console.log('🔄 Vidas resetadas para novo jogo');
  }
}

export default Player;

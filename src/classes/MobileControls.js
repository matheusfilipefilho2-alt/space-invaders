/**
 * Sistema de controles mobile para Space Invaders
 * Gerencia orientação da tela, movimento por acelerômetro e botão de tiro
 */
class MobileControls {
  constructor() {
    this.isMobile = this.detectMobile();
    this.isOrientationLocked = false;
    this.accelerometerData = { x: 0, y: 0, z: 0 };
    this.sensitivity = 2; // Sensibilidade do movimento
    this.deadZone = 1; // Zona morta para evitar movimento involuntário
    this.shootButton = null;
    this.onMoveCallback = null;
    this.onShootCallback = null;
    
    if (this.isMobile) {
      this.init();
    }
  }

  /**
   * Detecta se o dispositivo é mobile
   */
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }

  /**
   * Inicializa os controles mobile
   */
  init() {
    this.lockOrientation();
    this.adaptScreenSize();
    this.setupDeviceMotion();
    this.createShootButton();
    this.setupTouchEvents();
    console.log('📱 Controles mobile inicializados');
  }

  /**
   * Adapta o tamanho da tela para mobile
   */
  adaptScreenSize() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    // Forçar viewport mobile
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

    // Adaptar canvas ao tamanho da tela - maximizar área de jogo
    const updateCanvasSize = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Usar toda a tela disponível sem margens
      canvas.width = screenWidth;
      canvas.height = screenHeight;
      
      // Ajustar CSS para ocupar toda a tela sem overflow
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.zIndex = '1';
      canvas.style.margin = '0';
      canvas.style.padding = '0';
      canvas.style.border = 'none';
      canvas.style.outline = 'none';
      
      console.log(`📱 Canvas maximizado: ${screenWidth}x${screenHeight}`);
    };

    // Aplicar imediatamente
    updateCanvasSize();

    // Reagir a mudanças de orientação
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        updateCanvasSize();
        this.hideAddressBars();
        this.adaptUIForMobile();
      }, 100); // Delay para aguardar mudança completa
    });

    window.addEventListener('resize', () => {
      updateCanvasSize();
      this.adaptUIForMobile();
    });

    // Adaptar UI para mobile
    this.adaptUIForMobile();

    // Esconder barras de endereço em mobile
    this.hideAddressBars();
  }

  /**
   * Adapta elementos da UI para dispositivos móveis
   */
  adaptUIForMobile() {
    // Adaptar elementos de UI do jogo para mobile
    const gameElements = {
      '.game-ui': {
        fontSize: '14px',
        padding: '8px',
        position: 'fixed',
        zIndex: '1000'
      },
      '.score-display': {
        top: '10px',
        left: '10px',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#00ff00',
        textShadow: '0 0 10px rgba(0, 255, 0, 0.8)'
      },
      '.lives-display': {
        top: '10px',
        right: '10px',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#ff0000',
        textShadow: '0 0 10px rgba(255, 0, 0, 0.8)'
      },
      '.level-display': {
        top: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '14px',
        color: '#ffff00',
        textShadow: '0 0 10px rgba(255, 255, 0, 0.8)'
      },
      '.game-over-screen': {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: '2000',
        textAlign: 'center',
        padding: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '10px',
        border: '2px solid #00ff00'
      },
      '.pause-screen': {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: '2000',
        textAlign: 'center',
        padding: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '10px',
        border: '2px solid #ffff00'
      }
    };

    // Aplicar estilos aos elementos
    Object.keys(gameElements).forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        Object.assign(element.style, gameElements[selector]);
      });
    });

    // Adaptar botões do jogo
    const buttons = document.querySelectorAll('button:not(#mobile-shoot-button)');
    buttons.forEach(button => {
      button.style.fontSize = '16px';
      button.style.padding = '12px 20px';
      button.style.margin = '8px';
      button.style.minHeight = '44px'; // Tamanho mínimo recomendado para touch
      button.style.minWidth = '44px';
      button.style.border = '2px solid #00ff00';
      button.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
      button.style.color = '#00ff00';
      button.style.borderRadius = '8px';
      button.style.touchAction = 'manipulation';
    });

    // Notificar sobre mudança de tamanho para recriar elementos do jogo
    this.notifyGameElementsResize();
  }

  /**
   * Notifica o jogo sobre mudanças de tamanho para redimensionar nave e invasores
   */
  notifyGameElementsResize() {
    // Disparar evento customizado para notificar o jogo sobre mudança de tamanho
    const resizeEvent = new CustomEvent('mobileResize', {
      detail: {
        isMobile: window.innerWidth <= 480,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        playerSizeMultiplier: this.isMobile ? 0.0125 : 2,
         invaderSizeMultiplier: this.isMobile ? 0.00625 : 0.8
      }
    });
    window.dispatchEvent(resizeEvent);
    console.log('📱 Elementos do jogo notificados sobre redimensionamento');
  }

  /**
   * Esconde barras de endereço do navegador mobile
   */
  hideAddressBars() {
    // Forçar scroll para esconder barra de endereço
    setTimeout(() => {
      window.scrollTo(0, 1);
    }, 100);

    // Aplicar estilos para esconder barras
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.documentElement.style.overflow = 'hidden';
  }

  /**
   * Trava a orientação da tela em landscape
   */
  async lockOrientation() {
    try {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('landscape');
        this.isOrientationLocked = true;
        console.log('🔒 Orientação travada em landscape');
      } else if (screen.lockOrientation) {
        // Fallback para navegadores mais antigos
        screen.lockOrientation('landscape');
        this.isOrientationLocked = true;
      } else {
        console.warn('⚠️ Lock de orientação não suportado');
      }
    } catch (error) {
      console.warn('⚠️ Erro ao travar orientação:', error.message);
    }
  }

  /**
   * Configura o listener de movimento do dispositivo
   */
  setupDeviceMotion() {
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', (event) => {
        this.handleDeviceMotion(event);
      });
      console.log('🎮 Sensor de movimento ativado');
    } else {
      console.warn('⚠️ DeviceMotion não suportado');
    }
  }

  /**
   * Processa os dados do acelerômetro
   */
  handleDeviceMotion(event) {
    if (!event.accelerationIncludingGravity) return;

    const { x, y, z } = event.accelerationIncludingGravity;
    this.accelerometerData = { x: x || 0, y: y || 0, z: z || 0 };

    // Determina direção baseada na inclinação do dispositivo
    let direction = null;
    const tiltX = this.accelerometerData.x;

    if (Math.abs(tiltX) > this.deadZone) {
      if (tiltX > this.deadZone) {
        direction = 'left';
      } else if (tiltX < -this.deadZone) {
        direction = 'right';
      }
    }

    // Chama callback de movimento se definido
    if (this.onMoveCallback && direction) {
      const intensity = Math.min(Math.abs(tiltX) / this.sensitivity, 1);
      this.onMoveCallback(direction, intensity);
    }
  }

  /**
   * Implementa tiro automático para dispositivos móveis (sem botão)
   */
  createShootButton() {
    if (!this.isMobile) return;
    
    // Criar botão de tiro para mobile
    this.shootButton = document.createElement('button');
    this.shootButton.id = 'mobile-shoot-button';
    this.shootButton.innerHTML = '🔥';
    this.shootButton.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff4444, #cc0000);
      border: 3px solid #ffffff;
      color: white;
      font-size: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      box-shadow: 0 4px 15px rgba(255, 68, 68, 0.4);
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
    `;
    
    // Adicionar eventos de toque
    this.shootButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.shootButton.style.transform = 'scale(0.9)';
      this.handleShoot();
    });
    
    this.shootButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.shootButton.style.transform = 'scale(1)';
    });
    
    this.shootButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleShoot();
    });
    
    // Adicionar ao DOM
    document.body.appendChild(this.shootButton);
    console.log('📱 Botão de tiro criado para mobile');
  }

  /**
   * Remove o tiro automático (não usado mais)
   */
  removeAutoShoot() {
    if (this.autoShootInterval) {
      clearInterval(this.autoShootInterval);
      this.autoShootInterval = null;
    }
  }

  /**
   * Executa o tiro
   */
  handleShoot() {
    if (this.onShootCallback) {
      this.onShootCallback();
    }
  }

  /**
   * Configura eventos de toque adicionais
   */
  setupTouchEvents() {
    // Previne zoom por pinch
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    // Previne scroll
    document.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, { passive: false });
  }

  /**
   * Define callback para movimento
   */
  setMoveCallback(callback) {
    this.onMoveCallback = callback;
  }

  /**
   * Define callback para tiro
   */
  setShootCallback(callback) {
    this.onShootCallback = callback;
  }

  /**
   * Mostra o botão de tiro
   */
  showShootButton() {
    if (this.shootButton) {
      this.shootButton.style.display = 'flex';
    }
  }

  /**
   * Esconde o botão de tiro
   */
  hideShootButton() {
    if (this.shootButton) {
      this.shootButton.style.display = 'none';
    }
    // Limpar tiro automático se existir
    this.removeAutoShoot();
  }

  /**
   * Ajusta a sensibilidade do movimento
   */
  setSensitivity(value) {
    this.sensitivity = Math.max(0.5, Math.min(5, value));
  }

  /**
   * Ajusta a zona morta
   */
  setDeadZone(value) {
    this.deadZone = Math.max(0, Math.min(3, value));
  }

  /**
   * Libera a orientação da tela
   */
  unlockOrientation() {
    try {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      } else if (screen.unlockOrientation) {
        screen.unlockOrientation();
      }
      this.isOrientationLocked = false;
      console.log('🔓 Orientação liberada');
    } catch (error) {
      console.warn('⚠️ Erro ao liberar orientação:', error.message);
    }
  }

  /**
   * Remove os controles mobile
   */
  destroy() {
    if (this.shootButton) {
      this.shootButton.remove();
    }
    this.removeAutoShoot();
    this.unlockOrientation();
    console.log('📱 Controles mobile removidos');
  }

  /**
   * Verifica se é um dispositivo mobile
   */
  get mobile() {
    return this.isMobile;
  }

  /**
   * Retorna dados do acelerômetro
   */
  getAccelerometerData() {
    return { ...this.accelerometerData };
  }
}

export default MobileControls;
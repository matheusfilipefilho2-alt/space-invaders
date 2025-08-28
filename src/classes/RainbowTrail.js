class RainbowTrail {
  constructor() {
    this.particles = [];
    this.colors = [
      '#FF0000', // Vermelho
      '#FF7F00', // Laranja
      '#FFFF00', // Amarelo
      '#00FF00', // Verde
      '#0000FF', // Azul
      '#4B0082', // Índigo
      '#9400D3'  // Violeta
    ];
    this.colorIndex = 0;
    this.maxParticles = 50;
    this.spawnRate = 2; // Partículas por frame
    this.active = false; // Inicializar como inativo
  }

  // Adicionar partículas do rastro
  addTrailParticles(playerPosition, playerWidth, playerHeight) {
    if (!this.active) return;
    
    for (let i = 0; i < this.spawnRate; i++) {
      // Posição central da nave
      const centerX = playerPosition.x + playerWidth / 2;
      const centerY = playerPosition.y + playerHeight;
      
      // Criar partícula com cor do arco-íris
      const particle = {
        x: centerX + (Math.random() - 0.5) * playerWidth * 0.6,
        y: centerY - Math.random() * 5, // Spawn mais próximo da nave
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 2 + 2, // Movimento mais lento para baixo
        size: Math.random() * 8 + 4, // Partículas maiores
        color: this.colors[this.colorIndex],
        opacity: 1,
        life: Math.random() * 40 + 30, // Vida mais longa
        maxLife: Math.random() * 40 + 30
      };
      
      this.particles.push(particle);
      
      // Avançar para próxima cor do arco-íris
      this.colorIndex = (this.colorIndex + 1) % this.colors.length;
    }
    
    // Limitar número máximo de partículas
    if (this.particles.length > this.maxParticles) {
      this.particles.splice(0, this.particles.length - this.maxParticles);
    }
    
    // Debug log
    if (this.particles.length > 0 && Math.random() < 0.01) {
      console.log('✨ Partículas ativas:', this.particles.length);
    }
  }

  // Atualizar partículas
  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Atualizar posição
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Atualizar vida e opacidade
      particle.life--;
      particle.opacity = particle.life / particle.maxLife;
      
      // Remover partículas mortas
      if (particle.life <= 0 || particle.opacity <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Desenhar rastro
  draw(ctx) {
    if (!this.active || this.particles.length === 0) return;
    
    ctx.save();
    
    this.particles.forEach(particle => {
      ctx.globalAlpha = particle.opacity;
      ctx.beginPath();
      
      // Desenhar círculo sólido simples
      ctx.fillStyle = particle.color;
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Adicionar brilho
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = particle.size;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.restore();
    
    // Debug log ocasional
    if (Math.random() < 0.005) {
      console.log('🎨 Desenhando', this.particles.length, 'partículas');
    }
  }

  // Limpar todas as partículas
  clear() {
    this.particles = [];
  }

  // Ativar/desativar rastro
  setActive(active) {
    this.active = active;
    console.log('🎨 RainbowTrail setActive:', active);
    if (!active) {
      this.clear();
    }
  }
}

export default RainbowTrail;
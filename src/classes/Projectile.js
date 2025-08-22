class Projectile {
  constructor(position, velocity, type = 'normal') {
    this.position = position;
    this.width = type === 'destruction' ? 4 : 2;
    this.height = type === 'destruction' ? 30 : 20;
    this.velocity = velocity;
    this.type = type;
    this.animationFrame = 0;
    this.glowIntensity = 0;
    this.particles = [];
  }

  draw(ctx) {
    if (this.type === 'destruction') {
      this.drawDestructionProjectile(ctx);
    } else {
      ctx.fillStyle = "white";
      ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
    }
  }

  drawDestructionProjectile(ctx) {
    // Animação de brilho pulsante
    this.glowIntensity = Math.sin(this.animationFrame * 0.3) * 0.5 + 0.5;
    
    // Desenhar aura externa
    const gradient = ctx.createRadialGradient(
      this.position.x + this.width / 2, this.position.y + this.height / 2, 0,
      this.position.x + this.width / 2, this.position.y + this.height / 2, 15
    );
    gradient.addColorStop(0, `rgba(255, 0, 100, ${this.glowIntensity * 0.8})`);
    gradient.addColorStop(0.5, `rgba(255, 50, 150, ${this.glowIntensity * 0.4})`);
    gradient.addColorStop(1, 'rgba(255, 0, 100, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(
      this.position.x - 10, this.position.y - 10,
      this.width + 20, this.height + 20
    );
    
    // Desenhar núcleo do projétil
    ctx.fillStyle = `rgb(255, ${50 + this.glowIntensity * 100}, ${100 + this.glowIntensity * 155})`;
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
    
    // Desenhar linha central brilhante
    ctx.fillStyle = 'white';
    ctx.fillRect(
      this.position.x + this.width / 2 - 0.5, this.position.y,
      1, this.height
    );
    
    // Criar partículas de rastro
    if (Math.random() < 0.7) {
      this.particles.push({
        x: this.position.x + this.width / 2 + (Math.random() - 0.5) * 4,
        y: this.position.y + this.height,
        life: 1.0,
        size: Math.random() * 2 + 1
      });
    }
    
    // Desenhar partículas de rastro
    this.particles.forEach((particle, index) => {
      particle.life -= 0.05;
      particle.y += 2;
      
      if (particle.life <= 0) {
        this.particles.splice(index, 1);
        return;
      }
      
      ctx.fillStyle = `rgba(255, 100, 200, ${particle.life})`;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
  }

  update() {
    this.position.y += this.velocity;
    this.animationFrame++;
    
    // Limpar partículas antigas
    this.particles = this.particles.filter(p => p.life > 0);
  }
}

export default Projectile;

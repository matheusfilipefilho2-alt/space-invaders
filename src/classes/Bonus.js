class Bonus {
  constructor(canvasWidth, canvasHeight) {
    this.width = 30;
    this.height = 30;
    this.velocity = 4;
    
    // Posição aleatória na parte superior da tela
    this.position = {
      x: Math.random() * (canvasWidth - this.width),
      y: -this.height
    };
    
    this.canvasHeight = canvasHeight;
    this.collected = false;
    
    // Propriedades visuais do bônus
    this.color = "#FFD700"; // Dourado
    this.glowColor = "#FFA500"; // Laranja para o brilho
    this.pulseAnimation = 0;
  }

  draw(ctx) {
    // Animação de pulso
    this.pulseAnimation += 0.2;
    const pulse = Math.sin(this.pulseAnimation) * 0.2 + 1;
    
    ctx.save();
    
    // Efeito de brilho
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 15;
    
    // Desenhar o bônus como uma estrela
    ctx.fillStyle = this.color;
    ctx.translate(this.position.x + this.width / 2, this.position.y + this.height / 2);
    ctx.scale(pulse, pulse);
    
    // Desenhar estrela de 8 pontas
    this.drawStar(ctx, 0, 0, 8, this.width / 2, this.width / 4);
    
    ctx.restore();
  }

  drawStar(ctx, x, y, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;
    
    ctx.beginPath();
    ctx.moveTo(x, y - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
      let x1 = x + Math.cos(rot) * outerRadius;
      let y1 = y + Math.sin(rot) * outerRadius;
      ctx.lineTo(x1, y1);
      rot += step;
      
      let x2 = x + Math.cos(rot) * innerRadius;
      let y2 = y + Math.sin(rot) * innerRadius;
      ctx.lineTo(x2, y2);
      rot += step;
    }
    
    ctx.lineTo(x, y - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  update() {
    this.position.y += this.velocity;
  }

  // Verificar se o bônus saiu da tela
  isOffScreen() {
    return this.position.y > this.canvasHeight;
  }

  // Verificar colisão com o player
  hit(player) {
    return (
      this.position.x < player.position.x + player.width &&
      this.position.x + this.width > player.position.x &&
      this.position.y < player.position.y + player.height &&
      this.position.y + this.height > player.position.y
    );
  }
}

export default Bonus;
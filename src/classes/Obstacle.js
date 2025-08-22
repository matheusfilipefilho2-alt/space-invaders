class Obstacle {
  constructor(position, width, height, color) {
    this.position = position;
    this.width = width;
    this.height = height;
    this.color = color;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
  }
  
  update() {
    // Método vazio para compatibilidade com o loop de jogo
    // Pode ser implementado no futuro para animações ou efeitos
  }

    hit(projectile) {
        const projectilePositonY =
         projectile.velocity < 0 
             ? projectile.position.y
             : projectile.position.y + projectile.height;

        return (
          projectile.position.x >= this.position.x &&
          projectile.position.x <= this.position.x + this.width &&
          projectilePositonY >= this.position.y &&
          projectilePositonY <= this.position.y + this.height
        );
    }
    
    collidesWithProjectile(projectile) {
        // Alias para o método hit para compatibilidade com game.js
        return this.hit(projectile);
    }
}

export default Obstacle;

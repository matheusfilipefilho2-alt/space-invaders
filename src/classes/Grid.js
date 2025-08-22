import Invader from "./invader.js";
import { INVADERS } from "../../utils/constantes.js";

class Grid {
  constructor(rows, cols) {
    // Limitar o número máximo de linhas e colunas a 8
    this.rows = Math.min(rows, 8);
    this.cols = Math.min(cols, 8);
    
    // Log de aviso se os valores foram ajustados
    if (rows > 8 || cols > 8) {
      console.warn(`⚠️ Grid limitado: rows=${rows}→${this.rows}, cols=${cols}→${this.cols} (máximo: 8x8)`);
    }

    this.direction = "right";
    this.moveDown = false;

    this.invadersVelocity = 1.5;
    this.currentFormationPattern = null; // Armazenar padrão atual
    this.invaders = this.init();
    this.invaderProjectiles = [];
  }

  init() {
    const array = [];
    
    // Escolher padrão de formação aleatório
    const formationPattern = this.getRandomFormationPattern();
    this.currentFormationPattern = formationPattern; // Armazenar padrão atual
    
    // Log do padrão escolhido para debug
    console.log(`🛸 Novo grid gerado com padrão: ${formationPattern}`);
    
    for (let row = 0; row < this.rows; row += 1) {
      // Cada linha pode ter um tipo diferente de invasor
      const rowInvaderType = this.getInvaderTypeForRow(row);
      
      for (let col = 0; col < this.cols; col += 1) {
        // Verificar se deve criar invasor nesta posição baseado no padrão
        if (this.shouldCreateInvader(row, col, formationPattern)) {
          const position = this.getInvaderPosition(row, col, formationPattern);
          
          const invader = new Invader(
            position,
            this.invadersVelocity,
            rowInvaderType
          );

          array.push(invader);
        }
      }
    }

    // Log de estatísticas do grid criado
    const invaderTypes = {};
    array.forEach(invader => {
      const type = invader.image.src.split('/').pop();
      invaderTypes[type] = (invaderTypes[type] || 0) + 1;
    });
    
    console.log(`📊 Grid criado: ${array.length} invasores`);
    console.log('🎨 Tipos de invasores:', invaderTypes);

    return array;
  }
  
  // Gera padrões de formação aleatórios
  getRandomFormationPattern() {
    const patterns = [
      'standard',    // Formação padrão retangular
      'diamond',     // Formação em diamante
      'triangle',    // Formação triangular
      'wave',        // Formação em onda
      'cross',       // Formação em cruz
      'circle',      // Formação circular
      'random'       // Formação completamente aleatória
    ];
    
    return patterns[Math.floor(Math.random() * patterns.length)];
  }
  
  // Validar se a posição está dentro dos limites do grid
  isValidPosition(row, col) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }
  
  // Define tipo de invasor por linha
  getInvaderTypeForRow(row) {
    const strategies = [
      // Estratégia 1: Tipos diferentes por linha
      () => INVADERS[row % INVADERS.length],
      
      // Estratégia 2: Linhas superiores mais fortes
      () => {
        if (row === 0) return INVADERS[4]; // Vermelho (mais forte)
        if (row === 1) return INVADERS[3]; // Roxo
        if (row === 2) return INVADERS[2]; // Verde
        return INVADERS[Math.floor(Math.random() * 2)]; // Azul ou padrão
      },
      
      // Estratégia 3: Completamente aleatório
      () => INVADERS[Math.floor(Math.random() * INVADERS.length)],
      
      // Estratégia 4: Padrão alternado
      () => INVADERS[row % 2 === 0 ? 0 : Math.floor(Math.random() * INVADERS.length)]
    ];
    
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];
    return strategy();
  }
  
  // Determina se deve criar invasor na posição baseado no padrão
  shouldCreateInvader(row, col, pattern) {
    // Verificar se a posição é válida primeiro
    if (!this.isValidPosition(row, col)) {
      return false;
    }
    
    const centerRow = Math.floor(this.rows / 2);
    const centerCol = Math.floor(this.cols / 2);
    
    switch (pattern) {
      case 'standard':
        return true;
        
      case 'diamond':
        const distanceFromCenter = Math.abs(row - centerRow) + Math.abs(col - centerCol);
        return distanceFromCenter <= Math.min(centerRow, centerCol);
        
      case 'triangle':
        return col >= row && col < this.cols - row;
        
      case 'wave':
        const waveOffset = Math.sin(col * 0.5) * 1.5;
        return Math.abs(row - (centerRow + waveOffset)) <= 1;
        
      case 'scattered':
        return Math.random() > 0.3; // 70% chance de criar invasor
        
      case 'cross':
        return row === centerRow || col === centerCol;
        
      case 'circle':
        const radius = Math.min(centerRow, centerCol);
        const distance = Math.sqrt(
          Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
        );
        return distance <= radius && distance >= radius - 1;
        
      default:
        return true;
    }
  }
  
  // Calcula posição do invasor com variações baseadas no padrão
  getInvaderPosition(row, col, pattern) {
    let baseX = col * 50 + 20;
    let baseY = row * 37 + 120;
    
    // Adicionar variações de posicionamento baseadas no padrão
    switch (pattern) {
      case 'wave':
        baseX += Math.sin(row * 0.5) * 15;
        break;
        
      case 'scattered':
        baseX += (Math.random() - 0.5) * 20;
        baseY += (Math.random() - 0.5) * 15;
        break;
        
      case 'diamond':
      case 'circle':
        // Pequeno ajuste para formações geométricas
        baseX += (Math.random() - 0.5) * 5;
        baseY += (Math.random() - 0.5) * 5;
        break;
        
      default:
        // Variação mínima para formações padrão
        baseX += (Math.random() - 0.5) * 3;
        break;
    }
    
    return { x: baseX, y: baseY };
  }

  draw(ctx) {
    this.invaders.forEach((invader) => invader.draw(ctx));
  }

  update(playerStatus) {
    if (this.reachedRightBoundary()) {
      this.direction = "left";
      this.moveDown = true;
    } else if (this.reachedleftBoundary()) {
      this.direction = "right";
      this.moveDown = true;
    }

    if (!playerStatus) this.moveDown = false;

    this.invaders.forEach((invader) => {
      if (this.moveDown) {
        invader.moveDown();
        invader.incrementVelocity(1);
        this.invadersVelocity = invader.velocity;
      }

      if (this.direction === "right") invader.moveRight();
      if (this.direction === "left") invader.moveLeft();
    });

    this.moveDown = false;
  }

  reachedRightBoundary() {
    return this.invaders.some(
      (invader) => invader.position.x + invader.width >= innerWidth
    );
  }

  reachedleftBoundary() {
    return this.invaders.some((invader) => invader.position.x <= 0);
  }

  getRandomInvader() {
    const index = Math.floor(Math.random() * this.invaders.length);
    return this.invaders[index];
  }

  restart() {
    this.invaders = this.init();
    this.direction = "right";
    this.invaderProjectiles = [];
  }
  
  initialize(level) {
    // Ajusta a dificuldade com base no nível
    this.invadersVelocity = 1.5 + (level * 0.2);
    this.restart();
  }

  createInvaders() {
    return this.init();
  }
  
  // Getter para o padrão de formação atual
  getFormationPattern() {
    return this.currentFormationPattern;
  }
  
  // Método para obter descrição do padrão em português
  getFormationDescription() {
    const descriptions = {
      'standard': 'Formação Padrão',
      'diamond': 'Formação Diamante',
      'triangle': 'Formação Triangular',
      'wave': 'Formação Ondulada',
      'scattered': 'Formação Espalhada',
      'cross': 'Formação Cruz',
      'circle': 'Formação Circular'
    };
    
    return descriptions[this.currentFormationPattern] || 'Formação Desconhecida';
  }
}

export default Grid;

import { NavigationHelper } from "./navigation.js";
import RankingManager from "./classes/RankingManager.js";
import AntiCheat from "./classes/AntiCheat.js";
import Grid from "./classes/Grid.js";
import Obstacle from "./classes/Obstacle.js";
import Particle from "./classes/Particle.js";
import Player from "./classes/player.js";
import SoundEffects from "./classes/SoundEffects.js";
import Star from "./classes/Star.js";
import Bonus from "./classes/Bonus.js";
import RewardUI from "./classes/RewardUI.js"; // NOVO
import { GameState, NUMBER_STARS } from "../utils/constantes.js";
import { supabase } from "./supabase.js";

// Inicializar efeitos sonoros
const soundEffects = new SoundEffects();

// Elementos da UI
const scoreElement = document.querySelector(".score");
const levelElement = document.querySelector(".level");
const highElement = document.querySelector(".high");
const buttonRestart = document.querySelector(".button-restart");
const buttonViewRanking = document.querySelector(".button-view-ranking");
const gameOverScreen = document.querySelector(".game-over");

// Ranking Manager com sistema de recompensas integrado
const rankingManager = new RankingManager();

// Sistema de UI de recompensas
const rewardUI = new RewardUI(); // NOVO

// Configurar usuário atual no rankingManager
const currentUser = NavigationHelper.getCurrentUser();
if (currentUser) {
  rankingManager.currentUser = currentUser;
  rewardUI.setUser(currentUser); // NOVO
  rewardUI.setRewardSystem(rankingManager.getRewardSystem()); // NOVO
  console.log("🎮 Usuário logado encontrado:", currentUser.username);
} else {
  console.warn("⚠️ Nenhum usuário logado encontrado");
}

// Iniciar AntiCheat
const antiCheat = new AntiCheat();

// Remover a tela de game over inicialmente
if (gameOverScreen) {
  gameOverScreen.remove();
}

// Event listeners para os botões da tela de game over
if (buttonRestart) {
  buttonRestart.addEventListener("click", () => {
    // Reiniciar o jogo
    window.location.reload();
  });
}

if (buttonViewRanking) {
  buttonViewRanking.addEventListener("click", () => {
    // Ir para a tela de ranking
    NavigationHelper.navigateToRanking();
  });
}

// Configuração do canvas
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

ctx.imageSmoothingEnabled = false;

// Estado inicial do jogo
let currentState = GameState.PLAYING;

// Dados do jogo
const gameData = {
  score: 0,
  level: 1,
  high: localStorage.getItem("highScore") || 0,
};

// Atualizar a UI com os dados iniciais
const updateUI = () => {
  scoreElement.textContent = gameData.score;
  levelElement.textContent = gameData.level;
  highElement.textContent = gameData.high;
  
  // NOVO: Atualizar progresso para próxima moeda
  if (currentUser) {
    rewardUI.showProgressTowardsNextCoin(gameData.score);
  }
};

// Inicializar jogador e grid
const player = new Player(canvas.width, canvas.height);
const grid = new Grid(3, 6);

// Inicializar estrelas de fundo
const stars = [];
for (let i = 1; i < NUMBER_STARS; i += 1) {
  stars.push(new Star(canvas.width, canvas.height));
}

// Inicializar obstáculos
const obstacles = [];
const initObstacles = () => {
  const x = canvas.width / 2 - 50;
  const y = canvas.height - 250;
  const offset = canvas.width * 0.15;
  const color = "crimson";

  const obstacle1 = new Obstacle({ x: x - offset, y }, 100, 20, color);
  const obstacle2 = new Obstacle({ x: x, y }, 100, 20, color);
  const obstacle3 = new Obstacle({ x: x + offset, y }, 100, 20, color);

  obstacles.push(obstacle1, obstacle2, obstacle3);
};

// Inicializar partículas
const particles = [];

// Sistema de bônus
const bonusSystem = {
  bonuses: [],
  spawnTimer: 0,
  spawnInterval: 15000, // 15 segundos
  playerBuff: {
    active: false,
    type: null,
    duration: 10000, // 10 segundos
    startTime: 0,
    endTime: 0,
  },
};

// Funções do sistema de bônus
const spawnBonus = () => {
  const bonus = new Bonus(canvas.width, canvas.height);
  bonusSystem.bonuses.push(bonus);
};

// Teclas pressionadas
const keys = {
  left: false,
  right: false,
  shoot: {
    pressed: false,
    releassed: true,
  },
};

// Variáveis de controle
let frames = 0;
let randomInterval = Math.floor(Math.random() * 500) + 500;
let game;
let spawnProjectilesInterval;
let gameStartTime;
let lastTime = 0;
let isPaused = false;
let pauseStartTime = 0;
let totalPausedTime = 0;
const pauseIndicator = document.querySelector(".pause-indicator");

// Função para desenhar as estrelas
const drawStars = () => {
  stars.forEach((star) => {
    star.update();
    star.draw(ctx);
  });
};

// Função para criar partículas de explosão
const createParticles = ({ position }, color, count = 15) => {
  for (let i = 0; i < count; i += 1) {
    particles.push(
      new Particle({
        position: {
          x: position.x,
          y: position.y,
        },
        velocity: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
        },
        radius: Math.random() * 3,
        color: color || "#BAA0DE",
        fades: true,
      })
    );
  }
};

// Função para criar explosões
const createExplosion = (position, size, color) => {
  for (let i = 0; i < size; i += 1) {
    const particle = new Particle(
      {
        x: position.x,
        y: position.y,
      },
      {
        x: Math.random() - 0.5 * 1.5,
        y: Math.random() - 0.5 * 1.5,
      },
      2,
      color
    );

    particles.push(particle);
  }
};

// Função para limpar partículas
const clearParticles = () => {
  particles.forEach((particle, i) => {
    if (particle.opacity <= 0) {
      particles.splice(i, 1);
    }
  });
};

// Função para atualizar o high score
const updateHighScore = () => {
  if (gameData.score > gameData.high) {
    gameData.high = gameData.score;
    localStorage.setItem("highScore", gameData.high);
  }
};

// Função para desenhar o buff ativo
const drawActiveBuff = (ctx) => {
  if (bonusSystem.playerBuff.active) {
    const { startTime, endTime } = bonusSystem.playerBuff;
    const now = Date.now();
    const elapsed = now - startTime;
    const remaining = endTime - now;
    const progress = remaining / (endTime - startTime);

    if (progress <= 0) {
      bonusSystem.playerBuff.active = false;
      return;
    }

    ctx.save();
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 10;

    ctx.fillStyle = "rgba(255, 215, 0, 0.9)";
    ctx.fillRect(canvas.width / 2 - 120, 50, 240 * progress, 12);

    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 3;
    ctx.strokeRect(canvas.width / 2 - 120, 50, 240, 12);

    ctx.shadowBlur = 5;
    ctx.fillStyle = "#FFD700";
    ctx.font = "14px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillText("MEGA DESTRUCTION MODE!", canvas.width / 2, 35);

    ctx.font = "8px 'Press Start 2P'";
    ctx.fillStyle = "#FFA500";
    ctx.fillText("Destroys 4 ships per hit!", canvas.width / 2, 75);

    const seconds = Math.ceil(remaining / 1000);
    ctx.fillStyle = "#FF6B6B";
    ctx.fillText(`${seconds}s`, canvas.width / 2 + 130, 58);

    ctx.restore();
  }
};

// Função para iniciar o jogo
const startGame = () => {
  // Resetar variáveis do jogo
  gameData.score = 0;
  gameData.level = 1;
  currentState = GameState.PLAYING;
  frames = 0;
  isPaused = false;
  totalPausedTime = 0;
  gameStartTime = Date.now();

  // Limpar arrays
  grid.invaders = [];
  grid.initialize(gameData.level);
  player.projectiles = [];
  particles.length = 0;
  obstacles.length = 0;
  bonusSystem.bonuses = [];
  bonusSystem.playerBuff.active = false;

  // Limpar UI de recompensas
  rewardUI.clear();

  // Inicializar obstáculos
  initObstacles();

  // Atualizar UI
  updateUI();

  // Parar música global de menu e música local, depois iniciar música do nível
  if (window.globalMenuMusic) {
    window.globalMenuMusic.stopMenuMusic();
  }
  soundEffects.stopMenuMusic();
  soundEffects.playLevelMusic(gameData.level);

  // Iniciar loop do jogo se não estiver rodando
  if (!game) {
    gameLoop();
  }

  // Iniciar spawn de projéteis dos invasores
  clearInterval(spawnProjectilesInterval);
  spawnProjectilesInterval = setInterval(() => {
    if (currentState === GameState.PLAYING && !isPaused) {
      const invader =
        grid.invaders[Math.floor(Math.random() * grid.invaders.length)];
      if (invader) {
        invader.shoot(grid.invaderProjectiles);
      }
    }
  }, 1000);

  antiCheat.analyzeSession();
};

// FUNÇÃO ATUALIZADA: Finalizar o jogo com sistema de recompensas
const endGame = async () => {
  currentState = GameState.GAME_OVER;
  player.alive = false;

  bonusSystem.bonuses = [];
  bonusSystem.playerBuff.active = false;
  bonusSystem.spawnTimer = 0;

  // Atualizar high score local
  updateHighScore();

  // NOVO: Processar recompensas se usuário estiver logado
  let gameResult = null;
  if (currentUser && rankingManager.isLoggedIn()) {
    console.log('🎯 Processando recompensas do jogo...');
    
    gameResult = await rankingManager.updateHighScore(gameData.score);
    
    if (gameResult.success || gameResult.rewards) {
      console.log('🎉 Recompensas processadas:', gameResult);
      
      // Atualizar dados do usuário
      const updatedUser = rankingManager.getCurrentUser();
      NavigationHelper.setCurrentUser(updatedUser);
      rewardUI.setUser(updatedUser);
      
      // Mostrar notificações de recompensa
      if (gameResult.rewards) {
        rewardUI.showRewardNotifications(gameResult.rewards);
        
        // Mostrar resumo detalhado
        setTimeout(() => {
          rewardUI.showGameEndSummary(gameResult);
        }, 2000);
      }
      
      // Log para debug das recompensas
      if (gameResult.rewards) {
        if (gameResult.rewards.coinsEarned > 0) {
          console.log(`💰 Moedas ganhas: +${gameResult.rewards.coinsEarned}`);
        }
        if (gameResult.rewards.levelUp) {
          console.log(`⭐ Promoção: ${gameResult.rewards.levelUp.from.name} → ${gameResult.rewards.levelUp.to.name}`);
        }
      }
    }
  } else {
    console.log('ℹ️ Usuário não logado - sem recompensas');
  }

  // Mostrar tela de game over
  document.body.appendChild(gameOverScreen);
  gameOverScreen.style.display = "flex";

  // Parar spawn de projéteis
  clearInterval(spawnProjectilesInterval);

  // Parar música do nível e iniciar música de menu
  soundEffects.stopLevelMusic();
  soundEffects.playMenuMusic();
};

// Função para pausar/despausar o jogo
const togglePause = () => {
  isPaused = !isPaused;

  if (isPaused) {
    pauseStartTime = Date.now();
    if (pauseIndicator) {
      pauseIndicator.style.display = "flex";
    }
  } else {
    totalPausedTime += Date.now() - pauseStartTime;
    if (pauseIndicator) {
      pauseIndicator.style.display = "none";
    }
  }
};

// Arrays para projéteis separados
const playerProjectiles = [];
const invaderProjectiles = [];

// Funções auxiliares do jogo
const showGameData = () => {
  scoreElement.textContent = gameData.score;
  levelElement.textContent = gameData.level;
  highElement.textContent = gameData.high;
};

// FUNÇÃO ATUALIZADA: Incrementar score com notificação de moedas
const incrementScore = async (value) => {
  const previousScore = gameData.score;
  gameData.score += value;
  updateUI();

  // NOVO: Verificar se ganhou moeda durante o jogo
  if (currentUser && rankingManager.isLoggedIn()) {
    const rewardSystem = rankingManager.getRewardSystem();
    const coinsFromPrevious = Math.floor(previousScore / rewardSystem.config.pointsPerCoin);
    const coinsFromCurrent = Math.floor(gameData.score / rewardSystem.config.pointsPerCoin);
    
    // Se ganhou uma nova moeda durante o jogo, mostrar notificação rápida
    if (coinsFromCurrent > coinsFromPrevious) {
      const notification = {
        type: 'coins',
        title: 'Moeda Desbloqueada!',
        message: `🪙 +1 (${coinsFromCurrent * rewardSystem.config.pointsPerCoin} pts)`,
        color: '#FFD700',
        duration: 2000
      };
      
      rewardUI.createNotificationElement(notification);
      
      // Som especial para moeda durante o jogo
      soundEffects.playSound('bonus');
    }
  }
};

const spawnBonusGame = () => {
  bonusSystem.bonuses.push(new Bonus(canvas.width, canvas.height));
};

const updateBonuses = () => {
  bonusSystem.spawnTimer += 16;
  if (bonusSystem.spawnTimer >= bonusSystem.spawnInterval) {
    spawnBonusGame();
    bonusSystem.spawnTimer = 0;
  }

  bonusSystem.bonuses.forEach((bonus, index) => {
    bonus.update();
    if (bonus.position.y > canvas.height) {
      bonusSystem.bonuses.splice(index, 1);
    }
  });

  if (bonusSystem.playerBuff.active) {
    const currentTime = Date.now();
    if (
      currentTime - bonusSystem.playerBuff.startTime >=
      bonusSystem.playerBuff.duration
    ) {
      bonusSystem.playerBuff.active = false;
    }
  }
};

const drawBonuses = () => {
  bonusSystem.bonuses.forEach((bonus) => bonus.draw(ctx));
};

const checkBonusCollision = () => {
  bonusSystem.bonuses.forEach((bonus, index) => {
    if (player.hit(bonus)) {
      bonusSystem.bonuses.splice(index, 1);

      bonusSystem.playerBuff.active = true;
      bonusSystem.playerBuff.startTime = Date.now();

      createExplosion(
        {
          x: bonus.position.x + bonus.width / 2,
          y: bonus.position.y + bonus.height / 2,
        },
        15,
        "#FFD700"
      );

      soundEffects.playSound("bonus");
    }
  });
};

const playerShootWithBuff = (projectiles) => {
  if (bonusSystem.playerBuff.active) {
    player.shoot(projectiles, "destruction");
  } else {
    player.shoot(projectiles);
  }
};

const drawBuffIndicator = () => {
  if (bonusSystem.playerBuff.active) {
    const currentTime = Date.now();
    const timeLeft =
      bonusSystem.playerBuff.duration -
      (currentTime - bonusSystem.playerBuff.startTime);
    const progress = timeLeft / bonusSystem.playerBuff.duration;

    ctx.fillStyle = "rgba(255, 215, 0, 0.8)";
    ctx.fillRect(20, 20, 200 * progress, 10);

    ctx.strokeStyle = "#FFD700";
    ctx.strokeRect(20, 20, 200, 10);

    ctx.fillStyle = "#FFD700";
    ctx.font = "16px Arial";
    ctx.fillText("MEGA DESTRUCTION MODE!", 20, 50);
  }
};

const drawProjectiles = () => {
  playerProjectiles.forEach((projectile) => {
    projectile.update();
    projectile.draw(ctx);
  });

  invaderProjectiles.forEach((projectile) => {
    projectile.update();
    projectile.draw(ctx);
  });
};

const clearProjectiles = () => {
  for (let i = playerProjectiles.length - 1; i >= 0; i--) {
    if (playerProjectiles[i].position.y < 0) {
      playerProjectiles.splice(i, 1);
    }
  }

  for (let i = invaderProjectiles.length - 1; i >= 0; i--) {
    if (invaderProjectiles[i].position.y > canvas.height) {
      invaderProjectiles.splice(i, 1);
    }
  }
};

const findNearbyInvaders = (targetInvader, maxCount = 3) => {
  const nearbyInvaders = [];
  const targetCenter = {
    x: targetInvader.position.x + targetInvader.width / 2,
    y: targetInvader.position.y + targetInvader.height / 2,
  };

  grid.invaders.forEach((invader) => {
    if (invader !== targetInvader && invader.alive) {
      const invaderCenter = {
        x: invader.position.x + invader.width / 2,
        y: invader.position.y + invader.height / 2,
      };

      const distance = Math.sqrt(
        Math.pow(targetCenter.x - invaderCenter.x, 2) +
          Math.pow(targetCenter.y - invaderCenter.y, 2)
      );

      if (distance <= 100 && nearbyInvaders.length < maxCount) {
        nearbyInvaders.push(invader);
      }
    }
  });

  return nearbyInvaders;
};

const destroyInvader = (invader, delayMs = 0) => {
  setTimeout(() => {
    if (invader.alive) {
      invader.alive = false;

      incrementScore(100);

      createExplosion(
        {
          x: invader.position.x + invader.width / 2,
          y: invader.position.y + invader.height / 2,
        },
        15,
        "#FF6B6B"
      );

      soundEffects.playSound("explosion");

      const invaderIndex = grid.invaders.indexOf(invader);
      if (invaderIndex > -1) {
        grid.invaders.splice(invaderIndex, 1);
      }
    }
  }, delayMs);
};

const checkShootInvaders = () => {
  for (let i = grid.invaders.length - 1; i >= 0; i--) {
    const invader = grid.invaders[i];

    if (!invader.alive) continue;

    for (let j = playerProjectiles.length - 1; j >= 0; j--) {
      const projectile = playerProjectiles[j];

      if (invader.hit(projectile)) {
        if (projectile.type === "destruction") {
          const invadersToDestroy = [invader];
          const nearbyInvaders = findNearbyInvaders(invader, 3);
          invadersToDestroy.push(...nearbyInvaders);

          const finalInvaders = invadersToDestroy.slice(0, 4);

          finalInvaders.forEach((targetInvader, index) => {
            if (targetInvader && targetInvader.alive) {
              setTimeout(() => {
                destroyInvader(targetInvader);

                createExplosion(
                  {
                    x: targetInvader.position.x + targetInvader.width / 2,
                    y: targetInvader.position.y + targetInvader.height / 2,
                  },
                  25,
                  index === 0 ? "#FF0080" : "#FF6B6B"
                );
              }, index * 150);
            }
          });

          createExplosion(
            {
              x: projectile.position.x,
              y: projectile.position.y,
            },
            30,
            "#FF0080"
          );
        } else {
          destroyInvader(invader);
        }

        playerProjectiles.splice(j, 1);
        break;
      }
    }
  }
};

const checkInvaderCollision = () => {
  obstacles.forEach((obstacle) => {
    grid.invaders.some((invader) => {
      if (invader.hit(obstacle)) {
        obstacles.splice(obstacle, 1);
      }

      if (invader.position.y >= player.position.y) {
        endGame();
      }
    });
  });
};

const checkInvaderPlayer = () => {
  grid.invaders.some((invader) => {
    if (invader.hit(player)) {
      soundEffects.playSound("explosion");
      endGame();
    }
  });
};

const checkShootPlayer = () => {
  invaderProjectiles.some((projectile, i) => {
    if (player.hit(projectile)) {
      soundEffects.playSound("explosion");
      invaderProjectiles.splice(i, 1);
      endGame();
    }
  });
};

const checkShootObstacles = () => {
  obstacles.forEach((obstacle) => {
    playerProjectiles.forEach((projectile, projectileIndex) => {
      if (obstacle.collidesWithProjectile(projectile)) {
        playerProjectiles.splice(projectileIndex, 1);
        createExplosion(
          {
            x: projectile.position.x,
            y: projectile.position.y,
          },
          10,
          obstacle.color
        );
      }
    });

    invaderProjectiles.forEach((projectile, projectileIndex) => {
      if (obstacle.collidesWithProjectile(projectile)) {
        invaderProjectiles.splice(projectileIndex, 1);
        createExplosion(
          {
            x: projectile.position.x,
            y: projectile.position.y,
          },
          10,
          obstacle.color
        );
      }
    });
  });
};

const spawnGrid = () => {
  if (grid.invaders.length === 0) {
    grid.invaders = grid.createInvaders();
    gameData.level++;
    updateUI();

    soundEffects.playSound("nextLevel");
    soundEffects.playLevelMusic(gameData.level);
  }
};

// Loop principal do jogo
const gameLoop = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawStars();

  if (isPaused) {
    obstacles.forEach((obstacle) => {
      obstacle.draw(ctx);
    });

    grid.draw(ctx);
    player.draw(ctx);

    playerProjectiles.forEach((projectile) => {
      projectile.draw(ctx);
    });

    invaderProjectiles.forEach((projectile) => {
      projectile.draw(ctx);
    });

    particles.forEach((particle) => {
      particle.draw(ctx);
    });

    bonusSystem.bonuses.forEach((bonus) => {
      bonus.draw(ctx);
    });

    drawActiveBuff(ctx);

    requestAnimationFrame(gameLoop);
    return;
  }

  if (currentState === GameState.PLAYING) {
    if (antiCheat.shouldBlock()) {
      endGame();
      return;
    }

    showGameData();
    spawnGrid();

    updateBonuses();
    drawBonuses();
    checkBonusCollision();

    drawBuffIndicator();

    particles.forEach((particle) => {
      particle.update();
      particle.draw(ctx);
    });

    drawProjectiles();

    obstacles.forEach((obstacle) => {
      obstacle.update();
      obstacle.draw(ctx);
    });

    clearProjectiles();
    clearParticles();

    checkShootInvaders();
    checkShootPlayer();
    checkShootObstacles();
    checkInvaderCollision();
    checkInvaderPlayer();

    grid.draw(ctx);
    grid.update(player.alive);

    if (grid.invaderProjectiles && Array.isArray(grid.invaderProjectiles)) {
      grid.invaderProjectiles.forEach((projectile) => {
        invaderProjectiles.push(projectile);
      });
      grid.invaderProjectiles = [];
    }

    ctx.save();

    ctx.translate(
      player.position.x + player.width / 2,
      player.position.y + player.height / 2
    );

    if (keys.shoot.pressed && keys.shoot.releassed) {
      soundEffects.playSound("shoot");
      playerShootWithBuff(playerProjectiles);
      keys.shoot.releassed = false;
    }

    if (keys.left && player.position.x >= 0) {
      player.moveLeft();
      ctx.rotate(-0.15);
    }

    if (keys.right && player.position.x <= canvas.width - player.width) {
      player.moveRight();
      ctx.rotate(0.15);
    }

    ctx.translate(
      -player.position.x - player.width / 2,
      -player.position.y - player.height / 2
    );

    player.draw(ctx);
    ctx.restore();
  }

  if (currentState === GameState.GAME_OVER) {
    checkShootObstacles();

    particles.forEach((particle) => {
      particle.update();
      particle.draw(ctx);
    });

    drawProjectiles();

    obstacles.forEach((obstacle) => {
      obstacle.draw(ctx);
    });

    clearProjectiles();
    clearParticles();

    grid.draw(ctx);
    grid.update(player.alive);
  }

  requestAnimationFrame(gameLoop);
};

// Event listeners
addEventListener("keydown", (event) => {
  switch (event.code) {
    case "ArrowLeft":
    case "KeyA":
      keys.left = true;
      break;
    case "ArrowRight":
    case "KeyD":
      keys.right = true;
      break;
    case "Space":
      keys.shoot.pressed = true;
      break;
    case "KeyP":
      togglePause();
      break;
  }
});

addEventListener("keyup", (event) => {
  switch (event.code) {
    case "KeyA":
    case "ArrowLeft":
      keys.left = false;
      break;
    case "KeyD":
    case "ArrowRight":
      keys.right = false;
      break;
    case "Space":
      keys.shoot.pressed = false;
      keys.shoot.releassed = true;
      break;
  }
});

startGame();
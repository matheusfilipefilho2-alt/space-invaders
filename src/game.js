import { NavigationHelper } from "./navigation.js";
import RewardUI from "./classes/RewardUI.js";
import RankingManager from "./classes/RankingManager.js";
import AntiCheat from "./classes/AntiCheat.js";
import Grid from "./classes/Grid.js";
import Obstacle from "./classes/Obstacle.js";
import Particle from "./classes/Particle.js";
import Player from "./classes/player.js";
import SoundEffects from "./classes/SoundEffects.js";
import Star from "./classes/Star.js";
import Bonus from "./classes/Bonus.js";
import { GameState, NUMBER_STARS } from "../utils/constantes.js";
import { supabase } from "./supabase.js";
import AchievementSystem from "./classes/AchievementSystem.js"; // NOVO

// Inicializar efeitos sonoros
const soundEffects = new SoundEffects();
const rewardUI = new RewardUI();
const rankingManager = new RankingManager();
const achievementSystem = new AchievementSystem(rankingManager); // NOVO

const gameStats = {
  startTime: Date.now(),
  killCount: 0,
  rapidKills: 0,
  rapidKillWindow: [],
  maxCombo: 0,
  currentCombo: 0,
  bonusesCollected: 0,
  perfectShots: 0,
  totalShots: 0,
  survivalTime: 0,
  levelStart: 1,
  levelEnd: 1,
};

// Elementos da UI
const scoreElement = document.querySelector(".score");
const levelElement = document.querySelector(".level");
const highElement = document.querySelector(".high");
const buttonRestart = document.querySelector(".button-restart");
const buttonViewRanking = document.querySelector(".button-view-ranking");
const gameOverScreen = document.querySelector(".game-over");

// Configurar usuário atual no rankingManager
const currentUser = NavigationHelper.getCurrentUser();
if (currentUser) {
  rankingManager.currentUser = currentUser;
  rewardUI.setUser(currentUser);
  rewardUI.setRewardSystem(rankingManager.getRewardSystem());

  // NOVO: Marcar nível inicial para detectar saltos de nível
  gameStats.levelStart = rankingManager
    .getRewardSystem()
    .getCurrentLevel(currentUser.high_score || 0).id;

  console.log("🎮 Sistemas de recompensas inicializados");
} else {
  console.warn("⚠️ Usuário não logado - recompensas desabilitadas");
}

// NOVA FUNÇÃO: Registrar tiro para estatísticas
const registerShot = (hit = false) => {
  gameStats.totalShots++;
  if (hit) {
    gameStats.perfectShots++;
  } else {
    gameStats.currentCombo = 0; // Reset combo se errou
  }
};

// NOVA FUNÇÃO: Registrar coleta de bônus
const registerBonusCollected = () => {
  gameStats.bonusesCollected++;
};

// NOVA FUNÇÃO: Registrar kill para conquistas
const registerKill = () => {
  gameStats.killCount++;
  gameStats.currentCombo++;
  gameStats.maxCombo = Math.max(gameStats.maxCombo, gameStats.currentCombo);

  // Rastrear kills rápidos para conquista "Fogo Rápido"
  const now = Date.now();
  gameStats.rapidKillWindow.push(now);

  // Manter apenas kills dos últimos 30 segundos
  gameStats.rapidKillWindow = gameStats.rapidKillWindow.filter(
    (time) => now - time <= 30000
  );

  gameStats.rapidKills = Math.max(
    gameStats.rapidKills,
    gameStats.rapidKillWindow.length
  );
};

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

// Função para criar explosões (substituindo createParticles)
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

    // Texto do buff - linha principal
    ctx.shadowBlur = 5;
    ctx.fillStyle = "#FFD700";
    ctx.font = "14px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillText("MEGA DESTRUCTION MODE!", canvas.width / 2, 35);

    // Texto secundário
    ctx.font = "8px 'Press Start 2P'";
    ctx.fillStyle = "#FFA500";
    ctx.fillText("Destroys 4 ships per hit!", canvas.width / 2, 75);

    // Tempo restante
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

  resetGameStats();

  // Limpar arrays
  grid.invaders = [];
  grid.initialize(gameData.level);
  player.projectiles = [];
  particles.length = 0;
  obstacles.length = 0;
  bonusSystem.bonuses = [];
  bonusSystem.playerBuff.active = false;

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

  // Verificar anti-cheat
  // A classe AntiCheat não possui o método checkForCheating
  // Usando analyzeSession() que é o método disponível
  antiCheat.analyzeSession();
};

// Função para finalizar o jogo
const endGame = async () => {
  currentState = GameState.GAME_OVER;
  player.alive = false;

  bonusSystem.bonuses = [];
  bonusSystem.playerBuff.active = false;
  bonusSystem.spawnTimer = 0;

  // Atualizar high score
  updateHighScore();

  // Salvar pontuação no ranking
  const updated = rankingManager.updateHighScore(gameData.score); // Mudança aqui: saveScore -> updateHighScore
  if (updated === true) {
    const userDataNew = rankingManager.getUser(currentUser.username);

    // Salvar dados do usuário
    NavigationHelper.setCurrentUser(userDataNew);
  }

  // NOVO: Sistema completo de recompensas
  let gameResult = null;
  if (currentUser && rankingManager.isLoggedIn()) {
    console.log("🎯 Processando recompensas e conquistas...");

    // Calcular estatísticas finais
    const finalStats = calculateFinalGameStats();
    console.log("📊 Estatísticas da partida:", finalStats);

    // Processar recompensas de pontuação
    gameResult = await rankingManager.updateHighScore(gameData.score);

    if (gameResult.success || gameResult.rewards) {
      // Atualizar usuário local
      const updatedUser = rankingManager.getCurrentUser();
      NavigationHelper.setCurrentUser(updatedUser);
      rewardUI.setUser(updatedUser);

      // Verificar conquistas
      console.log("🏆 Verificando conquistas...");
      const achievementResults = await achievementSystem.checkAchievements(
        finalStats
      );

      if (achievementResults.length > 0) {
        console.log(
          `🎉 ${achievementResults.length} conquista(s) desbloqueada(s)!`
        );

        // Adicionar conquistas ao resultado
        gameResult.achievements = achievementResults;

        // Atualizar moedas com recompensas das conquistas
        let totalAchievementCoins = 0;
        achievementResults.forEach((result) => {
          totalAchievementCoins += result.coinReward || 0;
        });

        if (totalAchievementCoins > 0) {
          console.log(`💰 +${totalAchievementCoins} moedas de conquistas!`);

          // Atualizar usuário final
          const finalUser = rankingManager.getCurrentUser();
          NavigationHelper.setCurrentUser(finalUser);
          rewardUI.setUser(finalUser);
        }
      }

      // Mostrar notificações de recompensas
      if (gameResult.rewards) {
        rewardUI.showRewardNotifications(gameResult.rewards);
      }

      // Mostrar conquistas desbloqueadas
      if (achievementResults.length > 0) {
        achievementResults.forEach((achievementResult, index) => {
          setTimeout(() => {
            const notification =
              achievementSystem.createAchievementNotification(
                achievementResult
              );
            rewardUI.createNotificationElement(notification);

            // Usar função global se existir (para compatibilidade)
            if (window.showAchievement) {
              window.showAchievement(
                achievementResult.achievement.name,
                achievementResult.achievement.description
              );
            }
          }, 3000 + index * 2000); // Espaçar conquistas por 2 segundos
        });
      }

      // Mostrar resumo completo após todas as notificações
      setTimeout(() => {
        // Adicionar estatísticas da partida ao resultado
        gameResult.gameStats = finalStats;
        rewardUI.showGameEndSummary(gameResult);
      }, 5000 + achievementResults.length * 2000);
    } else {
      console.log(
        "📊 Pontuação não superou o recorde, verificando conquistas mesmo assim..."
      );

      // Mesmo sem novo recorde, verificar conquistas
      const finalStats = calculateFinalGameStats();
      const achievementResults = await achievementSystem.checkAchievements(
        finalStats
      );

      if (achievementResults.length > 0) {
        achievementResults.forEach((achievementResult, index) => {
          setTimeout(() => {
            const notification =
              achievementSystem.createAchievementNotification(
                achievementResult
              );
            rewardUI.createNotificationElement(notification);
          }, 2000 + index * 2000);
        });
      }
    }
  } else {
    console.log("ℹ️ Usuário não logado - sem recompensas nem conquistas");
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

// NOVA FUNÇÃO: Mostrar progresso de conquistas próximas durante o jogo
const showNearbyAchievements = () => {
  if (!currentUser || !achievementSystem) return;

  const nearby = achievementSystem.getNearbyAchievements(3);

  nearby.forEach((progress, index) => {
    setTimeout(() => {
      NavigationHelper.showToast(
        `🏆 ${progress.achievement.name}: ${progress.progress}% (${progress.remainingToUnlock} restante)`,
        "info",
        3000
      );
    }, index * 1000);
  });
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

const incrementScore = async (value) => {
  gameData.score += value;
  updateUI();
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

  // Verificar se o buff expirou
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

      registerBonusCollected();

      // Ativar buff
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
  gameStats.totalShots++;

  if (bonusSystem.playerBuff.active) {
    // Projétil de destruction quando o buff está ativo
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

    // Barra de progresso do buff
    ctx.fillStyle = "rgba(255, 215, 0, 0.8)";
    ctx.fillRect(20, 20, 200 * progress, 10);

    ctx.strokeStyle = "#FFD700";
    ctx.strokeRect(20, 20, 200, 10);

    // Texto do buff
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
  // Remover projéteis do jogador fora da tela
  for (let i = playerProjectiles.length - 1; i >= 0; i--) {
    if (playerProjectiles[i].position.y < 0) {
      playerProjectiles.splice(i, 1);
    }
  }

  // Remover projéteis dos invasores fora da tela
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
      // Marcar como morto imediatamente
      invader.alive = false;

      incrementScore(100);
      registerKill();

      createExplosion(
        {
          x: invader.position.x + invader.width / 2,
          y: invader.position.y + invader.height / 2,
        },
        15,
        "#FF6B6B"
      );

      soundEffects.playSound("explosion");

      // Remover invasor do grid
      const invaderIndex = grid.invaders.indexOf(invader);
      if (invaderIndex > -1) {
        grid.invaders.splice(invaderIndex, 1);
      }
    }
  }, delayMs);
};

const checkShootInvaders = () => {
  // Usar for loop reverso para evitar problemas com remoção de elementos
  for (let i = grid.invaders.length - 1; i >= 0; i--) {
    const invader = grid.invaders[i];

    // Verificar apenas invasores vivos
    if (!invader.alive) continue;

    for (let j = playerProjectiles.length - 1; j >= 0; j--) {
      const projectile = playerProjectiles[j];

      if (invader.hit(projectile)) {
        registerShot(true);

        // Verificar se é um projétil de destruction
        if (projectile.type === "destruction") {
          // Destruir exatamente 4 invasores (incluindo o atingido)
          const invadersToDestroy = [invader];
          const nearbyInvaders = findNearbyInvaders(invader, 3);
          invadersToDestroy.push(...nearbyInvaders);

          // Garantir que temos exatamente 4 invasores para destruir
          const finalInvaders = invadersToDestroy.slice(0, 4);

          finalInvaders.forEach((targetInvader, index) => {
            if (targetInvader && targetInvader.alive) {
              // Adicionar delay escalonado para efeito visual dramático
              setTimeout(() => {
                destroyInvader(targetInvader);

                // Efeito visual especial para cada destruição
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

          // Efeito visual especial inicial para o projétil de destruction
          createExplosion(
            {
              x: projectile.position.x,
              y: projectile.position.y,
            },
            30,
            "#FF0080"
          );
        } else {
          // Projétil normal - destruir apenas o invasor atingido
          destroyInvader(invader);
        }

        playerProjectiles.splice(j, 1);
        break; // Sair do loop de projéteis após acertar
      }
    }
  }
};

const calculateFinalGameStats = () => {
  const endTime = Date.now();
  const gameDuration = endTime - gameStats.startTime;

  gameStats.survivalTime = Math.floor(gameDuration / 1000);
  gameStats.levelEnd = gameData.level;

  const levelJump = gameStats.levelEnd - gameStats.levelStart;

  return {
    finalScore: gameData.score,
    gameTime: gameStats.survivalTime,
    killCount: gameStats.killCount,
    rapidKills: gameStats.rapidKills,
    maxCombo: gameStats.maxCombo,
    bonusesCollected: gameStats.bonusesCollected,
    accuracy:
      gameStats.totalShots > 0
        ? (gameStats.perfectShots / gameStats.totalShots) * 100
        : 0,
    levelJump: levelJump,
    isFirstGame: (currentUser?.total_games || 0) === 0,
  };
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
    // Projéteis do jogador vs obstáculos
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

    // Projéteis dos invasores vs obstáculos
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

    // Tocar som de próximo nível
    soundEffects.playSound("nextLevel");

    // Trocar música do nível
    soundEffects.playLevelMusic(gameData.level);
  }
};

// Loop principal do jogo
const gameLoop = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawStars();

  // Verificar se o jogo está pausado
  if (isPaused) {
    // Desenhar elementos estáticos
    obstacles.forEach((obstacle) => {
      obstacle.draw(ctx);
    });

    grid.draw(ctx);
    player.draw(ctx);

    // Desenhar projéteis
    playerProjectiles.forEach((projectile) => {
      projectile.draw(ctx);
    });

    invaderProjectiles.forEach((projectile) => {
      projectile.draw(ctx);
    });

    // Desenhar partículas
    particles.forEach((particle) => {
      particle.draw(ctx);
    });

    // Desenhar bônus
    bonusSystem.bonuses.forEach((bonus) => {
      bonus.draw(ctx);
    });

    // Desenhar buff ativo
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

    // Atualizar sistema de bônus
    updateBonuses();
    drawBonuses();
    checkBonusCollision();

    // Desenhar indicador de buff
    drawBuffIndicator();

    // Desenhar partículas
    particles.forEach((particle) => {
      particle.update();
      particle.draw(ctx);
    });

    drawProjectiles();

    // Atualizar e desenhar obstáculos
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

    // Atualizar projéteis dos invasores
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

    // Desenhar partículas
    particles.forEach((particle) => {
      particle.update();
      particle.draw(ctx);
    });

    drawProjectiles();

    // Desenhar obstáculos
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
    case "KeyC": // NOVO: Mostrar conquistas próximas
      if (currentState === GameState.PLAYING) {
        showNearbyAchievements();
      }
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

// NOVO: Resetar estatísticas ao iniciar novo jogo
const resetGameStats = () => {
  gameStats.startTime = Date.now();
  gameStats.killCount = 0;
  gameStats.rapidKills = 0;
  gameStats.rapidKillWindow = [];
  gameStats.maxCombo = 0;
  gameStats.currentCombo = 0;
  gameStats.bonusesCollected = 0;
  gameStats.perfectShots = 0;
  gameStats.totalShots = 0;
  gameStats.survivalTime = 0;

  if (currentUser) {
    gameStats.levelStart = rankingManager
      .getRewardSystem()
      .getCurrentLevel(currentUser.high_score || 0).id;
  }
};

startGame();

// NOVO: Exportar funções para debug/testes
if (window.location.hostname === 'localhost') {
    window.debugRewards = {
        gameStats,
        achievementSystem,
        rankingManager,
        rewardUI,
        showNearbyAchievements,
        calculateFinalGameStats
    };
}
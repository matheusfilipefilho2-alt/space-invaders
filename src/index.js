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

const soundEffects = new SoundEffects();

const startScreen = document.querySelector(".start-screen");
const gameOverScreen = document.querySelector(".game-over");
const scoreUi = document.querySelector(".score-ui");
const scoreElement = document.querySelector(".score > span");
const levelElement = document.querySelector(".level > span");
const highElement = document.querySelector(".high > span");
const buttonPlay = document.querySelector(".button-play");
const buttonRestart = document.querySelector(".button-restart");

// Ranking Manager
const rankingManager = new RankingManager();

//Iniciar AntiCheat
const antiCheat = new AntiCheat();

// Elementos das novas telas
const loginScreen = document.querySelector(".login-screen");
const registerScreen = document.querySelector(".register-screen");
const rankingScreen = document.querySelector(".ranking-screen");

// Elementos de input
const usernameInput = document.querySelector("#username");
const pinInput = document.querySelector("#pin");
const newUsernameInput = document.querySelector("#new-username");
const newPinInput = document.querySelector("#new-pin");
const confirmPinInput = document.querySelector("#confirm-pin");

// Botões
const buttonLogin = document.querySelector(".button-login");
const buttonRegister = document.querySelector(".button-register");
const buttonCreate = document.querySelector(".button-create");
const buttonBack = document.querySelector(".button-back");
const buttonBackRegister = document.querySelector(".button-back-register");
const buttonPlayRanking = document.querySelector(".button-play-ranking");
const buttonLogout = document.querySelector(".button-logout");

// Lista de ranking
const rankingList = document.querySelector(".ranking-list");

// Remover telas inicialmente
loginScreen.remove();
registerScreen.remove();
rankingScreen.remove();

gameOverScreen.remove();

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

ctx.imageSmoothingEnabled = false;

let currentState = GameState.LOGIN;

const gameData = {
  score: 0,
  level: 1,
  high: 0,
};

let gameStartTime = Date.now();

// Sistema de bônus
const bonusSystem = {
  bonuses: [],
  spawnTimer: 0,
  spawnInterval: 5000, // 10 segundos
  playerBuff: {
    active: false,
    duration: 10000, // 7 segundos - Mega Destruction Mode
    startTime: 0,
  },
};

const showGameData = () => {
  scoreElement.textContent = gameData.score;
  levelElement.textContent = gameData.level;
  highElement.textContent = gameData.high;
};

const player = new Player(canvas.width, canvas.height);
const grid = new Grid(3, 6);

const stars = [];
const playerProjectiles = [];
const invaderProjectiles = [];
const particles = [];
const obstacles = [];

const initObstacles = () => {
  const x = canvas.width / 2 - 50;
  const y = canvas.height - 250;
  const offset = canvas.width * 0.15;
  const color = "crimson";

  const obstacle1 = new Obstacle({ x: x - offset, y }, 100, 20, color);
  const obstacle2 = new Obstacle({ x: x + offset, y }, 100, 20, color);

  obstacles.push(obstacle1);
  obstacles.push(obstacle2);
};

initObstacles();

const keys = {
  left: false,
  right: false,
  shoot: {
    pressed: false,
    releassed: true,
  },
};

const incrementScore = async (value) => {
  if (antiCheat.shouldBlock()) {
    console.warn("🚫 Jogador bloqueado pelo anti-cheat!");
    gameOver();
    return;
  }

  gameData.score += value;

  antiCheat.recordScoreEvent(
    gameData.score,
    gameData.level,
    Date.now() - gameStartTime
  );

  if (antiCheat.shouldBlock()) {
    console.warn("🚫 Comportamento suspeito detectado!");

    alert("Comportamento suspeito detectado. O jogo será encerrado.");
    gameOver();
    return;
  }

  if (gameData.score > gameData.high) {
    gameData.high = gameData.score;

    // Atualizar score online se logado
    await updateOnlineScore();
  }
};

// Funções do sistema de bônus
const spawnBonus = () => {
  const bonus = new Bonus(canvas.width, canvas.height);
  bonusSystem.bonuses.push(bonus);
};

const updateBonuses = () => {
  // Atualizar timer de spawn
  bonusSystem.spawnTimer += 16; // Aproximadamente 60 FPS

  // Spawnar novo bônus se o timer atingir o intervalo
  if (bonusSystem.spawnTimer >= bonusSystem.spawnInterval) {
    if (Math.random() < 0.3) {
      // 30% de chance de spawnar
      spawnBonus();
    }
    bonusSystem.spawnTimer = 0;
  }

  // Atualizar bônus existentes
  bonusSystem.bonuses.forEach((bonus, index) => {
    bonus.update();

    // Remover bônus que saíram da tela
    if (bonus.isOffScreen()) {
      bonusSystem.bonuses.splice(index, 1);
    }
  });

  // Verificar buff ativo
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
  bonusSystem.bonuses.forEach((bonus) => {
    bonus.draw(ctx);
  });
};

const checkBonusCollision = () => {
  bonusSystem.bonuses.forEach((bonus, index) => {
    if (bonus.hit(player)) {
      // Ativar buff
      bonusSystem.playerBuff.active = true;
      bonusSystem.playerBuff.startTime = Date.now();

      // Criar efeito visual mais impactante
      createExplosion(
        {
          x: bonus.position.x + bonus.width / 2,
          y: bonus.position.y + bonus.height / 2,
        },
        25,
        "#FFD700"
      );

      // Efeito secundário
      createExplosion(
        {
          x: bonus.position.x + bonus.width / 2,
          y: bonus.position.y + bonus.height / 2,
        },
        15,
        "#FF6B6B"
      );

      // Pontuação extra
      incrementScore(50);

      // Remover bônus
      bonusSystem.bonuses.splice(index, 1);

      // Som de coleta (usando som de hit como placeholder)
      soundEffects.playHitSound();
    }
  });
};

const playerShootWithBuff = (projectiles) => {
  if (bonusSystem.playerBuff.active) {
    // Disparar múltiplos projéteis durante o buff
    const projectile1 = {
      position: {
        x: player.position.x + player.width / 2 - 5,
        y: player.position.y + 2,
      },
      velocity: -10,
      width: 2,
      height: 20,
      draw(ctx) {
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
      },
      update() {
        this.position.y += this.velocity;
      },
    };

    const projectile2 = {
      position: {
        x: player.position.x + player.width / 2 + 3,
        y: player.position.y + 2,
      },
      velocity: -10,
      width: 2,
      height: 20,
      draw(ctx) {
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
      },
      update() {
        this.position.y += this.velocity;
      },
    };

    projectiles.push(projectile1);
    projectiles.push(projectile2);
  } else {
    // Disparo normal
    player.shoot(projectiles);
  }
};

const drawBuffIndicator = () => {
  if (bonusSystem.playerBuff.active) {
    const currentTime = Date.now();
    const remaining =
      bonusSystem.playerBuff.duration -
      (currentTime - bonusSystem.playerBuff.startTime);
    const progress = remaining / bonusSystem.playerBuff.duration;

    // Desenhar barra de progresso do buff
    ctx.save();

    // Efeito de brilho na barra
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

// Event Listeners para Login
buttonLogin.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const pin = pinInput.value.trim();

  if (!username || !isValidPin(pin)) {
    showError("Nome de usuário e PIN de 4 dígitos são obrigatórios!");
    return;
  }

  const result = await rankingManager.login(username, pin);

  if (result.success) {
    loginScreen.remove();
    gameData.high = result.user.high_score;
    await showRankingScreen();
  } else {
    showError(result.error);
  }
});

buttonRegister.addEventListener("click", () => {
  showRegisterScreen();
});

buttonBack.addEventListener("click", () => {
  loginScreen.remove();
  document.body.append(startScreen);
  currentState = GameState.START;
});

// Event Listeners para Registro
buttonCreate.addEventListener("click", async () => {
  const username = newUsernameInput.value.trim();
  const pin = newPinInput.value.trim();
  const confirmPin = confirmPinInput.value.trim();

  if (!username || !isValidPin(pin)) {
    showError("Nome de usuário e PIN de 4 dígitos são obrigatórios!");
    return;
  }

  if (pin !== confirmPin) {
    showError("PINs não conferem!");
    return;
  }

  const result = await rankingManager.register(username, pin);

  if (result.success) {
    registerScreen.remove();
    await showRankingScreen();
  } else {
    showError(result.error);
  }
});

buttonBackRegister.addEventListener("click", () => {
  registerScreen.remove();
  document.body.append(loginScreen);
  currentState = GameState.LOGIN;
});

// Event Listeners para Ranking
buttonPlayRanking.addEventListener("click", () => {
  rankingScreen.remove();
  scoreUi.style.display = "block";
  currentState = GameState.PLAYING;

  antiCheat.markNotFirstSession();
  gameStartTime = Date.now();

  // Iniciar intervalo de tiro dos inimigos
  setInterval(() => {
    const invader = grid.getRandomInvader();
    if (invader) {
      invader.shoot(invaderProjectiles);
    }
  }, 1000);
});

buttonLogout.addEventListener("click", () => {
  rankingManager.logout();
  gameData.high = 0;
  rankingScreen.remove();
  document.body.append(startScreen);
  currentState = GameState.START;
});

//Função para mostrar status do anti-cheat (debug)
const showAntiCheatStatus = () => {
  const status = antiCheat.getStatus();
  console.log(`🛡️ AntiCheat Status: ${status.risk} | Flags: ${status.flags} | Time: ${status.sessionTime}s`);
};

// Atualizar botão Play original
buttonPlay.addEventListener("click", () => {
  startScreen.remove();
  showLoginScreen();
});

const generateStars = () => {
  for (let i = 1; i < NUMBER_STARS; i += 1) {
    stars.push(new Star(canvas.width, canvas.height));
  }
};

const drawStars = () => {
  stars.forEach((star, i) => {
    star.draw(ctx);
    star.update();
  });
};

const drawObstacles = () => {
  if (obstacles.length <= 1 && player.alive == false) {
    initObstacles();
  }
  obstacles.forEach((obstacle) => obstacle.draw(ctx));
};

const drawProjectiles = () => {
  const projectiles = [...playerProjectiles, ...invaderProjectiles];

  projectiles.forEach((projectile) => {
    projectile.draw(ctx);
    projectile.update();
  });
};

const drawParticles = () => {
  particles.forEach((particle) => {
    particle.draw(ctx);
    particle.update();
  });
};

const clearProjectiles = () => {
  playerProjectiles.forEach((projectile, index) => {
    if (projectile.position.y <= 0) {
      playerProjectiles.splice(index, 1);
    }
  });
};

const clearParticles = () => {
  particles.forEach((particle, i) => {
    if (particle.opacity <= 0) {
      particles.splice(i, 1);
    }
  });
};

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

const findNearbyInvaders = (targetInvader, maxCount = 3) => {
  const nearby = [];
  const targetX = targetInvader.position.x + targetInvader.width / 2;
  const targetY = targetInvader.position.y + targetInvader.height / 2;

  // Criar lista de invasores com suas distâncias
  const invadersWithDistance = grid.invaders
    .filter((invader) => invader !== targetInvader)
    .map((invader) => {
      const invaderX = invader.position.x + invader.width / 2;
      const invaderY = invader.position.y + invader.height / 2;
      const distance = Math.sqrt(
        Math.pow(targetX - invaderX, 2) + Math.pow(targetY - invaderY, 2)
      );
      return { invader, distance };
    })
    .sort((a, b) => a.distance - b.distance);

  // Retornar os mais próximos
  return invadersWithDistance.slice(0, maxCount).map((item) => item.invader);
};

const destroyInvader = (invader, delayMs = 0) => {
  setTimeout(() => {
    const invaderIndex = grid.invaders.indexOf(invader);
    if (invaderIndex !== -1) {
      soundEffects.playHitSound();

      createExplosion(
        {
          x: invader.position.x + invader.width / 2,
          y: invader.position.y + invader.height / 2,
        },
        10,
        bonusSystem.playerBuff.active ? "#FFD700" : "#939"
      );

      incrementScore(10);
      grid.invaders.splice(invaderIndex, 1);
    }
  }, delayMs);
};

const checkShootInvaders = () => {
  grid.invaders.forEach((invader, invaderIndex) => {
    playerProjectiles.some((projectile, projectileIndex) => {
      if (invader.hit(projectile)) {
        // Destruir a nave atingida imediatamente
        destroyInvader(invader);

        // Se o buff estiver ativo, destruir 3 naves adicionais
        if (bonusSystem.playerBuff.active) {
          const nearbyInvaders = findNearbyInvaders(invader, 3);

          nearbyInvaders.forEach((nearbyInvader, index) => {
            // Adicionar delay escalonado para efeito visual mais dramático
            destroyInvader(nearbyInvader, (index + 1) * 100);
          });

          // Efeito visual especial para o buff
          createExplosion(
            {
              x: invader.position.x + invader.width / 2,
              y: invader.position.y + invader.height / 2,
            },
            20,
            "#FF6B6B"
          );
        }

        playerProjectiles.splice(projectileIndex, 1);
        return true;
      }
    });
  });
};

const checkInvaderColission = () => {
  obstacles.forEach((obstacle) => {
    grid.invaders.some((invader) => {
      if (invader.hit(obstacle)) {
        obstacles.splice(obstacle, 1);
      }

      if (invader.position.y >= player.position.y) {
        gameOver();
      }
    });
  });
};

const checkInavaderPlayer = () => {
  grid.invaders.some((invader) => {
    if (invader.hit(player)) {
      soundEffects.playExplosionSound();
      gameOver();
    }
  });
};

const checkShootPlayer = () => {
  invaderProjectiles.some((projectile, i) => {
    if (player.hit(projectile)) {
      soundEffects.playExplosionSound();
      invaderProjectiles.splice(i, 1);
      gameOver();
    }
  });
};

const checkShootObstacles = () => {
  obstacles.forEach((obstacle) => {
    playerProjectiles.some((projectile, i) => {
      if (obstacle.hit(projectile)) {
        playerProjectiles.splice(i, 1);
      }
    });

    invaderProjectiles.some((projectile, i) => {
      if (obstacle.hit(projectile)) {
        invaderProjectiles.splice(i, 1);
      }
    });
  });
};

const spawnGrid = () => {
  if (grid.invaders.length === 0) {
    soundEffects.playNextLevelSound();
    grid.rows = Math.round(Math.random() * 9 + 1);
    grid.cols = Math.round(Math.random() * 9 + 1);
    grid.restart();

    gameData.level += 1;
    grid.invadersVelocity += 0.5;
  }
};

const gameOver = () => {
  const securityReport = antiCheat.getSecurityReport();

  console.log("📊 Relatório de Segurança:", securityReport);

  if (securityReport.flaggedBehaviors.length > 0) {
    logSuspiciousActivity(securityReport);
  }

  createExplosion(
    {
      x: player.position.x + player.width / 2,
      y: player.position.y + player.height / 2,
    },
    10,
    "white"
  );

  createExplosion(
    {
      x: player.position.x + player.width / 2,
      y: player.position.y + player.height / 2,
    },
    10,
    "#4D9BE6"
  );

  createExplosion(
    {
      x: player.position.x + player.width / 2,
      y: player.position.y + player.height / 2,
    },
    10,
    "crimson"
  );

  currentState = GameState.GAME_OVER;
  player.alive = false;

  // Resetar sistema de bônus
  bonusSystem.bonuses = [];
  bonusSystem.playerBuff.active = false;
  bonusSystem.spawnTimer = 0;

  document.body.append(gameOverScreen);
};

const logSuspiciousActivity = async (securityReport) => {
  if (rankingManager.isLoggedIn()) {
    try {
      const { error } = await supabase.from("security_logs").insert([
        {
          username: rankingManager.getCurrentUser().username,
          score: gameData.score,
          level: gameData.level,
          security_report: securityReport,
          timestamp: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error("Erro ao registrar atividade suspeita:", error);
      }
    } catch (error) {
      console.error("Erro ao conectar com servidor de segurança:", error);
    }
  }
};

// Mostrar mensagem de erro
const showError = (message) => {
  alert(message); // Você pode melhorar isso depois
};

// Validar PIN (4 dígitos)
const isValidPin = (pin) => {
  return true;
};

// Mostrar tela de login
const showLoginScreen = () => {
  currentState = GameState.LOGIN;
  document.body.append(loginScreen);
  usernameInput.focus();
};

// Mostrar tela de registro
const showRegisterScreen = () => {
  currentState = GameState.REGISTER;
  loginScreen.remove();
  document.body.append(registerScreen);
  newUsernameInput.focus();
};

// Mostrar ranking
const showRankingScreen = async () => {
  currentState = GameState.RANKING;
  document.body.append(rankingScreen);

  // Carregar e exibir ranking
  const ranking = await rankingManager.getRanking();
  displayRanking(ranking);
};

// Exibir lista de ranking
const displayRanking = (ranking) => {
  rankingList.innerHTML = "";

  ranking.forEach((player, index) => {
    const rankingItem = document.createElement("div");
    rankingItem.className = "ranking-item";

    // Destacar usuário atual
    if (
      rankingManager.getCurrentUser() &&
      player.username === rankingManager.getCurrentUser().username
    ) {
      rankingItem.classList.add("current-user");
    }

    rankingItem.innerHTML = `
            <span class="ranking-position">#${index + 1}</span>
            <span>${player.username}</span>
            <span>${player.high_score}</span>
        `;

    rankingList.appendChild(rankingItem);
  });
};

// Atualizar high score online
const updateOnlineScore = async () => {
  if (rankingManager.isLoggedIn()) {
    const updated = await rankingManager.updateHighScore(gameData.score);
    if (updated) {
      console.log("Nova pontuação máxima salva!");
    }
  }
};

const gameLoop = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawStars();

  if (currentState == GameState.PLAYING) {
    
    if (antiCheat.shouldBlock()) {
      gameOver();
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

    drawParticles();
    drawProjectiles();
    drawObstacles();

    clearProjectiles();
    clearParticles();

    checkShootInvaders();
    checkShootPlayer();
    checkShootObstacles();
    checkInvaderColission();
    checkInavaderPlayer();

    grid.draw(ctx);
    grid.update(player.alive);

    ctx.save();

    ctx.translate(
      player.position.x + player.width / 2,
      player.position.y + player.height / 2
    );

    if (keys.shoot.pressed && keys.shoot.releassed) {
      soundEffects.playShootSound();
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

  if (currentState == GameState.GAME_OVER) {
    checkShootObstacles();

    drawParticles();
    drawProjectiles();
    drawObstacles();

    clearProjectiles();
    clearParticles();

    grid.draw(ctx);
    grid.update(player.alive);
  }

  requestAnimationFrame(gameLoop);
};

addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key === "a" || key === "arrowleft") keys.left = true;
  if (key === "d" || key === "arrowright") keys.right = true;
  if (key === " ") keys.shoot.pressed = true;
});

addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();

  if (key === "a" || key === "arrowleft") keys.left = false;
  if (key === "d" || key === "arrowright") keys.right = false;
  if (key === " ") {
    keys.shoot.pressed = false;
    keys.shoot.releassed = true;
  }
});

buttonPlay.addEventListener("click", () => {
  startScreen.remove();
  scoreUi.style.display = "block";
  currentState = GameState.PLAYING;

  setInterval(() => {
    const invader = grid.getRandomInvader();

    if (invader) {
      invader.shoot(invaderProjectiles);
    }
  }, 1000);
});

buttonRestart.addEventListener("click", () => {
  currentState = GameState.PLAYING;
  player.alive = true;

  grid.invaders.length = 0;
  grid.invadersVelocity = 1;

  invaderProjectiles.length = 0;

  // Resetar sistema de bônus
  bonusSystem.bonuses = [];
  bonusSystem.playerBuff.active = false;
  bonusSystem.spawnTimer = 0;

  gameData.score = 0;
  gameData.level = 0;

  antiCheat.reset();
  gameStartTime = Date.now();

  gameOverScreen.remove();
});

generateStars();
gameLoop();

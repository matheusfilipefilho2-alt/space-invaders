import RankingManager from "./classes/RankingManager.js";
import Grid from "./classes/Grid.js";
import Obstacle from "./classes/Obstacle.js";
import Particle from "./classes/Particle.js";
import Player from "./classes/player.js";
import SoundEffects from "./classes/SoundEffects.js";
import Star from "./classes/Star.js";
import { GameState, NUMBER_STARS } from "../utils/constantes.js";

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
const rankingManager = new RankingManager()

// Elementos das novas telas
const loginScreen = document.querySelector(".login-screen")
const registerScreen = document.querySelector(".register-screen")
const rankingScreen = document.querySelector(".ranking-screen")

// Elementos de input
const usernameInput = document.querySelector("#username")
const pinInput = document.querySelector("#pin")
const newUsernameInput = document.querySelector("#new-username")
const newPinInput = document.querySelector("#new-pin")
const confirmPinInput = document.querySelector("#confirm-pin")

// Botões
const buttonLogin = document.querySelector(".button-login")
const buttonRegister = document.querySelector(".button-register")
const buttonCreate = document.querySelector(".button-create")
const buttonBack = document.querySelector(".button-back")
const buttonBackRegister = document.querySelector(".button-back-register")
const buttonPlayRanking = document.querySelector(".button-play-ranking")
const buttonLogout = document.querySelector(".button-logout")

// Lista de ranking
const rankingList = document.querySelector(".ranking-list")

// Remover telas inicialmente
loginScreen.remove()
registerScreen.remove()
rankingScreen.remove()

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
  gameData.score += value;

  if (gameData.score > gameData.high) {
    gameData.high = gameData.score;
    
    // Atualizar score online se logado
    await updateOnlineScore()
  }
};

// Event Listeners para Login
buttonLogin.addEventListener("click", async () => {
    const username = usernameInput.value.trim()
    const pin = pinInput.value.trim()
    
    if (!username || !isValidPin(pin)) {
        showError('Nome de usuário e PIN de 4 dígitos são obrigatórios!')
        return
    }
    
    const result = await rankingManager.login(username, pin)
    
    if (result.success) {
        loginScreen.remove()
        gameData.high = result.user.high_score
        await showRankingScreen()
    } else {
        showError(result.error)
    }
})

buttonRegister.addEventListener("click", () => {
    showRegisterScreen()
})

buttonBack.addEventListener("click", () => {
    loginScreen.remove()
    document.body.append(startScreen)
    currentState = GameState.START
})

// Event Listeners para Registro
buttonCreate.addEventListener("click", async () => {
    const username = newUsernameInput.value.trim()
    const pin = newPinInput.value.trim()
    const confirmPin = confirmPinInput.value.trim()
    
    if (!username || !isValidPin(pin)) {
        showError('Nome de usuário e PIN de 4 dígitos são obrigatórios!')
        return
    }
    
    if (pin !== confirmPin) {
        showError('PINs não conferem!')
        return
    }
    
    const result = await rankingManager.register(username, pin)
    
    if (result.success) {
        registerScreen.remove()
        await showRankingScreen()
    } else {
        showError(result.error)
    }
})

buttonBackRegister.addEventListener("click", () => {
    registerScreen.remove()
    document.body.append(loginScreen)
    currentState = GameState.LOGIN
})

// Event Listeners para Ranking
buttonPlayRanking.addEventListener("click", () => {
    rankingScreen.remove()
    scoreUi.style.display = "block"
    currentState = GameState.PLAYING
    
    // Iniciar intervalo de tiro dos inimigos
    setInterval(() => {
        const invader = grid.getRandomInvader()
        if (invader) {
            invader.shoot(invaderProjectiles)
        }
    }, 1000)
})

buttonLogout.addEventListener("click", () => {
    rankingManager.logout()
    gameData.high = 0
    rankingScreen.remove()
    document.body.append(startScreen)
    currentState = GameState.START
})

// Atualizar botão Play original
buttonPlay.addEventListener("click", () => {
    startScreen.remove()
    showLoginScreen()
})

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

const checkShootInvaders = () => {
  grid.invaders.forEach((invader, invaderIndex) => {
    playerProjectiles.some((projectile, projectileIndex) => {
      if (invader.hit(projectile)) {
        soundEffects.playHitSound();

        createExplosion(
          {
            x: invader.position.x + invader.width / 2,
            y: invader.position.y + invader.height / 2,
          },
          10,
          "#939 "
        );

        incrementScore(10);

        grid.invaders.splice(invaderIndex, 1);
        playerProjectiles.splice(projectileIndex, 1);
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
  document.body.append(gameOverScreen);
};

// Mostrar mensagem de erro
const showError = (message) => {
    alert(message) // Você pode melhorar isso depois
}

// Validar PIN (4 dígitos)
const isValidPin = (pin) => {
    return true
}

// Mostrar tela de login
const showLoginScreen = () => {
    currentState = GameState.LOGIN
    document.body.append(loginScreen)
    usernameInput.focus()
}

// Mostrar tela de registro
const showRegisterScreen = () => {
    currentState = GameState.REGISTER
    loginScreen.remove()
    document.body.append(registerScreen)
    newUsernameInput.focus()
}

// Mostrar ranking
const showRankingScreen = async () => {
    currentState = GameState.RANKING
    document.body.append(rankingScreen)
    
    // Carregar e exibir ranking
    const ranking = await rankingManager.getRanking()
    displayRanking(ranking)
}

// Exibir lista de ranking
const displayRanking = (ranking) => {
    rankingList.innerHTML = ''
    
    ranking.forEach((player, index) => {
        const rankingItem = document.createElement('div')
        rankingItem.className = 'ranking-item'
        
        // Destacar usuário atual
        if (rankingManager.getCurrentUser() && 
            player.username === rankingManager.getCurrentUser().username) {
            rankingItem.classList.add('current-user')
        }
        
        rankingItem.innerHTML = `
            <span class="ranking-position">#${index + 1}</span>
            <span>${player.username}</span>
            <span>${player.high_score}</span>
        `
        
        rankingList.appendChild(rankingItem)
    })
}

// Atualizar high score online
const updateOnlineScore = async () => {
    if (rankingManager.isLoggedIn()) {
        const updated = await rankingManager.updateHighScore(gameData.score)
        if (updated) {
            console.log('Nova pontuação máxima salva!')
        }
    }
}

const gameLoop = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawStars();

  if (currentState == GameState.PLAYING) {
    showGameData();
    spawnGrid();

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
      player.shoot(playerProjectiles);
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
  currentState = GameState.LOGIN;

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

  gameData.score = 0;
  gameData.level = 0;

  gameOverScreen.remove();
});

generateStars();
gameLoop();

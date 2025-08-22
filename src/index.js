import { NavigationHelper } from "./navigation.js";

// Elementos da interface
const startScreen = document.querySelector(".start-screen");
const scoreUi = document.querySelector(".score-ui");
const buttonPlay = document.querySelector(".button-play");
const buttonViewRanking = document.querySelector(".button-view-ranking");
const buttonRestart = document.querySelector(".button-restart");
const buttonLoginNav = document.querySelector(".button-logout");

// Estado inicial da aplicação
let currentState = 'START';

// Navegação e controle de interface
if (buttonLoginNav) {
  buttonLoginNav.addEventListener("click", () => {
    NavigationHelper.navigateToLogin();
  });
}

buttonPlay.addEventListener("click", () => {
  window.location.href = "game.html";
});

buttonViewRanking.addEventListener("click", () => {
  NavigationHelper.navigateToRanking();
});

if (buttonRestart) {
  buttonRestart.addEventListener("click", () => {
    window.location.reload();
  });
}

// Verificar se deve iniciar o jogo automaticamente
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("startGame") === "true") {
  window.location.href = "game.html";
}

// Função para iniciar o jogo (redirecionamento)
function startGame() {
  currentState = 'PLAYING';
  startScreen.style.display = 'none';
  scoreUi.style.display = 'flex';
  window.location.href = "game.html";
}

// Exportar funções necessárias para outros módulos
window.startGame = startGame;
window.currentState = currentState;

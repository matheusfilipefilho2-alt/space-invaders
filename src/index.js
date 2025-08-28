import { NavigationHelper } from "./navigation.js";
import RankingManager from "./classes/RankingManager.js";
import globalMenuMusic from "./globalMenuMusic.js";

// Elementos da interface
const startScreen = document.querySelector(".start-screen");
const scoreUi = document.querySelector(".score-ui");
const buttonPlay = document.querySelector(".button-play");
const buttonViewRanking = document.querySelector(".button-view-ranking");
const buttonRestart = document.querySelector(".button-restart");
const buttonLoginNav = document.querySelector(".button-logout");

// NOVO: Elementos para sistema de recompensas
let userInfoCard = null;
let rankingManager = null;

// Estado inicial da aplicação
let currentState = 'START';

// A música de menu é gerenciada automaticamente pelo globalMenuMusic

// NOVO: Inicializar sistema de recompensas se usuário estiver logado
async function initializeRewardSystem() {
    const currentUser = NavigationHelper.getCurrentUser();
    
    if (currentUser) {
        console.log('🎮 Usuário logado detectado:', currentUser.username);
        
        // Inicializar ranking manager
        rankingManager = new RankingManager();
        rankingManager.currentUser = currentUser;
        rankingManager.getRewardSystem().setUser(currentUser);
        
        // Criar card de informações do usuário
        await createUserInfoCard();
        
        // Adicionar botão da loja
        addShopButton();
        
        // Atualizar botão de login para logout
        updateLoginButton();
    } else {
        console.log('👤 Nenhum usuário logado');
        
        // Remover card de usuário se existir
        removeUserInfoCard();
    }
}

// NOVO: Criar card com informações do usuário logado
async function createUserInfoCard() {
    if (!rankingManager || !NavigationHelper.getCurrentUser()) return;
    
    // Remover card existente se houver
    removeUserInfoCard();
    
    const currentUser = NavigationHelper.getCurrentUser();
    const playerStats = rankingManager.getPlayerDetailedStats();
    const levelProgress = rankingManager.getLevelProgress();
    
    console.log('📊 Carregando estatísticas do jogador:', playerStats);
    
    userInfoCard = document.createElement('div');
    userInfoCard.className = 'user-info-card-home';
    userInfoCard.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.85);
        border: 2px solid #00ff88;
        border-radius: 12px;
        padding: 20px;
        color: white;
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        z-index: 1000;
        min-width: 280px;
        box-shadow: 0 0 25px rgba(0, 255, 136, 0.3);
        backdrop-filter: blur(10px);
    `;
    
    const nextLevelInfo = levelProgress.next ? 
        `<div style="font-size: 8px; color: #888; margin-top: 8px;">
            Próximo: ${levelProgress.next.name} (${levelProgress.pointsNeeded.toLocaleString()} pts)
         </div>
         <div style="
            width: 100%;
            height: 6px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 3px;
            margin-top: 5px;
            overflow: hidden;
         ">
            <div style="
                width: ${levelProgress.progress}%;
                height: 100%;
                background: linear-gradient(90deg, #4ECDC4, #44A08D);
                border-radius: 3px;
                transition: width 0.5s ease;
            "></div>
         </div>` : 
        `<div style="color: #4ECDC4; font-size: 8px; margin-top: 8px; text-align: center;">
            ⭐ NÍVEL MÁXIMO! ⭐
         </div>`;
    
    userInfoCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <div style="
                background: linear-gradient(135deg, ${playerStats.level.color}, ${darkenColor(playerStats.level.color, 20)});
                border-radius: 50%;
                width: 50px;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            ">${playerStats.level.icon}</div>
            
            <div style="flex: 1;">
                <div style="color: #00ff88; font-weight: bold; margin-bottom: 5px;">
                    👨‍🚀 ${playerStats.username}
                </div>
                <div style="color: ${playerStats.level.color}; font-size: 8px;">
                    ${playerStats.level.name}
                </div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div style="text-align: center;">
                <div style="color: #4ECDC4; font-size: 8px; margin-bottom: 5px;">RECORDE</div>
                <div style="color: white; font-weight: bold;">
                    ${playerStats.highScore.toLocaleString()}
                </div>
            </div>
            <div style="text-align: center;">
                <div style="color: #FFD700; font-size: 8px; margin-bottom: 5px;">MOEDAS</div>
                <div style="color: white; font-weight: bold;">
                    🪙 ${rankingManager.getRewardSystem().formatCoins(playerStats.coins)}
                </div>
            </div>
        </div>
        
        ${nextLevelInfo}
        
        <div style="display: flex; gap: 8px; margin-top: 15px; font-size: 8px; justify-content: center;">
            <button onclick="NavigationHelper.navigateToRanking()" style="
                background: #4ECDC4;
                color: #000;
                border: none;
                padding: 8px 12px;
                border-radius: 15px;
                cursor: pointer;
                font-family: 'Press Start 2P', monospace;
                font-size: 6px;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='#44A08D'" onmouseout="this.style.background='#4ECDC4'">
                🏆 RANKING
            </button>
            <button onclick="NavigationHelper.navigateToShop()" style="
                background: #FFD700;
                color: #000;
                border: none;
                padding: 8px 12px;
                border-radius: 15px;
                cursor: pointer;
                font-family: 'Press Start 2P', monospace;
                font-size: 6px;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='#FFA500'" onmouseout="this.style.background='#FFD700'">
                🛍️ LOJA
            </button>
        </div>
    `;
    
    document.body.appendChild(userInfoCard);
}

// NOVO: Função para escurecer cores
function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) - amt));
    const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) - amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) - amt));
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// NOVO: Remover card de informações do usuário
function removeUserInfoCard() {
    if (userInfoCard && userInfoCard.parentNode) {
        userInfoCard.parentNode.removeChild(userInfoCard);
        userInfoCard = null;
    }
}

// NOVO: Adicionar botão da loja
function addShopButton() {
    // Verificar se já existe
    if (document.querySelector('.button-shop')) return;
    
    const menuButtons = document.querySelector('.menu-buttons');
    if (!menuButtons) return;
    
    const shopButton = document.createElement('button');
    shopButton.className = 'button-view-ranking button-shop';
    shopButton.innerHTML = `
        <span class="button-icon">🛍️</span>
        LOJA
    `;
    
    shopButton.addEventListener('click', () => {
        NavigationHelper.navigateToShop();
    });
    
    // Inserir antes do último botão
    const lastButton = menuButtons.lastElementChild;
    menuButtons.insertBefore(shopButton, lastButton);
}

// NOVO: Atualizar botão de login para logout
function updateLoginButton() {
    if (buttonViewRanking && buttonViewRanking.parentNode) {
        // Mudar texto e função do botão
        buttonViewRanking.innerHTML = `
            <span class="button-icon">🚪</span>
            SAIR
        `;
        
        // Remover listeners antigos
        const newButton = buttonViewRanking.cloneNode(true);
        buttonViewRanking.parentNode.replaceChild(newButton, buttonViewRanking);
        
        // Adicionar novo listener
        newButton.addEventListener('click', () => {
            NavigationHelper.showConfirmation(
                'Tem certeza que deseja sair?',
                () => {
                    NavigationHelper.logout();
                }
            );
        });
        
        // Atualizar referência global
        window.buttonViewRanking = newButton;
    } else {
        console.warn('⚠️ Elemento buttonViewRanking não encontrado ou sem parentNode');
    }
}

// NOVO: Mostrar dicas do sistema de recompensas
function showRewardsTips() {
    const currentUser = NavigationHelper.getCurrentUser();
    if (!currentUser || !rankingManager) return;
    
    const playerStats = rankingManager.getPlayerDetailedStats();
    const coinsPerGame = rankingManager.getRewardSystem().config.pointsPerCoin;
    
    // Dicas baseadas no progresso do jogador
    let tips = [];
    
    if (playerStats.coins < 50) {
        tips.push(`💡 Ganhe moedas fazendo pontos! A cada ${coinsPerGame.toLocaleString()} pontos = 1 moeda 🪙`);
    }
    
    if (playerStats.level.id <= 3) {
        tips.push('🚀 Alcance pontuações maiores para subir de nível e desbloquear novos recursos!');
    }
    
    if (playerStats.coins >= 50 && !tips.length) {
        tips.push('🛍️ Você tem moedas suficientes! Visite a loja para comprar melhorias especiais!');
    }
    
    // Mostrar dica aleatória
    if (tips.length > 0) {
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        
        setTimeout(() => {
            NavigationHelper.showToast(randomTip, 'info', 5000);
        }, 2000);
    }
}

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
  NavigationHelper.navigateToLogin();
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

// NOVO: Inicialização completa da página
async function initializePage() {
    console.log('🌟 Inicializando página inicial...');
    
    try {
        // Inicializar sistema de recompensas
        await initializeRewardSystem();
        
        // Mostrar dicas do sistema de recompensas (após 3 segundos)
        setTimeout(showRewardsTips, 3000);
        
        console.log('✅ Página inicial carregada com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar página:', error);
    }
}

// NOVO: Verificar atualizações do usuário periodicamente
function startPeriodicUserCheck() {
    setInterval(() => {
        const currentUser = NavigationHelper.getCurrentUser();
        
        if (currentUser && !userInfoCard) {
            // Usuário fez login em outra aba
            initializeRewardSystem();
        } else if (!currentUser && userInfoCard) {
            // Usuário fez logout em outra aba
            removeUserInfoCard();
            location.reload(); // Recarregar para resetar interface
        }
    }, 5000); // Verificar a cada 5 segundos
}

// Exportar funções necessárias para outros módulos
window.startGame = startGame;
window.currentState = currentState;

// NOVO: Disponibilizar NavigationHelper globalmente
window.NavigationHelper = NavigationHelper;

// NOVO: Event listeners para inicialização
document.addEventListener('DOMContentLoaded', initializePage);
window.addEventListener('load', () => {
    startPeriodicUserCheck();
});

// NOVO: Event listener para detectar mudanças de foco (usuário voltou para a aba)
window.addEventListener('focus', () => {
    // Atualizar informações quando usuário voltar para a aba
    initializeRewardSystem();
});

export { initializePage, initializeRewardSystem };
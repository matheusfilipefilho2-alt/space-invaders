import { NavigationHelper } from "./navigation.js";
import RankingManager from "./classes/RankingManager.js";
import AchievementSystem from "./classes/AchievementSystem.js";
import { supabase } from "./supabase.js";
import { walletUI } from "./components/WalletUI.js"; // Wallet UI

// Inicializar managers
const rankingManager = new RankingManager();
let achievementSystem = null;

// Elementos da UI
const currentUserName = document.getElementById('current-user-name');
const currentUserScore = document.getElementById('current-user-score');
const rankingList = document.querySelector('.ranking-list');
const shopCoinIndicator = document.getElementById('shop-coin-indicator');

// Configurar usuário atual
const currentUser = NavigationHelper.getCurrentUser();
if (currentUser) {
  rankingManager.currentUser = currentUser;
  achievementSystem = new AchievementSystem(rankingManager);
  console.log('🎮 Usuário logado encontrado:', currentUser.username);
} else {
  console.warn('⚠️ Nenhum usuário logado encontrado');
  // Redirecionar para login se não estiver logado
  NavigationHelper.navigateToLogin();
}

// Função para carregar e exibir informações do usuário atual
async function loadCurrentUserInfo() {
  if (!currentUser) return;
  
  try {
    // Atualizar nome do usuário
    if (currentUserName) {
      currentUserName.textContent = currentUser.username;
    }
    
    // Buscar dados atualizados do usuário
    const { data: userData, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', currentUser.id)
      .limit(1);
    
    if (error) throw error;
    
    // Verificar se o usuário existe
    if (!userData || userData.length === 0) {
      console.warn('⚠️ Usuário não encontrado no banco de dados');
      // Usar dados do localStorage como fallback
      const fallbackData = {
        high_score: currentUser.high_score || 0,
        coins: currentUser.coins || 0
      };
      
      if (currentUserScore) {
        currentUserScore.textContent = `Score: ${fallbackData.high_score}`;
      }
      
      if (shopCoinIndicator && fallbackData.coins > 0) {
        shopCoinIndicator.style.display = 'block';
        const coinCount = shopCoinIndicator.querySelector('.coin-count');
        if (coinCount) {
          coinCount.textContent = fallbackData.coins;
        }
      }
      return;
    }
    
    const user = userData[0];
    
    // Atualizar score do usuário
    if (currentUserScore) {
      currentUserScore.textContent = `Score: ${user.high_score || 0}`;
    }
    
    // Atualizar indicador de moedas na loja
    if (shopCoinIndicator && user.coins > 0) {
      shopCoinIndicator.style.display = 'block';
      const coinCount = shopCoinIndicator.querySelector('.coin-count');
      if (coinCount) {
        coinCount.textContent = user.coins;
      }
    }
    
  } catch (error) {
    console.error('Erro ao carregar informações do usuário:', error);
    if (currentUserName) {
      currentUserName.textContent = 'Erro ao carregar';
    }
    if (currentUserScore) {
      currentUserScore.textContent = 'Score: --';
    }
  }
}

// Função para carregar e exibir o ranking
async function loadRanking() {
  if (!rankingList) return;
  
  try {
    // Mostrar loading
    rankingList.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">Carregando ranking...</div>';
    
    // Buscar ranking do banco de dados
    const ranking = await rankingManager.getRanking();
    
    if (!ranking || ranking.length === 0) {
      rankingList.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">Nenhum jogador encontrado</div>';
      return;
    }
    
    // Gerar HTML do ranking
    const rankingHTML = ranking.map((player, index) => {
      const position = index + 1;
      const isCurrentUser = currentUser && player.id === currentUser.id;
      const medal = position <= 3 ? ['🥇', '🥈', '🥉'][position - 1] : `#${position}`;
      
      return `
        <div class="ranking-item ${isCurrentUser ? 'current-user' : ''}">
          <div class="ranking-position">${medal}</div>
          <div class="ranking-player">
            <div class="player-name">${player.username}</div>
            <div class="player-level">Nível ${player.current_level || 1}</div>
          </div>
          <div class="ranking-score">${player.high_score || 0}</div>
          <div class="ranking-coins">🪙 ${player.coins || 0}</div>
        </div>
      `;
    }).join('');
    
    rankingList.innerHTML = rankingHTML;
    
  } catch (error) {
    console.error('Erro ao carregar ranking:', error);
    rankingList.innerHTML = '<div style="text-align: center; color: #ff4757; padding: 20px;">Erro ao carregar ranking</div>';
  }
}

// Função para carregar conquistas do usuário (referenciada no HTML)
window.loadUserAchievements = async function() {
  if (!currentUser || !achievementSystem) {
    return [];
  }
  
  try {
    const userAchievements = await achievementSystem.getUserAchievements();
    
    // Mapear conquistas para o formato esperado pelo modal
    return userAchievements.map(ua => {
      const achievement = achievementSystem.getAchievementById(ua.achievement_id);
      if (achievement) {
        const rarity = achievementSystem.rarities[achievement.rarity] || achievementSystem.rarities.common;
        return {
          icon: achievement.icon,
          name: achievement.name,
          description: achievement.description,
          coinReward: Math.ceil(achievement.coinReward * rarity.multiplier)
        };
      }
      return null;
    }).filter(Boolean);
    
  } catch (error) {
    console.error('Erro ao carregar conquistas:', error);
    return [];
  }
};

// Event listeners para botões
function setupEventListeners() {
  // Botão Jogar Agora
  const playButton = document.querySelector('.button-play-ranking');
  if (playButton) {
    playButton.addEventListener('click', () => {
      NavigationHelper.navigateToGame();
    });
  }
  
  // Botão Sair
  const logoutButton = document.querySelector('.button-logout');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      NavigationHelper.logout();
    });
  }
}

// Função de inicialização principal
async function initializeRankingPage() {
  console.log('🏆 Inicializando página de ranking...');
  
  // Verificar se usuário está logado
  if (!currentUser) {
    console.warn('⚠️ Usuário não logado, redirecionando...');
    NavigationHelper.navigateToLogin();
    return;
  }
  
  // Configurar event listeners
  setupEventListeners();
  
  // Carregar dados em paralelo
  await Promise.all([
    loadCurrentUserInfo(),
    loadRanking()
  ]);
  
  console.log('✅ Página de ranking inicializada com sucesso');
}

// Disponibilizar NavigationHelper globalmente (para botões inline)
window.NavigationHelper = NavigationHelper;

// Inicializar quando o DOM estiver carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeRankingPage);
} else {
  // DOM já carregado
  initializeRankingPage();
}

// Atualizar ranking a cada 30 segundos
setInterval(() => {
  if (document.visibilityState === 'visible') {
    loadRanking();
  }
}, 30000);
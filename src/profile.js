import { NavigationHelper } from "./navigation.js";
import { supabase } from "./supabase.js";
import { walletUI } from "./components/WalletUI.js"; // Wallet UI
import ProfileStats from "./components/profile/ProfileStats.js";

// Elementos da UI
const profileUsername = document.getElementById('profile-username');
const profileEmail = document.getElementById('profile-email');
const tabButtons = document.querySelectorAll('.ui-tabs__button');
const tabPanes = document.querySelectorAll('.ui-tabs__pane');
const tabUnderline = document.querySelector('.ui-tabs__underline');

// Configurar usuário atual
const currentUser = NavigationHelper.getCurrentUser();
if (!currentUser) {
    console.warn('⚠️ Nenhum usuário logado encontrado');
    NavigationHelper.navigateToLogin();
}

// Inicializar perfil
async function initProfile() {
    if (!currentUser) return;

    try {
        // Buscar dados do usuário
        const { data: userData, error } = await supabase
            .from('players')
            .select('*')
            .eq('id', currentUser.id)
            .limit(1);

        if (error) throw error;

        let user = currentUser;
        if (userData && userData.length > 0) {
            user = { ...currentUser, ...userData[0] };
        }

        // Atualizar informações do usuário
        if (profileUsername) {
            profileUsername.textContent = user.username || 'Jogador';
        }
        if (profileEmail) {
            profileEmail.textContent = user.email || 'email@exemplo.com';
        }

        // Atualizar estatísticas
        updateStats(user);

    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
    }
}

// Atualizar estatísticas do usuário
function updateStats(user) {
    // Dados de exemplo - em produção viriam do banco de dados
    const gamesPlayed = user.games_played || 0;
    const wins = user.wins || 0;
    const winRate = gamesPlayed > 0
        ? parseFloat(((wins / gamesPlayed) * 100).toFixed(1))
        : 0;

    const stats = {
        gamesPlayed: gamesPlayed,
        wins: wins,
        winRate: winRate,
        bestScore: user.high_score || 0,
        enemiesKilled: user.enemies_killed || 0,
        playtimeHours: user.playtime_hours || 0
    };

    // Create or update ProfileStats component
    const statsContainer = document.querySelector('.stats-grid');
    if (statsContainer && statsContainer.parentElement) {
        const profileStats = new ProfileStats({ stats });
        const newStatsElement = profileStats.render();

        // Replace the old stats grid with the new component
        statsContainer.parentElement.insertBefore(newStatsElement, statsContainer);
        statsContainer.remove();

        // Animate the stats
        profileStats.animateCountUp();
    }

    // Atualizar progresso XP
    updateProgressBar(user);
}

// Atualizar barra de progresso XP
function updateProgressBar(user) {
    const xp = user.xp || 0;
    const level = user.level || 1;
    const xpPerLevel = 1000;
    const maxXp = xpPerLevel;
    const currentLevelXp = xp % maxXp;
    const progressPercentage = (currentLevelXp / maxXp) * 100;

    const progressFill = document.getElementById('progress-xp');
    if (progressFill) {
        progressFill.style.width = `${progressPercentage}%`;
    }

    const currentElement = document.getElementById('progress-current');
    const maxElement = document.getElementById('progress-max');
    const levelElement = document.querySelector('[data-pane="stats"] .profile-meta-item:first-child .meta-value');

    if (currentElement) currentElement.textContent = currentLevelXp;
    if (maxElement) maxElement.textContent = maxXp;
    if (levelElement) levelElement.textContent = level;
}

// Sistema de Tabs
function initTabs() {
    tabButtons.forEach((button, index) => {
        button.addEventListener('click', () => selectTab(index));
    });

    // Selecionar primeiro tab por padrão
    if (tabButtons.length > 0) {
        selectTab(0);
    }
}

function selectTab(index) {
    // Remover active de todos os botões
    tabButtons.forEach(btn => btn.classList.remove('ui-tabs__button--active'));

    // Remover active de todos os panes
    tabPanes.forEach(pane => {
        pane.classList.remove('ui-tabs__pane--active');
        pane.classList.remove('fade-in');
    });

    // Adicionar active ao botão selecionado
    tabButtons[index].classList.add('ui-tabs__button--active');

    // Adicionar active ao pane selecionado
    if (tabPanes[index]) {
        tabPanes[index].classList.add('ui-tabs__pane--active');
        tabPanes[index].classList.add('fade-in');
    }

    // Atualizar posição do underline
    updateUnderline();

    // Carregar conteúdo do tab
    loadTabContent(index);
}

function updateUnderline() {
    if (!tabUnderline) return;

    const activeButton = document.querySelector('.ui-tabs__button--active');
    if (activeButton) {
        const left = activeButton.offsetLeft;
        const width = activeButton.offsetWidth;

        tabUnderline.style.left = `${left}px`;
        tabUnderline.style.width = `${width}px`;
    }
}

// Carregar conteúdo dos tabs
async function loadTabContent(index) {
    const tabNames = ['stats', 'achievements', 'inventory', 'settings'];
    const tabName = tabNames[index];

    switch (tabName) {
        case 'achievements':
            await loadAchievements();
            break;
        case 'inventory':
            await loadInventory();
            break;
        case 'settings':
            initSettings();
            break;
    }
}

// Carregar conquistas
async function loadAchievements() {
    const grid = document.getElementById('achievements-grid');
    if (!grid || grid.querySelector('.achievement-item')) return; // Já carregado

    try {
        // Dados de exemplo - em produção viriam do banco de dados
        const achievements = [
            { id: 1, icon: '🚀', name: 'Primeiro Voo', description: 'Complete sua primeira partida', reward: 10, unlocked: true },
            { id: 2, icon: '🎯', name: 'Mira Perfeita', description: 'Acerte 10 inimigos seguidos', reward: 20, unlocked: true },
            { id: 3, icon: '👑', name: 'Campeão', description: 'Vença 100 partidas', reward: 50, unlocked: false },
            { id: 4, icon: '⚡', name: 'Blitzkrieg', description: 'Vença em menos de 5 minutos', reward: 30, unlocked: true },
            { id: 5, icon: '💎', name: 'Collector', description: 'Colete 50 itens', reward: 40, unlocked: false },
            { id: 6, icon: '🏆', name: 'Ranking Master', description: 'Fique no topo do ranking', reward: 100, unlocked: false },
        ];

        grid.innerHTML = achievements.map(achievement => `
            <div class="achievement-item ${!achievement.unlocked ? 'locked' : ''}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
                <div class="achievement-reward">+${achievement.reward} 🪙</div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Erro ao carregar conquistas:', error);
        grid.innerHTML = '<div class="loading">Erro ao carregar conquistas</div>';
    }
}

// Carregar inventário
async function loadInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid || grid.querySelector('.inventory-item')) return; // Já carregado

    try {
        // Dados de exemplo - em produção viriam do banco de dados
        const items = [
            { id: 1, icon: '🛡️', name: 'Escudo Azul', quantity: 5 },
            { id: 2, icon: '💥', name: 'Bomba', quantity: 3 },
            { id: 3, icon: '⚡', name: 'Velocidade', quantity: 8 },
            { id: 4, icon: '💚', name: 'Vida Extra', quantity: 2 },
            { id: 5, icon: '🌟', name: 'Estrela de Poder', quantity: 1 },
            { id: 6, icon: '🎫', name: 'Ticket Premium', quantity: 0 },
        ];

        grid.innerHTML = items
            .filter(item => item.quantity > 0)
            .map(item => `
                <div class="inventory-item">
                    <div class="inventory-item-icon">${item.icon}</div>
                    <div class="inventory-item-name">${item.name}</div>
                    <div class="inventory-item-quantity">x${item.quantity}</div>
                </div>
            `).join('');

        if (items.filter(item => item.quantity > 0).length === 0) {
            grid.innerHTML = '<div class="loading">Inventário vazio</div>';
        }

    } catch (error) {
        console.error('Erro ao carregar inventário:', error);
        grid.innerHTML = '<div class="loading">Erro ao carregar inventário</div>';
    }
}

// Inicializar configurações
function initSettings() {
    const saveBtn = document.getElementById('save-settings-btn');
    const resetBtn = document.getElementById('reset-settings-btn');

    if (saveBtn) {
        saveBtn.removeEventListener('click', saveSettings);
        saveBtn.addEventListener('click', saveSettings);
    }

    if (resetBtn) {
        resetBtn.removeEventListener('click', resetSettings);
        resetBtn.addEventListener('click', resetSettings);
    }
}

function saveSettings() {
    const musicVolume = document.getElementById('music-volume')?.value;
    const sfxVolume = document.getElementById('sfx-volume')?.value;
    const difficulty = document.getElementById('difficulty-select')?.value;
    const fullscreen = document.getElementById('fullscreen-toggle')?.checked;
    const publicProfile = document.getElementById('public-profile-toggle')?.checked;
    const showScore = document.getElementById('show-score-toggle')?.checked;

    // Salvar no localStorage
    localStorage.setItem('musicVolume', musicVolume || 70);
    localStorage.setItem('sfxVolume', sfxVolume || 70);
    localStorage.setItem('difficulty', difficulty || 'normal');
    localStorage.setItem('fullscreen', fullscreen || false);
    localStorage.setItem('publicProfile', publicProfile || true);
    localStorage.setItem('showScore', showScore || true);

    alert('✅ Configurações salvas com sucesso!');
}

function resetSettings() {
    if (confirm('Deseja restaurar as configurações padrão?')) {
        document.getElementById('music-volume').value = 70;
        document.getElementById('sfx-volume').value = 70;
        document.getElementById('difficulty-select').value = 'normal';
        document.getElementById('fullscreen-toggle').checked = false;
        document.getElementById('public-profile-toggle').checked = true;
        document.getElementById('show-score-toggle').checked = true;

        // Salvar
        saveSettings();
    }
}

// Carregar configurações salvas
function loadSettings() {
    document.getElementById('music-volume').value = localStorage.getItem('musicVolume') || 70;
    document.getElementById('sfx-volume').value = localStorage.getItem('sfxVolume') || 70;
    document.getElementById('difficulty-select').value = localStorage.getItem('difficulty') || 'normal';
    document.getElementById('fullscreen-toggle').checked = localStorage.getItem('fullscreen') === 'true';
    document.getElementById('public-profile-toggle').checked = localStorage.getItem('publicProfile') !== 'false';
    document.getElementById('show-score-toggle').checked = localStorage.getItem('showScore') !== 'false';
}

// Inicializar página
document.addEventListener('DOMContentLoaded', () => {
    initProfile();
    initTabs();
    loadSettings();

    // Atualizar underline ao redimensionar janela
    window.addEventListener('resize', updateUnderline);
});

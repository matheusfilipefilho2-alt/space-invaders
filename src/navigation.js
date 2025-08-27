export const NavigationHelper = {
    // Ir para uma página específica
    goTo(page) {
        window.location.href = page;
    },

    // Salvar dados temporários no localStorage
    saveTemporaryData(key, data) {
        localStorage.setItem(`spaceInvaders_${key}`, JSON.stringify(data));
    },

    // Recuperar dados temporários
    getTemporaryData(key) {
        const data = localStorage.getItem(`spaceInvaders_${key}`);
        return data ? JSON.parse(data) : null;
    },

    // Limpar dados temporários
    clearTemporaryData(key) {
        localStorage.removeItem(`spaceInvaders_${key}`);
    },

    // Verificar se usuário está logado
    isUserLoggedIn() {
        return this.getTemporaryData('currentUser') !== null;
    },

    // Salvar dados do usuário atual
    setCurrentUser(userData) {
        this.saveTemporaryData('currentUser', userData);
        
        // NOVO: Registrar última atividade
        userData.lastActivity = Date.now();
        
        // NOVO: Log para debug
        console.log('💾 Dados do usuário salvos:', {
            username: userData.username,
            coins: userData.coins || 0,
            level: userData.level_id || 1,
            highScore: userData.high_score || 0
        });
    },

    // Obter dados do usuário atual
    getCurrentUser() {
        const user = this.getTemporaryData('currentUser');
        
        // NOVO: Verificar se os dados não são muito antigos (24 horas)
        if (user && user.lastActivity) {
            const hoursSinceLastActivity = (Date.now() - user.lastActivity) / (1000 * 60 * 60);
            if (hoursSinceLastActivity > 24) {
                console.warn('⚠️ Dados do usuário são muito antigos, fazendo logout automático');
                this.logout();
                return null;
            }
        }
        
        return user;
    },

    // Fazer logout
    logout() {
        console.log('👋 Fazendo logout do usuário');
        this.clearTemporaryData('currentUser');
        this.clearTemporaryData('gameSettings'); // NOVO: Limpar configurações do jogo
        this.goTo('index.html');
    },

    // NOVO: Verificar se usuário tem permissão para uma página
    requireAuth(redirectTo = 'login.html') {
        if (!this.isUserLoggedIn()) {
            console.warn('🔒 Acesso negado - usuário não logado');
            this.goTo(redirectTo);
            return false;
        }
        return true;
    },

    // NOVO: Salvar configurações do jogo
    saveGameSettings(settings) {
        this.saveTemporaryData('gameSettings', {
            ...settings,
            timestamp: Date.now()
        });
    },

    // NOVO: Obter configurações do jogo
    getGameSettings() {
        return this.getTemporaryData('gameSettings') || {};
    },

    // NOVO: Salvar estatísticas temporárias da sessão
    saveSessionStats(stats) {
        this.saveTemporaryData('currentSession', {
            ...stats,
            timestamp: Date.now()
        });
    },

    // NOVO: Obter estatísticas da sessão atual
    getSessionStats() {
        return this.getTemporaryData('currentSession') || {
            gamesPlayed: 0,
            totalScore: 0,
            bestScore: 0,
            coinsEarned: 0,
            startTime: Date.now()
        };
    },

    // NOVO: Limpar dados da sessão
    clearSessionStats() {
        this.clearTemporaryData('currentSession');
    },

    // Navegar para a página de ranking
    navigateToRanking() {
        this.goTo('ranking.html');
    },

    // Navegar para a página de login
    navigateToLogin() {
        this.goTo('login.html');
    },

    // Navegar para a página de registro
    navigateToRegister() {
        this.goTo('register.html');
    },

    // Navegar para o jogo
    navigateToGame() {
        this.goTo('game.html');
    },

    // NOVO: Navegar para a loja
    navigateToShop() {
        if (!this.isUserLoggedIn()) {
            alert('Você precisa estar logado para acessar a loja!');
            this.navigateToLogin();
            return;
        }
        this.goTo('shop.html');
    },

    // Voltar para a página inicial
    navigateToHome() {
        this.goTo('index.html');
    },

    // NOVO: Sistema de navegação com breadcrumb
    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '') || 'index';
        
        const pageNames = {
            'index': 'Início',
            'game': 'Jogo',
            'login': 'Login',
            'register': 'Registro',
            'ranking': 'Ranking',
            'shop': 'Loja'
        };
        
        return {
            id: page,
            name: pageNames[page] || 'Página Desconhecida',
            requiresAuth: ['game', 'ranking', 'shop'].includes(page)
        };
    },

    // NOVO: Obter menu de navegação baseado no estado do usuário
    getNavigationMenu() {
        const isLoggedIn = this.isUserLoggedIn();
        const currentUser = this.getCurrentUser();
        
        const baseMenu = [
            { id: 'home', name: '🏠 Início', url: 'index.html', requiresAuth: false },
            { id: 'game', name: '🚀 Jogar', url: 'game.html', requiresAuth: false }
        ];

        if (isLoggedIn) {
            return [
                ...baseMenu,
                { id: 'ranking', name: '🏆 Ranking', url: 'ranking.html', requiresAuth: true },
                { id: 'shop', name: '🛍️ Loja', url: 'shop.html', requiresAuth: true, 
                  badge: currentUser?.coins ? `${currentUser.coins} 🪙` : null },
                { id: 'logout', name: '🚪 Sair', action: () => this.logout(), requiresAuth: true }
            ];
        } else {
            return [
                ...baseMenu,
                { id: 'login', name: '🔐 Login', url: 'login.html', requiresAuth: false },
                { id: 'register', name: '✨ Registrar', url: 'register.html', requiresAuth: false }
            ];
        }
    },

    // NOVO: Criar barra de navegação dinâmica
    createNavigationBar(containerId = 'navigation-bar') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const menu = this.getNavigationMenu();
        const currentPage = this.getCurrentPage();

        container.innerHTML = `
            <nav style="
                display: flex;
                justify-content: center;
                gap: 20px;
                padding: 15px;
                background: rgba(0, 0, 0, 0.8);
                border-radius: 15px;
                margin: 20px 0;
                flex-wrap: wrap;
            ">
                ${menu.map(item => `
                    <${item.url ? 'a' : 'button'} 
                        ${item.url ? `href="${item.url}"` : ''}
                        ${item.action ? `onclick="(${item.action.toString()})()"` : ''}
                        style="
                            background: ${currentPage.id === item.id ? '#4ECDC4' : 'transparent'};
                            color: ${currentPage.id === item.id ? '#000' : '#fff'};
                            border: 2px solid #4ECDC4;
                            padding: 8px 15px;
                            border-radius: 20px;
                            text-decoration: none;
                            font-family: 'Press Start 2P', monospace;
                            font-size: 8px;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            position: relative;
                        "
                        onmouseover="this.style.background='#4ECDC4'; this.style.color='#000';"
                        onmouseout="this.style.background='${currentPage.id === item.id ? '#4ECDC4' : 'transparent'}'; this.style.color='${currentPage.id === item.id ? '#000' : '#fff'}';"
                    >
                        ${item.name}
                        ${item.badge ? `
                            <span style="
                                background: #FFD700;
                                color: #000;
                                padding: 2px 6px;
                                border-radius: 10px;
                                font-size: 6px;
                                position: absolute;
                                top: -8px;
                                right: -5px;
                                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                            ">${item.badge}</span>
                        ` : ''}
                    </${item.url ? 'a' : 'button'}>
                `).join('')}
            </nav>
        `;
    },

    // NOVO: Mostrar notificação toast
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4757' : '#4ECDC4'};
            color: ${type === 'success' || type === 'error' ? '#fff' : '#000'};
            padding: 15px 20px;
            border-radius: 8px;
            font-family: 'Press Start 2P', monospace;
            font-size: 8px;
            z-index: 10001;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        // Adicionar animação CSS
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        toast.textContent = message;
        document.body.appendChild(toast);

        // Remover após o tempo especificado
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    },

    // NOVO: Mostrar confirmação
    showConfirmation(message, onConfirm, onCancel = null) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10002;
            font-family: 'Press Start 2P', monospace;
        `;

        modal.innerHTML = `
            <div style="
                background: rgba(5, 5, 25, 0.95);
                border: 3px solid #FFD700;
                border-radius: 15px;
                padding: 30px;
                text-align: center;
                max-width: 400px;
                color: white;
            ">
                <h3 style="color: #FFD700; margin-bottom: 20px;">Confirmação</h3>
                <p style="margin-bottom: 30px; line-height: 1.4; font-size: 10px;">${message}</p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="confirm-btn" style="
                        background: #00ff88;
                        color: #000;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-family: 'Press Start 2P', monospace;
                        font-size: 8px;
                    ">CONFIRMAR</button>
                    <button id="cancel-btn" style="
                        background: #FF4757;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-family: 'Press Start 2P', monospace;
                        font-size: 8px;
                    ">CANCELAR</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('#confirm-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
            if (onConfirm) onConfirm();
        });

        modal.querySelector('#cancel-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
            if (onCancel) onCancel();
        });

        // Fechar clicando fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                if (onCancel) onCancel();
            }
        });
    },

    // NOVO: Criar indicador de carregamento
    showLoading(message = 'Carregando...') {
        const loadingId = 'global-loading-indicator';
        let loading = document.getElementById(loadingId);
        
        if (loading) {
            loading.querySelector('.loading-message').textContent = message;
            return;
        }

        loading = document.createElement('div');
        loading.id = loadingId;
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10003;
            font-family: 'Press Start 2P', monospace;
        `;

        loading.innerHTML = `
            <div style="
                background: rgba(5, 5, 25, 0.95);
                border: 3px solid #4ECDC4;
                border-radius: 15px;
                padding: 30px;
                text-align: center;
                color: white;
            ">
                <div style="font-size: 32px; margin-bottom: 15px; animation: pulse 1s ease-in-out infinite;">⚡</div>
                <div class="loading-message" style="font-size: 10px; color: #4ECDC4;">${message}</div>
            </div>
        `;

        // Adicionar animação CSS se não existir
        if (!document.getElementById('loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(loading);
    },

    // NOVO: Esconder indicador de carregamento
    hideLoading() {
        const loading = document.getElementById('global-loading-indicator');
        if (loading) {
            document.body.removeChild(loading);
        }
    },

    // NOVO: Obter informações da página atual para analytics
    getPageAnalytics() {
        const currentPage = this.getCurrentPage();
        const user = this.getCurrentUser();
        const sessionStats = this.getSessionStats();
        
        return {
            page: currentPage,
            user: user ? {
                username: user.username,
                level: user.level_id || 1,
                coins: user.coins || 0,
                isLoggedIn: true
            } : { isLoggedIn: false },
            session: sessionStats,
            timestamp: Date.now(),
            url: window.location.href,
            referrer: document.referrer
        };
    }
};

class RewardSystem {
    constructor() {
        this.currentUser = null;
        
        // Configurações do sistema
        this.config = {
            coinsPerMilestone: 1, // Moedas ganhas a cada marco
            pointsPerCoin: 2000,  // Pontos necessários para ganhar 1 moeda
            maxCoinsPerGame: 10   // Limite de moedas por partida
        };
        
        // Definição dos níveis baseados no high score
        this.levels = [
            { id: 1, name: 'Recruta', minScore: 0, icon: '🥉', color: '#CD7F32' },
            { id: 2, name: 'Soldado', minScore: 5000, icon: '🥈', color: '#C0C0C0' },
            { id: 3, name: 'Sargento', minScore: 15000, icon: '🥇', color: '#FFD700' },
            { id: 4, name: 'Tenente', minScore: 30000, icon: '⭐', color: '#FF6B6B' },
            { id: 5, name: 'Capitão', minScore: 50000, icon: '🌟', color: '#4ECDC4' },
            { id: 6, name: 'Major', minScore: 80000, icon: '💎', color: '#45B7D1' },
            { id: 7, name: 'Coronel', minScore: 120000, icon: '👑', color: '#96CEB4' },
            { id: 8, name: 'General', minScore: 180000, icon: '🏆', color: '#FECA57' },
            { id: 9, name: 'Comandante', minScore: 250000, icon: '🚀', color: '#FF9FF3' },
            { id: 10, name: 'Lenda Galáctica', minScore: 350000, icon: '🌌', color: '#A8E6CF' }
        ];
    }

    // Configurar usuário atual
    setUser(user) {
        this.currentUser = user;
        if (!this.currentUser.coins) {
            this.currentUser.coins = 0;
        }
        if (!this.currentUser.level_id) {
            this.currentUser.level_id = 1;
        }
    }

    // Calcular moedas ganhas baseado na pontuação
    calculateCoinsEarned(currentScore, previousHighScore = 0) {
        if (!currentScore || currentScore <= previousHighScore) {
            return 0;
        }

        // Calcular apenas as moedas das novas pontuações acima do high score anterior
        const newPoints = currentScore - previousHighScore;
        const coinsEarned = Math.floor(newPoints / this.config.pointsPerCoin);
        
        // Limitar moedas por partida
        return Math.min(coinsEarned, this.config.maxCoinsPerGame);
    }

    // Obter nível atual baseado na pontuação
    getCurrentLevel(highScore) {
        if (!highScore) highScore = 0;
        
        for (let i = this.levels.length - 1; i >= 0; i--) {
            if (highScore >= this.levels[i].minScore) {
                return this.levels[i];
            }
        }
        
        // Se não encontrou nenhum nível, retornar o primeiro
        return this.levels[0];
    }

    // Função para calcular nível do jogador (compatibilidade com possíveis chamadas SQL)
    calculate_player_level(score) {
        if (typeof score === 'bigint') {
            score = Number(score);
        }
        return this.getCurrentLevel(score).id;
    }

    // Obter próximo nível
    getNextLevel(currentLevelId) {
        const nextLevelIndex = this.levels.findIndex(level => level.id === currentLevelId) + 1;
        return nextLevelIndex < this.levels.length ? this.levels[nextLevelIndex] : null;
    }

    // Verificar se houve promoção de nível
    checkLevelUp(newHighScore, oldLevelId) {
        const newLevel = this.getCurrentLevel(newHighScore);
        const leveledUp = newLevel.id > oldLevelId;
        
        return {
            leveledUp,
            newLevel: leveledUp ? newLevel : null,
            oldLevel: leveledUp ? this.levels.find(l => l.id === oldLevelId) : null
        };
    }

    // Processar recompensas após o jogo
    processGameRewards(finalScore, previousHighScore = 0, previousLevelId = 1) {
        const rewards = {
            coinsEarned: 0,
            levelUp: null,
            newTotal: {
                coins: this.currentUser?.coins || 0,
                level: this.getCurrentLevel(Math.max(finalScore, previousHighScore))
            }
        };

        // Calcular moedas apenas se superou o high score
        if (finalScore > previousHighScore) {
            rewards.coinsEarned = this.calculateCoinsEarned(finalScore, previousHighScore);
            
            if (this.currentUser) {
                this.currentUser.coins = (this.currentUser.coins || 0) + rewards.coinsEarned;
                rewards.newTotal.coins = this.currentUser.coins;
            }
        }

        // Verificar promoção de nível
        const levelCheck = this.checkLevelUp(Math.max(finalScore, previousHighScore), previousLevelId);
        if (levelCheck.leveledUp) {
            rewards.levelUp = {
                from: levelCheck.oldLevel,
                to: levelCheck.newLevel
            };
            
            if (this.currentUser) {
                this.currentUser.level_id = levelCheck.newLevel.id;
                rewards.newTotal.level = levelCheck.newLevel;
            }
        }

        return rewards;
    }

    // Obter informações de progresso para o próximo nível
    getLevelProgress(highScore) {
        const currentLevel = this.getCurrentLevel(highScore);
        const nextLevel = this.getNextLevel(currentLevel.id);
        
        if (!nextLevel) {
            return {
                current: currentLevel,
                next: null,
                progress: 100,
                pointsNeeded: 0
            };
        }

        const progress = Math.min(100, ((highScore - currentLevel.minScore) / (nextLevel.minScore - currentLevel.minScore)) * 100);
        const pointsNeeded = Math.max(0, nextLevel.minScore - highScore);

        return {
            current: currentLevel,
            next: nextLevel,
            progress: Math.round(progress),
            pointsNeeded
        };
    }

    // Obter estatísticas do jogador
    getPlayerStats(user) {
        if (!user) return null;

        const level = this.getCurrentLevel(user.high_score || 0);
        const progress = this.getLevelProgress(user.high_score || 0);
        
        return {
            username: user.username,
            highScore: user.high_score || 0,
            coins: user.coins || 0,
            level: level,
            progress: progress,
            totalCoinsEarned: Math.floor((user.high_score || 0) / this.config.pointsPerCoin)
        };
    }

    // Formatar moedas para exibição
    formatCoins(coins) {
        if (coins >= 1000000) {
            return `${(coins / 1000000).toFixed(1)}M`;
        } else if (coins >= 1000) {
            return `${(coins / 1000).toFixed(1)}K`;
        }
        return coins.toString();
    }

    // Criar notificação de recompensa
    createRewardNotification(rewards) {
        const notifications = [];

        if (rewards.coinsEarned > 0) {
            notifications.push({
                type: 'coins',
                title: 'Moedas Ganhas!',
                message: `+${rewards.coinsEarned} 🪙`,
                color: '#FFD700',
                duration: 3000
            });
        }

        if (rewards.levelUp) {
            notifications.push({
                type: 'levelup',
                title: 'Promoção!',
                message: `${rewards.levelUp.from.name} → ${rewards.levelUp.to.name}`,
                color: rewards.levelUp.to.color,
                duration: 5000,
                icon: rewards.levelUp.to.icon
            });
        }

        return notifications;
    }

    // Verificar se pode comprar item (para sistema de loja futuro)
    canAfford(cost) {
        return this.currentUser && (this.currentUser.coins || 0) >= cost;
    }

    // Gastar moedas (para sistema de loja futuro)
    spendCoins(amount) {
        if (!this.canAfford(amount)) {
            return false;
        }

        this.currentUser.coins -= amount;
        return true;
    }

    // Obter ranking dos melhores jogadores por nível
    getRankingByLevel(players) {
        return players.map(player => ({
            ...player,
            level: this.getCurrentLevel(player.high_score || 0),
            coins: player.coins || 0
        })).sort((a, b) => {
            // Primeiro por level (descendente), depois por high score (descendente)
            if (a.level.id !== b.level.id) {
                return b.level.id - a.level.id;
            }
            return (b.high_score || 0) - (a.high_score || 0);
        });
    }

    // Obter dados para gráfico de progresso
    getProgressChartData(user) {
        if (!user) return null;

        const currentLevel = this.getCurrentLevel(user.high_score || 0);
        const nextLevel = this.getNextLevel(currentLevel.id);
        
        return {
            currentScore: user.high_score || 0,
            currentLevelMin: currentLevel.minScore,
            nextLevelMin: nextLevel ? nextLevel.minScore : currentLevel.minScore,
            progress: this.getLevelProgress(user.high_score || 0).progress
        };
    }
}

export default RewardSystem;
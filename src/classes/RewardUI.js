class RewardUI {
    constructor() {
        this.notifications = [];
        this.rewardSystem = null;
        this.currentUser = null;
        
        this.createUIElements();
        this.setupStyles();
    }

    setRewardSystem(rewardSystem) {
        this.rewardSystem = rewardSystem;
    }

    setUser(user) {
        this.currentUser = user;
        this.updatePlayerInfo();
    }

    createUIElements() {
        // Container principal de recompensas
        this.rewardContainer = document.createElement('div');
        this.rewardContainer.className = 'reward-ui-container';
        this.rewardContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            font-family: 'Press Start 2P', monospace;
            pointer-events: none;
            width: 350px;
        `;

        // Info do jogador
        this.playerInfo = document.createElement('div');
        this.playerInfo.className = 'player-info-card';
        this.playerInfo.style.cssText = `
            background: rgba(0, 0, 0, 0.85);
            border: 2px solid #FFD700;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
            pointer-events: auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        // Container para notificações
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.className = 'notification-container';
        this.notificationContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        this.rewardContainer.appendChild(this.playerInfo);
        this.rewardContainer.appendChild(this.notificationContainer);
        document.body.appendChild(this.rewardContainer);
    }

    setupStyles() {
        if (document.getElementById('reward-ui-styles')) return;

        const style = document.createElement('style');
        style.id = 'reward-ui-styles';
        style.textContent = `
            .reward-notification {
                background: rgba(0, 0, 0, 0.9);
                border: 2px solid;
                border-radius: 8px;
                padding: 15px;
                color: white;
                font-size: 12px;
                animation: slideInRight 0.5s ease-out, slideOutRight 0.5s ease-out 2.5s;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                position: relative;
                overflow: hidden;
            }

            .reward-notification::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                animation: shine 2s ease-in-out;
            }

            .reward-notification.coins {
                border-color: #FFD700;
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
            }

            .reward-notification.levelup {
                border-color: #FF6B6B;
                box-shadow: 0 0 20px rgba(255, 107, 107, 0.5);
                font-size: 14px;
                padding: 20px;
            }

            .notification-title {
                font-weight: bold;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .notification-message {
                font-size: 10px;
                opacity: 0.9;
            }

            .level-progress-bar {
                width: 100%;
                height: 8px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
                overflow: hidden;
                margin: 8px 0;
            }

            .level-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #4ECDC4, #44A08D);
                border-radius: 4px;
                transition: width 0.3s ease;
                position: relative;
            }

            .level-progress-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
                animation: progressShine 2s ease-in-out infinite;
            }

            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }

            @keyframes shine {
                0% { left: -100%; }
                100% { left: 100%; }
            }

            @keyframes progressShine {
                0%, 100% { left: -100%; }
                50% { left: 100%; }
            }

            .coin-icon {
                display: inline-block;
                animation: coinSpin 2s ease-in-out infinite;
            }

            @keyframes coinSpin {
                0%, 100% { transform: rotateY(0deg); }
                50% { transform: rotateY(180deg); }
            }

            .player-level-badge {
                background: linear-gradient(135deg, var(--level-color, #FFD700), var(--level-color-dark, #FFA500));
                border-radius: 20px;
                padding: 5px 10px;
                font-size: 10px;
                color: white;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }

            @media (max-width: 768px) {
                .reward-ui-container {
                    width: 280px;
                    right: 10px;
                    top: 70px;
                }

                .player-info-card {
                    padding: 10px;
                    font-size: 10px;
                }

                .reward-notification {
                    padding: 12px;
                    font-size: 10px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    updatePlayerInfo() {
        if (!this.currentUser || !this.rewardSystem) {
            this.hidePlayerInfoCard();
            return;
        }

        const stats = this.rewardSystem.getPlayerStats(this.currentUser);
        if (!stats) {
            this.hidePlayerInfoCard();
            return;
        }

        const levelProgress = this.rewardSystem.getLevelProgress(this.currentUser.high_score || 0);
        
        // Verificar se há informações relevantes para mostrar
        if (!this.hasRelevantInfo(stats, levelProgress)) {
            this.hidePlayerInfoCard();
            return;
        }
        
        this.showPlayerInfoCard();

        this.playerInfo.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="player-level-badge" style="--level-color: ${stats.level.color}; --level-color-dark: ${this.darkenColor(stats.level.color)};">
                        ${stats.level.icon} ${stats.level.name}
                    </div>
                    <div style="color: #FFD700; font-size: 12px;">
                        <span class="coin-icon">🪙</span> ${this.rewardSystem.formatCoins(stats.coins)}
                    </div>
                </div>
                
                ${levelProgress.next ? `
                    <div style="font-size: 8px; color: #888;">
                        Próximo: ${levelProgress.next.name} (${this.rewardSystem.formatCoins(levelProgress.pointsNeeded)} pts)
                    </div>
                    <div class="level-progress-bar">
                        <div class="level-progress-fill" style="width: ${levelProgress.progress}%"></div>
                    </div>
                ` : `
                    <div style="font-size: 8px; color: #4ECDC4; text-align: center;">
                        ⭐ NÍVEL MÁXIMO ⭐
                    </div>
                `}
            </div>
        `;
    }

    showRewardNotifications(rewards) {
        if (!rewards) return;

        const notifications = this.rewardSystem.createRewardNotification(rewards);
        
        notifications.forEach((notification, index) => {
            setTimeout(() => {
                this.createNotificationElement(notification);
            }, index * 1000); // Espaçar notificações por 1 segundo
        });

        // Atualizar info do jogador após as recompensas
        setTimeout(() => {
            this.updatePlayerInfo();
        }, notifications.length * 1000 + 500);
    }

    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `reward-notification ${notification.type}`;
        element.style.borderColor = notification.color;

        element.innerHTML = `
            <div class="notification-title">
                ${notification.icon || '🎉'} ${notification.title}
            </div>
            <div class="notification-message">${notification.message}</div>
        `;

        this.notificationContainer.appendChild(element);

        // Remover após a animação
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 3500);
    }

    showGameEndSummary(gameResult) {
        if (!gameResult) return;
        
        const { rewards, newHighScore, playerStats } = gameResult;
        
        // Verificar se há informações relevantes para mostrar no resumo
        const hasRelevantSummaryInfo = (
            newHighScore || 
            (rewards && rewards.coinsEarned > 0) || 
            (rewards && rewards.levelUp) ||
            (playerStats && playerStats.highScore > 0)
        );
        
        if (!hasRelevantSummaryInfo) {
            console.log('📊 Nenhuma informação relevante para mostrar no resumo do jogo');
            return;
        }

        // Criar resumo de fim de jogo
        const summary = document.createElement('div');
        summary.className = 'game-end-summary';
        summary.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            border: 3px solid #FFD700;
            border-radius: 15px;
            padding: 30px;
            color: white;
            font-family: 'Press Start 2P', monospace;
            z-index: 10000;
            text-align: center;
            min-width: 400px;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
            animation: slideInRight 0.5s ease-out;
        `;

        let summaryContent = `
            <h2 style="color: #FFD700; margin-bottom: 20px; font-size: 18px;">
                🎮 RESUMO DA PARTIDA 🎮
            </h2>
        `;

        if (newHighScore) {
            summaryContent += `
                <div style="background: rgba(0, 255, 0, 0.1); border: 1px solid #00FF00; padding: 15px; margin: 15px 0; border-radius: 8px;">
                    <div style="color: #00FF00; font-size: 14px; margin-bottom: 10px;">🚀 NOVO RECORDE!</div>
                    <div style="font-size: 12px;">${playerStats.highScore.toLocaleString()} pontos</div>
                </div>
            `;
        }

        if (rewards.coinsEarned > 0) {
            summaryContent += `
                <div style="background: rgba(255, 215, 0, 0.1); border: 1px solid #FFD700; padding: 15px; margin: 15px 0; border-radius: 8px;">
                    <div style="color: #FFD700; font-size: 14px; margin-bottom: 10px;">💰 MOEDAS GANHAS</div>
                    <div style="font-size: 12px;">+${rewards.coinsEarned} 🪙</div>
                    <div style="font-size: 10px; color: #888; margin-top: 5px;">Total: ${playerStats.coins} 🪙</div>
                </div>
            `;
        }

        if (rewards.levelUp) {
            summaryContent += `
                <div style="background: rgba(255, 107, 107, 0.1); border: 1px solid #FF6B6B; padding: 15px; margin: 15px 0; border-radius: 8px;">
                    <div style="color: #FF6B6B; font-size: 14px; margin-bottom: 10px;">⭐ PROMOÇÃO!</div>
                    <div style="font-size: 12px;">${rewards.levelUp.from.name} → ${rewards.levelUp.to.name}</div>
                    <div style="font-size: 10px; margin-top: 5px;">${rewards.levelUp.to.icon} ${rewards.levelUp.to.name}</div>
                </div>
            `;
        }

        summaryContent += `
            <button onclick="this.parentElement.remove()" style="
                background: #FF6B6B;
                border: none;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                font-family: 'Press Start 2P', monospace;
                font-size: 10px;
                cursor: pointer;
                margin-top: 20px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
            " onmouseover="this.style.background='#FF4757'" onmouseout="this.style.background='#FF6B6B'">
                CONTINUAR
            </button>
        `;

        summary.innerHTML = summaryContent;
        document.body.appendChild(summary);

        // Remover automaticamente após 10 segundos
        setTimeout(() => {
            if (summary.parentNode) {
                summary.remove();
            }
        }, 10000);
    }

    // Verificar se há informações relevantes para mostrar
    hasRelevantInfo(stats, levelProgress) {
        // Mostrar se há moedas para exibir
        if (stats.coins > 0) return true;
        
        // Mostrar se há progresso para o próximo nível
        if (levelProgress && levelProgress.next && levelProgress.progress > 0) return true;
        
        // Mostrar se não está no nível inicial (Bronze I)
        if (stats.level && stats.level.id > 1) return true;
        
        // Mostrar se há high score
        if (stats.highScore > 0) return true;
        
        return false;
    }
    
    // Mostrar player info card
    showPlayerInfoCard() {
        if (this.playerInfo) {
            this.playerInfo.style.display = 'flex';
        }
    }
    
    // Esconder player info card
    hidePlayerInfoCard() {
        if (this.playerInfo) {
            this.playerInfo.style.display = 'none';
        }
    }

    // Utilitário para escurecer cores
    darkenColor(color, percent = 20) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    }

    // Limpar UI (útil para reset do jogo)
    clear() {
        this.notificationContainer.innerHTML = '';
    }

    // Remover UI completamente
    destroy() {
        if (this.rewardContainer.parentNode) {
            this.rewardContainer.parentNode.removeChild(this.rewardContainer);
        }
    }

    // Mostrar progresso em tempo real durante o jogo
    showProgressTowardsNextCoin(currentScore) {
        if (!this.rewardSystem) return;

        const coinsEarned = Math.floor(currentScore / this.rewardSystem.config.pointsPerCoin);
        const nextCoinAt = (coinsEarned + 1) * this.rewardSystem.config.pointsPerCoin;
        const progress = ((currentScore % this.rewardSystem.config.pointsPerCoin) / this.rewardSystem.config.pointsPerCoin) * 100;

        // Atualizar indicador existente ou criar novo
        let indicator = document.getElementById('coin-progress-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'coin-progress-indicator';
            indicator.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                border: 2px solid #FFD700;
                border-radius: 20px;
                padding: 8px 15px;
                color: #FFD700;
                font-family: 'Press Start 2P', monospace;
                font-size: 8px;
                z-index: 9998;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            document.body.appendChild(indicator);
        }

        indicator.innerHTML = `
            🪙 Próxima moeda: ${nextCoinAt - currentScore} pts
            <div style="width: 60px; height: 6px; background: rgba(255, 215, 0, 0.3); border-radius: 3px; margin-left: 5px;">
                <div style="width: ${progress}%; height: 100%; background: #FFD700; border-radius: 3px; transition: width 0.3s ease;"></div>
            </div>
        `;
    }
}

export default RewardUI;
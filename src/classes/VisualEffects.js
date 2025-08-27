class VisualEffects {
    constructor() {
        this.particles = [];
        this.floatingTexts = [];
        this.screenShakes = [];
        this.flashEffects = [];
        
        // Configurações de efeitos
        this.config = {
            coinParticles: {
                count: 12,
                colors: ['#FFD700', '#FFA500', '#FFFF00'],
                lifetime: 2000,
                speed: 3
            },
            levelUpEffect: {
                duration: 3000,
                pulseIntensity: 1.5,
                glowRadius: 100
            },
            achievementExplosion: {
                count: 25,
                colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
                lifetime: 3000
            }
        };
        
        this.setupStyles();
    }

    setupStyles() {
        if (document.getElementById('visual-effects-styles')) return;

        const style = document.createElement('style');
        style.id = 'visual-effects-styles';
        style.textContent = `
            .floating-text {
                position: fixed;
                font-family: 'Press Start 2P', monospace;
                font-size: 12px;
                font-weight: bold;
                z-index: 9999;
                pointer-events: none;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                animation: floatUp 2s ease-out forwards;
            }

            .floating-coins {
                color: #FFD700;
                text-shadow: 0 0 10px #FFD700;
            }

            .floating-achievement {
                color: #FF6B6B;
                font-size: 14px;
                text-shadow: 0 0 15px #FF6B6B;
            }

            .floating-level {
                color: #4ECDC4;
                font-size: 16px;
                text-shadow: 0 0 20px #4ECDC4;
            }

            .screen-flash {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                pointer-events: none;
                z-index: 10000;
                opacity: 0;
            }

            .coin-particle {
                position: fixed;
                font-size: 16px;
                z-index: 9999;
                pointer-events: none;
                animation: coinFloat 2s ease-out forwards;
            }

            .star-burst {
                position: fixed;
                width: 4px;
                height: 4px;
                border-radius: 50%;
                z-index: 9999;
                pointer-events: none;
            }

            @keyframes floatUp {
                0% {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }
                50% {
                    transform: translateY(-50px) scale(1.2);
                    opacity: 1;
                }
                100% {
                    transform: translateY(-100px) scale(0.8);
                    opacity: 0;
                }
            }

            @keyframes coinFloat {
                0% {
                    transform: translateY(0) rotate(0deg) scale(1);
                    opacity: 1;
                }
                50% {
                    transform: translateY(-30px) rotate(180deg) scale(1.2);
                    opacity: 1;
                }
                100% {
                    transform: translateY(-80px) rotate(360deg) scale(0.5);
                    opacity: 0;
                }
            }

            @keyframes starBurst {
                0% {
                    transform: translate(0, 0) scale(0);
                    opacity: 1;
                }
                50% {
                    opacity: 1;
                }
                100% {
                    transform: translate(var(--end-x), var(--end-y)) scale(1);
                    opacity: 0;
                }
            }

            @keyframes levelPulse {
                0%, 100% {
                    transform: scale(1);
                    filter: brightness(1);
                }
                50% {
                    transform: scale(1.1);
                    filter: brightness(1.5) drop-shadow(0 0 20px currentColor);
                }
            }

            .level-celebration {
                animation: levelPulse 0.6s ease-in-out 3;
            }

            .achievement-glow {
                animation: achievementGlow 2s ease-out;
            }

            @keyframes achievementGlow {
                0% {
                    box-shadow: 0 0 0 rgba(255, 107, 107, 0);
                }
                50% {
                    box-shadow: 0 0 30px rgba(255, 107, 107, 0.8);
                }
                100% {
                    box-shadow: 0 0 0 rgba(255, 107, 107, 0);
                }
            }

            .shop-item-bought {
                animation: shopItemBought 1s ease-out;
            }

            @keyframes shopItemBought {
                0% {
                    transform: scale(1);
                    background: var(--original-bg);
                }
                25% {
                    transform: scale(1.05);
                    background: linear-gradient(135deg, #00ff88, #4ECDC4);
                }
                100% {
                    transform: scale(1);
                    background: var(--original-bg);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Efeito de moedas ganhas
    showCoinEffect(x, y, coinsEarned) {
        // Texto flutuante
        this.createFloatingText(
            `+${coinsEarned} 🪙`,
            x, y,
            'floating-coins',
            2000
        );

        // Partículas de moedas
        for (let i = 0; i < Math.min(coinsEarned, 8); i++) {
            setTimeout(() => {
                this.createCoinParticle(
                    x + (Math.random() - 0.5) * 100,
                    y + (Math.random() - 0.5) * 50
                );
            }, i * 100);
        }

        // Som especial para muitas moedas
        if (coinsEarned >= 5) {
            this.createScreenFlash('#FFD700', 0.2, 300);
        }
    }

    // Efeito de subida de nível
    showLevelUpEffect(levelData, x = window.innerWidth / 2, y = window.innerHeight / 2) {
        // Texto principal
        this.createFloatingText(
            `⭐ NÍVEL UP! ⭐`,
            x, y - 50,
            'floating-level',
            3000
        );

        // Nível alcançado
        this.createFloatingText(
            `${levelData.icon} ${levelData.name}`,
            x, y + 20,
            'floating-level',
            3000
        );

        // Explosão de estrelas
        this.createStarBurst(x, y, 20, levelData.color);

        // Flash da tela
        this.createScreenFlash(levelData.color, 0.3, 500);

        // Adicionar classe de celebração ao card do usuário
        const userCard = document.querySelector('.user-info-card-home');
        if (userCard) {
            userCard.classList.add('level-celebration');
            setTimeout(() => {
                userCard.classList.remove('level-celebration');
            }, 2000);
        }
    }

    // Efeito de conquista desbloqueada
    showAchievementEffect(achievement, x = window.innerWidth / 2, y = window.innerHeight / 2) {
        // Texto da conquista
        this.createFloatingText(
            `🏆 ${achievement.name}`,
            x, y,
            'floating-achievement',
            3000
        );

        // Explosão colorida
        this.createColoredExplosion(x, y, achievement.rarity);

        // Flash baseado na raridade
        const rarityColors = {
            common: '#9E9E9E',
            uncommon: '#4CAF50',
            rare: '#2196F3',
            epic: '#9C27B0',
            legendary: '#FF9800'
        };

        this.createScreenFlash(
            rarityColors[achievement.rarity] || rarityColors.common,
            0.25,
            400
        );
    }

    // Efeito de compra na loja
    showPurchaseEffect(element, item) {
        // Animação no elemento
        element.classList.add('shop-item-bought');
        setTimeout(() => {
            element.classList.remove('shop-item-bought');
        }, 1000);

        // Texto de confirmação
        const rect = element.getBoundingClientRect();
        this.createFloatingText(
            `${item.icon} Comprado!`,
            rect.left + rect.width / 2,
            rect.top,
            'floating-coins',
            2000
        );

        // Partículas de sucesso
        this.createStarBurst(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            10,
            '#00ff88'
        );
    }

    // Criar texto flutuante
    createFloatingText(text, x, y, className = '', duration = 2000) {
        const element = document.createElement('div');
        element.className = `floating-text ${className}`;
        element.textContent = text;
        element.style.left = (x - 100) + 'px'; // Centralizar aproximadamente
        element.style.top = y + 'px';

        document.body.appendChild(element);

        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, duration);
    }

    // Criar partícula de moeda
    createCoinParticle(x, y) {
        const particle = document.createElement('div');
        particle.className = 'coin-particle';
        particle.textContent = '🪙';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';

        // Variação aleatória na animação
        const randomX = (Math.random() - 0.5) * 40;
        particle.style.setProperty('--random-x', randomX + 'px');

        document.body.appendChild(particle);

        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 2000);
    }

    // Criar explosão de estrelas
    createStarBurst(centerX, centerY, count, color) {
        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.className = 'star-burst';
            star.style.left = centerX + 'px';
            star.style.top = centerY + 'px';
            star.style.backgroundColor = color;

            // Direção aleatória
            const angle = (i / count) * Math.PI * 2;
            const distance = 80 + Math.random() * 40;
            const endX = Math.cos(angle) * distance;
            const endY = Math.sin(angle) * distance;

            star.style.setProperty('--end-x', endX + 'px');
            star.style.setProperty('--end-y', endY + 'px');
            star.style.animation = `starBurst ${1 + Math.random()}s ease-out forwards`;

            document.body.appendChild(star);

            setTimeout(() => {
                if (star.parentNode) {
                    star.parentNode.removeChild(star);
                }
            }, 2000);
        }
    }

    // Criar explosão colorida para conquistas
    createColoredExplosion(x, y, rarity) {
        const colors = {
            common: ['#9E9E9E', '#BDBDBD'],
            uncommon: ['#4CAF50', '#66BB6A'],
            rare: ['#2196F3', '#42A5F5'],
            epic: ['#9C27B0', '#BA68C8'],
            legendary: ['#FF9800', '#FFB74D', '#FFC107']
        };

        const colorSet = colors[rarity] || colors.common;
        const particleCount = rarity === 'legendary' ? 30 : 20;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'star-burst';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.backgroundColor = colorSet[Math.floor(Math.random() * colorSet.length)];
            particle.style.width = (2 + Math.random() * 4) + 'px';
            particle.style.height = particle.style.width;

            const angle = Math.random() * Math.PI * 2;
            const distance = 60 + Math.random() * 80;
            const endX = Math.cos(angle) * distance;
            const endY = Math.sin(angle) * distance;

            particle.style.setProperty('--end-x', endX + 'px');
            particle.style.setProperty('--end-y', endY + 'px');
            particle.style.animation = `starBurst ${0.8 + Math.random() * 0.4}s ease-out forwards`;

            document.body.appendChild(particle);

            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 1500);
        }
    }

    // Criar flash na tela
    createScreenFlash(color, intensity = 0.3, duration = 300) {
        const flash = document.createElement('div');
        flash.className = 'screen-flash';
        flash.style.background = color;
        flash.style.opacity = intensity;

        document.body.appendChild(flash);

        // Fade out
        setTimeout(() => {
            flash.style.transition = `opacity ${duration}ms ease-out`;
            flash.style.opacity = '0';
        }, 50);

        setTimeout(() => {
            if (flash.parentNode) {
                flash.parentNode.removeChild(flash);
            }
        }, duration + 100);
    }

    // Efeito de combo de kills
    showComboEffect(comboCount, x, y) {
        if (comboCount < 3) return; // Só mostrar combos 3+

        const comboText = comboCount >= 10 ? 'UNSTOPPABLE!' :
                         comboCount >= 7 ? 'DOMINATING!' :
                         comboCount >= 5 ? 'KILLING SPREE!' :
                         'COMBO!';

        this.createFloatingText(
            `${comboCount}x ${comboText}`,
            x, y,
            'floating-achievement',
            1500
        );

        // Intensidade baseada no combo
        const intensity = Math.min(comboCount / 20, 1);
        this.createScreenFlash('#FF4757', intensity * 0.2, 200);
    }

    // Efeito de precisão de tiro
    showAccuracyEffect(accuracy, x, y) {
        if (accuracy < 80) return; // Só para alta precisão

        const text = accuracy >= 95 ? 'PERFECT AIM!' :
                     accuracy >= 90 ? 'SHARPSHOOTER!' :
                     'GREAT AIM!';

        this.createFloatingText(
            `${accuracy.toFixed(0)}% ${text}`,
            x, y,
            'floating-coins',
            2000
        );
    }

    // Efeito de power-up coletado
    showPowerUpEffect(x, y, powerUpType) {
        const effects = {
            speed: { text: '⚡ SPEED UP!', color: '#FFFF00' },
            power: { text: '💥 POWER UP!', color: '#FF6B6B' },
            shield: { text: '🛡️ SHIELD!', color: '#4ECDC4' },
            multishot: { text: '🚀 MULTI SHOT!', color: '#9C27B0' }
        };

        const effect = effects[powerUpType] || effects.power;

        this.createFloatingText(
            effect.text,
            x, y,
            'floating-level',
            2500
        );

        this.createStarBurst(x, y, 15, effect.color);
        this.createScreenFlash(effect.color, 0.15, 200);
    }

    // Efeito de milestone de pontuação
    showScoreMilestone(score, x = window.innerWidth / 2, y = 100) {
        // Verificar se é um milestone significativo
        const milestones = [1000, 5000, 10000, 25000, 50000, 100000];
        const milestone = milestones.find(m => score >= m && score < m + 500);

        if (!milestone) return;

        this.createFloatingText(
            `🎯 ${milestone.toLocaleString()} POINTS!`,
            x, y,
            'floating-level',
            3000
        );

        // Efeito especial para milestones altos
        if (milestone >= 50000) {
            this.createColoredExplosion(x, y, 'legendary');
            this.createScreenFlash('#FFD700', 0.4, 600);
        } else if (milestone >= 10000) {
            this.createColoredExplosion(x, y, 'epic');
            this.createScreenFlash('#9C27B0', 0.3, 400);
        }
    }

    // Limpar todos os efeitos
    clearAllEffects() {
        // Remover textos flutuantes
        document.querySelectorAll('.floating-text').forEach(el => el.remove());
        
        // Remover partículas
        document.querySelectorAll('.coin-particle').forEach(el => el.remove());
        document.querySelectorAll('.star-burst').forEach(el => el.remove());
        
        // Remover flashes
        document.querySelectorAll('.screen-flash').forEach(el => el.remove());
        
        // Limpar arrays internos
        this.particles = [];
        this.floatingTexts = [];
        this.screenShakes = [];
        this.flashEffects = [];
    }

    // Efeito de entrada na página
    showPageEnterEffect() {
        const elements = document.querySelectorAll('.user-info-card-home, .menu-buttons, .game-title');
        
        elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            element.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
            
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }

    // Efeito de crítico
    showCriticalHitEffect(x, y) {
        this.createFloatingText(
            'CRITICAL!',
            x, y,
            'floating-achievement',
            1500
        );

        this.createStarBurst(x, y, 12, '#FF0080');
        this.createScreenFlash('#FF0080', 0.2, 150);
    }

    // Efeito personalizado
    createCustomEffect(config) {
        const {
            text,
            x, y,
            color = '#FFFFFF',
            duration = 2000,
            particles = 0,
            flash = false,
            size = 'normal'
        } = config;

        // Texto
        if (text) {
            const className = size === 'large' ? 'floating-level' : 
                             size === 'small' ? 'floating-coins' : 
                             'floating-text';
            this.createFloatingText(text, x, y, className, duration);
        }

        // Partículas
        if (particles > 0) {
            this.createStarBurst(x, y, particles, color);
        }

        // Flash
        if (flash) {
            this.createScreenFlash(color, 0.2, 300);
        }
    }
}

export default VisualEffects;
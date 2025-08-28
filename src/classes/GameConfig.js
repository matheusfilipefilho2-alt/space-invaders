class GameConfig {
    constructor() {
        // Configurações do sistema de recompensas
        this.rewards = {
            // Sistema de moedas
            coins: {
                pointsPerCoin: 2000,        // Pontos necessários para 1 moeda
                maxCoinsPerGame: 10,        // Limite por partida
                bonusMultiplier: 1.5,       // Multiplicador para bônus especiais
                newRecordBonus: 5,          // Moedas extras por novo recorde
                firstGameBonus: 10,         // Bônus para primeira partida
                dailyLoginBonus: 2          // Bônus diário por login
            },

            // Sistema de experiência/níveis
            experience: {
                baseXP: 100,                // XP base por partida
                scoreMultiplier: 0.01,      // XP adicional por ponto
                survivalBonus: 50,          // XP por minuto sobrevivido
                comboMultiplier: 1.2,       // Multiplicador para combos
                perfectGameBonus: 200       // Bônus por jogo perfeito
            },

            // Multiplicadores por dificuldade
            difficulty: {
                easy: { coins: 0.8, xp: 0.8 },
                normal: { coins: 1.0, xp: 1.0 },
                hard: { coins: 1.3, xp: 1.3 },
                expert: { coins: 1.5, xp: 1.5 }
            }
        };

        // Configurações dos níveis
        this.levels = {
            // Requisitos de pontuação para cada nível
            requirements: [
                { id: 1, name: 'Recruta', minScore: 0, icon: '🥉', color: '#CD7F32', coinReward: 0 },
                { id: 2, name: 'Soldado', minScore: 5000, icon: '🥈', color: '#C0C0C0', coinReward: 10 },
                { id: 3, name: 'Sargento', minScore: 15000, icon: '🥇', color: '#FFD700', coinReward: 20 },
                { id: 4, name: 'Tenente', minScore: 30000, icon: '⭐', color: '#FF6B6B', coinReward: 30 },
                { id: 5, name: 'Capitão', minScore: 50000, icon: '🌟', color: '#4ECDC4', coinReward: 50 },
                { id: 6, name: 'Major', minScore: 80000, icon: '💎', color: '#45B7D1', coinReward: 75 },
                { id: 7, name: 'Coronel', minScore: 120000, icon: '👑', color: '#96CEB4', coinReward: 100 },
                { id: 8, name: 'General', minScore: 180000, icon: '🏆', color: '#FECA57', coinReward: 150 },
                { id: 9, name: 'Comandante', minScore: 250000, icon: '🚀', color: '#FF9FF3', coinReward: 200 },
                { id: 10, name: 'Lenda Galáctica', minScore: 350000, icon: '🌌', color: '#A8E6CF', coinReward: 300 }
            ],

            // Benefícios por nível
            benefits: {
                2: ['Acesso à loja básica'],
                3: ['Ofertas diárias desbloqueadas'],
                4: ['Itens raros disponíveis'],
                5: ['Bônus de XP +20%'],
                6: ['Itens épicos disponíveis'],
                7: ['Bônus de moedas +15%'],
                8: ['Acesso a temas premium'],
                9: ['Itens lendários disponíveis'],
                10: ['Todos os benefícios máximos', 'Status de Lenda']
            }
        };

        // Configurações das conquistas
        this.achievements = {
            // Multiplicadores de recompensa por raridade
            rarityMultipliers: {
                common: 1.0,
                uncommon: 1.2,
                rare: 1.5,
                epic: 2.0,
                legendary: 3.0
            },

            // Categorias e suas cores
            categories: {
                score: { name: 'Pontuação', icon: '🎯', color: '#4ECDC4' },
                games: { name: 'Partidas', icon: '🎮', color: '#FF6B6B' },
                level: { name: 'Progressão', icon: '⭐', color: '#FFD700' },
                combat: { name: 'Combate', icon: '⚔️', color: '#FF4757' },
                collection: { name: 'Coleção', icon: '📦', color: '#9C27B0' },
                social: { name: 'Social', icon: '👥', color: '#00ff88' },
                special: { name: 'Especial', icon: '✨', color: '#FFA500' }
            },

            // Condições especiais
            specialConditions: {
                perfectGame: { accuracy: 95, minKills: 50 },
                speedRun: { maxTime: 300, minScore: 10000 },
                survivor: { minTime: 600 },
                sharpshooter: { accuracy: 90, minShots: 100 },
                destroyer: { minKills: 100 }
            }
        };

        // Configurações da loja
        this.shop = {
            // Ofertas diárias
            dailyOffers: {
                count: 3,               // Número de itens em oferta
                discountMin: 20,        // Desconto mínimo (%)
                discountMax: 50,        // Desconto máximo (%)
                resetHour: 0            // Hora de reset (0-23)
            },

            // Preços base por categoria
            basePrices: {
                theme: { min: 30, max: 100 },
                boost: { min: 20, max: 80 },
                cosmetic: { min: 50, max: 500 },
                utility: { min: 10, max: 50 },
                skins: { min: 80, max: 300 }
            },

            // Multiplicadores por raridade
            rarityPriceMultipliers: {
                common: 1.0,
                uncommon: 1.5,
                rare: 2.5,
                epic: 4.0,
                legendary: 8.0
            },

            // Categorias de itens
            categories: [
                { id: 'theme', name: 'Temas', icon: '🎨', description: 'Personalize a aparência do jogo' },
                { id: 'boost', name: 'Impulsos', icon: '⚡', description: 'Melhorias temporárias' },
                { id: 'cosmetic', name: 'Cosméticos', icon: '✨', description: 'Itens visuais especiais' },
                { id: 'utility', name: 'Utilitários', icon: '🛠️', description: 'Ferramentas úteis' },
                { id: 'skins', name: 'Skins de Naves', icon: '🚀', description: 'Personalize a aparência da sua nave' }
            ]
        };

        // Configurações de gameplay
        this.gameplay = {
            // Combos e multiplicadores
            combo: {
                minForBonus: 3,         // Kills mínimas para combo
                multiplierPerKill: 1.1, // Multiplicador por kill em combo
                maxMultiplier: 3.0,     // Multiplicador máximo
                timeWindow: 5000        // Janela de tempo para manter combo (ms)
            },

            // Bônus especiais
            bonuses: {
                accuracyThreshold: 80,  // % de precisão para bônus
                survivalThreshold: 300, // Segundos para bônus de sobrevivência
                speedKillThreshold: 30, // Segundos para bônus de kill rápido
                noMissBonus: 2.0       // Multiplicador para jogos sem erro
            },

            // Power-ups
            powerups: {
                spawnChance: 0.15,      // Chance de spawn (15%)
                duration: 10000,        // Duração padrão (ms)
                effects: {
                    speed: 1.5,         // Multiplicador de velocidade
                    damage: 2.0,        // Multiplicador de dano
                    multishot: 3,       // Número de tiros
                    shield: 3           // Hits que pode levar
                }
            }
        };

        // Configurações da interface
        this.ui = {
            // Notificações
            notifications: {
                duration: 3000,         // Duração padrão (ms)
                maxVisible: 3,          // Máximo de notificações visíveis
                positions: {
                    top: { x: '50%', y: '20px' },
                    topRight: { x: '20px', y: '20px' },
                    center: { x: '50%', y: '50%' }
                }
            },

            // Animações
            animations: {
                enabled: true,
                duration: 300,          // Duração padrão (ms)
                easing: 'ease-out',
                reducedMotion: false    // Para acessibilidade
            },

            // Temas visuais
            themes: {
                default: {
                    primary: '#4ECDC4',
                    secondary: '#FF6B6B',
                    accent: '#FFD700',
                    background: '#050519',
                    text: '#FFFFFF'
                },
                neon: {
                    primary: '#FF0080',
                    secondary: '#00FFFF',
                    accent: '#FFFF00',
                    background: '#0D001A',
                    text: '#FFFFFF'
                },
                retro: {
                    primary: '#FF8C00',
                    secondary: '#32CD32',
                    accent: '#FFD700',
                    background: '#2F1B14',
                    text: '#F5DEB3'
                }
            }
        };

        // Configurações de segurança/anti-cheat
        this.security = {
            // Limites para detecção
            limits: {
                maxScorePerMinute: 5000,    // Score máximo por minuto
                maxAccuracy: 98,            // Precisão máxima realística
                minGameDuration: 30,        // Duração mínima de jogo (s)
                maxSessionDuration: 3600,   // Duração máxima de sessão (s)
                maxCoinsPerSession: 50      // Moedas máximas por sessão
            },

            // Tolerâncias
            tolerances: {
                timingVariation: 0.1,       // Variação mínima de timing
                scoreConsistency: 0.2,      // Consistência de score
                inputDelay: 50              // Delay mínimo entre inputs (ms)
            },

            // Ações automáticas
            actions: {
                suspiciousWarning: true,    // Avisar sobre atividade suspeita
                autoBlock: false,           // Bloquear automaticamente
                logSuspicious: true,        // Log de atividades suspeitas
                requireVerification: false   // Exigir verificação manual
            }
        };

        // Configurações de analytics
        this.analytics = {
            // Eventos a trackear
            events: {
                gameStart: true,
                gameEnd: true,
                levelUp: true,
                achievement: true,
                purchase: true,
                dailyLogin: true,
                sessionStart: true,
                sessionEnd: true
            },

            // Métricas
            metrics: {
                retention: true,        // Taxa de retenção
                engagement: true,       // Tempo de engajamento
                progression: true,      // Progresso do jogador
                monetization: true,     // Uso da loja
                difficulty: true        // Análise de dificuldade
            },

            // Configurações de privacidade
            privacy: {
                anonymize: true,        // Anonimizar dados
                optOut: false,         // Permitir opt-out
                localOnly: false,      // Apenas dados locais
                retention: 90          // Dias de retenção de dados
            }
        };

        // Configurações de desenvolvimento
        this.development = {
            // Debug
            debug: {
                enabled: false,         // Modo debug global
                logging: false,         // Logs detalhados
                showFPS: false,         // Mostrar FPS
                godMode: false,         // Modo invencível
                unlimitedCoins: false   // Moedas infinitas
            },

            // Testes
            testing: {
                skipIntro: false,       // Pular intro
                fastLevelUp: false,     // Level up acelerado
                autoWin: false,         // Vitória automática
                mockData: false         // Usar dados de teste
            },

            // Features experimentais
            experimental: {
                aiRecommendations: false,   // Recomendações por IA
                socialFeatures: false,      // Recursos sociais
                seasonalEvents: false,      // Eventos sazonais
                crossPlatform: false        // Multiplataforma
            }
        };
    }

    // Obter configuração por caminho (ex: 'rewards.coins.pointsPerCoin')
    get(path, defaultValue = null) {
        const keys = path.split('.');
        let current = this;

        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }

        return current;
    }

    // Definir configuração por caminho
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = this;

        for (const key of keys) {
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[lastKey] = value;
    }

    // Verificar se está em modo debug
    isDebugMode() {
        const isBrowser = typeof window !== 'undefined';
        const hasLocalStorage = typeof localStorage !== 'undefined';
        
        return this.development.debug.enabled || 
               (isBrowser && window.location.hostname === 'localhost') ||
               (hasLocalStorage && localStorage.getItem('spaceInvaders_debug') === 'true');
    }

    // Verificar se recurso experimental está habilitado
    isExperimentalEnabled(feature) {
        return this.development.experimental[feature] || false;
    }

    // Obter configurações por ambiente
    getEnvironmentConfig() {
        const isDev = this.isDebugMode();
        const isBrowser = typeof window !== 'undefined';
        const isProd = isBrowser && window.location.protocol === 'https:';
        
        if (isDev) {
            return {
                ...this,
                security: {
                    ...this.security,
                    actions: {
                        ...this.security.actions,
                        autoBlock: false,
                        logSuspicious: true
                    }
                },
                development: {
                    ...this.development,
                    debug: {
                        ...this.development.debug,
                        enabled: true,
                        logging: true
                    }
                }
            };
        }

        return this;
    }

    // Validar configurações
    validate() {
        const errors = [];

        // Validar moedas
        if (this.rewards.coins.pointsPerCoin <= 0) {
            errors.push('pointsPerCoin deve ser maior que 0');
        }

        if (this.rewards.coins.maxCoinsPerGame <= 0) {
            errors.push('maxCoinsPerGame deve ser maior que 0');
        }

        // Validar níveis
        if (this.levels.requirements.length === 0) {
            errors.push('Deve haver pelo menos um nível');
        }

        const sortedLevels = [...this.levels.requirements].sort((a, b) => a.minScore - b.minScore);
        if (JSON.stringify(sortedLevels) !== JSON.stringify(this.levels.requirements)) {
            errors.push('Níveis devem estar em ordem crescente de pontuação');
        }

        // Validar loja
        Object.keys(this.shop.basePrices).forEach(category => {
            const prices = this.shop.basePrices[category];
            if (prices.min >= prices.max) {
                errors.push(`Preço mínimo deve ser menor que máximo para categoria ${category}`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Exportar configurações para JSON
    export() {
        return JSON.stringify(this, null, 2);
    }

    // Importar configurações de JSON
    import(jsonConfig) {
        try {
            const config = JSON.parse(jsonConfig);
            Object.assign(this, config);
            
            const validation = this.validate();
            if (!validation.valid) {
                throw new Error('Configuração inválida: ' + validation.errors.join(', '));
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Resetar para configurações padrão
    reset() {
        const defaultConfig = new GameConfig();
        Object.assign(this, defaultConfig);
    }

    // Aplicar preset de configuração
    applyPreset(presetName) {
        const presets = {
            // Configuração para desenvolvimento
            development: {
                'development.debug.enabled': true,
                'development.debug.logging': true,
                'rewards.coins.pointsPerCoin': 100, // Moedas mais fáceis
                'security.actions.autoBlock': false
            },

            // Configuração para produção
            production: {
                'development.debug.enabled': false,
                'development.debug.logging': false,
                'security.actions.autoBlock': true,
                'security.actions.logSuspicious': true
            },

            // Configuração casual (mais fácil)
            casual: {
                'rewards.coins.pointsPerCoin': 1000,
                'rewards.coins.maxCoinsPerGame': 20,
                'gameplay.combo.minForBonus': 2,
                'gameplay.powerups.spawnChance': 0.25
            },

            // Configuração hardcore (mais difícil)
            hardcore: {
                'rewards.coins.pointsPerCoin': 5000,
                'rewards.coins.maxCoinsPerGame': 5,
                'gameplay.combo.minForBonus': 5,
                'gameplay.powerups.spawnChance': 0.05
            }
        };

        const preset = presets[presetName];
        if (!preset) {
            throw new Error(`Preset '${presetName}' não encontrado`);
        }

        Object.keys(preset).forEach(path => {
            this.set(path, preset[path]);
        });
    }

    // Obter informações sobre a configuração atual
    getInfo() {
        return {
            totalLevels: this.levels.requirements.length,
            coinRate: `1 moeda a cada ${this.rewards.coins.pointsPerCoin} pontos`,
            maxCoinsPerGame: this.rewards.coins.maxCoinsPerGame,
            debugMode: this.isDebugMode(),
            validation: this.validate(),
            lastModified: Date.now()
        };
    }
}

// Instância global da configuração
const gameConfig = new GameConfig();

// Permitir override via localStorage (para testes) - apenas no browser
if (typeof localStorage !== 'undefined') {
    const localConfig = localStorage.getItem('spaceInvaders_config');
    if (localConfig) {
        try {
            const parsedConfig = JSON.parse(localConfig);
            Object.assign(gameConfig, parsedConfig);
            console.log('🔧 Configuração local carregada');
        } catch (error) {
            console.warn('⚠️ Erro ao carregar configuração local:', error);
        }
    }
}

export default gameConfig;
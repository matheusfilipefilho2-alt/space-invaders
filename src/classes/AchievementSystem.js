// src/classes/AchievementSystem.js
import { supabase } from '../supabase.js';

class AchievementSystem {
    constructor(rankingManager) {
        this.rankingManager = rankingManager;
        this.rewardSystem = rankingManager.getRewardSystem();
        this.achievementIdCache = new Map(); // Cache para mapear string IDs para numeric IDs
        
        // Definir todas as conquistas disponíveis
        this.achievements = [
            // Conquistas de pontuação
            {
                id: 'first_points',
                name: 'Primeiros Pontos',
                description: 'Faça seus primeiros 100 pontos',
                icon: '🎯',
                type: 'score',
                requirement: 100,
                coinReward: 5,
                rarity: 'common'
            },
            {
                id: 'thousand_points',
                name: 'Mil Pontos',
                description: 'Alcance 1.000 pontos em uma partida',
                icon: '⭐',
                type: 'score',
                requirement: 1000,
                coinReward: 10,
                rarity: 'common'
            },
            {
                id: 'five_thousand',
                name: 'Atirador Experiente',
                description: 'Alcance 5.000 pontos',
                icon: '🎖️',
                type: 'score',
                requirement: 5000,
                coinReward: 25,
                rarity: 'uncommon'
            },
            {
                id: 'ten_thousand',
                name: 'Ace Pilot',
                description: 'Alcance 10.000 pontos em uma partida',
                icon: '🚀',
                type: 'score',
                requirement: 10000,
                coinReward: 50,
                rarity: 'rare'
            },
            {
                id: 'fifty_thousand',
                name: 'Destruidor Galáctico',
                description: 'Alcance 50.000 pontos',
                icon: '💫',
                type: 'score',
                requirement: 50000,
                coinReward: 100,
                rarity: 'epic'
            },
            {
                id: 'hundred_thousand',
                name: 'Lenda do Espaço',
                description: 'Alcance 100.000 pontos',
                icon: '🌟',
                type: 'score',
                requirement: 100000,
                coinReward: 200,
                rarity: 'legendary'
            },

            // Conquistas de jogos
            {
                id: 'first_game',
                name: 'Primeiro Voo',
                description: 'Complete seu primeiro jogo',
                icon: '🛸',
                type: 'games_played',
                requirement: 1,
                coinReward: 5,
                rarity: 'common'
            },
            {
                id: 'ten_games',
                name: 'Veterano',
                description: 'Jogue 10 partidas',
                icon: '🏅',
                type: 'games_played',
                requirement: 10,
                coinReward: 20,
                rarity: 'uncommon'
            },
            {
                id: 'fifty_games',
                name: 'Dedicado',
                description: 'Jogue 50 partidas',
                icon: '🎖️',
                type: 'games_played',
                requirement: 50,
                coinReward: 75,
                rarity: 'rare'
            },
            {
                id: 'hundred_games',
                name: 'Viciado em Space',
                description: 'Jogue 100 partidas',
                icon: '🏆',
                type: 'games_played',
                requirement: 100,
                coinReward: 150,
                rarity: 'epic'
            },

            // Conquistas de nível
            {
                id: 'soldier_rank',
                name: 'Soldado',
                description: 'Alcance o nível Soldado',
                icon: '⚔️',
                type: 'level',
                requirement: 2,
                coinReward: 15,
                rarity: 'common'
            },
            {
                id: 'captain_rank',
                name: 'Capitão',
                description: 'Alcance o nível Capitão',
                icon: '👨‍✈️',
                type: 'level',
                requirement: 5,
                coinReward: 50,
                rarity: 'uncommon'
            },
            {
                id: 'general_rank',
                name: 'General',
                description: 'Alcance o nível General',
                icon: '⭐',
                type: 'level',
                requirement: 8,
                coinReward: 100,
                rarity: 'rare'
            },
            {
                id: 'legend_rank',
                name: 'Lenda Galáctica',
                description: 'Alcance o nível máximo',
                icon: '🌌',
                type: 'level',
                requirement: 10,
                coinReward: 250,
                rarity: 'legendary'
            },

            // Conquistas de moedas
            {
                id: 'first_coins',
                name: 'Primeira Riqueza',
                description: 'Ganhe suas primeiras 10 moedas',
                icon: '💰',
                type: 'coins_earned',
                requirement: 10,
                coinReward: 10,
                rarity: 'common'
            },
            {
                id: 'hundred_coins',
                name: 'Rico',
                description: 'Acumule 100 moedas',
                icon: '💎',
                type: 'coins_total',
                requirement: 100,
                coinReward: 25,
                rarity: 'uncommon'
            },
            {
                id: 'thousand_coins',
                name: 'Milionário Espacial',
                description: 'Acumule 1.000 moedas',
                icon: '👑',
                type: 'coins_total',
                requirement: 1000,
                coinReward: 100,
                rarity: 'epic'
            },

            // Conquistas especiais
            {
                id: 'perfect_start',
                name: 'Começo Perfeito',
                description: 'Alcance 2.000 pontos na primeira partida',
                icon: '✨',
                type: 'special',
                requirement: 2000,
                coinReward: 50,
                rarity: 'rare',
                condition: 'first_game_score'
            },
            {
                id: 'rapid_fire',
                name: 'Fogo Rápido',
                description: 'Destrua 20 invasores em 30 segundos',
                icon: '⚡',
                type: 'special',
                requirement: 20,
                coinReward: 30,
                rarity: 'uncommon',
                condition: 'rapid_kills'
            },
            {
                id: 'survivor',
                name: 'Sobrevivente',
                description: 'Sobreviva por 5 minutos em uma partida',
                icon: '🛡️',
                type: 'special',
                requirement: 300, // 5 minutos em segundos
                coinReward: 40,
                rarity: 'rare',
                condition: 'survival_time'
            },
            {
                id: 'shop_enthusiast',
                name: 'Entusiasta da Loja',
                description: 'Compre 5 itens diferentes',
                icon: '🛒',
                type: 'special',
                requirement: 5,
                coinReward: 50,
                rarity: 'uncommon',
                condition: 'items_bought'
            },
            {
                id: 'level_jumper',
                name: 'Salto de Nível',
                description: 'Suba 2 níveis em uma única partida',
                icon: '🚁',
                type: 'special',
                requirement: 2,
                coinReward: 75,
                rarity: 'epic',
                condition: 'level_jump'
            }
        ];

        // Definir raridades
        this.rarities = {
            common: { color: '#9E9E9E', name: 'Comum', multiplier: 1 },
            uncommon: { color: '#4CAF50', name: 'Incomum', multiplier: 1.2 },
            rare: { color: '#2196F3', name: 'Raro', multiplier: 1.5 },
            epic: { color: '#9C27B0', name: 'Épico', multiplier: 2 },
            legendary: { color: '#FF9800', name: 'Lendário', multiplier: 3 }
        };
    }

    // Obter todas as conquistas
    getAllAchievements() {
        return this.achievements;
    }

    // Obter conquistas por tipo
    getAchievementsByType(type) {
        return this.achievements.filter(achievement => achievement.type === type);
    }

    // Obter conquista por ID
    getAchievementById(id) {
        return this.achievements.find(achievement => achievement.id === id);
    }

    // Buscar ou criar ID numérico da conquista no banco
    async getNumericAchievementId(stringId) {
        // Verificar cache primeiro
        if (this.achievementIdCache.has(stringId)) {
            return this.achievementIdCache.get(stringId);
        }

        const achievement = this.getAchievementById(stringId);
        if (!achievement) {
            throw new Error(`Conquista não encontrada: ${stringId}`);
        }

        try {
            // Buscar na tabela achievements
            const { data: existingAchievement, error: searchError } = await supabase
                .from('achievements')
                .select('id')
                .eq('name', achievement.name)
                .eq('requirement_type', achievement.type)
                .eq('requirement_value', achievement.requirement)
                .limit(1);

            if (searchError) throw searchError;

            let numericId;
            
            if (existingAchievement && existingAchievement.length > 0) {
                // Conquista já existe
                numericId = existingAchievement[0].id;
            } else {
                // Criar nova conquista
                const { data: newAchievement, error: insertError } = await supabase
                    .from('achievements')
                    .insert({
                        name: achievement.name,
                        description: achievement.description,
                        icon: achievement.icon,
                        requirement_type: achievement.type,
                        requirement_value: achievement.requirement,
                        coin_reward: achievement.coinReward
                    })
                    .select('id')
                    .limit(1);

                if (insertError) throw insertError;
                numericId = newAchievement[0].id;
            }

            // Armazenar no cache
            this.achievementIdCache.set(stringId, numericId);
            return numericId;

        } catch (error) {
            console.error('Erro ao buscar/criar conquista:', error);
            throw error;
        }
    }

    // Verificar conquistas do usuário atual
    async getUserAchievements() {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) return [];

        try {
            const { data, error } = await supabase
                .from('player_achievements')
                .select(`
                    *,
                    achievement:achievements(*)
                `)
                .eq('player_id', currentUser.id)
                .order('unlocked_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erro ao buscar conquistas do usuário:', error);
            return [];
        }
    }

    // Verificar se usuário possui uma conquista
    async hasAchievement(achievementId) {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) return false;

        try {
            const numericId = await this.getNumericAchievementId(achievementId);
            const { data, error } = await supabase
                .from('player_achievements')
                .select('id')
                .eq('player_id', currentUser.id)
                .eq('achievement_id', numericId)
                .limit(1);

            return !error && data && data.length > 0;
        } catch (error) {
            return false;
        }
    }

    // Desbloquear conquista
    async unlockAchievement(achievementId) {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) return { success: false, error: 'Usuário não logado' };

        const achievement = this.getAchievementById(achievementId);
        if (!achievement) return { success: false, error: 'Conquista não encontrada' };

        try {
            // Verificar se já possui a conquista
            const hasIt = await this.hasAchievement(achievementId);
            if (hasIt) return { success: false, error: 'Conquista já desbloqueada' };

            // Obter ID numérico da conquista
            const numericId = await this.getNumericAchievementId(achievementId);

            // Inserir na tabela de conquistas do jogador
            const { error: insertError } = await supabase
                .from('player_achievements')
                .insert({
                    player_id: currentUser.id,
                    achievement_id: numericId,
                    unlocked_at: new Date().toISOString()
                });

            if (insertError) throw insertError;

            // Calcular recompensa com multiplicador de raridade
            const rarity = this.rarities[achievement.rarity] || this.rarities.common;
            const coinReward = Math.ceil(achievement.coinReward * rarity.multiplier);

            // Dar recompensa em moedas
            if (coinReward > 0) {
                currentUser.coins = (currentUser.coins || 0) + coinReward;

                // Atualizar no banco de dados
                const { error: updateError } = await supabase
                    .from('players')
                    .update({ coins: currentUser.coins })
                    .eq('id', currentUser.id);

                if (updateError) {
                    console.error('Erro ao atualizar moedas:', updateError);
                }

                // Registrar no histórico
                await this.logAchievementReward(currentUser.id, achievement, coinReward);
            }

            return {
                success: true,
                achievement: achievement,
                coinReward: coinReward,
                totalCoins: currentUser.coins
            };

        } catch (error) {
            console.error('Erro ao desbloquear conquista:', error);
            return { success: false, error: error.message };
        }
    }

    // Registrar recompensa de conquista no histórico
    async logAchievementReward(playerId, achievement, coinReward) {
        try {
            await supabase
                .from('reward_history')
                .insert({
                    player_id: playerId,
                    reward_type: 'achievement',
                    amount: coinReward,
                    description: `Conquista: ${achievement.name}`,
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('Erro ao registrar recompensa:', error);
        }
    }

    // Verificar múltiplas conquistas baseadas em estatísticas do jogador
    async checkAchievements(gameStats) {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) return [];

        const unlockedAchievements = [];

        // Preparar dados para verificação
        const playerData = {
            highScore: gameStats.finalScore || currentUser.high_score || 0,
            gamesPlayed: (currentUser.total_games || 0) + 1,
            currentCoins: currentUser.coins || 0,
            currentLevel: this.rewardSystem.getCurrentLevel(currentUser.high_score || 0).id,
            gameTime: gameStats.gameTime || 0,
            killCount: gameStats.killCount || 0,
            isFirstGame: (currentUser.total_games || 0) === 0,
            itemsBought: gameStats.itemsBought || 0,
            levelJump: gameStats.levelJump || 0
        };

        // Verificar cada conquista
        for (const achievement of this.achievements) {
            const hasIt = await this.hasAchievement(achievement.id);
            if (hasIt) continue; // Já possui

            let shouldUnlock = false;

            switch (achievement.type) {
                case 'score':
                    shouldUnlock = playerData.highScore >= achievement.requirement;
                    break;

                case 'games_played':
                    shouldUnlock = playerData.gamesPlayed >= achievement.requirement;
                    break;

                case 'level':
                    shouldUnlock = playerData.currentLevel >= achievement.requirement;
                    break;

                case 'coins_earned':
                    const totalEarned = Math.floor(playerData.highScore / this.rewardSystem.config.pointsPerCoin);
                    shouldUnlock = totalEarned >= achievement.requirement;
                    break;

                case 'coins_total':
                    shouldUnlock = playerData.currentCoins >= achievement.requirement;
                    break;

                case 'special':
                    shouldUnlock = this.checkSpecialAchievement(achievement, playerData, gameStats);
                    break;
            }

            if (shouldUnlock) {
                const result = await this.unlockAchievement(achievement.id);
                if (result.success) {
                    unlockedAchievements.push(result);
                }
            }
        }

        return unlockedAchievements;
    }

    // Verificar conquistas especiais
    checkSpecialAchievement(achievement, playerData, gameStats) {
        switch (achievement.condition) {
            case 'first_game_score':
                return playerData.isFirstGame && (gameStats.finalScore || 0) >= achievement.requirement;

            case 'rapid_kills':
                return (gameStats.rapidKills || 0) >= achievement.requirement;

            case 'survival_time':
                return (gameStats.gameTime || 0) >= achievement.requirement;

            case 'items_bought':
                return playerData.itemsBought >= achievement.requirement;

            case 'level_jump':
                return playerData.levelJump >= achievement.requirement;

            default:
                return false;
        }
    }

    // Obter progresso de conquistas
    getAchievementProgress(achievementId, currentStats) {
        const achievement = this.getAchievementById(achievementId);
        if (!achievement) return null;

        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) return null;

        let current = 0;
        const target = achievement.requirement;

        switch (achievement.type) {
            case 'score':
                current = currentUser.high_score || 0;
                break;
            case 'games_played':
                current = currentUser.total_games || 0;
                break;
            case 'level':
                current = this.rewardSystem.getCurrentLevel(currentUser.high_score || 0).id;
                break;
            case 'coins_total':
                current = currentUser.coins || 0;
                break;
            case 'coins_earned':
                current = Math.floor((currentUser.high_score || 0) / this.rewardSystem.config.pointsPerCoin);
                break;
        }

        const progress = Math.min(100, (current / target) * 100);

        return {
            achievement,
            current,
            target,
            progress: Math.round(progress),
            completed: current >= target
        };
    }

    // Obter estatísticas de conquistas do usuário
    async getAchievementStats() {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) return null;

        const userAchievements = await this.getUserAchievements();
        const totalAchievements = this.achievements.length;

        // Agrupar por raridade
        const byRarity = {};
        for (const rarity in this.rarities) {
            byRarity[rarity] = {
                total: this.achievements.filter(a => a.rarity === rarity).length,
                unlocked: userAchievements.filter(ua => {
                    const achievement = this.getAchievementById(ua.achievement_id);
                    return achievement && achievement.rarity === rarity;
                }).length
            };
        }

        // Calcular moedas ganhas com conquistas
        const totalCoinsFromAchievements = userAchievements.reduce((sum, ua) => {
            const achievement = this.getAchievementById(ua.achievement_id);
            if (achievement) {
                const rarity = this.rarities[achievement.rarity] || this.rarities.common;
                return sum + Math.ceil(achievement.coinReward * rarity.multiplier);
            }
            return sum;
        }, 0);

        return {
            totalUnlocked: userAchievements.length,
            totalAvailable: totalAchievements,
            completionPercentage: Math.round((userAchievements.length / totalAchievements) * 100),
            byRarity,
            totalCoinsEarned: totalCoinsFromAchievements,
            recentAchievements: userAchievements.slice(0, 3) // Últimas 3 conquistas
        };
    }

    // Obter conquistas próximas de serem desbloqueadas
    getNearbyAchievements(limit = 5) {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) return [];

        const nearby = [];

        for (const achievement of this.achievements) {
            const progress = this.getAchievementProgress(achievement.id);
            if (progress && !progress.completed && progress.progress >= 50) {
                nearby.push({
                    ...progress,
                    remainingToUnlock: progress.target - progress.current
                });
            }
        }

        // Ordenar por progresso (mais próximas primeiro)
        nearby.sort((a, b) => b.progress - a.progress);

        return nearby.slice(0, limit);
    }

    // Criar notificação de conquista desbloqueada
    createAchievementNotification(achievementResult) {
        return {
            type: 'achievement',
            title: `🏆 ${achievementResult.achievement.name}`,
            description: achievementResult.achievement.description,
            coinReward: achievementResult.coinReward,
            rarity: achievementResult.achievement.rarity,
            color: this.rarities[achievementResult.achievement.rarity].color,
            icon: achievementResult.achievement.icon,
            duration: 5000
        };
    }
}

export default AchievementSystem;
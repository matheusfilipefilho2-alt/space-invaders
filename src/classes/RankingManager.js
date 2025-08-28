import { supabase } from '../supabase.js'
import RewardSystem from './RewardSystem.js'

class RankingManager {
    constructor() {
        this.currentUser = null
        this.rewardSystem = new RewardSystem()
    }

    async register(username, pin) {
        try {
            const { data: existing } = await supabase
                .from('players')
                .select('username')
                .eq('username', username)
                .limit(1)

            if (existing && existing.length > 0) {
                throw new Error('Nome de usuário já existe!')
            }

            const { data, error } = await supabase
                .from('players')
                .insert([
                    { 
                        username: username, 
                        pin: pin, 
                        high_score: 0,
                        coins: 0,          // Novo campo
                        level_id: 1,       // Novo campo
                        total_games: 0,    // Novo campo
                        created_at: new Date().toISOString()
                    }
                ])
                .select()

            if (error) throw error

            this.currentUser = data[0]
            this.rewardSystem.setUser(this.currentUser)
            return { success: true, user: data[0] }
        } catch (error) {
            console.error('❌ Erro no registro:', error)
            return { success: false, error: error.message }
        }
    }

    // Fazer login
    async login(username, pin) {
        try {
            const { data, error } = await supabase
                .from('players')
                .select('*')
                .eq('username', username)
                .eq('pin', pin)

            if (error) {
                console.error('Erro na consulta de login:', error)
                throw new Error('Erro na autenticação')
            }

            if (!data || data.length === 0) {
                throw new Error('Usuário ou PIN incorretos!')
            }

            const user = data[0]
            
            // Garantir que campos novos existem (migração suave)
            if (user.coins === undefined) user.coins = 0
            if (user.level_id === undefined) user.level_id = 1
            if (user.total_games === undefined) user.total_games = 0

            this.currentUser = user
            this.rewardSystem.setUser(this.currentUser)
            
            return { success: true, user: user }

        } catch (error) {
            console.error('Erro no login:', error)
            return { success: false, error: error.message }
        }
    }

    // Atualizar pontuação máxima COM sistema de recompensas
    async updateHighScore(newScore) {
        console.log('🎯 Processando pontuação com sistema de recompensas:', {
            newScore,
            currentUser: this.currentUser?.username,
            currentHighScore: this.currentUser?.high_score,
            currentCoins: this.currentUser?.coins,
            currentLevel: this.currentUser?.level_id
        });

        if (!this.currentUser) {
            console.error('❌ Erro: Usuário não está logado');
            return { success: false, rewards: null };
        }

        try {
            const previousHighScore = this.currentUser.high_score || 0;
            const previousLevelId = this.currentUser.level_id || 1;
            const previousCoins = this.currentUser.coins || 0;

            // Processar recompensas APENAS se superou o high score
            let rewards = null;
            let updated = false;

            if (newScore > previousHighScore) {
                // Calcular recompensas
                rewards = this.rewardSystem.processGameRewards(
                    newScore, 
                    previousHighScore, 
                    previousLevelId
                );

                console.log('🎉 Recompensas calculadas:', rewards);

                // Atualizar no banco de dados
                const updateData = {
                    high_score: newScore,
                    coins: this.currentUser.coins,
                    level_id: this.currentUser.level_id,
                    total_games: (this.currentUser.total_games || 0) + 1,
                    last_played: new Date().toISOString()
                };

                const { error } = await supabase
                    .from('players')
                    .update(updateData)
                    .eq('id', this.currentUser.id);

                if (!error) {
                    console.log('✅ Dados atualizados com sucesso no banco!');
                    updated = true;
                } else {
                    console.error('❌ Erro do Supabase:', error);
                    // Reverter mudanças locais em caso de erro
                    this.currentUser.high_score = previousHighScore;
                    this.currentUser.coins = previousCoins;
                    this.currentUser.level_id = previousLevelId;
                }
            } else {
                // Apenas incrementar total de jogos
                const { error } = await supabase
                    .from('players')
                    .update({
                        total_games: (this.currentUser.total_games || 0) + 1,
                        last_played: new Date().toISOString()
                    })
                    .eq('id', this.currentUser.id);

                if (!error) {
                    this.currentUser.total_games = (this.currentUser.total_games || 0) + 1;
                }

                console.log('📊 Pontuação não superou o recorde atual');
            }

            return { 
                success: updated, 
                rewards: rewards,
                newHighScore: updated,
                playerStats: this.rewardSystem.getPlayerStats(this.currentUser)
            };

        } catch (error) {
            console.error('❌ Erro ao atualizar pontuação:', error);
            return { success: false, rewards: null, error: error.message };
        }
    }

    // Buscar ranking com informações de nível
    async getRanking() {
        try {
            const { data, error } = await supabase
                .from('players')
                .select('username, high_score, coins, level_id, total_games')
                .order('high_score', { ascending: false })
                .limit(15)

            if (error) throw error

            // Enriquecer dados com informações de nível
            const enrichedData = data.map(player => {
                const level = this.rewardSystem.getCurrentLevel(player.high_score || 0);
                return {
                    ...player,
                    level: level,
                    coins: player.coins || 0,
                    total_games: player.total_games || 0
                };
            });

            return enrichedData;
        } catch (error) {
            console.error('Erro ao buscar ranking:', error)
            return []
        }
    }

    // Buscar usuário atualizado
    async getUser(username) {
        try {
            const { data, error } = await supabase 
                .from('players')
                .select('*')
                .eq('username', username)
                .limit(1)

            if (error) throw error;
            if (!data || data.length === 0) return null;

            const user = data[0];
            // Garantir que campos novos existem
            if (user.coins === undefined) user.coins = 0;
            if (user.level_id === undefined) user.level_id = 1;
            if (user.total_games === undefined) user.total_games = 0;

            return user;
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            return null;
        }
    }

    // Obter estatísticas detalhadas do jogador
    getPlayerDetailedStats() {
        if (!this.currentUser) return null;
        
        return this.rewardSystem.getPlayerStats(this.currentUser);
    }

    // Obter informações de progresso de nível
    getLevelProgress() {
        if (!this.currentUser) return null;
        
        return this.rewardSystem.getLevelProgress(this.currentUser.high_score || 0);
    }

    // Obter todos os níveis disponíveis
    getAllLevels() {
        return this.rewardSystem.levels;
    }

    // Obter ranking por nível
    async getRankingByLevel() {
        const players = await this.getRanking();
        return this.rewardSystem.getRankingByLevel(players);
    }

    // Salvar compra na loja (para futuro sistema de loja)
    async purchaseItem(itemId, cost) {
        if (!this.currentUser || !this.rewardSystem.canAfford(cost)) {
            return { success: false, error: 'Moedas insuficientes' };
        }

        try {
            // Gastar moedas localmente
            const success = this.rewardSystem.spendCoins(cost);
            if (!success) {
                return { success: false, error: 'Erro ao processar compra' };
            }

            // Atualizar no banco
            const { error } = await supabase
                .from('players')
                .update({ coins: this.currentUser.coins })
                .eq('id', this.currentUser.id);

            if (error) {
                // Reverter compra em caso de erro
                this.currentUser.coins += cost;
                throw error;
            }

            // Aqui você pode adicionar lógica para salvar o item comprado
            // Por exemplo, em uma tabela 'player_items'

            return { 
                success: true, 
                remainingCoins: this.currentUser.coins,
                item: itemId 
            };

        } catch (error) {
            console.error('Erro ao comprar item:', error);
            return { success: false, error: error.message };
        }
    }

    // Logout
    logout() {
        this.currentUser = null;
        this.rewardSystem.setUser(null);
    }

    // Verificar se está logado
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Obter usuário atual
    getCurrentUser() {
        return this.currentUser;
    }

    // Obter sistema de recompensas (para acesso externo)
    getRewardSystem() {
        return this.rewardSystem;
    }
}

export default RankingManager;
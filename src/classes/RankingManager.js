import { supabase } from '../supabase.js'

class RankingManager {
    constructor() {
        this.currentUser = null
    }

    async register(username, pin) {
        try {
            const { data: existing } = await supabase
                .from('players')
                .select('username')
                .eq('username', username)
                .single()

            if (existing) {
                throw new Error('Nome de usuário já existe!')
            }

            const { data, error } = await supabase
                .from('players')
                .insert([
                    { username: username, pin: pin, high_score: 0 }
                ])
                .select()

            if (error) throw error

            this.currentUser = data[0]
            return { success: true, user: data[0] }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Fazer login
    async login(username, pin) {
        try {
            // NÃO usar .single() - verificar se array tem elementos
            const { data, error } = await supabase
                .from('players')
                .select('*')
                .eq('username', username)
                .eq('pin', pin)

            if (error) {
                console.error('Erro na consulta de login:', error)
                throw new Error('Erro na autenticação')
            }

            // Verificar se encontrou algum usuário
            if (!data || data.length === 0) {
                throw new Error('Usuário ou PIN incorretos!')
            }

            // Pegar o primeiro (e único) resultado
            const user = data[0]
            this.currentUser = user
            return { success: true, user: user }

        } catch (error) {
            console.error('Erro no login:', error)
            return { success: false, error: error.message }
        }
    }

    // Atualizar pontuação máxima
    async updateHighScore(newScore) {
        console.log('🎯 Tentando atualizar pontuação:', {
            newScore,
            currentUser: this.currentUser,
            hasUser: !!this.currentUser,
            currentHighScore: this.currentUser.high_score
        });
        if (!this.currentUser) {
            console.error('❌ Erro: Usuário não está logado (currentUser é null/undefined)');
            return false;
        }

        try {
            if (newScore > this.currentUser.high_score) {
                console.log('🚀 Nova pontuação é maior! Atualizando no banco...');
                
                const { error } = await supabase
                    .from('players')
                    .update({ high_score: newScore })
                    .eq('id', this.currentUser.id)

                    
                if (!error) {
                    this.currentUser.high_score = newScore;
                    console.log('✅ Pontuação atualizada com sucesso!');
                    return true;
                } else {
                    console.error('❌ Erro do Supabase:', error);
                }
            } else {
                console.log('📊 Pontuação atual não é maior que o recorde');
            }
            return false;
        } catch (error) {
            console.error('❌ Erro ao atualizar pontuação:', error);
            return false;
        }
    }

    // Buscar ranking
    async getRanking() {
        try {
            const { data, error } = await supabase
                .from('players')
                .select('username, high_score')
                .order('high_score', { ascending: false })
                .limit(15)

            if (error) throw error
            return data
        } catch (error) {
            console.error('Erro ao buscar ranking:', error)
            return []
        }
    }

    async getUser(username) {
        try {
            const { data, error } = await supabase 
            .from('players')
            .select('*')
            .eq('username', username)
            if (error) throw error
            console.log("atualizou")
            return data 
        }catch (error) {
            console.error('erro ao buscar ranking:', error)
            return []
        }
    }

    // Logout
    logout() {
        this.currentUser = null
    }

    // Verificar se está logado
    isLoggedIn() {
        return this.currentUser !== null
    }

    // Obter usuário atual
    getCurrentUser() {
        return this.currentUser
    }
}

export default RankingManager
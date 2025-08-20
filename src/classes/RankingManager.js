import { supabase } from '../supabase.js'

class RankingManager {
    constructor() {
        this.currentUser = null
    }

    // Registrar novo usuário
    async register(username, pin) {
        try {
            // Verificar se já existe
            const { data: existing } = await supabase
                .from('players')
                .select('username')
                .eq('username', username)
                .single()

            if (existing) {
                throw new Error('Nome de usuário já existe!')
            }

            // Criar novo usuário
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
            const { data, error } = await supabase
                .from('players')
                .select('*')
                .eq('username', username)
                .eq('pin', pin)
                .single()

            if (error || !data) {
                throw new Error('Usuário ou PIN incorretos!')
            }

            this.currentUser = data
            return { success: true, user: data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Atualizar pontuação máxima
    async updateHighScore(newScore) {
        if (!this.currentUser) return false

        try {
            if (newScore > this.currentUser.high_score) {
                const { error } = await supabase
                    .from('players')
                    .update({ high_score: newScore })
                    .eq('id', this.currentUser.id)

                if (!error) {
                    this.currentUser.high_score = newScore
                    return true
                }
            }
            return false
        } catch (error) {
            console.error('Erro ao atualizar pontuação:', error)
            return false
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
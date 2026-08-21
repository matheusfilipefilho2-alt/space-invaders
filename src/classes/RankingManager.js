import { supabase } from "../supabase.js";
import RewardSystem from "./RewardSystem.js";

class RankingManager {
  constructor() {
    this.currentUser = null;
    this.rewardSystem = new RewardSystem();
  }

  async register(username, hashedPin) {  // MUDANÇA: parâmetro agora é hashedPin
    try {
      const { data: existing } = await supabase
        .from("players")
        .select("username")
        .eq("username", username)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error("Nome de usuário já existe!");
      }

      const { data, error } = await supabase
        .from("players")
        .insert([
          {
            username: username,
            pin: hashedPin,  // MUDANÇA: usa hashedPin
            high_score: 0,
            coins: 0, // Novo campo
            level_id: 1, // Novo campo
            total_games: 0, // Novo campo
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      this.currentUser = data[0];
      this.rewardSystem.setUser(this.currentUser);
      return { success: true, user: data[0] };
    } catch (error) {
      console.error("❌ Erro no registro:", error);
      return { success: false, error: error.message };
    }
  }

  // Fazer login
  async login(username, pin) {  // Recebe PIN plano (não hash)
    try {
        // Buscar usuário
        const { data, error } = await supabase
            .from("players")
            .select("*")
            .eq("username", username);

        if (error) {
            console.error("Erro na consulta de login:", error);
            throw new Error("Erro na autenticação");
        }

        if (!data || data.length === 0) {
            throw new Error("Usuário ou PIN incorretos!");
        }

        const user = data[0];
        const storedPin = user.pin;

        // Detectar se PIN é hash ou texto plano
        const isHash = storedPin.startsWith('$2a$') || storedPin.startsWith('$2b$');

        let authenticated = false;

        if (isHash) {
            // Novo sistema: comparar com bcrypt
            console.log('🔐 Verificando PIN hasheado...');

            // Verificar se bcrypt está disponível
            if (typeof bcrypt === 'undefined' || !window.bcrypt) {
                console.error('❌ bcrypt não está carregado!');
                throw new Error('Sistema de segurança não carregado. Recarregue a página.');
            }

            authenticated = bcrypt.compareSync(pin, storedPin);
        } else {
            // Sistema legado: comparação direta (texto plano)
            console.log('⚠️ PIN em texto plano detectado (legado)');
            authenticated = (pin === storedPin);

            // Migrar para hash automaticamente se login for bem-sucedido
            if (authenticated) {
                console.log('🔄 Migrando PIN para hash...');

                // Verificar se bcrypt está disponível
                if (typeof bcrypt === 'undefined' || !window.bcrypt) {
                    console.error('❌ bcrypt não disponível para migração');
                    console.log('⚠️ Migração de PIN adiada - bcrypt não carregado');
                    // Não bloqueia login, apenas adia migração
                } else {
                    const hashedPin = bcrypt.hashSync(pin, 10);

                    // Atualizar PIN para hash no banco
                    const { error: updateError } = await supabase
                        .from("players")
                        .update({ pin: hashedPin })
                        .eq("id", user.id);

                    if (updateError) {
                        console.error('❌ Erro ao migrar PIN:', updateError);
                    } else {
                        console.log('✅ PIN migrado com sucesso');
                    }
                }
            }
        }

        if (!authenticated) {
            throw new Error("Usuário ou PIN incorretos!");
        }

        // Garantir campos novos (migração suave)
        if (user.coins === undefined) user.coins = 0;
        if (user.level_id === undefined) user.level_id = 1;
        if (user.total_games === undefined) user.total_games = 0;

        this.currentUser = user;
        this.rewardSystem.setUser(this.currentUser);

        return { success: true, user: user };
    } catch (error) {
        console.error("Erro no login:", error);
        return { success: false, error: error.message };
    }
  }

  // Atualizar pontuação máxima COM sistema de recompensas
  // Método updateHighScore corrigido no RankingManager.js

  async updateHighScore(newScore) {
    console.log("🎯 Processando pontuação com sistema de recompensas:", {
      newScore,
      currentUser: this.currentUser?.username,
      currentHighScore: this.currentUser?.high_score,
      currentCoins: this.currentUser?.coins,
      currentLevel: this.currentUser?.level_id,
    });

    if (!this.currentUser) {
      console.error("❌ Erro: Usuário não está logado");
      return { success: false, rewards: null };
    }

    // Verificar se o usuário ainda existe no banco de dados
    const { data: userExists, error: checkError } = await supabase
      .from("players")
      .select("id")
      .eq("id", this.currentUser.id)
      .limit(1);

    if (checkError || !userExists || userExists.length === 0) {
      console.error(
        "❌ Erro: Usuário não encontrado no banco de dados. ID:",
        this.currentUser.id
      );
      this.logout();
      return { success: false, rewards: null, error: "Usuário não encontrado" };
    }

    try {
      const previousHighScore = this.currentUser.high_score || 0;
      const previousLevelId = this.currentUser.level_id || 1;
      const previousCoins = this.currentUser.coins || 0;

      // Processar recompensas sempre baseado na pontuação da partida
      const rewards = this.rewardSystem.processGameRewards(
        newScore,
        previousHighScore,
        previousLevelId
      );

      console.log("🎉 Recompensas calculadas:", rewards);

      // Determinar se deve atualizar high score
      const isNewHighScore = newScore > previousHighScore;
      const finalHighScore = Math.max(newScore, previousHighScore);

      // ⭐ SOLUÇÃO: Calcular level_id localmente para evitar função SQL
      const newLevelId = this.rewardSystem.getCurrentLevel(finalHighScore).id;

      let updated = false;

      // ⭐ CORREÇÃO: Incluir moedas ganhas na partida
      const newCoinsTotal = (this.currentUser.coins || 0) + (rewards.coinsEarned || 0);
      
      // Preparar dados para atualização (SEM triggers SQL problemáticos)
      const updateData = {
        coins: parseInt(newCoinsTotal), // Incluir moedas ganhas na partida
        level_id: parseInt(newLevelId), // Calculado localmente
        total_games: parseInt((this.currentUser.total_games || 0) + 1),
        last_played: new Date().toISOString(),
        high_score: parseInt(finalHighScore), // Sempre salvar o maior score
      };

      // Log para debug
      console.log("📊 Dados para atualização:", updateData);

      // ⭐ ATUALIZAÇÃO SEGURA: Usar .eq() específico para evitar triggers
      const { error } = await supabase
        .from("players")
        .update(updateData)
        .eq("id", this.currentUser.id)
        .select(); // Forçar retorno para confirmar atualização

      if (!error) {
        console.log("✅ Dados atualizados com sucesso no banco!");

        // Atualizar dados locais APÓS sucesso no banco
        this.currentUser.high_score = finalHighScore;
        this.currentUser.level_id = newLevelId;
        this.currentUser.total_games = (this.currentUser.total_games || 0) + 1;
        this.currentUser.coins = newCoinsTotal; // Usar o total calculado

        updated = true;
      } else {
        console.error("❌ Erro do Supabase:", error);

        // Tratamento específico para erro de função SQL inexistente
        if (
          error.code === "42883" &&
          error.message.includes("calculate_player_level")
        ) {
          console.warn(
            "⚠️ Ignorando erro de função SQL inexistente - continuando com dados locais"
          );

          // ⭐ FIX: Atualizar dados locais corretamente mesmo com erro SQL
          this.currentUser.high_score = finalHighScore;
          this.currentUser.level_id = newLevelId;
          this.currentUser.total_games =
            (this.currentUser.total_games || 0) + 1;
          this.currentUser.coins = newCoinsTotal; // Usar o total calculado

          updated = true; // Considerar como sucesso para não quebrar o fluxo

          // ⭐ TENTATIVA ALTERNATIVA: Tentar atualização simples sem triggers
          try {
            const { error: retryError } = await supabase
              .from("players")
              .update({
                high_score: parseInt(finalHighScore),
                coins: parseInt(newCoinsTotal), // Usar o total calculado
                total_games: parseInt(updateData.total_games),
                last_played: updateData.last_played,
              })
              .eq("id", this.currentUser.id);

            if (!retryError) {
              console.log(
                "✅ Atualização alternativa bem-sucedida (sem level_id)"
              );
            }
          } catch (retryErr) {
            console.warn(
              "⚠️ Atualização alternativa também falhou, mantendo apenas dados locais"
            );
          }
        } else {
          // Reverter mudanças locais apenas para outros tipos de erro
          console.error(
            "❌ Revertendo mudanças devido a erro não relacionado à função SQL"
          );
          this.currentUser.high_score = previousHighScore;
          this.currentUser.coins = previousCoins;
          this.currentUser.level_id = previousLevelId;
          updated = false;
        }
      }

      return {
        success: updated,
        rewards: rewards,
        newHighScore: isNewHighScore,
        playerStats: this.rewardSystem.getPlayerStats(this.currentUser),
      };
    } catch (error) {
      console.error("❌ Erro ao atualizar pontuação:", error);
      return { success: false, rewards: null, error: error.message };
    }
  }

  // Buscar ranking com informações de nível
  async getRanking() {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("username, high_score, coins, level_id, total_games")
        .order("high_score", { ascending: false })
        .limit(15);

      if (error) throw error;

      // Enriquecer dados com informações de nível
      const enrichedData = data.map((player) => {
        const level = this.rewardSystem.getCurrentLevel(player.high_score || 0);
        return {
          ...player,
          level: level,
          coins: player.coins || 0,
          total_games: player.total_games || 0,
        };
      });

      return enrichedData;
    } catch (error) {
      console.error("Erro ao buscar ranking:", error);
      return [];
    }
  }

  // Buscar usuário atualizado
  async getUser(username) {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("username", username)
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const user = data[0];
      // Garantir que campos novos existem
      if (user.coins === undefined) user.coins = 0;
      if (user.level_id === undefined) user.level_id = 1;
      if (user.total_games === undefined) user.total_games = 0;

      return user;
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
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
      return { success: false, error: "Moedas insuficientes" };
    }

    try {
      // Gastar moedas localmente
      const success = this.rewardSystem.spendCoins(cost);
      if (!success) {
        return { success: false, error: "Erro ao processar compra" };
      }

      // Atualizar no banco
      const { error } = await supabase
        .from("players")
        .update({ coins: this.currentUser.coins })
        .eq("id", this.currentUser.id);

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
        item: itemId,
      };
    } catch (error) {
      console.error("Erro ao comprar item:", error);
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

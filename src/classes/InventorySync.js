import { supabase } from '../supabase.js';
import { NavigationHelper } from '../navigation.js';

class InventorySync {
    constructor() {
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.syncQueue = [];
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 segundo
        
        // Configurações de sincronização
        this.config = {
            autoSyncInterval: 30000,    // 30 segundos
            conflictResolution: 'smart', // 'server', 'client', 'smart'
            enableRealTimeSync: true,   // Sincronização em tempo real
            batchSize: 50              // Máximo de itens por lote
        };
        
        this.init();
    }
    
    async init() {
        // Carregar último timestamp de sync
        this.lastSyncTime = localStorage.getItem('spaceInvaders_lastInventorySync');
        
        // Iniciar sincronização automática
        if (this.config.enableRealTimeSync) {
            this.startAutoSync();
        }
        
        // Listener para mudanças de conectividade
        window.addEventListener('online', () => this.handleConnectionRestore());
        window.addEventListener('offline', () => this.handleConnectionLoss());
        
        console.log('📦 InventorySync inicializado');
    }
    
    // Iniciar sincronização automática
    startAutoSync() {
        setInterval(() => {
            const currentUser = NavigationHelper.getCurrentUser();
            if (currentUser && navigator.onLine) {
                this.syncInventory(currentUser.id, false);
            }
        }, this.config.autoSyncInterval);
    }
    
    // Sincronizar inventário completo
    async syncInventory(userId, forceSync = false) {
        if (this.syncInProgress && !forceSync) {
            console.log('📦 Sincronização de inventário já em progresso');
            return { success: false, reason: 'sync_in_progress' };
        }
        
        this.syncInProgress = true;
        
        try {
            const result = await this.performInventorySync(userId);
            this.lastSyncTime = Date.now();
            localStorage.setItem('spaceInvaders_lastInventorySync', this.lastSyncTime.toString());
            
            console.log('✅ Sincronização de inventário concluída:', result);
            return result;
        } catch (error) {
            console.error('❌ Erro na sincronização de inventário:', error);
            return { success: false, error: error.message };
        } finally {
            this.syncInProgress = false;
        }
    }
    
    // Executar sincronização do inventário (UNIDIRECIONAL: Banco -> localStorage)
    async performInventorySync(userId) {
        // 1. Obter itens do servidor (fonte da verdade)
        const serverItems = await this.getServerInventory(userId);
        
        // 2. Atualizar inventário local com dados do servidor
        this.updateLocalInventory(userId, serverItems);
        
        console.log(`📦 Sincronização unidirecional: ${serverItems.length} itens carregados do servidor`);
        
        return {
            success: true,
            itemsLoaded: serverItems.length,
            totalItems: serverItems.length,
            lastSync: this.lastSyncTime,
            syncDirection: 'server_to_local'
        };
    }
    
    // Obter inventário local
    getLocalInventory(userId) {
        try {
            const userItemsKey = `userItems_${userId}`;
            const localData = localStorage.getItem(userItemsKey);
            return localData ? JSON.parse(localData) : [];
        } catch (error) {
            console.error('Erro ao obter inventário local:', error);
            return [];
        }
    }
    
    // Obter inventário do servidor
    async getServerInventory(userId) {
        try {
            const { data, error } = await supabase
                .from('player_items')
                .select('*')
                .eq('player_id', userId)
                .order('purchased_at', { ascending: false });
            
            if (error) {
                // Se a tabela não existe, retornar array vazio
                if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                    console.log('📦 Tabela player_items não existe, usando apenas localStorage');
                    return [];
                }
                throw error;
            }
            
            return data || [];
        } catch (error) {
            console.error('Erro ao obter inventário do servidor:', error);
            return [];
        }
    }
    
    // Método removido: compareInventories não é mais necessário
    // A sincronização agora é unidirecional (servidor -> localStorage)
    
    // Método removido: resolveInventoryConflicts não é mais necessário
    // A sincronização agora é unidirecional (servidor -> localStorage)
    
    // Método removido: saveResolvedInventory não é mais necessário
    // A sincronização agora é unidirecional (servidor -> localStorage)
    // Novos itens devem ser adicionados diretamente no banco via outras operações
    
    // Atualizar inventário local
    updateLocalInventory(userId, resolvedItems) {
        try {
            const userItemsKey = `userItems_${userId}`;
            localStorage.setItem(userItemsKey, JSON.stringify(resolvedItems));
            console.log(`✅ ${resolvedItems.length} itens atualizados no localStorage`);
        } catch (error) {
            console.error('❌ Erro ao atualizar inventário local:', error);
        }
    }
    
    // Criar lotes para inserção
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
    
    // Adicionar item ao inventário (SERVIDOR PRIMEIRO, depois sincroniza)
    async addItemToInventory(userId, item) {
        try {
            // 1. Tentar adicionar no servidor primeiro (se online)
            if (navigator.onLine) {
                try {
                    // Verificar se o item já existe
                    const { data: existingItems, error: checkError } = await supabase
                        .from('player_items')
                        .select('id')
                        .eq('player_id', userId)
                        .eq('item_id', item.item_id)
                        .eq('is_permanent', item.is_permanent || false);
                    
                    if (checkError && !(checkError.code === 'PGRST116' || checkError.message.includes('does not exist'))) {
                        throw checkError;
                    }
                    
                    // Se não existe, inserir no servidor
                    if (!existingItems || existingItems.length === 0) {
                        const { error: insertError } = await supabase
                            .from('player_items')
                            .insert({
                                player_id: userId,
                                item_id: item.item_id,
                                item_name: item.item_name,
                                item_category: item.item_category,
                                is_permanent: item.is_permanent || false,
                                uses_remaining: item.uses_remaining || 0,
                                purchased_at: item.purchased_at
                            });
                        
                        if (insertError && !(insertError.code === 'PGRST116' || insertError.message.includes('does not exist'))) {
                            throw insertError;
                        }
                        
                        console.log('✅ Item adicionado no servidor:', item.item_id);
                    } else {
                        console.log('📦 Item já existe no servidor:', item.item_id);
                    }
                    
                    // 2. Sincronizar do servidor para localStorage
                    await this.syncInventory(userId, true);
                    
                } catch (serverError) {
                    console.warn('⚠️ Erro ao adicionar item no servidor, adicionando apenas local:', serverError);
                    // Fallback: adicionar apenas localmente se servidor falhar
                    const localItems = this.getLocalInventory(userId);
                    localItems.push(item);
                    this.updateLocalInventory(userId, localItems);
                }
            } else {
                // Offline: adicionar apenas localmente
                console.log('📴 Offline: adicionando item apenas localmente');
                const localItems = this.getLocalInventory(userId);
                localItems.push(item);
                this.updateLocalInventory(userId, localItems);
            }
            
            return { success: true, item };
        } catch (error) {
            console.error('❌ Erro ao adicionar item ao inventário:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Usar item do inventário (SERVIDOR PRIMEIRO, depois sincroniza)
    async useItemFromInventory(userId, itemId) {
        try {
            // Verificar se o item existe localmente primeiro
            const localItems = this.getLocalInventory(userId);
            const itemIndex = localItems.findIndex(item => 
                item.item_id === itemId && 
                (item.is_permanent || (item.uses_remaining && item.uses_remaining > 0))
            );
            
            if (itemIndex === -1) {
                return { success: false, error: 'Item não encontrado ou sem usos' };
            }
            
            const item = localItems[itemIndex];
            
            // Se é permanente, não precisa atualizar usos
            if (item.is_permanent) {
                return { 
                    success: true, 
                    item, 
                    usesRemaining: 'permanent' 
                };
            }
            
            // 1. Atualizar no servidor primeiro (se online)
            if (navigator.onLine) {
                try {
                    const newUsesRemaining = item.uses_remaining - 1;
                    
                    if (newUsesRemaining <= 0) {
                        // Remover do servidor
                        const { error: deleteError } = await supabase
                            .from('player_items')
                            .delete()
                            .eq('player_id', userId)
                            .eq('item_id', itemId);
                        
                        if (deleteError && !(deleteError.code === 'PGRST116' || deleteError.message.includes('does not exist'))) {
                            throw deleteError;
                        }
                        
                        console.log('✅ Item removido do servidor (sem usos):', itemId);
                    } else {
                        // Atualizar usos no servidor
                        const { error: updateError } = await supabase
                            .from('player_items')
                            .update({ uses_remaining: newUsesRemaining })
                            .eq('player_id', userId)
                            .eq('item_id', itemId);
                        
                        if (updateError && !(updateError.code === 'PGRST116' || updateError.message.includes('does not exist'))) {
                            throw updateError;
                        }
                        
                        console.log('✅ Usos atualizados no servidor:', itemId, newUsesRemaining);
                    }
                    
                    // 2. Sincronizar do servidor para localStorage
                    await this.syncInventory(userId, true);
                    
                    return { 
                        success: true, 
                        item: { ...item, uses_remaining: newUsesRemaining }, 
                        usesRemaining: newUsesRemaining 
                    };
                    
                } catch (serverError) {
                    console.warn('⚠️ Erro ao atualizar item no servidor, atualizando apenas local:', serverError);
                    // Fallback: atualizar apenas localmente
                }
            }
            
            // Fallback ou modo offline: atualizar apenas localmente
            console.log('📴 Offline ou erro no servidor: atualizando item apenas localmente');
            item.uses_remaining -= 1;
            
            // Remover item se não tem mais usos
            if (item.uses_remaining <= 0) {
                localItems.splice(itemIndex, 1);
            }
            
            this.updateLocalInventory(userId, localItems);
            
            return { 
                success: true, 
                item, 
                usesRemaining: item.uses_remaining 
            };
        } catch (error) {
            console.error('❌ Erro ao usar item do inventário:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Manipuladores de conectividade
    handleConnectionRestore() {
        console.log('🌐 Conexão restaurada, sincronizando inventário...');
        const currentUser = NavigationHelper.getCurrentUser();
        if (currentUser) {
            this.syncInventory(currentUser.id, true);
        }
    }
    
    handleConnectionLoss() {
        console.log('📴 Conexão perdida, usando apenas localStorage');
    }
    
    // Verificar se o usuário possui um item específico
    hasItemInInventory(userId, itemId) {
        try {
            const localItems = this.getLocalInventory(userId);
            return localItems.some(item => 
                item.item_id === itemId && 
                (item.is_permanent || (item.uses_remaining && item.uses_remaining > 0))
            );
        } catch (error) {
            console.error('❌ Erro ao verificar item no inventário:', error);
            return false;
        }
    }
    
    // Obter status da sincronização
    getSyncStatus() {
        return {
            inProgress: this.syncInProgress,
            lastSync: this.lastSyncTime,
            isOnline: navigator.onLine,
            queueSize: this.syncQueue.length
        };
    }
}

export default InventorySync;
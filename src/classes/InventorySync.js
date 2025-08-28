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
    
    // Executar sincronização do inventário
    async performInventorySync(userId) {
        // 1. Obter itens locais
        const localItems = this.getLocalInventory(userId);
        
        // 2. Obter itens do servidor
        const serverItems = await this.getServerInventory(userId);
        
        // 3. Detectar conflitos e diferenças
        const syncResult = this.compareInventories(localItems, serverItems);
        
        // 4. Resolver conflitos e sincronizar
        const resolvedItems = await this.resolveInventoryConflicts(
            syncResult, localItems, serverItems
        );
        
        // 5. Salvar itens resolvidos
        await this.saveResolvedInventory(userId, resolvedItems);
        
        // 6. Atualizar inventário local
        this.updateLocalInventory(userId, resolvedItems);
        
        return {
            success: true,
            itemsAdded: syncResult.toAdd.length,
            itemsUpdated: syncResult.toUpdate.length,
            itemsRemoved: syncResult.toRemove.length,
            conflicts: syncResult.conflicts.length,
            totalItems: resolvedItems.length,
            lastSync: this.lastSyncTime
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
    
    // Comparar inventários e detectar diferenças
    compareInventories(localItems, serverItems) {
        const result = {
            toAdd: [],      // Itens para adicionar no servidor
            toUpdate: [],   // Itens para atualizar no servidor
            toRemove: [],   // Itens para remover localmente
            conflicts: []   // Conflitos que precisam de resolução
        };
        
        // Criar mapas para comparação eficiente
        const localMap = new Map();
        const serverMap = new Map();
        
        localItems.forEach(item => {
            const key = `${item.item_id}_${item.purchased_at}`;
            localMap.set(key, item);
        });
        
        serverItems.forEach(item => {
            const key = `${item.item_id}_${item.purchased_at}`;
            serverMap.set(key, item);
        });
        
        // Verificar itens locais que não estão no servidor
        localMap.forEach((localItem, key) => {
            if (!serverMap.has(key)) {
                result.toAdd.push(localItem);
            } else {
                const serverItem = serverMap.get(key);
                // Verificar se há diferenças nos usos restantes
                if (localItem.uses_remaining !== serverItem.uses_remaining) {
                    result.conflicts.push({
                        type: 'uses_mismatch',
                        key,
                        local: localItem,
                        server: serverItem
                    });
                }
            }
        });
        
        // Verificar itens do servidor que não estão localmente
        serverMap.forEach((serverItem, key) => {
            if (!localMap.has(key)) {
                // Adicionar ao inventário local
                result.toUpdate.push(serverItem);
            }
        });
        
        return result;
    }
    
    // Resolver conflitos de inventário
    async resolveInventoryConflicts(syncResult, localItems, serverItems) {
        let resolvedItems = [...serverItems];
        
        // Adicionar itens que existem apenas localmente
        syncResult.toAdd.forEach(item => {
            resolvedItems.push(item);
        });
        
        // Resolver conflitos de usos restantes
        syncResult.conflicts.forEach(conflict => {
            if (conflict.type === 'uses_mismatch') {
                const existingIndex = resolvedItems.findIndex(item => 
                    `${item.item_id}_${item.purchased_at}` === conflict.key
                );
                
                if (existingIndex !== -1) {
                    // Estratégia inteligente: usar o menor valor de usos (mais conservador)
                    resolvedItems[existingIndex].uses_remaining = Math.min(
                        conflict.local.uses_remaining || 0,
                        conflict.server.uses_remaining || 0
                    );
                    
                    console.log(`🔄 Conflito resolvido para ${conflict.local.item_id}: usando ${resolvedItems[existingIndex].uses_remaining} usos`);
                }
            }
        });
        
        // Remover itens com 0 usos restantes (exceto permanentes)
        resolvedItems = resolvedItems.filter(item => {
            return item.is_permanent || (item.uses_remaining && item.uses_remaining > 0);
        });
        
        return resolvedItems;
    }
    
    // Salvar inventário resolvido no servidor
    async saveResolvedInventory(userId, resolvedItems) {
        try {
            // Verificar se a tabela existe
            const { data: tableCheck, error: tableError } = await supabase
                .from('player_items')
                .select('id')
                .limit(1);
            
            if (tableError && (tableError.code === 'PGRST116' || tableError.message.includes('does not exist'))) {
                console.log('📦 Tabela player_items não existe, salvando apenas no localStorage');
                return;
            }
            
            // Limpar e recriar inventário para evitar conflitos
            if (resolvedItems.length > 0) {
                try {
                    // Primeiro, remover todos os itens existentes do usuário
                    const { error: deleteError } = await supabase
                        .from('player_items')
                        .delete()
                        .eq('player_id', userId);
                    
                    if (deleteError) {
                        console.warn('⚠️ Erro ao limpar itens existentes:', deleteError);
                    }
                    
                    // Depois, inserir todos os itens resolvidos
                    const batches = this.createBatches(resolvedItems, this.config.batchSize);
                    
                    for (const batch of batches) {
                        const itemsToInsert = batch.map(item => ({
                            player_id: userId,
                            item_id: item.item_id,
                            item_name: item.item_name,
                            item_category: item.item_category,
                            is_permanent: item.is_permanent || false,
                            uses_remaining: item.uses_remaining || 0,
                            purchased_at: item.purchased_at
                        }));
                        
                        const { error: insertError } = await supabase
                            .from('player_items')
                            .insert(itemsToInsert);
                        
                        if (insertError) {
                            console.warn('⚠️ Erro ao inserir lote, tentando itens individuais:', insertError);
                            // Fallback: tentar inserir itens individualmente com verificação
                            for (const item of itemsToInsert) {
                                try {
                                    // Verificar se o item já existe antes de inserir
                                    const { data: existingItems, error: checkError } = await supabase
                                        .from('player_items')
                                        .select('id')
                                        .eq('player_id', item.player_id)
                                        .eq('item_id', item.item_id)
                                        .eq('is_permanent', item.is_permanent);
                                    
                                    if (checkError) {
                                        console.warn('⚠️ Erro ao verificar item existente:', item.item_id, checkError);
                                        continue;
                                    }
                                    
                                    // Se não existe, inserir
                                    if (!existingItems || existingItems.length === 0) {
                                        await supabase
                                            .from('player_items')
                                            .insert(item);
                                    } else {
                                        console.log('📦 Item já existe, pulando:', item.item_id);
                                    }
                                } catch (individualError) {
                                    console.warn('⚠️ Erro ao inserir item individual:', item.item_id, individualError);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('❌ Erro durante operação de limpeza e inserção:', error);
                }
            }
            
            console.log(`✅ ${resolvedItems.length} itens salvos no servidor`);
        } catch (error) {
            console.error('❌ Erro ao salvar inventário no servidor:', error);
            // Não falhar a sincronização se não conseguir salvar no servidor
        }
    }
    
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
    
    // Adicionar item ao inventário (com sincronização)
    async addItemToInventory(userId, item) {
        try {
            // Adicionar localmente primeiro
            const localItems = this.getLocalInventory(userId);
            localItems.push(item);
            this.updateLocalInventory(userId, localItems);
            
            // Tentar adicionar no servidor verificando duplicatas
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
                    
                    // Se não existe, inserir
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
                    } else {
                        console.log('📦 Item já existe no servidor, mantendo apenas local');
                    }
                } catch (serverError) {
                    console.warn('⚠️ Erro ao adicionar item no servidor, mantendo apenas local:', serverError);
                }
            }
            
            return { success: true, item };
        } catch (error) {
            console.error('❌ Erro ao adicionar item ao inventário:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Usar item do inventário (com sincronização)
    async useItemFromInventory(userId, itemId) {
        try {
            // Atualizar localmente primeiro
            const localItems = this.getLocalInventory(userId);
            const itemIndex = localItems.findIndex(item => 
                item.item_id === itemId && 
                item.uses_remaining && 
                item.uses_remaining > 0
            );
            
            if (itemIndex === -1) {
                return { success: false, error: 'Item não encontrado ou sem usos' };
            }
            
            const item = localItems[itemIndex];
            item.uses_remaining -= 1;
            
            // Remover item se não tem mais usos e não é permanente
            if (item.uses_remaining <= 0 && !item.is_permanent) {
                localItems.splice(itemIndex, 1);
            }
            
            this.updateLocalInventory(userId, localItems);
            
            // Tentar atualizar no servidor
            if (navigator.onLine) {
                try {
                    if (item.uses_remaining <= 0 && !item.is_permanent) {
                        // Remover do servidor
                        await supabase
                            .from('player_items')
                            .delete()
                            .eq('player_id', userId)
                            .eq('item_id', itemId);
                    } else {
                        // Atualizar usos no servidor
                        await supabase
                            .from('player_items')
                            .update({ uses_remaining: item.uses_remaining })
                            .eq('player_id', userId)
                            .eq('item_id', itemId);
                    }
                } catch (serverError) {
                    console.warn('⚠️ Erro ao atualizar item no servidor, mantendo apenas local:', serverError);
                }
            }
            
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
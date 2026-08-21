import gameConfig from './GameConfig.js';
import RewardSystem from './RewardSystem.js';
import InventorySync from './InventorySync.js';
import { supabase } from '../supabase.js';

class Shop {
    constructor(rankingManager) {
        this.rankingManager = rankingManager;
        this.gameConfig = gameConfig;
        this.rewardSystem = rankingManager ? rankingManager.getRewardSystem() : new RewardSystem();
        this.inventorySync = new InventorySync();
        this.isPurchasing = false;  // Flag para prevenir double-submit

        // Configurações da loja
        this.config = this.gameConfig.shop;
        
        // Raridades dos itens
        this.rarities = {
            common: { name: 'Comum', color: '#9E9E9E' },
            uncommon: { name: 'Incomum', color: '#4CAF50' },
            rare: { name: 'Raro', color: '#2196F3' },
            epic: { name: 'Épico', color: '#9C27B0' },
            legendary: { name: 'Lendário', color: '#FF9800' }
        };
        
        // Itens da loja
        this.items = [
            // Temas
            {
                id: 'theme_neon',
                name: 'Tema Neon',
                description: 'Interface com cores vibrantes e efeitos neon',
                category: 'theme',
                rarity: 'uncommon',
                price: 450,
                icon: '🌈',
                permanent: true,
                disabled: true,
                comingSoon: true
            },
            {
                id: 'theme_retro',
                name: 'Tema Retrô',
                description: 'Visual clássico dos anos 80',
                category: 'theme',
                rarity: 'rare',
                price: 750,
                icon: '📺',
                permanent: true,
                disabled: true,
                comingSoon: true
            },
            
            // Boosts
            {
                id: 'boost_coins',
                name: 'Multiplicador de Moedas',
                description: 'Dobra as moedas ganhas por 5 partidas',
                category: 'boost',
                rarity: 'common',
                price: 250,
                icon: '💰',
                duration: '5 partidas'
            },
            {
                id: 'boost_xp',
                name: 'Boost de XP',
                description: '+50% de experiência por 3 partidas',
                category: 'boost',
                rarity: 'uncommon',
                price: 400,
                icon: '⚡',
                duration: '3 partidas'
            },
            
            // Cosméticos
            {
                id: 'ship_golden',
                name: 'Nave Dourada',
                description: 'Nave com acabamento dourado luxuoso',
                category: 'cosmetic',
                rarity: 'epic',
                price: 500,
                icon: '🚀',
                permanent: true
            },
            
            // Utilitários
            {
                id: 'shield_extra',
                name: 'Escudo Extra',
                description: 'Começa a partida com escudo adicional',
                category: 'utility',
                rarity: 'common',
                price: 150,
                icon: '🛡️',
                duration: '1 partida',
                disabled: true,
                comingSoon: true
            },
            {
                id: 'life_bonus',
                name: 'Vida Bônus',
                description: 'Tem a chance de receber um bonus de até 3 vidas durante a partida',
                category: 'utility',
                rarity: 'uncommon',
                price: 300,
                icon: '❤️',
                duration: '1 partida'
            },
            {
                id: 'trail_rainbow',
                name: 'Nave Arco-íris',
                description: 'Efeito visual especial com cores do arco-íris',
                category: 'utility',
                rarity: 'legendary',
                price: 500,
                icon: '🌈',
                permanent: true
            },
            
            // Skins de Naves
            {
                id: 'skin_default',
                name: 'Nave Padrão',
                description: 'A nave clássica original do jogo',
                category: 'skins',
                rarity: 'common',
                price: 0,
                icon: '🛸',
                permanent: true,
                skinFile: 'spaceship.png',
                isDefault: true
            },
            {
                id: 'skin_milenium',
                name: 'Millennium Falcon',
                description: 'A icônica nave de Han Solo',
                category: 'skins',
                rarity: 'legendary',
                price: 2500,
                icon: '🚀',
                permanent: true,
                skinFile: 'milenium.png'
            },
            {
                id: 'skin_xwing',
                name: 'X-Wing Fighter',
                description: 'Caça estelar da Aliança Rebelde',
                category: 'skins',
                rarity: 'epic',
                price: 1800,
                icon: '✈️',
                permanent: true,
                skinFile: 'xwing.png'
            },
            {
                id: 'skin_orange',
                name: 'Nave Laranja',
                description: 'Design moderno com acabamento laranja vibrante',
                category: 'skins',
                rarity: 'rare',
                price: 1200,
                icon: '🟠',
                permanent: true,
                skinFile: 'orange.png'
            },
            {
                id: 'skin_yellowwing',
                name: 'Yellow Wing',
                description: 'Caça amarelo de alta velocidade',
                category: 'skins',
                rarity: 'uncommon',
                price: 900,
                icon: '🟡',
                permanent: true,
                skinFile: 'yellowwing.png'
            },
            
            // Pacotes de Moedas
            {
                id: 'coin_pack_199',
                name: 'Pacote de 199 Moedas',
                description: 'Compre 199 moedas por R$ 4,99',
                category: 'coin_packs',
                rarity: 'common',
                price: 4.99,
                priceType: 'real',
                coinAmount: 199,
                icon: '💰',
                permanent: false
            },
            {
                id: 'coin_pack_499',
                name: 'Pacote de 499 Moedas',
                description: 'Compre 499 moedas por R$ 9,99',
                category: 'coin_packs',
                rarity: 'uncommon',
                price: 9.99,
                priceType: 'real',
                coinAmount: 499,
                icon: '💰',
                permanent: false
            },
            {
                id: 'coin_pack_999',
                name: 'Pacote de 999 Moedas',
                description: 'Compre 999 moedas por R$ 14,99',
                category: 'coin_packs',
                rarity: 'rare',
                price: 14.99,
                priceType: 'real',
                coinAmount: 999,
                icon: '💰',
                permanent: false
            },
        ];
        
        this.dailyOffers = [];
        this.generateDailyOffers();
    }
    
    // Obter categorias disponíveis
    getCategories() {
        // Categorias de itens
        const categories = [
            { id: 'theme', name: 'Temas', icon: '🎨', description: 'Personalize a aparência do jogo' },
            { id: 'boost', name: 'Impulsos', icon: '⚡', description: 'Melhorias temporárias' },
            { id: 'cosmetic', name: 'Cosméticos', icon: '✨', description: 'Itens visuais especiais' },
            { id: 'utility', name: 'Utilitários', icon: '🛠️', description: 'Ferramentas úteis' },
            { id: 'skins', name: 'Skins de Naves', icon: '🚀', description: 'Personalize a aparência da sua nave' },
            { id: 'coin_packs', name: 'Pacotes de Moedas', icon: '💰', description: 'Compre moedas com dinheiro real' }
        ];
        return categories;
    }
    
    // Obter todos os itens
    getAllItems() {
        return this.items;
    }
    
    // Obter itens por categoria
    getItemsByCategory(categoryId) {
        if (categoryId === 'all') {
            return this.items;
        }
        return this.items.filter(item => item.category === categoryId);
    }
    
    // Obter item por ID
    getItemById(itemId) {
        return this.items.find(item => item.id === itemId);
    }
    
    // Gerar ofertas diárias
    generateDailyOffers() {
        const today = new Date().toDateString();
        const savedOffers = localStorage.getItem('dailyOffers');
        const savedDate = localStorage.getItem('dailyOffersDate');
        
        // Verificar se já temos ofertas para hoje
        if (savedOffers && savedDate === today) {
            this.dailyOffers = JSON.parse(savedOffers);
            return;
        }
        
        // Gerar novas ofertas
        const shuffledItems = [...this.items].sort(() => Math.random() - 0.5);
        const selectedItems = shuffledItems.slice(0, this.config.dailyOffers.count);
        
        this.dailyOffers = selectedItems.map(item => {
            const discount = Math.floor(
                Math.random() * (this.config.dailyOffers.discountMax - this.config.dailyOffers.discountMin + 1)
            ) + this.config.dailyOffers.discountMin;
            
            const originalPrice = item.price;
            const discountedPrice = Math.floor(originalPrice * (1 - discount / 100));
            
            return {
                ...item,
                isDailyOffer: true,
                originalPrice,
                price: discountedPrice,
                discount
            };
        });
        
        // Salvar no localStorage
        localStorage.setItem('dailyOffers', JSON.stringify(this.dailyOffers));
        localStorage.setItem('dailyOffersDate', today);
    }

    /**
     * Valida se usuário tem saldo suficiente via RPC server-side
     * @param {string} userId - UUID do usuário
     * @param {number} requiredAmount - Quantidade de moedas necessárias
     * @returns {Promise<boolean>} - true se tem saldo suficiente
     */
    async validateBalance(userId, requiredAmount) {
        try {
            const { data, error } = await supabase
                .rpc('validate_user_balance', {
                    p_user_id: userId,
                    p_required_amount: requiredAmount
                });

            if (error) {
                console.error('❌ Erro ao validar saldo server-side:', error);
                return false;
            }

            console.log('✅ Validação server-side:', data ? 'Saldo OK' : 'Saldo insuficiente');
            return data; // boolean
        } catch (error) {
            console.error('❌ Erro inesperado na validação:', error);
            return false;
        }
    }

    // Obter ofertas diárias
    getDailyOffers() {
        return this.dailyOffers;
    }

    /**
     * Compra item usando transação atômica via RPC
     * @param {string} itemId - ID do item a comprar
     * @param {string} itemType - Tipo do item (skin, boost, etc)
     * @param {number} price - Preço do item
     * @returns {Promise<Object>} - Resultado da compra
     */
    async buyItem(itemId, itemType, price) {
        // Validar item existe
        const item = this.getItemById(itemId);
        if (!item) {
            console.error('❌ Item não encontrado:', itemId);
            alert('Item não encontrado');
            return { success: false, error: 'Item não encontrado' };
        }

        // Usar dados reais do item
        const actualPrice = item.price;
        const actualType = item.category;

        const currentUser = this.rankingManager.getCurrentUser();

        if (!currentUser) {
            alert('Você precisa estar logado para comprar!');
            return { success: false };
        }

        // Proteção contra double-submit
        if (this.isPurchasing) {
            console.log('⏳ Compra já em andamento...');
            return { success: false };
        }

        this.isPurchasing = true;

        // Desabilitar botão se existir
        const button = document.querySelector(`[data-item-id="${itemId}"]`);
        if (button) button.disabled = true;

        try {
            console.log('🛒 Processando compra atômica via RPC...');

            // Chamar RPC function atômica
            const { data, error } = await supabase
                .rpc('atomic_purchase', {
                    p_user_id: currentUser.id,
                    p_item_id: itemId,
                    p_item_type: actualType,  // MUDANÇA: usar tipo real
                    p_price: actualPrice      // MUDANÇA: usar preço real
                });

            if (error) {
                console.error('❌ Erro na compra:', error);
                alert('Erro ao processar compra. Tente novamente.');
                return { success: false };
            }

            // RPC retorna JSON com success/error/remaining_coins
            if (!data.success) {
                alert(data.error);
                return { success: false };
            }

            if (data.success) {
                // Atualizar moedas localmente
                currentUser.coins = data.remaining_coins;
                this.rankingManager.setCurrentUser(currentUser);

                // Auto-selecionar skin se for uma skin
                if (item.category === 'skins') {
                    this.setSelectedSkin(itemId, item.skinFile, item.name);
                }

                console.log('✅ Compra concluída:', {
                    item: item.name,
                    newBalance: data.remaining_coins
                });

                // Feedback visual
                alert(data.message || `${item.name} comprado com sucesso!`);

                // Recarregar loja para atualizar UI
                if (typeof this.loadShopItems === 'function') {
                    await this.loadShopItems();
                }

                return {
                    success: true,
                    message: `${item.name} comprado com sucesso!`,
                    remainingCoins: data.remaining_coins
                };
            }

        } catch (error) {
            console.error('❌ Erro inesperado na compra:', error);
            alert('Erro inesperado. Tente novamente.');
            return { success: false };

        } finally {
            // SEMPRE liberar flag e botão
            this.isPurchasing = false;
            if (button) button.disabled = false;
        }
    }
    
    // Comprar item
    async purchaseItem(itemId) {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) {
            alert('Você precisa estar logado para comprar!');
            return { success: false, error: 'Usuário não autenticado' };
        }

        // Obter item
        const item = this.getItemById(itemId);
        if (!item) {
            alert('Item não encontrado!');
            return { success: false, error: 'Item não encontrado' };
        }

        // Validar tipo de item
        if (item.disabled || item.comingSoon) {
            alert('Este item ainda não está disponível!');
            return { success: false, error: 'Item indisponível' };
        }

        // Tratamento especial para coin packs (PIX)
        if (item.category === 'coin_packs' && item.priceType === 'real') {
            return await this.purchaseCoinPack(item, currentUser);
        }

        // Usar buyItem para compra atômica
        return await this.buyItem(itemId, item.category, item.price);
    }
    
    // Obter itens do usuário (com sincronização)
    async getUserItems() {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) {
            return [];
        }
        
        // Sincronizar inventário antes de retornar
        await this.inventorySync.syncInventory(currentUser.id);
        
        // Retornar itens do localStorage (já sincronizado)
        let userItems = this.inventorySync.getLocalInventory(currentUser.id);
        
        // Garantir que a nave padrão sempre esteja no inventário
        const hasDefaultSkin = userItems.some(item => item.item_id === 'skin_default');
        if (!hasDefaultSkin) {
            const defaultSkinItem = {
                id: Date.now(),
                player_id: currentUser.id,
                item_id: 'skin_default',
                item_name: 'Nave Padrão',
                item_category: 'skins',
                uses_remaining: null,
                is_permanent: true,
                purchased_at: new Date().toISOString()
            };
            
            // Adicionar ao inventário local
            userItems.push(defaultSkinItem);
            
            // Salvar no localStorage
            const localItems = JSON.parse(localStorage.getItem(`userItems_${currentUser.id}`) || '[]');
            localItems.push(defaultSkinItem);
            localStorage.setItem(`userItems_${currentUser.id}`, JSON.stringify(localItems));
            
            console.log('🛸 Nave padrão adicionada automaticamente ao inventário');
        }
        
        return userItems;
    }
    
    // Usar item do inventário (com sincronização)
    async useItem(itemId) {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) {
            return { success: false, error: 'Usuário não logado' };
        }
        
        // Usar item através do InventorySync
        const result = await this.inventorySync.useItemFromInventory(currentUser.id, itemId);
        
        if (result.success) {
            const shopItem = this.getItemById(itemId);
            return {
                success: true,
                item: shopItem,
                usesRemaining: result.usesRemaining
            };
        }
        
        return result;
    }
    
    // Converter duração em número de usos
    getUsesFromDuration(duration) {
        if (duration.includes('partida')) {
            const matches = duration.match(/\d+/);
            return matches ? parseInt(matches[0]) : 1;
        }
        return 1;
    }
    
    // Comprar pacote de moedas com dinheiro real
    async purchaseCoinPack(item, currentUser) {
        try {
            // Simular confirmação de pagamento (em produção, integrar com gateway de pagamento)
            const paymentConfirmed = await this.simulatePayment(item.price, 'BRL');
            
            if (!paymentConfirmed) {
                return { success: false, error: 'Pagamento não autorizado' };
            }
            
            // Adicionar moedas ao usuário
            const currentCoins = currentUser.coins || 0;
            const newCoins = currentCoins + item.coinAmount;
            
            // Atualizar no banco de dados
            const { error: updateError } = await supabase
                .from('players')
                .update({ coins: newCoins })
                .eq('id', currentUser.id);
                
            if (updateError) {
                console.error('Erro ao atualizar moedas:', updateError);
                return { success: false, error: 'Erro ao processar pagamento' };
            }
            
            // Atualizar usuário local
            currentUser.coins = newCoins;
            
            // Registrar a compra no histórico
            const purchaseRecord = {
                id: Date.now(),
                player_id: currentUser.id,
                item_id: item.id,
                item_name: item.name,
                price_paid: item.price,
                currency: 'BRL',
                coins_received: item.coinAmount,
                purchased_at: new Date().toISOString()
            };
            
            // Salvar histórico no localStorage
            const purchaseHistory = JSON.parse(localStorage.getItem(`coinPurchases_${currentUser.id}`) || '[]');
            purchaseHistory.push(purchaseRecord);
            localStorage.setItem(`coinPurchases_${currentUser.id}`, JSON.stringify(purchaseHistory));
            
            console.log(`💰 Pacote de moedas comprado: +${item.coinAmount} moedas por R$ ${item.price}`);
            
            return {
                success: true,
                item,
                coinsAdded: item.coinAmount,
                totalCoins: newCoins,
                paymentAmount: item.price,
                currency: 'BRL'
            };
            
        } catch (error) {
            console.error('Erro na compra do pacote de moedas:', error);
            return { success: false, error: 'Erro ao processar compra' };
        }
    }
    
    // Simular pagamento (em produção, integrar com gateway real)
    async simulatePayment(amount, currency) {
        // Simular delay de processamento
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simular confirmação (95% de sucesso)
        const success = Math.random() > 0.05;
        
        console.log(`💳 Simulando pagamento: ${currency} ${amount} - ${success ? 'APROVADO' : 'REJEITADO'}`);
        
        return success;
    }
    
    // === SISTEMA DE SKINS ===
    
    // Definir skin selecionada (FONTE ÚNICA DE DADOS)
    setSelectedSkin(skinId, skinFile, skinName = null) {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) {
            return false;
        }
        
        const selectedSkin = {
            skinId,
            skinFile,
            skinName: skinName || skinId,
            selectedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`selectedSkin_${currentUser.id}`, JSON.stringify(selectedSkin));
        console.log(`🚀 Skin selecionada definida: ${skinId}`);
        return true;
    }
    
    // Obter skin selecionada (FONTE ÚNICA DE DADOS)
    getSelectedSkin() {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) {
            return null;
        }
        
        const selectedSkinData = localStorage.getItem(`selectedSkin_${currentUser.id}`);
        if (selectedSkinData) {
            try {
                return JSON.parse(selectedSkinData);
            } catch (error) {
                console.error('❌ JSON inválido em selectedSkin, removendo dados corrompidos:', error);
                localStorage.removeItem(`selectedSkin_${currentUser.id}`);
                return null;
            }
        }
        
        return null;
    }
    
    // DEPRECATED: Manter para compatibilidade temporária
    setActiveSkin(skinId, skinFile) {
        console.warn('⚠️ setActiveSkin está deprecated, use setSelectedSkin');
        return this.setSelectedSkin(skinId, skinFile);
    }
    
    // DEPRECATED: Manter para compatibilidade temporária
    getActiveSkin() {
        console.warn('⚠️ getActiveSkin está deprecated, use getSelectedSkin');
        return this.getSelectedSkin();
    }
    
    // Obter skins do usuário
    async getUserSkins() {
        const userItems = await this.getUserItems();
        return userItems.filter(item => {
            const shopItem = this.getItemById(item.item_id);
            return shopItem && shopItem.category === 'skins';
        });
    }
    
    // Verificar se usuário possui uma skin
    async hasUserSkin(skinId) {
        const userSkins = await this.getUserSkins();
        return userSkins.some(item => item.item_id === skinId);
    }
    
    // Verificar se usuário possui um item específico
    async hasUserItem(itemId) {
        const userItems = await this.getUserItems();
        return userItems.some(item => {
            const shopItem = this.getItemById(item.item_id);
            // Para itens permanentes, verificar apenas se possui
            if (shopItem && shopItem.permanent) {
                return item.item_id === itemId;
            }
            // Para itens temporários, verificar se ainda tem usos
            return item.item_id === itemId && item.uses_remaining > 0;
        });
    }
    
    // Versão síncrona para verificação rápida (usando cache)
    hasUserItemSync(itemId) {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) {
            return false;
        }
        
        // Usar InventorySync para verificação
        return this.inventorySync.hasItemInInventory(currentUser.id, itemId);
    }
}

export default Shop;
import gameConfig from './GameConfig.js';
import RewardSystem from './RewardSystem.js';
import { supabase } from '../supabase.js';

class Shop {
    constructor(rankingManager) {
        this.rankingManager = rankingManager;
        this.gameConfig = gameConfig;
        this.rewardSystem = rankingManager ? rankingManager.getRewardSystem() : new RewardSystem();
        
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
                price: 45,
                icon: '🌈',
                permanent: true
            },
            {
                id: 'theme_retro',
                name: 'Tema Retrô',
                description: 'Visual clássico dos anos 80',
                category: 'theme',
                rarity: 'rare',
                price: 75,
                icon: '📺',
                permanent: true
            },
            
            // Boosts
            {
                id: 'boost_coins',
                name: 'Multiplicador de Moedas',
                description: 'Dobra as moedas ganhas por 5 partidas',
                category: 'boost',
                rarity: 'common',
                price: 25,
                icon: '💰',
                duration: '5 partidas'
            },
            {
                id: 'boost_xp',
                name: 'Boost de XP',
                description: '+50% de experiência por 3 partidas',
                category: 'boost',
                rarity: 'uncommon',
                price: 40,
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
                price: 200,
                icon: '🚀',
                permanent: true
            },
            {
                id: 'trail_rainbow',
                name: 'Rastro Arco-íris',
                description: 'Deixa um rastro colorido ao se mover',
                category: 'cosmetic',
                rarity: 'rare',
                price: 120,
                icon: '🌟',
                permanent: true
            },
            
            // Utilitários
            {
                id: 'shield_extra',
                name: 'Escudo Extra',
                description: 'Começa a partida com escudo adicional',
                category: 'utility',
                rarity: 'common',
                price: 15,
                icon: '🛡️',
                duration: '1 partida'
            },
            {
                id: 'life_bonus',
                name: 'Vida Bônus',
                description: 'Ganha uma vida extra no início',
                category: 'utility',
                rarity: 'uncommon',
                price: 30,
                icon: '❤️',
                duration: '1 partida'
            },
            
            // Skins de Naves
            {
                id: 'skin_milenium',
                name: 'Millennium Falcon',
                description: 'A icônica nave de Han Solo',
                category: 'skins',
                rarity: 'legendary',
                price: 250,
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
                price: 180,
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
                price: 120,
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
                price: 90,
                icon: '🟡',
                permanent: true,
                skinFile: 'yellowwing.png'
            }
        ];
        
        this.dailyOffers = [];
        this.generateDailyOffers();
    }
    
    // Obter categorias disponíveis
    getCategories() {
        return this.config.categories;
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
    
    // Obter ofertas diárias
    getDailyOffers() {
        return this.dailyOffers;
    }
    
    // Comprar item
    async purchaseItem(itemId) {
        const item = this.getItemById(itemId);
        console.log('Item a ser comprado:', item);

        if (!item) {
            return { success: false, error: 'Item não encontrado' };
        }
        
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) {
            return { success: false, error: 'Usuário não logado' };
        }
        
        const userCoins = currentUser.coins || 0;
        if (userCoins < item.price) {
            return { success: false, error: 'Moedas insuficientes' };
        }
        
        // Primeiro, verificar se a tabela player_items existe
        try {
            const { data: testData, error: testError } = await supabase
                .from('player_items')
                .select('*')
                .limit(1);
                
            if (testError) {
                console.error('Erro ao acessar tabela player_items:', testError);
                // Se a tabela não existe, vamos tentar criar o registro de compra de outra forma
                if (testError.code === 'PGRST116' || testError.message.includes('does not exist')) {
                    console.log('Tabela player_items não existe. Simulando compra...');
                    
                    // Apenas atualizar as moedas do usuário
                    const newCoins = userCoins - item.price;
                    const { error: updateError } = await supabase
                        .from('players')
                        .update({ coins: newCoins })
                        .eq('id', currentUser.id);
                        
                    if (updateError) {
                        console.error('Erro ao atualizar moedas:', updateError);
                        return { success: false, error: 'Erro ao processar pagamento' };
                    }
                    
                    // Salvar no localStorage como fallback
                    const userItems = JSON.parse(localStorage.getItem(`userItems_${currentUser.id}`) || '[]');
                    userItems.push({
                        id: Date.now(),
                        item_id: itemId,
                        player_id: currentUser.id,
                        uses_remaining: item.duration ? this.getUsesFromDuration(item.duration) : null,
                        is_permanent: item.permanent || false,
                        purchased_at: new Date().toISOString()
                    });
                    localStorage.setItem(`userItems_${currentUser.id}`, JSON.stringify(userItems));
                    
                    currentUser.coins = newCoins;
                    return {
                        success: true,
                        item,
                        remainingCoins: newCoins
                    };
                }
                return { success: false, error: 'Erro ao acessar banco de dados' };
            }
            
            console.log('Tabela player_items acessível:', testData);
        } catch (error) {
            console.error('Erro geral ao testar tabela:', error);
            return { success: false, error: 'Erro de conexão com banco de dados' };
        }
        
        try {
            // Dados para inserir na tabela player_items
            const itemData = {
                player_id: currentUser.id,
                item_id: itemId,
                uses_remaining: item.duration ? this.getUsesFromDuration(item.duration) : null,
                is_permanent: item.permanent || false,
                purchased_at: new Date().toISOString()
            };
            
            console.log('Dados do item a ser inserido:', itemData);
            console.log('Usuário atual:', currentUser);
            
            // Atualizar moedas do usuário
            const newCoins = userCoins - item.price;
            
            const { error: updateError } = await supabase
                .from('players')
                .update({ coins: newCoins })
                .eq('id', currentUser.id);
                
            if (updateError) {
                console.error('Erro ao atualizar moedas:', updateError);
                throw updateError;
            }
            
            // Salvar item no inventário
            const itemDataWithName = {
                ...itemData,
                item_name: item.name,
                item_category: item.category
            };
            
            const { data: insertData, error: insertError } = await supabase
                .from('player_items')
                .insert(itemDataWithName);
                
            if (insertError) {
                console.error('Erro detalhado na inserção:', insertError);
                console.error('Código do erro:', insertError.code);
                console.error('Mensagem:', insertError.message);
                console.error('Detalhes:', insertError.details);
                throw insertError;
            }
            
            console.log('Item inserido com sucesso:', insertData);
            
            // Atualizar usuário local
            currentUser.coins = newCoins;
            
            // Se for uma skin, salvar como skin ativa
            if (item.category === 'skins') {
                this.setActiveSkin(itemId, item.skinFile);
            }
            
            return {
                success: true,
                item,
                remainingCoins: newCoins
            };
            
        } catch (error) {
            console.error('Erro na compra:', error);
            return { success: false, error: 'Erro ao processar compra' };
        }
    }
    
    // Obter itens do usuário
    async getUserItems() {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) {
            return [];
        }
        
        try {
            const { data, error } = await supabase
                .from('player_items')
                .select('*')
                .eq('player_id', currentUser.id)
                .order('purchased_at', { ascending: false });
                
            if (error) {
                console.error('Erro ao carregar inventário do Supabase:', error);
                // Se a tabela não existe, usar localStorage como fallback
                if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                    console.log('Usando localStorage para inventário...');
                    const userItems = JSON.parse(localStorage.getItem(`userItems_${currentUser.id}`) || '[]');
                    return userItems.sort((a, b) => new Date(b.purchased_at) - new Date(a.purchased_at));
                }
                throw error;
            }
            
            return data || [];
            
        } catch (error) {
            console.error('Erro ao carregar inventário:', error);
            // Fallback para localStorage em caso de erro
            const userItems = JSON.parse(localStorage.getItem(`userItems_${currentUser.id}`) || '[]');
            return userItems.sort((a, b) => new Date(b.purchased_at) - new Date(a.purchased_at));
        }
    }
    
    // Usar item do inventário
    async useItem(itemId) {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) {
            return { success: false, error: 'Usuário não logado' };
        }
        
        try {
            // Buscar item no inventário
            const { data: userItems, error: fetchError } = await supabase
                .from('player_items')
                .select('*')
                .eq('player_id', currentUser.id)
                .eq('item_id', itemId)
                .gt('uses_remaining', 0)
                .limit(1);
                
            if (fetchError) {
                console.error('Erro ao buscar item no Supabase:', fetchError);
                // Fallback para localStorage
                if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
                    console.log('Usando localStorage para usar item...');
                    const userItems = JSON.parse(localStorage.getItem(`userItems_${currentUser.id}`) || '[]');
                    const userItem = userItems.find(item => 
                        item.item_id === itemId && 
                        item.uses_remaining && 
                        item.uses_remaining > 0
                    );
                    
                    if (!userItem) {
                        return { success: false, error: 'Item não encontrado ou sem usos' };
                    }
                    
                    userItem.uses_remaining -= 1;
                    localStorage.setItem(`userItems_${currentUser.id}`, JSON.stringify(userItems));
                    
                    const shopItem = this.getItemById(itemId);
                    return {
                        success: true,
                        item: shopItem,
                        usesRemaining: userItem.uses_remaining
                    };
                }
                throw fetchError;
            }
            
            if (!userItems || userItems.length === 0) {
                return { success: false, error: 'Item não encontrado ou sem usos' };
            }
            
            const userItem = userItems[0];
            const newUses = userItem.uses_remaining - 1;
            
            // Atualizar usos restantes
            const { error: updateError } = await supabase
                .from('player_items')
                .update({ uses_remaining: newUses })
                .eq('id', userItem.id);
                
            if (updateError) {
                throw updateError;
            }
            
            const shopItem = this.getItemById(itemId);
            
            return {
                success: true,
                item: shopItem,
                usesRemaining: newUses
            };
            
        } catch (error) {
            console.error('Erro ao usar item:', error);
            return { success: false, error: 'Erro ao usar item' };
        }
    }
    
    // Converter duração em número de usos
    getUsesFromDuration(duration) {
        if (duration.includes('partida')) {
            const matches = duration.match(/\d+/);
            return matches ? parseInt(matches[0]) : 1;
        }
        return 1;
    }
    
    // === SISTEMA DE SKINS ===
    
    // Definir skin ativa
    setActiveSkin(skinId, skinFile) {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) {
            return false;
        }
        
        const activeSkin = {
            skinId,
            skinFile,
            setAt: new Date().toISOString()
        };
        
        localStorage.setItem(`activeSkin_${currentUser.id}`, JSON.stringify(activeSkin));
        console.log(`🚀 Skin ativa definida: ${skinId}`);
        return true;
    }
    
    // Obter skin ativa
    getActiveSkin() {
        const currentUser = this.rankingManager.getCurrentUser();
        if (!currentUser) {
            return null;
        }
        
        const activeSkinData = localStorage.getItem(`activeSkin_${currentUser.id}`);
        if (activeSkinData) {
            return JSON.parse(activeSkinData);
        }
        
        return null;
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
        
        try {
            // Tentar usar localStorage como cache rápido
            const userItems = JSON.parse(localStorage.getItem(`userItems_${currentUser.id}`) || '[]');
            return userItems.some(item => {
                const shopItem = this.getItemById(item.item_id);
                // Para itens permanentes, verificar apenas se possui
                if (shopItem && shopItem.permanent) {
                    return item.item_id === itemId;
                }
                // Para itens temporários, verificar se ainda tem usos
                return item.item_id === itemId && item.uses_remaining > 0;
            });
        } catch (error) {
            console.error('Erro ao verificar item no cache:', error);
            return false;
        }
    }
}

export default Shop;
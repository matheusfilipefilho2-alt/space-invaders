import RankingManager from "./classes/RankingManager.js";
import Shop from "./classes/Shop.js";
import { NavigationHelper } from "./navigation.js";

// Inicializar managers
const rankingManager = new RankingManager();
const shop = new Shop(rankingManager);

// Estado da aplicação
let currentCategory = 'all';
let currentPurchaseItem = null;
let userItems = [];

// Elementos DOM
const userCoinsElement = document.getElementById('user-coins');
const categoriesContainer = document.getElementById('categories');
const dailyOffersGrid = document.getElementById('daily-offers-grid');
const itemsGrid = document.getElementById('items-grid');
const inventoryGrid = document.getElementById('inventory-grid');
const currentSectionTitle = document.getElementById('current-section-title');
const purchaseModal = document.getElementById('purchase-modal');
const resultModal = document.getElementById('result-modal');

// Verificar se usuário está logado
async function checkUser() {
    const currentUser = NavigationHelper.getCurrentUser();
    
    if (!currentUser) {
        alert('Você precisa estar logado para acessar a loja!');
        NavigationHelper.navigateToLogin();
        return false;
    }

    // Configurar usuários nos managers
    rankingManager.currentUser = currentUser;
    rankingManager.getRewardSystem().setUser(currentUser);
    
    console.log('👤 Usuário logado:', currentUser.username);
    return true;
}

// Atualizar display de moedas do usuário
function updateUserCoins() {
    const currentUser = rankingManager.getCurrentUser();
    if (currentUser) {
        const coins = currentUser.coins || 0;
        userCoinsElement.textContent = `🪙 ${shop.rewardSystem.formatCoins(coins)} moedas`;
    }
}

// Carregar e exibir categorias
function loadCategories() {
    const categories = shop.getCategories();
    
    categoriesContainer.innerHTML = categories.map(category => `
        <button class="category-btn ${category.id === currentCategory ? 'active' : ''}" 
                onclick="selectCategory('${category.id}')">
            ${category.icon} ${category.name}
        </button>
    `).join('');
}

// Selecionar categoria
window.selectCategory = function(categoryId) {
    currentCategory = categoryId;
    loadCategories(); // Recarregar para atualizar botão ativo
    loadItems();
    
    // Atualizar título da seção
    const categoryName = shop.getCategories().find(c => c.id === categoryId)?.name || 'Todos';
    currentSectionTitle.textContent = `🛍️ ${categoryName.toUpperCase()}`;
};

// Carregar e exibir ofertas diárias
function loadDailyOffers() {
    const dailyOffers = shop.getDailyOffers();
    
    if (dailyOffers.length === 0) {
        dailyOffersGrid.innerHTML = '<div class="loading">Nenhuma oferta diária hoje</div>';
        return;
    }

    dailyOffersGrid.innerHTML = dailyOffers.map(item => createItemCard(item, true)).join('');
}

// Carregar e exibir itens
function loadItems() {
    let items;
    
    if (currentCategory === 'all') {
        items = shop.getAllItems();
    } else {
        items = shop.getItemsByCategory(currentCategory);
    }

    if (items.length === 0) {
        itemsGrid.innerHTML = '<div class="loading">Nenhum item encontrado nesta categoria</div>';
        return;
    }

    itemsGrid.innerHTML = items.map(item => createItemCard(item, false)).join('');
}

// Criar card de item
function createItemCard(item, isDailyOffer = false) {
    const currentUser = rankingManager.getCurrentUser();
    const userCoins = currentUser ? (currentUser.coins || 0) : 0;
    const canAfford = userCoins >= item.price;
    const rarity = shop.rarities[item.rarity];
    const isOwned = userItems.some(userItem => userItem.item_id === item.id && userItem.is_permanent);

    return `
        <div class="shop-item ${item.rarity}" style="--rarity-color: ${rarity.color}">
            ${item.isDailyOffer ? `<div class="discount-badge">-${item.discount}%</div>` : ''}
            
            <div class="item-header">
                <div>
                    <div class="item-icon">${item.icon}</div>
                    <div class="item-rarity" style="background: ${rarity.color}">${rarity.name}</div>
                </div>
            </div>
            
            <div class="item-name">${item.name}</div>
            <div class="item-description">${item.description}</div>
            
            ${item.duration ? `<div style="font-size: 8px; color: #4ECDC4; margin-bottom: 10px;">⏱️ ${item.duration} usos</div>` : ''}
            ${item.permanent ? `<div style="font-size: 8px; color: #FFD700; margin-bottom: 10px;">♾️ Permanente</div>` : ''}
            
            <div class="item-footer">
                <div class="item-price ${item.isDailyOffer ? 'discounted' : ''}">
                    ${item.isDailyOffer ? `<div class="original-price">🪙 ${item.originalPrice}</div>` : ''}
                    <div>🪙 ${item.price}</div>
                </div>
                
                ${isOwned ? 
                    '<div class="owned-badge">POSSUI</div>' :
                    `<button class="buy-btn" ${!canAfford ? 'disabled' : ''} 
                             onclick="openPurchaseModal('${item.id}')">
                        ${canAfford ? 'COMPRAR' : 'SEM MOEDAS'}
                     </button>`
                }
            </div>
        </div>
    `;
}

// Abrir modal de confirmação de compra
window.openPurchaseModal = function(itemId) {
    const item = shop.getItemById(itemId);
    if (!item) return;

    currentPurchaseItem = item;
    
    document.getElementById('modal-title').textContent = `Comprar ${item.name}`;
    document.getElementById('modal-message').innerHTML = `
        <div style="margin: 15px 0;">
            <div style="font-size: 24px; margin-bottom: 10px;">${item.icon}</div>
            <div style="margin-bottom: 8px;">${item.description}</div>
            <div style="color: #FFD700; font-weight: bold;">Preço: 🪙 ${item.price}</div>
            ${item.duration ? `<div style="color: #4ECDC4; margin-top: 5px;">⏱️ ${item.duration} usos</div>` : ''}
            ${item.permanent ? `<div style="color: #FFD700; margin-top: 5px;">♾️ Permanente</div>` : ''}
        </div>
    `;
    
    purchaseModal.style.display = 'flex';
};

// Fechar modal de compra
window.closePurchaseModal = function() {
    purchaseModal.style.display = 'none';
    currentPurchaseItem = null;
};

// Confirmar compra
window.confirmPurchase = async function() {
    if (!currentPurchaseItem) return;

    try {
        closePurchaseModal();
        
        // Mostrar loading
        showResultModal('Comprando...', 'Processando sua compra...', false);
        
        const result = await shop.purchaseItem(currentPurchaseItem.id);
        
        if (result.success) {
            // Atualizar dados locais
            const updatedUser = rankingManager.getCurrentUser();
            NavigationHelper.setCurrentUser(updatedUser);
            updateUserCoins();
            
            // Recarregar inventário
            await loadInventory();
            
            // Recarregar itens para atualizar status
            loadItems();
            loadDailyOffers();
            
            showResultModal(
                '✅ Compra Realizada!', 
                `${result.item.name} foi adicionado ao seu inventário!<br>
                 <div style="margin-top: 10px; color: #4ECDC4;">
                    Moedas restantes: 🪙 ${result.remainingCoins}
                 </div>`,
                true
            );
            
        } else {
            showResultModal('❌ Erro na Compra', result.error, true);
        }
        
    } catch (error) {
        console.error('Erro na compra:', error);
        showResultModal('❌ Erro', 'Ocorreu um erro inesperado na compra', true);
    }
    
    currentPurchaseItem = null;
};

// Mostrar modal de resultado
function showResultModal(title, message, showOk = true) {
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-message').innerHTML = message;
    
    if (showOk) {
        resultModal.style.display = 'flex';
    }
}

// Fechar modal de resultado
window.closeResultModal = function() {
    resultModal.style.display = 'none';
};

// Carregar inventário do usuário
async function loadInventory() {
    try {
        userItems = await shop.getUserItems();
        
        if (userItems.length === 0) {
            inventoryGrid.innerHTML = `
                <div class="loading" style="grid-column: 1/-1;">
                    🎒 Seu inventário está vazio<br>
                    <div style="font-size: 8px; margin-top: 10px; color: #888;">
                        Compre itens para começar sua coleção!
                    </div>
                </div>
            `;
            return;
        }

        inventoryGrid.innerHTML = userItems.map(userItem => {
            const shopItem = shop.getItemById(userItem.item_id);
            if (!shopItem) return '';

            return `
                <div class="inventory-item">
                    <div class="item-icon" style="font-size: 24px;">${shopItem.icon}</div>
                    <div class="item-name" style="font-size: 10px; margin: 8px 0;">${shopItem.name}</div>
                    
                    ${userItem.uses_remaining ? 
                        `<div class="uses-remaining">${userItem.uses_remaining} usos restantes</div>` :
                        userItem.is_permanent ? 
                            '<div style="color: #FFD700; font-size: 8px;">♾️ Permanente</div>' :
                            ''
                    }
                    
                    ${userItem.uses_remaining && userItem.uses_remaining > 0 ?
                        `<button class="buy-btn" style="margin-top: 10px;" onclick="useItem('${userItem.item_id}')">
                            USAR
                         </button>` : 
                        ''
                    }
                    
                    <div style="font-size: 8px; color: #888; margin-top: 8px;">
                        Comprado em ${new Date(userItem.purchased_at).toLocaleDateString('pt-BR')}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Erro ao carregar inventário:', error);
        inventoryGrid.innerHTML = '<div class="loading">Erro ao carregar inventário</div>';
    }
}

// Usar item do inventário
window.useItem = async function(itemId) {
    try {
        const result = await shop.useItem(itemId);
        
        if (result.success) {
            showResultModal(
                '✅ Item Usado!',
                `${result.item.name} foi ativado!<br>
                 <div style="margin-top: 10px; color: #4ECDC4;">
                    ${result.usesRemaining > 0 ? `${result.usesRemaining} usos restantes` : 'Item consumido'}
                 </div>`,
                true
            );
            
            // Recarregar inventário
            await loadInventory();
            
        } else {
            showResultModal('❌ Erro', result.error, true);
        }
        
    } catch (error) {
        console.error('Erro ao usar item:', error);
        showResultModal('❌ Erro', 'Ocorreu um erro ao usar o item', true);
    }
};

// Inicializar loja
async function initializeShop() {
    console.log('🏪 Inicializando loja...');
    
    // Verificar usuário
    const userValid = await checkUser();
    if (!userValid) return;

    try {
        // Carregar dados
        updateUserCoins();
        loadCategories();
        loadDailyOffers();
        loadItems();
        await loadInventory();
        
        console.log('✅ Loja carregada com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao carregar loja:', error);
        itemsGrid.innerHTML = '<div class="loading">Erro ao carregar itens da loja</div>';
    }
}

// Event listeners para fechar modais clicando fora
window.addEventListener('click', (e) => {
    if (e.target === purchaseModal) {
        closePurchaseModal();
    }
    if (e.target === resultModal) {
        closeResultModal();
    }
});

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', initializeShop);
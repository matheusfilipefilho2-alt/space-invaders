import { supabase } from "./supabase.js";
import RankingManager from "./classes/RankingManager.js";
import Shop from "./classes/ShopClass.js";
import { NavigationHelper } from "./navigation.js";
import { walletUI } from "./components/WalletUI.js";
import abacatePayManager from "./classes/AbacatePayManager.js";
import ShopTabs from './components/shop/ShopTabs.js';
import ItemGrid from './components/shop/ItemGrid.js';
import ItemFilters from './components/shop/ItemFilters.js';
import toast from './utils/toast.js';

// Inicializar managers
const rankingManager = new RankingManager();
const shop = new Shop(rankingManager);

// Estado da aplicação
let currentCategory = 'all';
let currentPurchaseItem = null;
let userItems = [];

// Global variables
let currentPixPayment = null;
let expirationTimerInterval = null;
let pollingInterval = null;

// Component instances
let shopTabs = null;
let itemFilters = null;
let itemGrid = null;

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
    const isDisabled = item.disabled || false;
    const isComingSoon = item.comingSoon || false;

    // Verificar se é uma skin para mostrar a imagem
    const isSkin = item.category === 'skins' && item.skinFile;
    const skinImagePath = isSkin ? `src/assets/images/skins/${item.skinFile}` : null;

    return `
        <div class="shop-item ${item.rarity} ${isDisabled ? 'disabled' : ''}" style="--rarity-color: ${rarity.color}; ${isDisabled ? 'opacity: 0.6; filter: grayscale(50%);' : ''}">
            ${item.isDailyOffer ? `<div class="discount-badge">-${item.discount}%</div>` : ''}
            ${isComingSoon ? '<div class="coming-soon-badge">EM BREVE</div>' : ''}
            
            <div class="item-header">
                <div>
                    ${isSkin ? 
                        `<div class="skin-preview">
                            <img src="${skinImagePath}" alt="${item.name}" class="skin-image" 
                                 style="width: 48px; height: 48px; object-fit: contain; border-radius: 8px; background: rgba(255,255,255,0.1);" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                            <div class="item-icon" style="display: none;">${item.icon}</div>
                         </div>` : 
                        `<div class="item-icon">${item.icon}</div>`
                    }
                    <div class="item-rarity" style="background: ${rarity.color}">${rarity.name}</div>
                </div>
            </div>
            
            <div class="item-name">${item.name}</div>
            <div class="item-description">${item.description}</div>
            
            ${item.duration ? `<div style="font-size: 8px; color: #4ECDC4; margin-bottom: 10px;">⏱️ ${item.duration} usos</div>` : ''}
            ${item.permanent ? `<div style="font-size: 8px; color: #FFD700; margin-bottom: 10px;">♾️ Permanente</div>` : ''}
            
            <div class="item-footer">
                <div class="item-price ${item.isDailyOffer ? 'discounted' : ''}">
                    ${item.isDailyOffer ? `<div class="original-price">${item.priceType === 'real' ? 'R$' : '🪙'} ${item.originalPrice}</div>` : ''}
                    <div>${item.priceType === 'real' ? 'R$' : '🪙'} ${item.price}</div>
                    ${item.category === 'coin_packs' ? `<div style="font-size: 10px; color: #4ECDC4; margin-top: 4px;">+${item.coinAmount} moedas</div>` : ''}
                </div>
                
                ${isOwned ? 
                    '<div class="owned-badge">POSSUI</div>' :
                    isDisabled ? 
                        '<div class="disabled-badge">INDISPONÍVEL</div>' :
                        `<button class="buy-btn" ${(!canAfford && item.priceType !== 'real') ? 'disabled' : ''} 
                                 onclick="openPurchaseModal('${item.id}')">
                            ${item.priceType === 'real' ? 'COMPRAR' : (canAfford ? 'COMPRAR' : 'SEM MOEDAS')}
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
    
    // Verificar se o item está desabilitado
    if (item.disabled) {
        showResultModal('🚧 Item Indisponível', 'Este item estará disponível em breve!', true);
        return;
    }

    currentPurchaseItem = item;
    
    // Se for um pacote de moedas, abrir modal PIX
    if (item.category === 'coin_packs' && item.priceType === 'real') {
        openPixModal(item);
        return;
    }
    
    // Verificar se é uma skin para mostrar a imagem
    const isSkin = item.category === 'skins' && item.skinFile;
    const skinImagePath = isSkin ? `src/assets/images/skins/${item.skinFile}` : null;
    
    document.getElementById('modal-title').textContent = `Comprar ${item.name}`;
    document.getElementById('modal-message').innerHTML = `
        <div style="margin: 15px 0; text-align: center;">
            ${isSkin ? 
                `<div style="margin-bottom: 15px;">
                    <img src="${skinImagePath}" alt="${item.name}" 
                         style="width: 64px; height: 64px; object-fit: contain; border-radius: 12px; background: rgba(255,255,255,0.1); border: 2px solid #4ECDC4;" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                    <div style="font-size: 32px; margin-bottom: 10px; display: none;">${item.icon}</div>
                 </div>` : 
                `<div style="font-size: 32px; margin-bottom: 15px;">${item.icon}</div>`
            }
            <div style="margin-bottom: 12px; font-size: 14px;">${item.description}</div>
            <div style="color: #FFD700; font-weight: bold; font-size: 16px;">
                Preço: ${item.priceType === 'real' ? 'R$' : '🪙'} ${item.price}
            </div>
            ${item.category === 'coin_packs' ? `<div style="color: #4ECDC4; margin-top: 8px; font-size: 14px;">💰 Você receberá: ${item.coinAmount} moedas</div>` : ''}
            ${item.duration ? `<div style="color: #4ECDC4; margin-top: 8px;">⏱️ ${item.duration} usos</div>` : ''}
            ${item.permanent ? `<div style="color: #FFD700; margin-top: 8px;">♾️ Permanente</div>` : ''}
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
        purchaseModal.style.display = 'none';
        
        // Mostrar loading
        showResultModal('Comprando...', 'Processando sua compra...', false);
        
        const result = await shop.purchaseItem(currentPurchaseItem.id);

        console.log('Resultado da compra:', result);
        
        if (result.success) {
            // Atualizar dados locais
            const updatedUser = rankingManager.getCurrentUser();
            NavigationHelper.setCurrentUser(updatedUser);
            updateUserCoins();

            // Recarregar inventário
            await loadInventory();

            // Recarregar componentes se estiverem inicializados
            if (shopTabs) {
                // Refresh all tabs
                await initShopComponents();
            } else {
                // Legacy system
                loadItems();
                loadDailyOffers();
            }
            
            // Mensagem específica para pacotes de moedas
            if (result.item.category === 'coin_packs') {
                showResultModal(
                    '✅ Compra Realizada!', 
                    `Pagamento de R$ ${result.paymentAmount} aprovado!<br>
                     <div style="margin-top: 10px; color: #4ECDC4;">
                        💰 +${result.coinsAdded} moedas adicionadas<br>
                        🪙 Total de moedas: ${result.totalCoins}
                     </div>`,
                    true
                );
            } else {
                showResultModal(
                    '✅ Compra Realizada!', 
                    `${result.item.name} foi adicionado ao seu inventário!<br>
                     <div style="margin-top: 10px; color: #4ECDC4;">
                        Moedas restantes: 🪙 ${result.remainingCoins || result.totalCoins}
                     </div>`,
                    true
                );
            }
            
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

// Show processing modal
function showProcessingModal(message) {
    document.getElementById('result-title').textContent = 'Processando...';
    document.getElementById('result-message').innerHTML = message;
    resultModal.style.display = 'flex';
}

// Close processing modal
function closeProcessingModal() {
    resultModal.style.display = 'none';
}

// Copy PIX code to clipboard
window.copyPixCode = function() {
    const pixCodeInput = document.getElementById('pix-code');
    if (pixCodeInput) {
        pixCodeInput.select();
        document.execCommand('copy');
        showResultModal('✅ Copiado!', 'Código PIX copiado para a área de transferência!', true);
    }
};

/**
 * Open PIX modal and create real payment
 */
window.openPixModal = async function(item) {
    const currentUser = NavigationHelper.getCurrentUser();
    if (!currentUser) {
        showResultModal('❌ Erro', 'Você precisa estar logado.', true);
        return;
    }

    // Show processing modal
    showProcessingModal('Gerando PIX...');

    try {
        // Fetch fresh user data from database to ensure we have email and latest info
        const { data: freshUser, error: fetchError } = await supabase
            .from('players')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (fetchError || !freshUser) {
            closeProcessingModal();
            console.error('❌ Failed to fetch user data:', fetchError);
            showResultModal('❌ Erro', 'Erro ao carregar dados do usuário.', true);
            return;
        }

        // Update localStorage with fresh data
        NavigationHelper.setCurrentUser(freshUser);

        // Create real PIX payment with fresh user data
        const payment = await abacatePayManager.createPixPayment(
            item.id,
            freshUser
        );

        closeProcessingModal();

        // Store payment data
        currentPixPayment = payment;

        // Display modal with QR code
        displayPixModal(payment, item);

        // Start polling for payment status
        startPaymentPolling(payment.checkoutId, item);

    } catch (error) {
        closeProcessingModal();

        console.error('❌ Failed to create PIX:', error);

        // Show user-friendly error
        let message = 'Não foi possível gerar o PIX. Tente novamente.';

        if (error.message.includes('email')) {
            message = error.message;  // Show email validation errors
        } else if (error.message.includes('Network') || error.message.includes('timeout')) {
            message = 'Sem conexão. Verifique sua internet e tente novamente.';
        }

        showResultModal('❌ Erro ao Gerar PIX', message, true);
    }
};

/**
 * Display PIX modal with QR code and info
 */
function displayPixModal(payment, item) {
    let pixModal = document.getElementById('pix-modal');

    // Update modal content
    const itemIcon = pixModal.querySelector('.pix-item-icon');
    const itemName = pixModal.querySelector('.pix-item-details h4');
    const itemDesc = pixModal.querySelector('.pix-item-details p');
    const pixPrice = pixModal.querySelector('.pix-price');
    const pixCoins = pixModal.querySelector('.pix-coins');
    const qrCodeImg = pixModal.querySelector('#qr-code-container img');
    const pixCodeInput = pixModal.querySelector('#pix-code');

    if (itemIcon) itemIcon.textContent = item.icon;
    if (itemName) itemName.textContent = item.name;
    if (itemDesc) itemDesc.textContent = item.description;
    if (pixPrice) pixPrice.textContent = `R$ ${payment.amount.toFixed(2)}`;
    if (pixCoins) pixCoins.textContent = `💰 ${payment.coinAmount} moedas`;

    // Set QR code image (base64 PNG)
    if (qrCodeImg) {
        // Check if brCodeBase64 already includes the data URL prefix
        const qrCodeSrc = payment.brCodeBase64.startsWith('data:image/png;base64,')
            ? payment.brCodeBase64
            : `data:image/png;base64,${payment.brCodeBase64}`;
        qrCodeImg.src = qrCodeSrc;
        qrCodeImg.alt = 'QR Code PIX';
    }

    // Set copy-paste code
    if (pixCodeInput) {
        pixCodeInput.value = payment.brCode;
    }

    // Start expiration timer
    startExpirationTimer(payment.expiresAt);

    // Show modal
    pixModal.style.display = 'flex';
}

/**
 * Start countdown timer for PIX expiration
 */
function startExpirationTimer(expiresAt) {
    // Clear previous timer
    if (expirationTimerInterval) {
        clearInterval(expirationTimerInterval);
    }

    const timerElement = document.querySelector('.pix-expiration-timer');
    if (!timerElement) {
        console.warn('Timer element not found');
        return;
    }

    expirationTimerInterval = setInterval(() => {
        const now = new Date();
        const expires = new Date(expiresAt);
        const remaining = Math.max(0, expires - now);

        if (remaining === 0) {
            clearInterval(expirationTimerInterval);
            timerElement.textContent = '⏱️ Expirado';
            timerElement.style.color = '#ff6b6b';
            return;
        }

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        timerElement.textContent = `⏱️ Expira em ${minutes}:${seconds.toString().padStart(2, '0')}`;
        timerElement.style.color = '#4ECDC4';
    }, 1000);
}

/**
 * Close PIX modal
 */
window.closePixModal = function() {
    const pixModal = document.getElementById('pix-modal');
    if (pixModal) {
        pixModal.style.display = 'none';
    }

    // Clear timers
    if (expirationTimerInterval) {
        clearInterval(expirationTimerInterval);
    }

    if (pollingInterval) {
        clearInterval(pollingInterval);
    }

    currentPixPayment = null;
};

/**
 * Start polling for payment status (every 5 seconds)
 */
function startPaymentPolling(checkoutId, item) {
    console.log('🔄 Starting payment polling for:', checkoutId);

    // Clear previous polling
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }

    // Poll every 5 seconds
    pollingInterval = setInterval(async () => {
        try {
            const status = await abacatePayManager.checkPaymentStatus(checkoutId);

            console.log('📊 Payment status:', status);

            if (status === 'paid') {
                // Payment confirmed!
                clearInterval(pollingInterval);
                closePixModal();

                // Reload player coins from database
                await reloadPlayerCoins();

                // Show success modal
                showResultModal(
                    '✅ Pagamento Aprovado!',
                    `<div style="text-align: center;">
                        <div style="font-size: 48px; margin: 20px 0;">🎉</div>
                        <div style="color: #4ECDC4; font-size: 20px; font-weight: bold; margin: 10px 0;">
                            +${item.coinAmount} moedas creditadas!
                        </div>
                        <div style="color: #999; font-size: 14px; margin-top: 10px;">
                            As moedas já estão disponíveis em sua conta.
                        </div>
                    </div>`,
                    false
                );

                // Reload offers and items
                loadDailyOffers();
                loadItems();
            }

            if (status === 'expired') {
                // PIX expired
                clearInterval(pollingInterval);
                closePixModal();

                showResultModal(
                    '⏱️ PIX Expirado',
                    `<div style="text-align: center;">
                        <div style="color: #ff6b6b; margin: 10px 0;">
                            O QR Code expirou após 30 minutos.
                        </div>
                        <div style="color: #999; font-size: 14px; margin-top: 10px;">
                            Deseja gerar um novo PIX?
                        </div>
                    </div>
                    <div style="margin-top: 20px;">
                        <button class="modal-btn confirm" onclick="closeResultModal(); openPixModal(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                            🔄 Gerar Novo PIX
                        </button>
                    </div>`,
                    false
                );
            }

        } catch (error) {
            console.error('❌ Polling error:', error);
            // Continue polling (don't stop on transient errors)
        }
    }, 5000);  // Poll every 5 seconds
}

/**
 * Reload player coins from database
 */
async function reloadPlayerCoins() {
    try {
        const currentUser = NavigationHelper.getCurrentUser();
        if (!currentUser) return;

        // Fetch updated coins from Supabase
        const { supabase } = await import('./supabase.js');
        const { data, error } = await supabase
            .from('players')
            .select('coins')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            console.error('❌ Failed to reload coins:', error);
            return;
        }

        // Update local user object
        currentUser.coins = data.coins;

        // Update UI
        updateUserCoins();

        console.log('✅ Coins reloaded:', data.coins);

    } catch (error) {
        console.error('❌ Error reloading coins:', error);
    }
}

// Carregar inventário do usuário
async function loadInventory() {
    try {
        userItems = await shop.getUserItems();
        console.log('📦 Itens do usuário carregados:', userItems);

        // Update ShopTabs component if initialized
        if (shopTabs) {
            shopTabs.setUserItems(userItems);
            console.log('✅ ShopTabs inventory updated');
        }

        // Legacy inventory display (fallback) - only if inventoryGrid exists
        if (inventoryGrid) {
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
            console.log(`🔍 Processando item ${userItem.item_id}:`, { userItem, shopItem });
            if (!shopItem) {
                console.log(`❌ Item ${userItem.item_id} não encontrado na loja`);
                return '';
            }

            // Verificar se é uma skin para mostrar preview e botão usar
            const isSkin = shopItem.category === 'skins' && shopItem.skinFile;
            const skinImagePath = isSkin ? `src/assets/images/skins/${shopItem.skinFile}` : null;
            
            return `
                <div class="inventory-item">
                    ${isSkin ? 
                        `<div class="skin-preview" style="margin-bottom: 8px;">
                            <img src="${skinImagePath}" alt="${shopItem.name}" 
                                 style="width: 32px; height: 32px; object-fit: contain; border-radius: 6px; background: rgba(255,255,255,0.1);" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                            <div class="item-icon" style="font-size: 24px; display: none;">${shopItem.icon}</div>
                         </div>` : 
                        `<div class="item-icon" style="font-size: 24px;">${shopItem.icon}</div>`
                    }
                    <div class="item-name" style="font-size: 10px; margin: 8px 0;">${shopItem.name}</div>
                    
                    ${userItem.uses_remaining ? 
                        `<div class="uses-remaining">${userItem.uses_remaining} usos restantes</div>` :
                        userItem.is_permanent ? 
                            '<div style="color: #FFD700; font-size: 8px;">♾️ Permanente</div>' :
                            ''
                    }
                    
                    ${/* Botão USAR para itens com usos restantes OU skins permanentes (exceto life_bonus) */ ''}
                    ${(() => {
                        // Não mostrar botão USAR para o item life_bonus
                        if (userItem.item_id === 'life_bonus') {
                            return '';
                        }
                        
                        const shouldShowButton = (userItem.uses_remaining && userItem.uses_remaining > 0) || (isSkin && userItem.is_permanent);
                        console.log(`🔍 Debug botão para item ${userItem.item_id}:`, {
                            isSkin,
                            is_permanent: userItem.is_permanent,
                            uses_remaining: userItem.uses_remaining,
                            shouldShowButton,
                            shopItem: shopItem ? shopItem.name : 'não encontrado'
                        });
                        
                        return shouldShowButton ?
                            `<button class="buy-btn" style="margin-top: 10px;" onclick="${isSkin ? `useSkin('${userItem.item_id}')` : `useItem('${userItem.item_id}')`}">
                                ${isSkin ? 'USAR SKIN' : 'USAR'}
                             </button>` : 
                            '';
                    })()
                    }
                    
                    <div style="font-size: 8px; color: #888; margin-top: 8px;">
                        Comprado em ${new Date(userItem.purchased_at).toLocaleDateString('pt-BR')}
                    </div>
                </div>
            `;
            }).join('');
        }

    } catch (error) {
        console.error('Erro ao carregar inventário:', error);
        if (inventoryGrid) {
            inventoryGrid.innerHTML = '<div class="loading">Erro ao carregar inventário</div>';
        }
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

// Usar skin do inventário (SISTEMA UNIFICADO)
window.useSkin = async function(itemId) {
    console.log('🎯 useSkin chamada com itemId:', itemId);
    
    try {
        const shopItem = shop.getItemById(itemId);
        console.log('📦 Item encontrado:', shopItem);
        
        if (!shopItem || shopItem.category !== 'skins') {
            console.log('❌ Item não é uma skin válida');
            showResultModal('❌ Erro', 'Item não é uma skin válida', true);
            return;
        }

        const currentUser = rankingManager.getCurrentUser();
        console.log('👤 Usuário atual:', currentUser);
        
        if (!currentUser) {
            console.log('❌ Usuário não encontrado');
            showResultModal('❌ Erro', 'Usuário não encontrado', true);
            return;
        }

        // MIGRAÇÃO: Limpar dados antigos de activeSkin se existirem
        const oldActiveSkinKey = `activeSkin_${currentUser.id}`;
        if (localStorage.getItem(oldActiveSkinKey)) {
            console.log('🔄 Removendo dados antigos de activeSkin...');
            localStorage.removeItem(oldActiveSkinKey);
        }
        
        // Tratamento especial para a nave padrão
        if (itemId === 'skin_default') {
            // Para a nave padrão, limpar a skin selecionada para voltar ao padrão
            localStorage.removeItem(`selectedSkin_${currentUser.id}`);
            console.log('🛸 Voltando para a nave padrão (removendo selectedSkin)');
            
            showResultModal(
                '✅ Nave Padrão Aplicada!',
                `Você voltou para a nave clássica original!<br>
                 <div style="margin-top: 10px; color: #4ECDC4;">
                    A nave padrão será aplicada na próxima partida.
                 </div>`,
                true
            );
        } else {
            // Para outras skins, usar o sistema unificado
            const skinData = {
                skinId: shopItem.id,
                skinFile: shopItem.skinFile,
                skinName: shopItem.name,
                selectedAt: new Date().toISOString()
            };
            
            console.log('💾 Salvando skin no localStorage (fonte única):', skinData);
            
            try {
                localStorage.setItem(`selectedSkin_${currentUser.id}`, JSON.stringify(skinData));
                
                // Verificar se foi salvo corretamente
                const savedData = localStorage.getItem(`selectedSkin_${currentUser.id}`);
                const parsedData = JSON.parse(savedData);
                
                if (parsedData.skinId === shopItem.id) {
                    console.log('✅ Skin salva e verificada com sucesso');
                    
                    showResultModal(
                        '✅ Skin Aplicada!',
                        `${shopItem.name} foi definida como sua skin atual!<br>
                         <div style="margin-top: 10px; color: #4ECDC4;">
                            A nova skin será aplicada na próxima partida.
                         </div>`,
                        true
                    );
                    
                    console.log(`🎨 Skin aplicada: ${shopItem.name} (${shopItem.skinFile})`);
                } else {
                    throw new Error('Dados salvos não conferem');
                }
                
            } catch (saveError) {
                console.error('❌ Erro ao salvar skin:', saveError);
                showResultModal('❌ Erro', 'Erro ao salvar a skin selecionada', true);
            }
        }
        
        // Recarregar inventário para refletir mudanças
        await loadInventory();
        
    } catch (error) {
        console.error('💥 Erro ao aplicar skin:', error);
        showResultModal('❌ Erro', 'Ocorreu um erro ao aplicar a skin', true);
    }
};

/**
 * Initialize new tab-based shop system
 */
async function initShopComponents() {
    try {
        console.log('🚀 Initializing new shop component system...');

        // Load user items first
        userItems = await shop.getUserItems();
        console.log('📦 User items loaded:', userItems);

        // Initialize ShopTabs component
        shopTabs = new ShopTabs({
            shop: shop,
            rankingManager: rankingManager,
            userItems: userItems,
            currentCategory: currentCategory,
            onItemClick: (itemId) => {
                console.log('🛒 Item clicked:', itemId);
                openPurchaseModal(itemId);
            },
            onTabChange: (tabId) => {
                console.log('📑 Tab changed to:', tabId);
                // Hide/show filters based on tab
                const filtersContainer = document.getElementById('shop-filters-container');
                if (filtersContainer) {
                    // Only show filters on Store tab
                    filtersContainer.style.display = tabId === 'store' ? 'block' : 'none';
                }
            }
        });

        // Render tabs
        const tabsContainer = document.getElementById('shop-tabs-container');
        if (tabsContainer) {
            const tabsElement = shopTabs.render();
            tabsContainer.appendChild(tabsElement);
            console.log('✅ ShopTabs rendered');
        }

        // Initialize ItemFilters component (only for Store tab)
        itemFilters = new ItemFilters({
            rarities: shop.rarities,
            onFiltersChange: (filterState) => {
                console.log('🔍 Filters changed:', filterState);
                applyFiltersToStore(filterState);
            }
        });

        // Render filters
        const filtersContainer = document.getElementById('shop-filters-container');
        if (filtersContainer) {
            const filtersElement = itemFilters.render();
            filtersContainer.appendChild(filtersElement);
            // Initially hide filters (will show when Store tab is active)
            filtersContainer.style.display = 'none';
            console.log('✅ ItemFilters rendered');
        }

        // Make shopTabs globally accessible for item click handlers
        window.shopTabs = shopTabs;

        console.log('✅ Shop component system initialized successfully!');
    } catch (error) {
        console.error('❌ Error initializing shop components:', error);
        // Fall back to legacy system
        document.querySelector('.shop-legacy-content').style.display = 'block';
        toast('Erro ao carregar nova interface. Usando sistema legado.', 'error');
    }
}

/**
 * Apply filters to store tab content
 */
function applyFiltersToStore(filterState) {
    if (!shopTabs || !itemFilters) return;

    // Get all items or filtered by category
    let items;
    if (currentCategory === 'all') {
        items = shop.getAllItems();
    } else {
        items = shop.getItemsByCategory(currentCategory);
    }

    // Apply filters
    const filteredItems = itemFilters.filterItems(items);
    console.log(`🔍 Filtered items: ${filteredItems.length} of ${items.length}`);

    // Update store tab content
    shopTabs.tabDefinitions[1].content = generateStoreContentWithItems(filteredItems);

    // Refresh the store tab if it's active
    if (shopTabs.uiTabs && shopTabs.uiTabs.activeIndex === 1) {
        const pane = shopTabs.uiTabs.contentPanes[1];
        if (pane) {
            pane.innerHTML = '';
            pane.appendChild(shopTabs.tabDefinitions[1].content);
        }
    }
}

/**
 * Generate store content with filtered items
 */
function generateStoreContentWithItems(items) {
    if (items.length === 0) {
        return '<div class="loading">Nenhum item encontrado com os filtros aplicados</div>';
    }

    const grid = document.createElement('div');
    grid.className = 'shop-grid';

    items.forEach((item) => {
        const card = shopTabs._createItemCard(item, false);
        grid.appendChild(card);
    });

    return grid;
}

// Inicializar aplicação
async function init() {
    const userLoggedIn = await checkUser();
    if (!userLoggedIn) return;

    // Initialize AbacatePay (create products if needed)
    try {
        await abacatePayManager.initialize();
    } catch (error) {
        console.error('❌ Failed to initialize AbacatePay:', error);
        // Continue anyway - show error modal if user tries to buy
    }

    // Initialize new component system
    await initShopComponents();

    // Update user coins display
    updateUserCoins();

    // Legacy system as fallback (commented out by default)
    // loadCategories();
    // loadDailyOffers();
    // loadItems();
    // loadInventory();
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
document.addEventListener('DOMContentLoaded', init);
import RankingManager from "./classes/RankingManager.js";
import Shop from "./classes/ShopClass.js";
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
            
            // Recarregar itens para atualizar status
            loadItems();
            loadDailyOffers();
            
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

// Abrir modal PIX para pacotes de moedas
window.openPixModal = function(item) {
    // Criar modal PIX se não existir
    let pixModal = document.getElementById('pix-modal');
    if (!pixModal) {
        pixModal = document.createElement('div');
        pixModal.id = 'pix-modal';
        pixModal.className = 'modal';
        pixModal.innerHTML = `
            <div class="modal-content pix-modal-content">
                <h3>💳 Pagamento PIX</h3>
                <div class="pix-content">
                    <div class="pix-item-info">
                        <div class="pix-item-icon">${item.icon}</div>
                        <div class="pix-item-details">
                            <h4>${item.name}</h4>
                            <p>${item.description}</p>
                            <div class="pix-price">R$ ${item.price}</div>
                            <div class="pix-coins">💰 ${item.coinAmount} moedas</div>
                        </div>
                    </div>
                    
                    <div class="pix-qr-section">
                        <div class="pix-qr-code">
                            <div id="qr-code-container"></div>
                        </div>
                        <p class="pix-instruction">Escaneie o QR Code com seu app do banco</p>
                        <div class="pix-copy-paste">
                            <p class="pix-copy-label">Ou copie o código PIX:</p>
                            <div class="pix-code-container">
                                <input type="text" id="pix-code" value="00020126580014br.gov.bcb.pix013636401234-5678-9012-3456-789012345678520400005303986540${item.price}5802BR5925Space Invaders Loja6009SAO PAULO62070503***6304" readonly />
                                <button class="copy-btn" onclick="copyPixCode()">📋</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="pix-form">
                        <label for="pix-user-name">Nome do usuário:</label>
                        <input type="text" id="pix-user-name" placeholder="Digite seu nome completo" required />
                    </div>
                </div>
                
                <div class="modal-buttons">
                    <button class="modal-btn confirm" onclick="confirmPixPayment()">CONFIRMAR PAGAMENTO</button>
                    <button class="modal-btn cancel" onclick="closePixModal()">CANCELAR</button>
                </div>
            </div>
        `;
        document.body.appendChild(pixModal);
    }
    
    // Atualizar informações do item no modal
    const itemIcon = pixModal.querySelector('.pix-item-icon');
    const itemName = pixModal.querySelector('.pix-item-details h4');
    const itemDesc = pixModal.querySelector('.pix-item-details p');
    const itemPrice = pixModal.querySelector('.pix-price');
    const itemCoins = pixModal.querySelector('.pix-coins');
    
    itemIcon.textContent = item.icon;
    itemName.textContent = item.name;
    itemDesc.textContent = item.description;
    itemPrice.textContent = `R$ ${item.price}`;
    itemCoins.textContent = `💰 ${item.coinAmount} moedas`;
    
    // Atualizar código PIX com o preço correto
    const pixCode = `00020126330014br.gov.bcb.pix01111414050879552040000530398654044.995802BR5925Matheus Felipe Marinho Do6009Sao Paulo62290525REC68B0DA804C95901388581863042EE`;
    document.getElementById('pix-code').value = pixCode;
    
    // Gerar QR Code
    generateQRCode(pixCode);
    
    // Limpar campo de nome
    document.getElementById('pix-user-name').value = '';
    
    // Mostrar modal
    pixModal.style.display = 'flex';
};

// Fechar modal PIX
window.closePixModal = function() {
    const pixModal = document.getElementById('pix-modal');
    if (pixModal) {
        pixModal.style.display = 'none';
    }
};

// Confirmar pagamento PIX
window.confirmPixPayment = function() {
    const userName = document.getElementById('pix-user-name').value.trim();
    
    if (!userName) {
        showResultModal('⚠️ Campo Obrigatório', 'Por favor, digite seu nome completo.', true);
        return;
    }
    
    // Fechar modal PIX
    closePixModal();
    
    // Mostrar modal de processamento
    showProcessingModal();
    
    // Simular processamento (em produção, aqui seria a integração real com PIX)
    setTimeout(() => {
        closeProcessingModal();
        showResultModal(
            '⏳ Pagamento em Processamento', 
            `Obrigado, ${userName}! Seu pagamento PIX está sendo processado. As moedas serão creditadas em sua conta em até 5 minutos.`,
            false
        );
    }, 3000);
};

// Mostrar modal de processamento
function showProcessingModal() {
    let processingModal = document.getElementById('processing-modal');
    if (!processingModal) {
        processingModal = document.createElement('div');
        processingModal.id = 'processing-modal';
        processingModal.className = 'modal';
        processingModal.innerHTML = `
            <div class="modal-content processing-modal-content">
                <div class="processing-animation">
                    <div class="spinner"></div>
                </div>
                <h3>🔄 Processando Pagamento</h3>
                <p>Aguarde enquanto processamos sua transação PIX...</p>
            </div>
        `;
        document.body.appendChild(processingModal);
    }
    processingModal.style.display = 'flex';
}

// Fechar modal de processamento
function closeProcessingModal() {
    const processingModal = document.getElementById('processing-modal');
    if (processingModal) {
        processingModal.style.display = 'none';
    }
}

// Gerar QR Code PIX
function generateQRCode(pixCode) {
    const qrContainer = document.getElementById('qr-code-container');
    qrContainer.innerHTML = '';
    
    // Usar imagem QR Code local
    const qrImg = document.createElement('img');
    qrImg.src = 'src/assets/images/pix/qrcode_pix.png';
    qrImg.alt = 'QR Code PIX';
    qrImg.style.width = '150px';
    qrImg.style.height = '150px';
    qrImg.style.border = '2px solid #4ECDC4';
    qrImg.style.borderRadius = '8px';
    
    qrContainer.appendChild(qrImg);
}

// Copiar código PIX
window.copyPixCode = function() {
    const pixCodeInput = document.getElementById('pix-code');
    pixCodeInput.select();
    pixCodeInput.setSelectionRange(0, 99999); // Para dispositivos móveis
    
    try {
        document.execCommand('copy');
        showResultModal('✅ Copiado!', 'Código PIX copiado para a área de transferência.', false);
    } catch (err) {
        // Fallback para navegadores mais antigos
        navigator.clipboard.writeText(pixCodeInput.value).then(() => {
            showResultModal('✅ Copiado!', 'Código PIX copiado para a área de transferência.', false);
        }).catch(() => {
            showResultModal('❌ Erro', 'Não foi possível copiar o código. Tente selecionar e copiar manualmente.', true);
        });
    }
}

// Carregar inventário do usuário
async function loadInventory() {
    try {
        userItems = await shop.getUserItems();
        console.log('📦 Itens do usuário carregados:', userItems);
        
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
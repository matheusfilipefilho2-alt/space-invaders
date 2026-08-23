import UITabs from '../ui/Tabs.js';

/**
 * ShopTabs - Shop-specific wrapper for UITabs component
 * Manages 3 tabs: Offers, Store, Inventory
 * Handles content generation for each tab
 */
class ShopTabs {
    constructor(options = {}) {
        this.shop = options.shop;
        this.rankingManager = options.rankingManager;
        this.onItemClick = options.onItemClick || (() => {});
        this.onTabChange = options.onTabChange || (() => {});

        // Store user items for inventory tab
        this.userItems = options.userItems || [];
        this.currentCategory = options.currentCategory || 'all';

        // Initialize UITabs
        this.uiTabs = null;
        this.element = null;

        // Tab definitions
        this.tabDefinitions = [
            { id: 'offers', label: '🎁 Ofertas Diárias', content: null },
            { id: 'store', label: '🛍️ Loja', content: null },
            { id: 'inventory', label: '🎒 Inventário', content: null }
        ];
    }

    /**
     * Render ShopTabs with all content
     */
    render() {
        // Generate content for all tabs
        this.tabDefinitions[0].content = this.generateOffersContent();
        this.tabDefinitions[1].content = this.generateStoreContent();
        this.tabDefinitions[2].content = this.generateInventoryContent();

        // Create UITabs instance
        this.uiTabs = new UITabs({
            tabs: this.tabDefinitions,
            activeIndex: 0,
            onChange: (index) => this._handleTabChange(index)
        });

        // Render and store element
        this.element = this.uiTabs.render();
        return this.element;
    }

    /**
     * Generate content for Offers tab (daily offers grid)
     */
    generateOffersContent() {
        if (!this.shop) {
            return '<div class="loading">Carregando ofertas...</div>';
        }

        const dailyOffers = this.shop.getDailyOffers();

        if (dailyOffers.length === 0) {
            return '<div class="loading">Nenhuma oferta diária disponível</div>';
        }

        const grid = document.createElement('div');
        grid.className = 'shop-grid';

        dailyOffers.forEach((item) => {
            const card = this._createItemCard(item, true);
            grid.appendChild(card);
        });

        return grid;
    }

    /**
     * Generate content for Store tab (filtered items grid)
     */
    generateStoreContent() {
        if (!this.shop) {
            return '<div class="loading">Carregando loja...</div>';
        }

        let items;
        if (this.currentCategory === 'all') {
            items = this.shop.getAllItems();
        } else {
            items = this.shop.getItemsByCategory(this.currentCategory);
        }

        if (items.length === 0) {
            return '<div class="loading">Nenhum item encontrado nesta categoria</div>';
        }

        const grid = document.createElement('div');
        grid.className = 'shop-grid';

        items.forEach((item) => {
            const card = this._createItemCard(item, false);
            grid.appendChild(card);
        });

        return grid;
    }

    /**
     * Generate content for Inventory tab (user items)
     */
    generateInventoryContent() {
        if (!this.shop || !this.userItems) {
            return '<div class="loading">Carregando inventário...</div>';
        }

        if (this.userItems.length === 0) {
            return `
                <div class="loading" style="grid-column: 1/-1;">
                    🎒 Seu inventário está vazio<br>
                    <div style="font-size: 8px; margin-top: 10px; color: #888;">
                        Compre itens para começar sua coleção!
                    </div>
                </div>
            `;
        }

        const grid = document.createElement('div');
        grid.className = 'inventory-grid';

        this.userItems.forEach((userItem) => {
            const shopItem = this.shop.getItemById(userItem.item_id);
            if (!shopItem) return;

            const card = this._createInventoryCard(userItem, shopItem);
            grid.appendChild(card);
        });

        return grid;
    }

    /**
     * Create item card element for shop display
     */
    _createItemCard(item, isDailyOffer = false) {
        const card = document.createElement('div');
        card.className = `shop-item ${item.rarity}`;

        const currentUser = this.rankingManager?.getCurrentUser();
        const userCoins = currentUser ? (currentUser.coins || 0) : 0;
        const canAfford = userCoins >= item.price;
        const rarity = this.shop?.rarities[item.rarity];
        const isOwned = this.userItems.some(
            (userItem) => userItem.item_id === item.id && userItem.is_permanent
        );
        const isDisabled = item.disabled || false;
        const isComingSoon = item.comingSoon || false;

        // Set CSS variables for styling
        if (rarity) {
            card.style.setProperty('--rarity-color', rarity.color);
        }

        if (isDisabled) {
            card.style.opacity = '0.6';
            card.style.filter = 'grayscale(50%)';
            card.classList.add('disabled');
        }

        // Build card content
        let html = '';

        // Badges
        if (item.isDailyOffer) {
            html += `<div class="discount-badge">-${item.discount}%</div>`;
        }
        if (isComingSoon) {
            html += '<div class="coming-soon-badge">EM BREVE</div>';
        }

        // Item header with icon/image
        html += '<div class="item-header"><div>';
        if (item.category === 'skins' && item.skinFile) {
            html += `
                <div class="skin-preview">
                    <img src="src/assets/images/skins/${item.skinFile}" alt="${item.name}"
                         class="skin-image"
                         style="width: 48px; height: 48px; object-fit: contain; border-radius: 8px; background: rgba(255,255,255,0.1);"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                    <div class="item-icon" style="display: none;">${item.icon}</div>
                </div>
            `;
        } else {
            html += `<div class="item-icon">${item.icon}</div>`;
        }

        html += `<div class="item-rarity" style="background: ${rarity?.color || '#999'}">${rarity?.name || 'Comum'}</div>`;
        html += '</div></div>';

        // Item details
        html += `<div class="item-name">${item.name}</div>`;
        html += `<div class="item-description">${item.description}</div>`;

        // Duration/permanent indicators
        if (item.duration) {
            html += `<div style="font-size: 8px; color: #4ECDC4; margin-bottom: 10px;">⏱️ ${item.duration}</div>`;
        }
        if (item.permanent) {
            html += `<div style="font-size: 8px; color: #FFD700; margin-bottom: 10px;">♾️ Permanente</div>`;
        }

        // Footer with price and button
        html += '<div class="item-footer">';
        html += '<div class="item-price ' + (item.isDailyOffer ? 'discounted' : '') + '">';

        if (item.isDailyOffer) {
            const pricePrefix = item.priceType === 'real' ? 'R$' : '🪙';
            html += `<div class="original-price">${pricePrefix} ${item.originalPrice}</div>`;
        }

        const pricePrefix = item.priceType === 'real' ? 'R$' : '🪙';
        html += `<div>${pricePrefix} ${item.price}</div>`;

        if (item.category === 'coin_packs') {
            html += `<div style="font-size: 10px; color: #4ECDC4; margin-top: 4px;">+${item.coinAmount} moedas</div>`;
        }

        html += '</div>';

        // Buy button or owned badge
        if (isOwned) {
            html += '<div class="owned-badge">POSSUI</div>';
        } else if (isDisabled) {
            html += '<div class="disabled-badge">INDISPONÍVEL</div>';
        } else {
            const isDisabledBtn = !canAfford && item.priceType !== 'real';
            const btnText = item.priceType === 'real' ? 'COMPRAR' : (canAfford ? 'COMPRAR' : 'SEM MOEDAS');
            html += `<button class="buy-btn" ${isDisabledBtn ? 'disabled' : ''} onclick="shopTabs.onItemClick('${item.id}')">${btnText}</button>`;
        }

        html += '</div>';
        card.innerHTML = html;

        return card;
    }

    /**
     * Create inventory card element
     */
    _createInventoryCard(userItem, shopItem) {
        const card = document.createElement('div');
        card.className = 'inventory-item';

        const isSkin = shopItem.category === 'skins' && shopItem.skinFile;

        let html = '';

        // Item icon or skin image
        if (isSkin) {
            html += `
                <div class="skin-preview" style="margin-bottom: 8px;">
                    <img src="src/assets/images/skins/${shopItem.skinFile}" alt="${shopItem.name}"
                         style="width: 32px; height: 32px; object-fit: contain; border-radius: 6px; background: rgba(255,255,255,0.1);"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                    <div class="item-icon" style="font-size: 24px; display: none;">${shopItem.icon}</div>
                </div>
            `;
        } else {
            html += `<div class="item-icon" style="font-size: 24px;">${shopItem.icon}</div>`;
        }

        // Item name
        html += `<div class="item-name" style="font-size: 10px; margin: 8px 0;">${shopItem.name}</div>`;

        // Uses remaining or permanent indicator
        if (userItem.uses_remaining) {
            html += `<div class="uses-remaining">${userItem.uses_remaining} usos restantes</div>`;
        } else if (userItem.is_permanent) {
            html += '<div style="color: #FFD700; font-size: 8px;">♾️ Permanente</div>';
        }

        // Use button
        const shouldShowButton =
            (userItem.uses_remaining && userItem.uses_remaining > 0) || (isSkin && userItem.is_permanent);

        // Hide use button for life_bonus
        if (userItem.item_id !== 'life_bonus' && shouldShowButton) {
            const buttonAction = isSkin ? `useSkin('${userItem.item_id}')` : `useItem('${userItem.item_id}')`;
            const buttonText = isSkin ? 'USAR SKIN' : 'USAR';
            html += `<button class="buy-btn" style="margin-top: 10px;" onclick="window.${buttonAction}">${buttonText}</button>`;
        }

        // Purchase date
        const purchaseDate = new Date(userItem.purchased_at).toLocaleDateString('pt-BR');
        html += `<div style="font-size: 8px; color: #888; margin-top: 8px;">Comprado em ${purchaseDate}</div>`;

        card.innerHTML = html;
        return card;
    }

    /**
     * Handle tab changes
     */
    _handleTabChange(index) {
        const tabId = this.tabDefinitions[index].id;
        this.onTabChange(tabId);
    }

    /**
     * Update user items and refresh inventory tab
     */
    setUserItems(userItems) {
        this.userItems = userItems;
        if (this.uiTabs && this.uiTabs.activeIndex === 2) {
            // Refresh inventory tab if it's currently active
            this.tabDefinitions[2].content = this.generateInventoryContent();
            const pane = this.uiTabs.contentPanes[2];
            if (pane) {
                pane.innerHTML = '';
                pane.appendChild(this.tabDefinitions[2].content);
            }
        }
    }

    /**
     * Update store category and refresh store tab
     */
    setCategory(categoryId) {
        this.currentCategory = categoryId;
        if (this.uiTabs && this.uiTabs.activeIndex === 1) {
            // Refresh store tab if it's currently active
            this.tabDefinitions[1].content = this.generateStoreContent();
            const pane = this.uiTabs.contentPanes[1];
            if (pane) {
                pane.innerHTML = '';
                pane.appendChild(this.tabDefinitions[1].content);
            }
        }
    }

    /**
     * Get active tab index
     */
    getActiveTab() {
        return this.uiTabs ? this.uiTabs.activeIndex : 0;
    }

    /**
     * Set active tab by index
     */
    setActiveTab(index) {
        if (this.uiTabs && index >= 0 && index < this.tabDefinitions.length) {
            this.uiTabs.setActive(index);
        }
    }
}

export default ShopTabs;

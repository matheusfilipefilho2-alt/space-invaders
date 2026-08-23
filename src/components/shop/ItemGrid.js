import UICard from '../ui/Card.js';
import UIBadge from '../ui/Badge.js';
import UISkeleton from '../ui/Skeleton.js';

/**
 * ItemGrid - Responsive grid component for displaying shop items
 * Features: skeleton loading state, empty state, responsive layout
 * Consumes: UICard, UIBadge, UISkeleton
 * Produces: ItemGrid class with grid rendering and state management
 */
class ItemGrid {
    constructor(options = {}) {
        this.items = options.items || [];
        this.isLoading = options.isLoading || false;
        this.isEmpty = options.isEmpty || false;
        this.onItemClick = options.onItemClick || (() => {});
        this.columns = options.columns || 'auto-fill'; // auto-fill or auto-fit
        this.minWidth = options.minWidth || '250px';
        this.gap = options.gap || '16px';
        this.element = null;
        this.skeletonCards = [];
    }

    /**
     * Main render method - returns grid element
     */
    render() {
        const grid = document.createElement('div');
        grid.className = 'item-grid';

        // Apply custom grid settings
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = `repeat(${this.columns}, minmax(${this.minWidth}, 1fr))`;
        grid.style.gap = this.gap;
        grid.style.marginBottom = '40px';

        if (this.isLoading) {
            return this._renderSkeletonGrid(grid);
        }

        if (this.isEmpty || this.items.length === 0) {
            return this._renderEmptyState(grid);
        }

        // Render item cards
        this.items.forEach((item) => {
            const card = this._createItemCard(item);
            grid.appendChild(card);
        });

        this.element = grid;
        return grid;
    }

    /**
     * Render skeleton loading state with multiple placeholder cards
     */
    _renderSkeletonGrid(grid) {
        grid.className = 'item-grid item-grid--loading';

        // Show 6 skeleton cards by default
        const skeletonCount = 6;

        for (let i = 0; i < skeletonCount; i++) {
            const skeletonCard = this._createSkeletonCard();
            grid.appendChild(skeletonCard);
            this.skeletonCards.push(skeletonCard);
        }

        this.element = grid;
        return grid;
    }

    /**
     * Create a single skeleton card placeholder
     */
    _createSkeletonCard() {
        const card = document.createElement('div');
        card.className = 'skeleton-card';
        card.style.position = 'relative';
        card.style.padding = '20px';
        card.style.borderRadius = '8px';
        card.style.overflow = 'hidden';

        // Image skeleton
        const imgSkeleton = new UISkeleton({
            shape: 'rectangle',
            width: '100%',
            height: '180px',
            className: 'skeleton-image'
        });
        card.appendChild(imgSkeleton.render());

        // Title skeleton
        const titleSkeleton = new UISkeleton({
            shape: 'text',
            width: '80%',
            height: '16px',
            count: 1,
            className: 'skeleton-title'
        });
        const titleContainer = document.createElement('div');
        titleContainer.style.marginTop = '12px';
        titleContainer.appendChild(titleSkeleton.render());
        card.appendChild(titleContainer);

        // Description skeleton
        const descSkeleton = new UISkeleton({
            shape: 'text',
            width: '100%',
            height: '12px',
            count: 2,
            className: 'skeleton-description'
        });
        const descContainer = document.createElement('div');
        descContainer.style.marginTop = '8px';
        descContainer.appendChild(descSkeleton.render());
        card.appendChild(descContainer);

        // Price skeleton
        const priceSkeleton = new UISkeleton({
            shape: 'text',
            width: '40%',
            height: '14px',
            count: 1,
            className: 'skeleton-price'
        });
        const priceContainer = document.createElement('div');
        priceContainer.style.marginTop = '16px';
        priceContainer.appendChild(priceSkeleton.render());
        card.appendChild(priceContainer);

        return card;
    }

    /**
     * Render empty state when no items match filters
     */
    _renderEmptyState(grid) {
        grid.className = 'item-grid item-grid--empty';

        const emptyContainer = document.createElement('div');
        emptyContainer.className = 'item-grid__empty-state';
        emptyContainer.style.gridColumn = '1 / -1';
        emptyContainer.style.display = 'flex';
        emptyContainer.style.flexDirection = 'column';
        emptyContainer.style.alignItems = 'center';
        emptyContainer.style.justifyContent = 'center';
        emptyContainer.style.padding = '60px 20px';
        emptyContainer.style.textAlign = 'center';

        // Empty state icon
        const icon = document.createElement('div');
        icon.className = 'empty-state-icon';
        icon.textContent = '📭';
        icon.style.fontSize = '48px';
        icon.style.marginBottom = '20px';
        emptyContainer.appendChild(icon);

        // Empty state title
        const title = document.createElement('div');
        title.className = 'empty-state-title';
        title.textContent = 'Nenhum item encontrado';
        title.style.fontSize = '18px';
        title.style.color = '#fff';
        title.style.marginBottom = '8px';
        title.style.fontWeight = 'bold';
        emptyContainer.appendChild(title);

        // Empty state message
        const message = document.createElement('div');
        message.className = 'empty-state-message';
        message.textContent = 'Tente ajustar seus filtros ou volte mais tarde';
        message.style.fontSize = '12px';
        message.style.color = '#888';
        emptyContainer.appendChild(message);

        grid.appendChild(emptyContainer);
        this.element = grid;
        return grid;
    }

    /**
     * Create individual item card with UICard component
     */
    _createItemCard(item) {
        const cardOptions = {
            variant: 'item',
            rarity: item.rarity || 'common',
            image: item.image || null,
            title: item.name || '',
            description: item.description || '',
            badges: this._createBadges(item),
            onClick: () => this.onItemClick(item),
            data: item
        };

        const uiCard = new UICard(cardOptions);
        const cardElement = uiCard.render();

        // Add grid-specific classes
        cardElement.className += ' item-grid__card';

        return cardElement;
    }

    /**
     * Create badge elements for item card
     */
    _createBadges(item) {
        const badges = [];

        // Discount badge
        if (item.discount && item.discount > 0) {
            const discountBadge = new UIBadge({
                variant: 'discount',
                position: 'top-right',
                text: `-${item.discount}%`,
                animate: true
            });
            badges.push(discountBadge.render());
        }

        // New badge
        if (item.isNew) {
            const newBadge = new UIBadge({
                variant: 'new',
                position: 'top-left',
                animate: true
            });
            badges.push(newBadge.render());
        }

        // Hot badge
        if (item.isHot) {
            const hotBadge = new UIBadge({
                variant: 'hot',
                position: item.discount > 0 ? 'top-left' : 'top-right',
                animate: true
            });
            badges.push(hotBadge.render());
        }

        // Owned badge
        if (item.isOwned) {
            const ownedBadge = new UIBadge({
                variant: 'owned',
                position: 'bottom-right'
            });
            badges.push(ownedBadge.render());
        }

        // Rarity badge
        if (item.rarity && item.showRarityBadge) {
            const rarityBadge = new UIBadge({
                variant: 'rarity',
                position: 'bottom-left',
                rarity: item.rarity
            });
            badges.push(rarityBadge.render());
        }

        return badges;
    }

    /**
     * Update grid with new items
     */
    setItems(items, isLoading = false) {
        this.items = items;
        this.isLoading = isLoading;
        this.isEmpty = items.length === 0 && !isLoading;
    }

    /**
     * Set loading state
     */
    setLoading(isLoading) {
        this.isLoading = isLoading;
    }

    /**
     * Get current grid element
     */
    getElement() {
        return this.element;
    }

    /**
     * Update grid with responsive column count
     */
    setResponsiveColumns(windowWidth) {
        if (!this.element) return;

        let columns;
        let minWidth;

        if (windowWidth < 480) {
            // Mobile: single column
            columns = 1;
            minWidth = '100%';
        } else if (windowWidth < 768) {
            // Tablet: 2 columns
            columns = 2;
            minWidth = '150px';
        } else if (windowWidth < 1024) {
            // Small desktop: 3 columns
            columns = 3;
            minWidth = '200px';
        } else {
            // Large desktop: auto-fill
            columns = 'auto-fill';
            minWidth = '250px';
        }

        this.minWidth = minWidth;
        this.columns = columns;

        if (columns === 'auto-fill') {
            this.element.style.gridTemplateColumns = `repeat(auto-fill, minmax(${minWidth}, 1fr))`;
        } else {
            this.element.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
        }
    }

    /**
     * Clear all skeleton cards
     */
    clearSkeletons() {
        this.skeletonCards = [];
    }

    /**
     * Replace skeletons with actual content (fade effect)
     */
    replaceSkeleton(index, content) {
        if (this.skeletonCards[index]) {
            const skeleton = this.skeletonCards[index];
            skeleton.classList.add('skeleton-fade-out');

            setTimeout(() => {
                if (skeleton.parentNode) {
                    skeleton.parentNode.replaceChild(content, skeleton);
                }
                this.skeletonCards.splice(index, 1);
            }, 200);
        }
    }
}

export default ItemGrid;

/**
 * UICard - Reusable card component
 * Variants: item, player, transaction, balance
 * Rarity: common, uncommon, rare, epic, legendary
 */
class UICard {
    constructor(options = {}) {
        this.variant = options.variant || 'item';
        this.rarity = options.rarity || null; // For item cards
        this.image = options.image || null;
        this.title = options.title || '';
        this.description = options.description || '';
        this.badges = options.badges || []; // Array of badge objects
        this.onClick = options.onClick || null;
        this.data = options.data || {}; // Custom data
    }

    render() {
        const card = document.createElement('div');
        card.className = `ui-card ui-card--${this.variant}`;

        if (this.rarity) {
            card.classList.add(`ui-card--rarity-${this.rarity}`);
        }

        if (this.onClick) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => this.onClick(this.data));
        }

        // Image
        if (this.image) {
            const img = document.createElement('img');
            img.src = this.image;
            img.alt = this.title;
            img.className = 'ui-card__image';
            img.loading = 'lazy';
            card.appendChild(img);
        }

        // Content
        const content = document.createElement('div');
        content.className = 'ui-card__content';

        if (this.title) {
            const title = document.createElement('div');
            title.className = 'ui-card__title';
            title.textContent = this.title;
            content.appendChild(title);
        }

        if (this.description) {
            const desc = document.createElement('div');
            desc.className = 'ui-card__description';
            desc.textContent = this.description;
            content.appendChild(desc);
        }

        card.appendChild(content);

        return card;
    }
}

export default UICard;

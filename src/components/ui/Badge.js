/**
 * UIBadge - Reusable badge component
 * Variants: discount, new, owned, hot, rarity
 * Positions: top-left, top-right, bottom-left, bottom-right
 * Animation: pulse
 */
class UIBadge {
    constructor(options = {}) {
        this.variant = options.variant || 'new'; // discount, new, owned, hot, rarity
        this.position = options.position || 'top-right'; // top-left, top-right, bottom-left, bottom-right
        this.text = options.text || '';
        this.rarity = options.rarity || null; // For rarity variant
        this.animate = options.animate || false; // Enable pulse animation
        this.element = null;
    }

    render() {
        const badge = document.createElement('div');
        badge.className = `ui-badge ui-badge--${this.variant} ui-badge--${this.position}`;

        // Add animation if enabled
        if (this.animate) {
            badge.classList.add('ui-badge--animate');
        }

        // Set rarity class if applicable
        if (this.rarity) {
            badge.classList.add(`ui-badge--rarity-${this.rarity}`);
        }

        // Build badge content based on variant
        switch (this.variant) {
            case 'discount':
                badge.innerHTML = `<span class="ui-badge__value">${this.text}</span>`;
                break;
            case 'new':
                badge.textContent = 'NEW';
                break;
            case 'owned':
                badge.textContent = '✓';
                badge.classList.add('ui-badge__checkmark');
                break;
            case 'hot':
                badge.textContent = '🔥';
                badge.classList.add('ui-badge__icon');
                break;
            case 'rarity':
                const rarityIcons = {
                    common: '◆',
                    uncommon: '◆◆',
                    rare: '◆◆◆',
                    epic: '◆◆◆◆',
                    legendary: '⭐'
                };
                badge.textContent = rarityIcons[this.rarity] || '◆';
                badge.classList.add('ui-badge__rarity-icon');
                break;
            default:
                badge.textContent = this.text;
        }

        this.element = badge;
        return badge;
    }

    setAnimate(animate) {
        this.animate = animate;
        if (this.element) {
            if (animate) {
                this.element.classList.add('ui-badge--animate');
            } else {
                this.element.classList.remove('ui-badge--animate');
            }
        }
    }

    setPosition(position) {
        if (this.element) {
            // Remove old position class
            this.element.classList.forEach(cls => {
                if (cls.startsWith('ui-badge--') && ['top-left', 'top-right', 'bottom-left', 'bottom-right'].some(p => cls.includes(p))) {
                    this.element.classList.remove(cls);
                }
            });
            // Add new position class
            this.element.classList.add(`ui-badge--${position}`);
        }
        this.position = position;
    }

    setText(text) {
        this.text = text;
        if (this.element && this.variant === 'discount') {
            const valueEl = this.element.querySelector('.ui-badge__value');
            if (valueEl) {
                valueEl.textContent = text;
            }
        }
    }
}

export default UIBadge;

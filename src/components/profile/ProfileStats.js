/**
 * ProfileStats Component
 * Displays player statistics with animated count-up values
 * Features: count-up animations, responsive grid, stat cards with icons
 * Consumes: Player data from Supabase
 * Produces: Animated stats display component
 */
class ProfileStats {
    constructor(options = {}) {
        this.stats = options.stats || {
            gamesPlayed: 0,
            wins: 0,
            winRate: 0,
            bestScore: 0,
            enemiesKilled: 0,
            playtimeHours: 0
        };
        this.animationDuration = options.animationDuration || 1500; // milliseconds
        this.element = null;
        this.animatingElements = new Map();
    }

    /**
     * Main render method - returns stats container element
     */
    render() {
        const container = document.createElement('div');
        container.className = 'profile-stats-container';

        // Create stats grid
        const grid = document.createElement('div');
        grid.className = 'profile-stats-grid';

        // Define stat cards with icons and labels
        const statDefinitions = [
            {
                id: 'games-played',
                icon: '🎮',
                label: 'Partidas Jogadas',
                value: this.stats.gamesPlayed,
                format: 'number'
            },
            {
                id: 'wins',
                icon: '🏅',
                label: 'Vitórias',
                value: this.stats.wins,
                format: 'number'
            },
            {
                id: 'win-rate',
                icon: '⚔️',
                label: 'Taxa de Vitória',
                value: this.stats.winRate,
                format: 'percent'
            },
            {
                id: 'best-score',
                icon: '💯',
                label: 'Melhor Score',
                value: this.stats.bestScore,
                format: 'number'
            },
            {
                id: 'enemies-killed',
                icon: '👾',
                label: 'Inimigos Destruídos',
                value: this.stats.enemiesKilled,
                format: 'number'
            },
            {
                id: 'playtime',
                icon: '⏱️',
                label: 'Tempo Jogado',
                value: this.stats.playtimeHours,
                format: 'hours'
            }
        ];

        // Create stat cards
        statDefinitions.forEach((stat) => {
            const card = this._createStatCard(stat);
            grid.appendChild(card);
        });

        container.appendChild(grid);
        this.element = container;
        return container;
    }

    /**
     * Create individual stat card with icon, label, and value
     */
    _createStatCard(stat) {
        const card = document.createElement('div');
        card.className = 'profile-stat-card';
        card.setAttribute('data-stat-id', stat.id);

        // Icon container
        const icon = document.createElement('div');
        icon.className = 'profile-stat-card__icon';
        icon.textContent = stat.icon;
        card.appendChild(icon);

        // Content container
        const content = document.createElement('div');
        content.className = 'profile-stat-card__content';

        // Label
        const label = document.createElement('div');
        label.className = 'profile-stat-card__label';
        label.textContent = stat.label;
        content.appendChild(label);

        // Value container with data attribute for animation
        const valueContainer = document.createElement('div');
        valueContainer.className = 'profile-stat-card__value';
        valueContainer.setAttribute('data-stat-format', stat.format);
        valueContainer.setAttribute('data-stat-value', stat.value);

        // Initial value
        valueContainer.textContent = this._formatValue(stat.value, stat.format);

        content.appendChild(valueContainer);
        card.appendChild(content);

        return card;
    }

    /**
     * Format value based on format type
     */
    _formatValue(value, format) {
        const numValue = Math.round(value);

        switch (format) {
            case 'percent':
                return `${numValue}%`;
            case 'hours':
                return `${numValue}h`;
            case 'number':
            default:
                return numValue.toLocaleString('pt-BR');
        }
    }

    /**
     * Animate count-up for all stat values
     * Starts from 0 and counts up to the actual value
     */
    animateCountUp() {
        if (!this.element) return;

        const valueElements = this.element.querySelectorAll('.profile-stat-card__value');

        valueElements.forEach((element) => {
            const format = element.getAttribute('data-stat-format');
            const finalValue = parseFloat(element.getAttribute('data-stat-value'));
            const startTime = performance.now();

            // Store animation frame ID for cleanup if needed
            const animateValue = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / this.animationDuration, 1);

                // Easing function (ease-out-cubic)
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                const currentValue = finalValue * easeProgress;
                element.textContent = this._formatValue(currentValue, format);

                if (progress < 1) {
                    const frameId = requestAnimationFrame(animateValue);
                    this.animatingElements.set(element, frameId);
                } else {
                    // Ensure final value is exact
                    element.textContent = this._formatValue(finalValue, format);
                    this.animatingElements.delete(element);
                }
            };

            // Start animation
            const frameId = requestAnimationFrame(animateValue);
            this.animatingElements.set(element, frameId);
        });
    }

    /**
     * Update stats with new values and optionally animate
     */
    updateStats(newStats, animate = true) {
        this.stats = {
            ...this.stats,
            ...newStats
        };

        if (!this.element) return;

        // Update value elements
        const valueElements = this.element.querySelectorAll('.profile-stat-card__value');

        const statDefinitions = [
            { id: 'games-played', value: this.stats.gamesPlayed },
            { id: 'wins', value: this.stats.wins },
            { id: 'win-rate', value: this.stats.winRate },
            { id: 'best-score', value: this.stats.bestScore },
            { id: 'enemies-killed', value: this.stats.enemiesKilled },
            { id: 'playtime', value: this.stats.playtimeHours }
        ];

        valueElements.forEach((element) => {
            const card = element.closest('.profile-stat-card');
            const statId = card.getAttribute('data-stat-id');
            const statDef = statDefinitions.find(s => s.id === statId);

            if (statDef) {
                element.setAttribute('data-stat-value', statDef.value);
            }
        });

        // Animate if requested
        if (animate) {
            this.animateCountUp();
        }
    }

    /**
     * Stop all running animations
     */
    stopAnimations() {
        this.animatingElements.forEach((frameId) => {
            cancelAnimationFrame(frameId);
        });
        this.animatingElements.clear();
    }

    /**
     * Get current element
     */
    getElement() {
        return this.element;
    }

    /**
     * Reset stats to initial values
     */
    reset() {
        this.stopAnimations();
        this.stats = {
            gamesPlayed: 0,
            wins: 0,
            winRate: 0,
            bestScore: 0,
            enemiesKilled: 0,
            playtimeHours: 0
        };
        if (this.element) {
            const valueElements = this.element.querySelectorAll('.profile-stat-card__value');
            valueElements.forEach((element) => {
                const format = element.getAttribute('data-stat-format');
                element.textContent = this._formatValue(0, format);
            });
        }
    }
}

export default ProfileStats;

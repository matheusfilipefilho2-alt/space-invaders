/**
 * PlayerCard - Card component for ranking row
 * Features: position indicator, name, score, level stars, position change arrows, top percentage badges
 */
class PlayerCard {
    constructor(options = {}) {
        this.player = options.player || {};
        this.position = options.position || 0;
        this.totalPlayers = options.totalPlayers || 0;
        this.isCurrentUser = options.isCurrentUser || false;
        this.previousPosition = options.previousPosition || null;
        this.element = null;
    }

    render() {
        const card = document.createElement('div');
        card.className = `ranking-item ${this.isCurrentUser ? 'current-user' : ''}`;
        card.setAttribute('data-player-id', this.player.id);

        // Position with medal for top 3
        const positionEl = document.createElement('div');
        positionEl.className = 'ranking-position';

        const medal = this.position <= 3 ? ['🥇', '🥈', '🥉'][this.position - 1] : `#${this.position}`;
        positionEl.innerHTML = `<span class="position-number">${medal}</span>`;

        // Add position change arrow
        if (this.previousPosition !== null && this.previousPosition !== this.position) {
            const arrow = this._getPositionArrow();
            if (arrow) {
                positionEl.innerHTML += `<span class="position-change ${arrow.class}">${arrow.symbol}</span>`;
            }
        }

        // Player info
        const playerEl = document.createElement('div');
        playerEl.className = 'ranking-player';

        const nameEl = document.createElement('div');
        nameEl.className = 'player-name';
        nameEl.textContent = this.player.username || 'Unknown';

        const levelEl = document.createElement('div');
        levelEl.className = 'player-level';
        const level = this.player.current_level || 1;
        const stars = this._getLevelStars(level);
        levelEl.innerHTML = `Nível ${level} ${stars}`;

        playerEl.appendChild(nameEl);
        playerEl.appendChild(levelEl);

        // Score
        const scoreEl = document.createElement('div');
        scoreEl.className = 'ranking-score';
        scoreEl.textContent = (this.player.high_score || 0).toLocaleString();

        // Coins
        const coinsEl = document.createElement('div');
        coinsEl.className = 'ranking-coins';
        coinsEl.textContent = `🪙 ${(this.player.coins || 0).toLocaleString()}`;

        // Position indicator badge (Top X%)
        const percentageBadge = this._getPercentageBadge();

        // Assemble card
        card.appendChild(positionEl);
        card.appendChild(playerEl);
        card.appendChild(scoreEl);
        card.appendChild(coinsEl);

        if (percentageBadge) {
            card.appendChild(percentageBadge);
        }

        this.element = card;
        return card;
    }

    _getLevelStars(level) {
        // Show stars based on level (1-5 stars)
        const starCount = Math.min(level, 5);
        return '⭐'.repeat(starCount);
    }

    _getPositionArrow() {
        const diff = this.previousPosition - this.position;

        if (diff > 0) {
            // Moved up
            return { symbol: '↗️', class: 'position-up' };
        } else if (diff < 0) {
            // Moved down
            return { symbol: '↘️', class: 'position-down' };
        } else {
            // No change
            return { symbol: '➡️', class: 'position-same' };
        }
    }

    _getPercentageBadge() {
        if (!this.totalPlayers || this.totalPlayers === 0) return null;

        const percentage = (this.position / this.totalPlayers) * 100;

        let badgeText = null;
        let badgeClass = '';

        if (percentage <= 5) {
            badgeText = 'Top 5%';
            badgeClass = 'badge-top-5';
        } else if (percentage <= 10) {
            badgeText = 'Top 10%';
            badgeClass = 'badge-top-10';
        } else if (percentage <= 25) {
            badgeText = 'Top 25%';
            badgeClass = 'badge-top-25';
        }

        if (!badgeText) return null;

        const badge = document.createElement('div');
        badge.className = `position-badge ${badgeClass}`;
        badge.textContent = badgeText;

        return badge;
    }

    /**
     * Scroll this card into view
     */
    scrollIntoView(options = {}) {
        if (this.element) {
            this.element.scrollIntoView({
                behavior: options.behavior || 'smooth',
                block: options.block || 'center',
                inline: options.inline || 'nearest'
            });
        }
    }

    /**
     * Highlight this card temporarily
     */
    highlight(duration = 2000) {
        if (this.element) {
            this.element.classList.add('highlight-pulse');
            setTimeout(() => {
                this.element.classList.remove('highlight-pulse');
            }, duration);
        }
    }

    /**
     * Update player data
     */
    updatePlayer(player) {
        this.player = player;
        if (this.element) {
            // Re-render by replacing content
            const newCard = this.render();
            if (this.element.parentNode) {
                this.element.parentNode.replaceChild(newCard, this.element);
            }
        }
    }
}

export default PlayerCard;

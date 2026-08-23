import UISkeleton from '../ui/Skeleton.js';
import PlayerCard from './PlayerCard.js';

/**
 * RankingList - List component with skeleton loading and scroll-to-me feature
 * Features: skeleton loading, scroll-to-me, search filtering, position tracking
 */
class RankingList {
    constructor(options = {}) {
        this.container = options.container || null;
        this.currentUserId = options.currentUserId || null;
        this.onRefresh = options.onRefresh || (() => {});

        this.players = [];
        this.previousPositions = new Map(); // Track position changes
        this.playerCards = [];
        this.loading = false;
        this.searchQuery = '';

        this.element = null;
        this.listElement = null;
        this.headerElement = null;
        this.lastUpdatedElement = null;
        this.lastUpdatedTime = null;
        this.updateIntervalId = null;
    }

    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'ranking-list-wrapper';

        // Header with refresh button and last updated
        this.headerElement = this._renderHeader();
        wrapper.appendChild(this.headerElement);

        // List container
        this.listElement = document.createElement('div');
        this.listElement.className = 'ranking-list';

        wrapper.appendChild(this.listElement);

        this.element = wrapper;

        // Start the timestamp update interval
        this._startTimestampUpdate();

        return wrapper;
    }

    _renderHeader() {
        const header = document.createElement('div');
        header.className = 'ranking-header';

        // Title
        const title = document.createElement('h3');
        title.className = 'ranking-title';
        title.textContent = 'Melhores Jogadores';

        // Controls container
        const controls = document.createElement('div');
        controls.className = 'ranking-controls';

        // Last updated timestamp
        this.lastUpdatedElement = document.createElement('span');
        this.lastUpdatedElement.className = 'ranking-last-updated';
        this.lastUpdatedElement.textContent = 'Carregando...';

        // Refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'ranking-refresh-btn';
        refreshBtn.innerHTML = '🔄';
        refreshBtn.title = 'Atualizar ranking';
        refreshBtn.addEventListener('click', () => {
            this.onRefresh();
        });

        controls.appendChild(this.lastUpdatedElement);
        controls.appendChild(refreshBtn);

        header.appendChild(title);
        header.appendChild(controls);

        return header;
    }

    /**
     * Show skeleton loading state
     */
    showLoading(count = 10) {
        if (!this.listElement) return;

        this.loading = true;
        this.listElement.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const skeletonCard = this._renderSkeletonCard();
            this.listElement.appendChild(skeletonCard);
        }
    }

    _renderSkeletonCard() {
        const card = document.createElement('div');
        card.className = 'ranking-item ranking-item--skeleton';

        // Position skeleton
        const positionSkeleton = new UISkeleton({
            shape: 'circle',
            width: '40px',
            height: '40px'
        });
        card.appendChild(positionSkeleton.render());

        // Player info skeleton
        const playerWrapper = document.createElement('div');
        playerWrapper.className = 'ranking-player';

        const nameSkeleton = new UISkeleton({
            shape: 'text',
            width: '120px',
            height: '16px'
        });
        playerWrapper.appendChild(nameSkeleton.render());

        const levelSkeleton = new UISkeleton({
            shape: 'text',
            width: '80px',
            height: '12px'
        });
        playerWrapper.appendChild(levelSkeleton.render());

        card.appendChild(playerWrapper);

        // Score skeleton
        const scoreSkeleton = new UISkeleton({
            shape: 'rectangle',
            width: '80px',
            height: '20px'
        });
        card.appendChild(scoreSkeleton.render());

        // Coins skeleton
        const coinsSkeleton = new UISkeleton({
            shape: 'rectangle',
            width: '60px',
            height: '16px'
        });
        card.appendChild(coinsSkeleton.render());

        return card;
    }

    /**
     * Update list with player data
     */
    updatePlayers(players = []) {
        if (!this.listElement) return;

        // Store previous positions before updating
        this.players.forEach((player, index) => {
            this.previousPositions.set(player.id, index + 1);
        });

        this.players = players;
        this.loading = false;

        // Clear list
        this.listElement.innerHTML = '';
        this.playerCards = [];

        // Filter players by search query
        const filteredPlayers = this._filterPlayers(players);

        if (filteredPlayers.length === 0) {
            this._showEmptyState();
            return;
        }

        // Render player cards
        filteredPlayers.forEach((player, index) => {
            const position = index + 1;
            const previousPosition = this.previousPositions.get(player.id);

            const card = new PlayerCard({
                player,
                position,
                totalPlayers: players.length, // Use total count for percentage calculation
                isCurrentUser: player.id === this.currentUserId,
                previousPosition
            });

            const cardElement = card.render();
            this.listElement.appendChild(cardElement);
            this.playerCards.push(card);
        });

        // Update last updated timestamp
        this.lastUpdatedTime = Date.now();
        this._updateTimestamp();
    }

    _filterPlayers(players) {
        if (!this.searchQuery) return players;

        const query = this.searchQuery.toLowerCase();
        return players.filter(player => {
            return player.username?.toLowerCase().includes(query);
        });
    }

    _showEmptyState() {
        this.listElement.innerHTML = `
            <div class="ranking-empty-state">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-text">Nenhum jogador encontrado</div>
            </div>
        `;
    }

    /**
     * Scroll to current user's card
     */
    scrollToMe() {
        if (!this.currentUserId) return;

        const currentUserCard = this.playerCards.find(
            card => card.player.id === this.currentUserId
        );

        if (currentUserCard) {
            currentUserCard.scrollIntoView();
            currentUserCard.highlight();
        }
    }

    /**
     * Set search query and filter list
     */
    setSearchQuery(query) {
        this.searchQuery = query;

        // Re-render with filtered data
        if (this.players.length > 0) {
            this.updatePlayers(this.players);
        }
    }

    /**
     * Start interval to update "last updated" timestamp
     */
    _startTimestampUpdate() {
        // Update every second
        this.updateIntervalId = setInterval(() => {
            this._updateTimestamp();
        }, 1000);
    }

    /**
     * Update the "last updated" timestamp display
     */
    _updateTimestamp() {
        if (!this.lastUpdatedElement || !this.lastUpdatedTime) return;

        const secondsAgo = Math.floor((Date.now() - this.lastUpdatedTime) / 1000);

        let text = '';
        if (secondsAgo < 60) {
            text = `Atualizado há ${secondsAgo}s`;
        } else if (secondsAgo < 3600) {
            const minutes = Math.floor(secondsAgo / 60);
            text = `Atualizado há ${minutes}m`;
        } else {
            const hours = Math.floor(secondsAgo / 3600);
            text = `Atualizado há ${hours}h`;
        }

        this.lastUpdatedElement.textContent = text;
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.updateIntervalId) {
            clearInterval(this.updateIntervalId);
        }
    }

    /**
     * Get the container element
     */
    getElement() {
        return this.element;
    }
}

export default RankingList;

/**
 * AbacatePay API Manager
 * Handles payment creation, customer management, and status polling
 * Docs: https://docs.abacatepay.com
 */

class AbacatePayManager {
    constructor() {
        this.apiKey = import.meta.env.VITE_ABACATE_PAY;
        this.baseUrl = 'https://api.abacatepay.com/v2';
        this.productCache = new Map(); // externalId -> productId
        this.customerCache = new Map(); // playerId -> customerId

        if (!this.apiKey) {
            throw new Error('VITE_ABACATE_PAY not found in .env');
        }

        console.log('💳 AbacatePayManager initialized', {
            mode: this.isDevMode() ? 'DevMode' : 'Production',
            baseUrl: this.baseUrl
        });
    }

    /**
     * Check if running in development mode
     * @returns {boolean} True if using abc_dev_ key
     */
    isDevMode() {
        return this.apiKey.startsWith('abc_dev_');
    }

    /**
     * Generic API call with retry logic
     * @param {string} endpoint - API endpoint (e.g., '/products/create')
     * @param {object} options - Fetch options
     * @param {number} retries - Number of retries
     * @returns {Promise<object>} API response
     */
    async _callAbacatePay(endpoint, options = {}, retries = 3) {
        // Implementation in next step
    }

    /**
     * Convert BRL to centavos
     * @param {number} brl - Value in reais (e.g., 4.99)
     * @returns {number} Value in centavos (e.g., 499)
     */
    _toCentavos(brl) {
        return Math.round(brl * 100);
    }

    /**
     * Validate email format
     * @param {string} email - Email address
     * @returns {boolean} True if valid
     */
    _isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Wait for specified milliseconds
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     */
    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get or create customer in AbacatePay
     * @param {object} player - Player object with id, username, email
     * @returns {Promise<{customerId: string}>}
     */
    async getOrCreateCustomer(player) {
        // Validate player data
        if (!player || !player.id) {
            throw new Error('Invalid player object');
        }

        if (!player.email || player.email === '') {
            throw new Error('Player email is required. Please update your profile.');
        }

        if (!this._isValidEmail(player.email)) {
            throw new Error('Invalid email format. Please update your profile.');
        }

        // Check cache
        if (this.customerCache.has(player.id)) {
            const customerId = this.customerCache.get(player.id);
            console.log('📦 Customer from cache:', customerId);
            return { customerId };
        }

        try {
            // Create or get customer (AbacatePay returns existing if email matches)
            const response = await this._callAbacatePay('/customers/create', {
                method: 'POST',
                body: JSON.stringify({
                    email: player.email,
                    name: player.username || 'Space Invaders Player',
                    metadata: {
                        playerId: player.id,
                        username: player.username,
                        gameTimestamp: new Date().toISOString()
                    }
                })
            });

            if (!response.success || !response.data?.id) {
                throw new Error('Failed to create customer');
            }

            const customerId = response.data.id;
            this.customerCache.set(player.id, customerId);

            console.log('✅ Customer created/retrieved:', customerId);
            return { customerId };

        } catch (error) {
            console.error('❌ Failed to get/create customer:', error);
            throw error;
        }
    }
}

export default new AbacatePayManager();

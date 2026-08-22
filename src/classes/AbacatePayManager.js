/**
 * AbacatePay API Manager
 * Handles payment creation, customer management, and status polling
 * Docs: https://docs.abacatepay.com
 */

// AbacatePay API Key - Get from https://dashboard.abacatepay.com/
const ABACATE_PAY_API_KEY = "abc_dev_36LGWbADGu61FZa5L2bURW3w";

class AbacatePayManager {
    constructor() {
        this.apiKey = ABACATE_PAY_API_KEY;
        this.baseUrl = 'https://api.abacatepay.com/v2';
        this.productCache = new Map(); // externalId -> productId
        this.customerCache = new Map(); // playerId -> customerId

        if (!this.apiKey) {
            throw new Error('ABACATE_PAY_API_KEY not configured');
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
        const url = `${this.baseUrl}${endpoint}`;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    signal: AbortSignal.timeout(10000)  // 10s timeout
                });

                const data = await response.json();

                // Success
                if (response.ok) {
                    return data;
                }

                // Retry on server errors or rate limit
                if (response.status >= 500 || response.status === 429) {
                    if (attempt < retries) {
                        const delay = 2000 * attempt;  // Exponential backoff
                        console.warn(`⚠️ API error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${retries})`);
                        await this._wait(delay);
                        continue;
                    }
                }

                // Non-retryable error
                throw new Error(`AbacatePay API error: ${response.status} - ${data.error || data.message || 'Unknown error'}`);

            } catch (error) {
                // Network error - retry
                if (attempt < retries && (error.name === 'AbortError' || error.name === 'TypeError')) {
                    const delay = 2000 * attempt;
                    console.warn(`⚠️ Network error, retrying in ${delay}ms (attempt ${attempt}/${retries})`, error);
                    await this._wait(delay);
                    continue;
                }

                throw error;
            }
        }

        throw new Error('AbacatePay API: Max retries exceeded');
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
     * Initialize AbacatePay products
     * Creates coin pack products if they don't exist
     * @returns {Promise<void>}
     */
    async initialize() {
        console.log('🔄 Initializing AbacatePay products...');

        const coinPacks = [
            {
                externalId: 'coin_pack_199',
                name: '199 Moedas - Space Invaders',
                description: 'Pacote de 199 moedas',
                price: 4.99
            },
            {
                externalId: 'coin_pack_499',
                name: '499 Moedas - Space Invaders',
                description: 'Pacote de 499 moedas',
                price: 9.99
            },
            {
                externalId: 'coin_pack_999',
                name: '999 Moedas - Space Invaders',
                description: 'Pacote de 999 moedas',
                price: 14.99
            }
        ];

        for (const pack of coinPacks) {
            try {
                // Check if product exists
                const products = await this._callAbacatePay('/products/list', {
                    method: 'GET'
                });

                const existing = products.data?.find(p => p.externalId === pack.externalId);

                if (existing) {
                    this.productCache.set(pack.externalId, existing.id);
                    console.log(`✅ Product ${pack.externalId} already exists:`, existing.id);
                } else {
                    // Create product
                    const productId = await this._createProduct(
                        pack.externalId,
                        pack.name,
                        pack.price,
                        pack.description
                    );
                    this.productCache.set(pack.externalId, productId);
                    console.log(`✅ Created product ${pack.externalId}:`, productId);
                }
            } catch (error) {
                console.error(`❌ Failed to initialize product ${pack.externalId}:`, error);
                // Continue with other products
            }
        }

        console.log('✅ Product initialization complete');
    }

    /**
     * Create a product in AbacatePay
     * @param {string} externalId - External product ID
     * @param {string} name - Product name
     * @param {number} price - Price in BRL
     * @param {string} description - Product description
     * @returns {Promise<string>} Product ID
     */
    async _createProduct(externalId, name, price, description) {
        const response = await this._callAbacatePay('/products/create', {
            method: 'POST',
            body: JSON.stringify({
                externalId,
                name,
                price: this._toCentavos(price),
                currency: 'BRL',
                description
            })
        });

        if (!response.success || !response.data?.id) {
            throw new Error('Failed to create product');
        }

        return response.data.id;
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

    /**
     * Create PIX payment for coin pack
     * @param {string} coinPackId - Coin pack ID (e.g., 'coin_pack_499')
     * @param {object} player - Player object
     * @returns {Promise<object>} Payment data with QR code
     */
    async createPixPayment(coinPackId, player) {
        console.log('💳 Creating PIX payment:', { coinPackId, playerId: player.id });

        // Map coin pack to amount and coins
        const coinPackConfig = {
            'coin_pack_199': { price: 4.99, coins: 199 },
            'coin_pack_499': { price: 9.99, coins: 499 },
            'coin_pack_999': { price: 14.99, coins: 999 }
        };

        const config = coinPackConfig[coinPackId];
        if (!config) {
            throw new Error(`Invalid coin pack: ${coinPackId}`);
        }

        // Validate price
        if (config.price < 0.50 || config.price > 1000) {
            throw new Error('Invalid price range');
        }

        // Get/create customer
        const { customerId } = await this.getOrCreateCustomer(player);

        // Create transparent checkout (PIX)
        try {
            const response = await this._callAbacatePay('/transparents/create', {
                method: 'POST',
                body: JSON.stringify({
                    data: {
                        amount: this._toCentavos(config.price),
                        expiresIn: 1800,  // 30 minutes
                        description: `${config.coins} moedas - Space Invaders`,
                        customer: {
                            id: customerId
                        },
                        metadata: {
                            playerId: player.id,
                            playerUsername: player.username,
                            coinPackId: coinPackId,
                            coinAmount: config.coins,
                            gameTimestamp: new Date().toISOString()
                        }
                    }
                })
            });

            if (!response.success || !response.data) {
                throw new Error('Failed to create PIX payment');
            }

            const payment = response.data;

            console.log('✅ PIX payment created:', {
                checkoutId: payment.id,
                amount: config.price,
                coins: config.coins,
                expiresAt: payment.expiresAt
            });

            return {
                success: true,
                checkoutId: payment.id,
                brCode: payment.brCode,  // Copy-paste code
                brCodeBase64: payment.brCodeBase64,  // PNG image base64
                expiresAt: payment.expiresAt,
                amount: config.price,
                coinAmount: config.coins
            };

        } catch (error) {
            console.error('❌ Failed to create PIX payment:', error);
            throw error;
        }
    }

    /**
     * Check payment status
     * @param {string} checkoutId - Checkout ID
     * @returns {Promise<string>} Status: "pending" | "paid" | "expired"
     */
    async checkPaymentStatus(checkoutId) {
        try {
            const response = await this._callAbacatePay(`/transparents/check?id=${checkoutId}`, {
                method: 'GET'
            });

            if (!response.success || !response.data) {
                throw new Error('Failed to check payment status');
            }

            const status = response.data.status;

            // Normalize status
            if (status === 'pending') return 'pending';
            if (status === 'paid' || status === 'completed') return 'paid';
            if (status === 'expired') return 'expired';

            return 'pending';  // Default

        } catch (error) {
            console.error('❌ Failed to check payment status:', error);
            throw error;
        }
    }

    /**
     * Simulate payment (DevMode only)
     * @param {string} checkoutId - Checkout ID to mark as paid
     * @returns {Promise<void>}
     */
    async simulatePayment(checkoutId) {
        if (!this.isDevMode()) {
            throw new Error('simulatePayment is only available in DevMode');
        }

        try {
            console.log('🧪 Simulating payment for:', checkoutId);

            const response = await this._callAbacatePay('/transparents/simulate-payment', {
                method: 'POST',
                body: JSON.stringify({
                    id: checkoutId
                })
            });

            if (!response.success) {
                throw new Error('Failed to simulate payment');
            }

            console.log('✅ Payment simulated successfully');

        } catch (error) {
            console.error('❌ Failed to simulate payment:', error);
            throw error;
        }
    }
}

export default new AbacatePayManager();

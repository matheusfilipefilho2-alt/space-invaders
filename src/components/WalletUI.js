// ============================================================================
// WALLET UI COMPONENT
// ============================================================================
// Manages the visual wallet interface, including connection button, address
// display, balance widget, and notifications. Non-intrusive design.
// ============================================================================

import SolanaWalletManager from '../classes/SolanaWalletManager.js';

class WalletUI {
    constructor() {
        this.walletManager = SolanaWalletManager;
        this.notificationTimeout = null;
        this.init();
    }

    init() {
        console.log('🎨 Initializing Wallet UI...');
        this.setupEventListeners();
        this.updateUI();

        // Listen for wallet manager changes
        window.addEventListener('wallet-connected', () => this.onWalletConnected());
        window.addEventListener('wallet-disconnected', () => this.onWalletDisconnected());
    }

    setupEventListeners() {
        const connectBtn = document.getElementById('wallet-connect-btn');
        const disconnectBtn = document.getElementById('wallet-disconnect-btn');

        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.handleConnect());
        }

        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.handleDisconnect());
        }
    }

    /**
     * Handle wallet connection
     */
    async handleConnect() {
        const connectBtn = document.getElementById('wallet-connect-btn');
        if (!connectBtn) return;

        // Show loading state
        connectBtn.classList.add('loading');
        connectBtn.disabled = true;

        try {
            const success = await this.walletManager.connect();

            if (success) {
                this.showNotification('Wallet conectada com sucesso!', 'success');
                this.updateUI();
                this.dispatchWalletEvent('connected');
            } else {
                this.showNotification('Falha ao conectar wallet', 'error');
            }
        } catch (error) {
            console.error('Erro ao conectar wallet:', error);
            this.showNotification('Erro: ' + error.message, 'error');
        } finally {
            connectBtn.classList.remove('loading');
            connectBtn.disabled = false;
        }
    }

    /**
     * Handle wallet disconnection
     */
    async handleDisconnect() {
        try {
            await this.walletManager.disconnect();
            this.showNotification('Wallet desconectada', 'success');
            this.updateUI();
            this.dispatchWalletEvent('disconnected');
        } catch (error) {
            console.error('Erro ao desconectar:', error);
            this.showNotification('Erro ao desconectar', 'error');
        }
    }

    /**
     * Update UI based on wallet connection state
     */
    updateUI() {
        const connectBtn = document.getElementById('wallet-connect-btn');
        const walletDisplay = document.getElementById('wallet-display');
        const walletAddress = document.getElementById('wallet-address');

        if (!connectBtn || !walletDisplay) {
            console.warn('⚠️ Wallet UI elements not found in DOM');
            return;
        }

        if (this.walletManager.isWalletConnected()) {
            connectBtn.style.display = 'none';
            walletDisplay.style.display = 'flex';

            if (walletAddress) {
                const pubKey = this.walletManager.getPublicKey();
                if (pubKey) {
                    walletAddress.textContent = this.formatAddress(pubKey.toString());
                    walletAddress.title = pubKey.toString(); // Full address on hover
                }
            }
        } else {
            connectBtn.style.display = 'inline-flex';
            walletDisplay.style.display = 'none';
        }
    }

    /**
     * Format address for display (4...4)
     */
    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }

    /**
     * Update balance widget
     */
    updateBalanceWidget(inGameBalance, blockchainBalance) {
        const inGameElement = document.querySelector('[data-balance="in-game"] .amount');
        const blockchainElement = document.querySelector('[data-balance="blockchain"] .amount');

        if (inGameElement) {
            inGameElement.textContent = this.formatNumber(inGameBalance);
        }

        if (blockchainElement) {
            blockchainElement.textContent = this.formatNumber(blockchainBalance);
        }
    }

    /**
     * Format number with thousands separator
     */
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * Show notification toast
     */
    showNotification(message, type = 'info', duration = 3000) {
        let notification = document.querySelector('.wallet-notification');

        if (!notification) {
            notification = document.createElement('div');
            notification.className = `wallet-notification ${type}`;
            notification.innerHTML = `
                <div style="margin-bottom: 4px;">${message}</div>
                <button class="wallet-notification-close">&times;</button>
            `;
            document.body.appendChild(notification);

            notification.querySelector('.wallet-notification-close').addEventListener('click', () => {
                notification.remove();
            });
        } else {
            notification.textContent = message;
            notification.className = `wallet-notification ${type}`;
        }

        // Auto-hide after duration
        clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    /**
     * Show wallet modal
     */
    showWalletModal() {
        let modal = document.getElementById('wallet-modal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'wallet-modal';
            modal.className = 'wallet-modal active';
            modal.innerHTML = `
                <div class="wallet-modal-content">
                    <div class="wallet-modal-header">
                        <h2 class="wallet-modal-title">Conectar Wallet</h2>
                        <button class="wallet-modal-close">&times;</button>
                    </div>
                    <div class="wallet-modal-body">
                        <p style="color: #4ECDC4; font-size: 8px; margin-bottom: 10px;">
                            Conecte sua Phantom Wallet para acessar recursos blockchain.
                        </p>
                        ${this.walletManager.isWalletConnected() ? `
                            <div class="wallet-info-card">
                                <div class="wallet-info-row">
                                    <span class="wallet-info-label">Endereço</span>
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <span class="wallet-info-value">${this.formatAddress(this.walletManager.getPublicKey().toString())}</span>
                                        <button class="wallet-copy-btn" onclick="this.parentElement.previousElementSibling.click()">Copiar</button>
                                    </div>
                                </div>
                            </div>
                            <button class="wallet-btn primary-action" onclick="walletUI.handleDisconnect()" style="width: 100%;">
                                ❌ Desconectar Wallet
                            </button>
                        ` : `
                            <button class="wallet-btn primary-action" onclick="walletUI.handleConnect()" style="width: 100%;">
                                🔗 Conectar Phantom
                            </button>
                            <p style="color: #999; font-size: 6px; text-align: center; margin-top: 10px;">
                                Você precisa ter a Phantom Wallet instalada.
                                <a href="https://phantom.app/" target="_blank" style="color: #FFD700;">Baixar Phantom</a>
                            </p>
                        `}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('.wallet-modal-close').addEventListener('click', () => {
                modal.remove();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        } else {
            modal.classList.toggle('active');
        }
    }

    /**
     * Dispatch custom wallet event
     */
    dispatchWalletEvent(eventType) {
        const event = new CustomEvent(`wallet-${eventType}`, {
            detail: {
                publicKey: this.walletManager.getPublicKey()?.toString(),
                isConnected: this.walletManager.isWalletConnected()
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Callback when wallet is connected
     */
    onWalletConnected() {
        console.log('✅ Wallet UI: Wallet connected');
        this.updateUI();
    }

    /**
     * Callback when wallet is disconnected
     */
    onWalletDisconnected() {
        console.log('❌ Wallet UI: Wallet disconnected');
        this.updateUI();
    }

    /**
     * Show loading state on wallet button
     */
    setLoading(isLoading) {
        const connectBtn = document.getElementById('wallet-connect-btn');
        if (connectBtn) {
            if (isLoading) {
                connectBtn.classList.add('loading');
                connectBtn.disabled = true;
            } else {
                connectBtn.classList.remove('loading');
                connectBtn.disabled = false;
            }
        }
    }

    /**
     * Get wallet status for display
     */
    getStatus() {
        return {
            isConnected: this.walletManager.isWalletConnected(),
            publicKey: this.walletManager.getPublicKey()?.toString() || null,
            formattedAddress: this.walletManager.isWalletConnected()
                ? this.formatAddress(this.walletManager.getPublicKey().toString())
                : null
        };
    }
}

// Export singleton instance
export const walletUI = new WalletUI();

// Make globally available for inline event handlers
window.walletUI = walletUI;

export default walletUI;

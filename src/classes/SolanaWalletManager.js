import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { supabase } from '../supabase.js';
import SOLANA_CONFIG from '../config/solana-config.js';
import { NavigationHelper } from '../navigation.js';

class SolanaWalletManager {
    constructor() {
        this.connection = new Connection(
            SOLANA_CONFIG.rpcEndpoint,
            SOLANA_CONFIG.commitment
        );
        this.wallet = null;
        this.publicKey = null;
        this.isConnected = false;

        this.init();
    }

    async init() {
        // Try auto-reconnect if wallet was connected before
        const savedWallet = localStorage.getItem('walletPublicKey');
        if (savedWallet && window.solana?.isPhantom) {
            try {
                await this.connect();
            } catch (err) {
                console.log('⚠️ Auto-reconnect failed:', err.message);
                localStorage.removeItem('walletPublicKey');
            }
        }
    }

    async connect() {
        // Check if Phantom is installed
        if (!window.solana) {
            alert('Por favor, instale a Phantom Wallet!\n\nClique OK para abrir o site.');
            window.open('https://phantom.app/', '_blank');
            return false;
        }

        try {
            console.log('🔗 Conectando wallet...');

            // Request connection
            const resp = await window.solana.connect();
            this.publicKey = resp.publicKey;
            this.isConnected = true;

            // Save connection
            localStorage.setItem('walletPublicKey', this.publicKey.toString());

            // Update UI
            this.updateWalletUI();

            // Link wallet to player account
            await this.linkWalletToPlayer();

            console.log('✅ Wallet conectada:', this.publicKey.toString());
            return true;

        } catch (err) {
            console.error('❌ Erro ao conectar wallet:', err);
            alert('Erro ao conectar wallet: ' + err.message);
            return false;
        }
    }

    async disconnect() {
        if (window.solana) {
            try {
                await window.solana.disconnect();
            } catch (err) {
                console.error('Erro ao desconectar:', err);
            }
        }

        this.publicKey = null;
        this.isConnected = false;

        localStorage.removeItem('walletPublicKey');
        this.updateWalletUI();

        console.log('Wallet desconectada');
    }

    async linkWalletToPlayer() {
        const currentUser = NavigationHelper.getCurrentUser();
        if (!currentUser) {
            console.log('⚠️ Nenhum usuário logado para associar wallet');
            return;
        }

        try {
            const { error } = await supabase
                .from('player_wallets')
                .upsert({
                    player_id: currentUser.id,
                    wallet_address: this.publicKey.toString(),
                    last_used_at: new Date().toISOString()
                }, {
                    onConflict: 'player_id,wallet_address'
                });

            if (error) {
                console.error('❌ Erro ao associar wallet:', error);
            } else {
                console.log('✅ Wallet associada ao player:', currentUser.username);
            }
        } catch (err) {
            console.error('❌ Erro ao associar wallet:', err);
        }
    }

    updateWalletUI() {
        const connectBtn = document.getElementById('wallet-connect-btn');
        const walletDisplay = document.getElementById('wallet-display');
        const walletAddress = document.getElementById('wallet-address');

        if (!connectBtn || !walletDisplay) return;

        if (this.isConnected) {
            connectBtn.style.display = 'none';
            walletDisplay.style.display = 'flex';
            if (walletAddress) {
                walletAddress.textContent = this.formatAddress(this.publicKey.toString());
            }
        } else {
            connectBtn.style.display = 'block';
            walletDisplay.style.display = 'none';
        }
    }

    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }

    getConnection() {
        return this.connection;
    }

    getPublicKey() {
        return this.publicKey;
    }

    isWalletConnected() {
        return this.isConnected;
    }

    // Validate Solana address
    static isValidAddress(address) {
        try {
            const pubkey = new PublicKey(address);
            return PublicKey.isOnCurve(pubkey.toBuffer());
        } catch {
            return false;
        }
    }
}

// Export singleton instance
export default new SolanaWalletManager();

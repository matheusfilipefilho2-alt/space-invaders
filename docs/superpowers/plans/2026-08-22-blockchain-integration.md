# Blockchain Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Space Invaders into a Web3 game with true asset ownership on Solana blockchain

**Architecture:** Hybrid system where gameplay stays off-chain (fast/free) but players can opt-in to convert items to NFTs and coins to SPL tokens. Client-side direct approach using Solana Wallet Adapter, Metaplex for NFTs, and custom Anchor program for marketplace.

**Tech Stack:** Solana (Devnet/Mainnet), @solana/web3.js, @solana/wallet-adapter, Metaplex JS SDK, Anchor framework, SPL Token, Supabase (PostgreSQL)

## Global Constraints

- Use Solana Devnet for development/testing, Mainnet for production
- SPL Token decimals: 9 (standard)
- NFT royalties: 5% (500 basis points)
- Marketplace fee: 2.5%
- Rate limits: 5 withdrawals/hour, 10 deposits/hour, 3 mints/day
- Maximum transaction amount: 10,000 coins/tokens
- Only permanent items (skins, cosmetics) can become NFTs
- Burn NFTs permanently when converting back to in-game items
- All Web3 features are optional (player can play without wallet)

---

## PHASE 1: FOUNDATION (Wallet Connection + Database)

### Task 1: Database Schema Setup

**Files:**
- Create: `migrations/001_blockchain_tables.sql`
- Modify: none

**Interfaces:**
- Consumes: Existing Supabase connection
- Produces: 5 new tables (player_wallets, token_transactions, nft_metadata, marketplace_listings, marketplace_sales, rate_limits)

- [ ] **Step 1: Create migration file**

Create `migrations/001_blockchain_tables.sql`:

```sql
-- player_wallets: Maps player_id to Solana wallet address
CREATE TABLE player_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    wallet_address TEXT UNIQUE NOT NULL,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_primary BOOLEAN DEFAULT true,

    UNIQUE(player_id, wallet_address)
);

CREATE INDEX idx_player_wallets_player ON player_wallets(player_id);
CREATE INDEX idx_player_wallets_address ON player_wallets(wallet_address);

-- token_transactions: Logs coin↔token conversions
CREATE TABLE token_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    type TEXT NOT NULL CHECK (type IN ('WITHDRAW', 'DEPOSIT')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    tx_signature TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_token_tx_player ON token_transactions(player_id);
CREATE INDEX idx_token_tx_signature ON token_transactions(tx_signature);
CREATE INDEX idx_token_tx_status ON token_transactions(status);

-- nft_metadata: Cache of minted NFTs
CREATE TABLE nft_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mint_address TEXT UNIQUE NOT NULL,
    player_id UUID REFERENCES players(id),
    item_id TEXT NOT NULL,
    name TEXT,
    image_url TEXT,
    metadata_uri TEXT,
    rarity TEXT,
    minted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    burned_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_nft_mint ON nft_metadata(mint_address);
CREATE INDEX idx_nft_player ON nft_metadata(player_id);
CREATE INDEX idx_nft_burned ON nft_metadata(burned_at) WHERE burned_at IS NOT NULL;

-- marketplace_listings: Active and historical listings
CREATE TABLE marketplace_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_address TEXT UNIQUE NOT NULL,
    seller_wallet TEXT NOT NULL,
    nft_mint TEXT NOT NULL,
    price BIGINT NOT NULL CHECK (price > 0),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SOLD', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sold_at TIMESTAMP WITH TIME ZONE,
    buyer_wallet TEXT
);

CREATE INDEX idx_listings_status ON marketplace_listings(status);
CREATE INDEX idx_listings_seller ON marketplace_listings(seller_wallet);
CREATE INDEX idx_listings_nft ON marketplace_listings(nft_mint);
CREATE INDEX idx_listings_price ON marketplace_listings(price) WHERE status = 'ACTIVE';

-- marketplace_sales: Completed sales history
CREATE TABLE marketplace_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_address TEXT NOT NULL,
    seller TEXT NOT NULL,
    buyer TEXT NOT NULL,
    nft_mint TEXT NOT NULL,
    price BIGINT NOT NULL,
    royalty BIGINT NOT NULL,
    marketplace_fee BIGINT NOT NULL,
    tx_signature TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sales_nft ON marketplace_sales(nft_mint);
CREATE INDEX idx_sales_seller ON marketplace_sales(seller);
CREATE INDEX idx_sales_buyer ON marketplace_sales(buyer);

-- rate_limits: Track action frequency for abuse prevention
CREATE TABLE rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_player_action
    ON rate_limits(player_id, action, created_at);

-- Add NFT tracking columns to player_items
ALTER TABLE player_items
ADD COLUMN nft_mint_address TEXT,
ADD COLUMN is_on_chain BOOLEAN DEFAULT false,
ADD COLUMN minted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN burned_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_player_items_nft ON player_items(nft_mint_address);
CREATE INDEX idx_player_items_on_chain ON player_items(is_on_chain);
```

- [ ] **Step 2: Run migration in Supabase**

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the SQL from `migrations/001_blockchain_tables.sql`
3. Click "Run"
4. Verify tables created: Check "Table Editor" sidebar

Expected: 5 new tables + 2 new columns in player_items

- [ ] **Step 3: Commit**

```bash
git add migrations/001_blockchain_tables.sql
git commit -m "feat(db): add blockchain integration tables

- Add player_wallets for wallet connections
- Add token_transactions for coin conversion logs
- Add nft_metadata for NFT cache
- Add marketplace_listings for sale tracking
- Add marketplace_sales for historical sales
- Add rate_limits for abuse prevention
- Extend player_items with NFT tracking columns

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Supabase RPC Functions for Security

**Files:**
- Create: `migrations/002_blockchain_rpcs.sql`

**Interfaces:**
- Consumes: Tables from Task 1
- Produces: RPC functions (check_rate_limit, withdraw_coins, deposit_coins, restore_item_from_nft)

- [ ] **Step 1: Create RPC functions file**

Create `migrations/002_blockchain_rpcs.sql`:

```sql
-- Rate limiting function
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_player_id UUID,
    p_action TEXT,
    p_max_count INTEGER,
    p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    action_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO action_count
    FROM rate_limits
    WHERE player_id = p_player_id
        AND action = p_action
        AND created_at > NOW() - INTERVAL '1 second' * p_window_seconds;

    IF action_count >= p_max_count THEN
        RETURN false;
    END IF;

    INSERT INTO rate_limits (player_id, action)
    VALUES (p_player_id, p_action);

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Withdraw coins (in-game → blockchain preparation)
CREATE OR REPLACE FUNCTION withdraw_coins(
    p_user_id UUID,
    p_amount INTEGER
) RETURNS JSON AS $$
DECLARE
    user_coins INTEGER;
BEGIN
    -- Lock row (prevent race condition)
    SELECT coins INTO user_coins
    FROM players
    WHERE id = p_user_id
    FOR UPDATE;

    -- Validate caller is owner (RLS check)
    IF p_user_id != auth.uid() THEN
        RETURN json_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- Check balance
    IF user_coins < p_amount THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- Check limits (anti-abuse)
    IF p_amount > 10000 THEN
        RETURN json_build_object('success', false, 'error', 'Amount too large');
    END IF;

    IF p_amount < 10 THEN
        RETURN json_build_object('success', false, 'error', 'Amount too small');
    END IF;

    -- Deduct coins
    UPDATE players
    SET coins = coins - p_amount
    WHERE id = p_user_id;

    RETURN json_build_object('success', true, 'new_balance', user_coins - p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deposit coins (blockchain → in-game)
CREATE OR REPLACE FUNCTION deposit_coins(
    p_user_id UUID,
    p_amount INTEGER,
    p_tx_signature TEXT
) RETURNS JSON AS $$
BEGIN
    -- Check if signature already used (prevent replay)
    IF EXISTS (
        SELECT 1 FROM token_transactions
        WHERE tx_signature = p_tx_signature
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already processed');
    END IF;

    -- Validate amount
    IF p_amount < 10 OR p_amount > 10000 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid amount');
    END IF;

    -- Add coins
    UPDATE players
    SET coins = coins + p_amount
    WHERE id = p_user_id;

    -- Log transaction
    INSERT INTO token_transactions (
        player_id, type, amount, tx_signature, status
    ) VALUES (
        p_user_id, 'DEPOSIT', p_amount, p_tx_signature, 'CONFIRMED'
    );

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore item from burned NFT
CREATE OR REPLACE FUNCTION restore_item_from_nft(
    p_player_id UUID,
    p_item_id TEXT,
    p_nft_mint TEXT
) RETURNS JSON AS $$
BEGIN
    -- Mark NFT as burned
    UPDATE nft_metadata
    SET burned_at = NOW()
    WHERE mint_address = p_nft_mint;

    -- Check if item already exists
    IF EXISTS (
        SELECT 1 FROM player_items
        WHERE player_id = p_player_id
            AND item_id = p_item_id
            AND is_on_chain = false
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Item already in inventory');
    END IF;

    -- Restore item
    INSERT INTO player_items (
        player_id, item_id, acquired_at
    ) VALUES (
        p_player_id, p_item_id, NOW()
    );

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old rate limits (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limits() RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 2: Run RPC functions in Supabase**

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the SQL from `migrations/002_blockchain_rpcs.sql`
3. Click "Run"
4. Verify functions created: Check Database → Functions

Expected: 4 new functions visible in function list

- [ ] **Step 3: Enable Row Level Security**

Run in Supabase SQL Editor:

```sql
-- Enable RLS on sensitive tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users manage own wallet"
    ON player_wallets
    FOR ALL
    USING (player_id = auth.uid());

CREATE POLICY "Users view own transactions"
    ON token_transactions
    FOR SELECT
    USING (player_id = auth.uid());
```

Expected: RLS enabled, policies created

- [ ] **Step 4: Commit**

```bash
git add migrations/002_blockchain_rpcs.sql
git commit -m "feat(db): add blockchain RPC functions

- Add check_rate_limit for abuse prevention
- Add withdraw_coins with validation and locking
- Add deposit_coins with replay protection
- Add restore_item_from_nft for burn→item flow
- Add cleanup_rate_limits for maintenance
- Enable RLS and policies for security

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Solana Config File

**Files:**
- Create: `src/config/solana-config.js`

**Interfaces:**
- Consumes: none
- Produces: SOLANA_CONFIG object with network settings and addresses

- [ ] **Step 1: Create config file**

Create `src/config/solana-config.js`:

```javascript
// Solana Blockchain Configuration
// Toggle between devnet (testing) and mainnet (production)

const NETWORK = 'devnet'; // Change to 'mainnet-beta' for production

export const SOLANA_CONFIG = {
    // Network
    network: NETWORK,
    rpcEndpoint: NETWORK === 'devnet'
        ? 'https://api.devnet.solana.com'
        : 'https://api.mainnet-beta.solana.com',

    // SPL Token (SPACE)
    // TODO: Deploy token and update these addresses
    spaceTokenMint: NETWORK === 'devnet'
        ? null  // Deploy token first
        : null, // Deploy token first

    // NFT Collection
    // TODO: Create collection and update address
    collectionMint: NETWORK === 'devnet'
        ? null  // Create collection first
        : null, // Create collection first

    // Marketplace Program
    // TODO: Deploy program and update address
    marketplaceProgramId: NETWORK === 'devnet'
        ? null  // Deploy program first
        : null, // Deploy program first

    // Project Wallets
    // TODO: Update with your actual wallet addresses
    creatorWallet: NETWORK === 'devnet'
        ? null  // Your devnet wallet
        : null, // Your mainnet wallet

    marketplaceFeeWallet: NETWORK === 'devnet'
        ? null  // Your devnet wallet
        : null, // Your mainnet wallet

    // Royalties
    royaltyBasisPoints: 500, // 5%

    // Marketplace
    marketplaceFeeBasisPoints: 250, // 2.5%

    // Rate Limits
    rateLimits: {
        WITHDRAW: { max: 5, windowSeconds: 3600 },      // 5 per hour
        DEPOSIT: { max: 10, windowSeconds: 3600 },       // 10 per hour
        MINT_NFT: { max: 3, windowSeconds: 86400 },      // 3 per day
        LIST_NFT: { max: 20, windowSeconds: 86400 },     // 20 per day
        MAKE_OFFER: { max: 50, windowSeconds: 86400 }    // 50 per day
    },

    // Transaction Limits
    minAmount: 10,       // Minimum coins/tokens per transaction
    maxAmount: 10000,    // Maximum coins/tokens per transaction

    // Confirmation
    commitment: 'confirmed'
};

export default SOLANA_CONFIG;
```

- [ ] **Step 2: Verify file structure**

Check that file is in correct location:
```bash
ls -la src/config/solana-config.js
```

Expected: File exists at `src/config/solana-config.js`

- [ ] **Step 3: Commit**

```bash
git add src/config/solana-config.js
git commit -m "feat(config): add Solana blockchain configuration

- Add network settings (devnet/mainnet toggle)
- Add placeholder addresses for token, NFT collection, program
- Add rate limits and transaction constraints
- Add royalty and fee configurations

Addresses will be updated after deployment.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: SolanaWalletManager Class

**Files:**
- Create: `src/classes/SolanaWalletManager.js`

**Interfaces:**
- Consumes: SOLANA_CONFIG from Task 3
- Produces: SolanaWalletManager (singleton) with methods: connect(), disconnect(), getConnection(), getPublicKey()

- [ ] **Step 1: Create wallet manager class**

Create `src/classes/SolanaWalletManager.js`:

```javascript
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
```

- [ ] **Step 2: Add CDN scripts to HTML files**

Add to ALL HTML files (before closing `</body>`):

```html
<!-- Solana Web3.js -->
<script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js"></script>

<!-- SPL Token -->
<script src="https://unpkg.com/@solana/spl-token@latest/lib/index.iife.js"></script>
```

Files to update:
- `index.html`
- `login.html`
- `register.html`
- `ranking.html`
- `game.html`
- `shop.html`

Expected: Scripts load before app code

- [ ] **Step 3: Test wallet detection**

Open browser console and test:
```javascript
console.log('Phantom installed?', !!window.solana);
```

Expected: If Phantom installed, logs `true`

- [ ] **Step 4: Commit**

```bash
git add src/classes/SolanaWalletManager.js index.html login.html register.html ranking.html game.html shop.html
git commit -m "feat(web3): add Solana wallet manager

- Create SolanaWalletManager singleton class
- Implement connect/disconnect with Phantom
- Add auto-reconnect on page load
- Link wallet to player account in Supabase
- Add address validation utility
- Add Solana Web3.js and SPL Token CDN scripts

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Wallet UI Components

**Files:**
- Create: `src/styles/wallet-ui.css`
- Modify: All HTML files (add wallet button to header)

**Interfaces:**
- Consumes: SolanaWalletManager from Task 4
- Produces: Wallet connect button UI in all pages

- [ ] **Step 1: Create wallet UI styles**

Create `src/styles/wallet-ui.css`:

```css
/* Wallet Connection UI */
.header-wallet {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 10px;
}

.wallet-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    transition: all 0.3s;
    display: flex;
    align-items: center;
    gap: 8px;
}

.wallet-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.wallet-btn:active {
    transform: translateY(0);
}

#wallet-display {
    background: rgba(0, 0, 0, 0.8);
    padding: 10px 16px;
    border-radius: 12px;
    border: 2px solid #667eea;
    color: white;
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    display: none;
    align-items: center;
    gap: 10px;
}

.wallet-icon {
    font-size: 14px;
}

#wallet-address {
    color: #667eea;
}

#wallet-disconnect-btn {
    background: transparent;
    border: none;
    color: #ff6b6b;
    cursor: pointer;
    font-size: 12px;
    padding: 0;
    transition: transform 0.2s;
}

#wallet-disconnect-btn:hover {
    transform: scale(1.2);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
    .header-wallet {
        top: 10px;
        right: 10px;
    }

    .wallet-btn {
        padding: 8px 16px;
        font-size: 8px;
    }

    #wallet-display {
        padding: 8px 12px;
        font-size: 7px;
    }
}
```

- [ ] **Step 2: Add wallet button to all HTML files**

Add this HTML to ALL pages (after opening `<body>` tag):

```html
<!-- Wallet Connection -->
<div class="header-wallet">
    <button id="wallet-connect-btn" class="wallet-btn">
        <span>🔗</span> Conectar Wallet
    </button>

    <div id="wallet-display" style="display: none;">
        <span class="wallet-icon">👛</span>
        <span id="wallet-address">...</span>
        <button id="wallet-disconnect-btn">❌</button>
    </div>
</div>
```

And add this script (before closing `</body>`):

```html
<script type="module">
    import walletManager from './src/classes/SolanaWalletManager.js';

    document.getElementById('wallet-connect-btn')
        ?.addEventListener('click', () => walletManager.connect());

    document.getElementById('wallet-disconnect-btn')
        ?.addEventListener('click', () => walletManager.disconnect());
</script>
```

And link the CSS (in `<head>`):

```html
<link rel="stylesheet" href="src/styles/wallet-ui.css" />
```

Files to update:
- `index.html`
- `login.html`
- `register.html`
- `ranking.html`
- `game.html`
- `shop.html`

- [ ] **Step 3: Test wallet UI**

1. Open any page in browser
2. Should see "🔗 Conectar Wallet" button in top-right
3. Click button
4. Phantom should open and request connection
5. After connecting, should see "👛 7xK9...mP4z ❌"

Expected: Wallet connects and UI updates

- [ ] **Step 4: Commit**

```bash
git add src/styles/wallet-ui.css index.html login.html register.html ranking.html game.html shop.html
git commit -m "feat(ui): add wallet connection UI components

- Create wallet-ui.css with modern gradient design
- Add wallet connect button to all pages
- Add wallet display with address truncation
- Add disconnect button
- Add mobile responsive styles
- Wire up click handlers to WalletManager

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## PHASE 2: SPL TOKEN SYSTEM

### Task 6: Deploy SPACE Token (Manual Step)

**Files:**
- Modify: `src/config/solana-config.js`

**Interfaces:**
- Consumes: Solana Devnet connection
- Produces: SPACE token mint address

**⚠️ MANUAL DEPLOYMENT REQUIRED**

This task requires running Solana CLI commands. You cannot automate this in code.

- [ ] **Step 1: Install Solana CLI**

```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"
```

Verify installation:
```bash
solana --version
```

Expected: `solana-cli 1.17.0` or later

- [ ] **Step 2: Create Devnet wallet**

```bash
solana-keygen new --outfile ~/.config/solana/devnet-wallet.json
```

Save the seed phrase securely!

- [ ] **Step 3: Configure Solana CLI for Devnet**

```bash
solana config set --url devnet
solana config set --keypair ~/.config/solana/devnet-wallet.json
```

- [ ] **Step 4: Airdrop SOL for gas fees**

```bash
solana airdrop 2
```

Check balance:
```bash
solana balance
```

Expected: ~2 SOL

- [ ] **Step 5: Create SPACE token**

```bash
spl-token create-token --decimals 9
```

Output will be: `Creating token [MINT_ADDRESS]`

**Copy the MINT_ADDRESS!**

- [ ] **Step 6: Create token account**

```bash
spl-token create-account [MINT_ADDRESS]
```

Replace `[MINT_ADDRESS]` with the address from Step 5.

- [ ] **Step 7: Update solana-config.js**

Edit `src/config/solana-config.js`:

```javascript
// Replace the null values with your actual addresses
spaceTokenMint: NETWORK === 'devnet'
    ? '[YOUR_DEVNET_MINT_ADDRESS]'  // Paste address from Step 5
    : null,

creatorWallet: NETWORK === 'devnet'
    ? '[YOUR_DEVNET_WALLET_ADDRESS]'  // From: solana address
    : null,

marketplaceFeeWallet: NETWORK === 'devnet'
    ? '[YOUR_DEVNET_WALLET_ADDRESS]'  // Same as creator for now
    : null,
```

Get your wallet address:
```bash
solana address
```

- [ ] **Step 8: Verify token creation**

```bash
spl-token supply [MINT_ADDRESS]
```

Expected: `0` (no tokens minted yet)

- [ ] **Step 9: Commit**

```bash
git add src/config/solana-config.js
git commit -m "feat(token): deploy SPACE token on Devnet

- Create SPL token with 9 decimals
- Update config with token mint address
- Update config with creator wallet address
- Ready for minting operations

Token Mint: [MINT_ADDRESS]
Creator: [WALLET_ADDRESS]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: TokenManager Class

**Files:**
- Create: `src/classes/TokenManager.js`

**Interfaces:**
- Consumes: SolanaWalletManager, SOLANA_CONFIG, supabase
- Produces: TokenManager with methods: withdrawCoins(), depositCoins(), getTokenBalance()

- [ ] **Step 1: Create TokenManager class**

Create `src/classes/TokenManager.js`:

```javascript
import {
    Transaction,
    PublicKey,
    SystemProgram
} from '@solana/web3.js';
import {
    createMintToInstruction,
    createBurnInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    getAccount
} from '@solana/spl-token';
import walletManager from './SolanaWalletManager.js';
import SOLANA_CONFIG from '../config/solana-config.js';
import { supabase } from '../supabase.js';
import { NavigationHelper } from '../navigation.js';

class TokenManager {
    constructor() {
        this.connection = walletManager.getConnection();
    }

    // Validate withdrawal amount
    validateAmount(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) {
            throw new Error('Amount must be a number');
        }

        if (amount <= 0 || !Number.isInteger(amount)) {
            throw new Error('Amount must be a positive integer');
        }

        if (amount < SOLANA_CONFIG.minAmount) {
            throw new Error(`Minimum amount is ${SOLANA_CONFIG.minAmount}`);
        }

        if (amount > SOLANA_CONFIG.maxAmount) {
            throw new Error(`Maximum amount is ${SOLANA_CONFIG.maxAmount}`);
        }

        return true;
    }

    // Withdraw coins from game → SPACE tokens on blockchain
    async withdrawCoins(amount) {
        try {
            console.log('💰 Iniciando saque de', amount, 'moedas...');

            // Validate
            this.validateAmount(amount);

            // Check wallet connected
            const playerWallet = walletManager.getPublicKey();
            if (!playerWallet) {
                throw new Error('Wallet not connected');
            }

            const currentUser = NavigationHelper.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not logged in');
            }

            // Check rate limit
            const { data: canProceed } = await supabase.rpc('check_rate_limit', {
                p_player_id: currentUser.id,
                p_action: 'WITHDRAW',
                p_max_count: SOLANA_CONFIG.rateLimits.WITHDRAW.max,
                p_window_seconds: SOLANA_CONFIG.rateLimits.WITHDRAW.windowSeconds
            });

            if (!canProceed) {
                throw new Error('Rate limit exceeded. Wait 1 hour.');
            }

            // Deduct coins from Supabase (atomic)
            console.log('📊 Deduzindo moedas do Supabase...');
            const { data: withdrawResult, error: withdrawError } = await supabase
                .rpc('withdraw_coins', {
                    p_user_id: currentUser.id,
                    p_amount: amount
                });

            if (withdrawError || !withdrawResult.success) {
                throw new Error(withdrawResult?.error || withdrawError.message);
            }

            console.log('✅ Moedas deduzidas. Novo saldo:', withdrawResult.new_balance);

            // Mint tokens on Solana
            console.log('⛓️ Mintando SPACE tokens...');
            const signature = await this.mintTokens(playerWallet, amount);

            console.log('✅ Tokens mintados! TX:', signature);

            // Log transaction
            await supabase
                .from('token_transactions')
                .insert({
                    player_id: currentUser.id,
                    type: 'WITHDRAW',
                    amount: amount,
                    tx_signature: signature,
                    status: 'CONFIRMED',
                    confirmed_at: new Date().toISOString()
                });

            // Update local user balance
            currentUser.coins = withdrawResult.new_balance;
            NavigationHelper.setCurrentUser(currentUser);

            return {
                success: true,
                signature: signature,
                newBalance: withdrawResult.new_balance
            };

        } catch (err) {
            console.error('❌ Erro no saque:', err);
            throw err;
        }
    }

    // Mint SPACE tokens to player wallet
    async mintTokens(playerWallet, amount) {
        const tokenMint = new PublicKey(SOLANA_CONFIG.spaceTokenMint);
        const mintAuthority = new PublicKey(SOLANA_CONFIG.creatorWallet);

        // Get or create player's token account
        const playerTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            playerWallet
        );

        // Check if account exists
        let accountExists = true;
        try {
            await getAccount(this.connection, playerTokenAccount);
        } catch {
            accountExists = false;
        }

        const tx = new Transaction();

        // Create account if needed
        if (!accountExists) {
            tx.add(
                createAssociatedTokenAccountInstruction(
                    playerWallet,           // Payer
                    playerTokenAccount,     // Account to create
                    playerWallet,           // Owner
                    tokenMint              // Mint
                )
            );
        }

        // Mint tokens
        tx.add(
            createMintToInstruction(
                tokenMint,
                playerTokenAccount,
                mintAuthority,
                amount * 10**9  // Convert to lamports (9 decimals)
            )
        );

        // Sign and send (player pays gas fee)
        tx.feePayer = playerWallet;
        tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

        // Request signature from wallet
        const signedTx = await window.solana.signTransaction(tx);
        const signature = await this.connection.sendRawTransaction(signedTx.serialize());

        // Confirm
        await this.connection.confirmTransaction(signature, SOLANA_CONFIG.commitment);

        return signature;
    }

    // Deposit SPACE tokens from blockchain → coins in game
    async depositCoins(amount) {
        try {
            console.log('💰 Iniciando depósito de', amount, 'tokens...');

            // Validate
            this.validateAmount(amount);

            const playerWallet = walletManager.getPublicKey();
            if (!playerWallet) {
                throw new Error('Wallet not connected');
            }

            const currentUser = NavigationHelper.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not logged in');
            }

            // Check rate limit
            const { data: canProceed } = await supabase.rpc('check_rate_limit', {
                p_player_id: currentUser.id,
                p_action: 'DEPOSIT',
                p_max_count: SOLANA_CONFIG.rateLimits.DEPOSIT.max,
                p_window_seconds: SOLANA_CONFIG.rateLimits.DEPOSIT.windowSeconds
            });

            if (!canProceed) {
                throw new Error('Rate limit exceeded. Wait 1 hour.');
            }

            // Burn tokens on Solana
            console.log('🔥 Queimando SPACE tokens...');
            const signature = await this.burnTokens(playerWallet, amount);

            console.log('✅ Tokens queimados! TX:', signature);

            // Add coins to Supabase
            console.log('📊 Adicionando moedas ao Supabase...');
            const { data: depositResult, error: depositError } = await supabase
                .rpc('deposit_coins', {
                    p_user_id: currentUser.id,
                    p_amount: amount,
                    p_tx_signature: signature
                });

            if (depositError || !depositResult.success) {
                throw new Error(depositResult?.error || depositError.message);
            }

            console.log('✅ Moedas adicionadas!');

            // Update local user balance
            const { data: updatedUser } = await supabase
                .from('players')
                .select('coins')
                .eq('id', currentUser.id)
                .single();

            if (updatedUser) {
                currentUser.coins = updatedUser.coins;
                NavigationHelper.setCurrentUser(currentUser);
            }

            return {
                success: true,
                signature: signature,
                newBalance: updatedUser?.coins
            };

        } catch (err) {
            console.error('❌ Erro no depósito:', err);
            throw err;
        }
    }

    // Burn SPACE tokens from player wallet
    async burnTokens(playerWallet, amount) {
        const tokenMint = new PublicKey(SOLANA_CONFIG.spaceTokenMint);

        const playerTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            playerWallet
        );

        const tx = new Transaction().add(
            createBurnInstruction(
                playerTokenAccount,
                tokenMint,
                playerWallet,
                amount * 10**9
            )
        );

        tx.feePayer = playerWallet;
        tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

        const signedTx = await window.solana.signTransaction(tx);
        const signature = await this.connection.sendRawTransaction(signedTx.serialize());

        await this.connection.confirmTransaction(signature, SOLANA_CONFIG.commitment);

        return signature;
    }

    // Get player's SPACE token balance
    async getTokenBalance(playerWallet) {
        try {
            const tokenMint = new PublicKey(SOLANA_CONFIG.spaceTokenMint);
            const playerTokenAccount = await getAssociatedTokenAddress(
                tokenMint,
                playerWallet || walletManager.getPublicKey()
            );

            const accountInfo = await getAccount(this.connection, playerTokenAccount);
            return Number(accountInfo.amount) / 10**9;

        } catch (err) {
            // Account doesn't exist yet
            return 0;
        }
    }
}

export default new TokenManager();
```

- [ ] **Step 2: Verify imports work**

Open browser console and test:
```javascript
import('./src/classes/TokenManager.js').then(m => console.log('TokenManager loaded:', m.default));
```

Expected: `TokenManager loaded: Object`

- [ ] **Step 3: Commit**

```bash
git add src/classes/TokenManager.js
git commit -m "feat(token): add TokenManager for coin conversion

- Implement withdrawCoins (in-game → blockchain)
- Implement depositCoins (blockchain → in-game)
- Add mintTokens helper (create SPACE tokens)
- Add burnTokens helper (destroy SPACE tokens)
- Add getTokenBalance query
- Include amount validation and rate limiting
- Handle token account creation automatically

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Token Bridge UI

**Files:**
- Create: `token-bridge.html`
- Create: `src/styles/token-bridge.css`
- Create: `src/token-bridge.js`

**Interfaces:**
- Consumes: TokenManager (Task 7), SolanaWalletManager (Task 4)
- Produces: UI for coin↔token conversion with balance display

- [ ] **Step 1: Create token bridge HTML page**

Create `token-bridge.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Token Bridge - Space Invaders</title>
    <link rel="stylesheet" href="src/styles/token-bridge.css">
    <link rel="stylesheet" href="src/styles/wallet-ui.css">
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
</head>
<body>
    <!-- Wallet Connection -->
    <div class="header-wallet">
        <button id="wallet-connect-btn" class="wallet-btn">
            <span>🔗</span> Conectar Wallet
        </button>

        <div id="wallet-display" style="display: none;">
            <span class="wallet-icon">👛</span>
            <span id="wallet-address">...</span>
            <button id="wallet-disconnect-btn">❌</button>
        </div>
    </div>

    <div class="container">
        <h1 class="title">⚡ Token Bridge</h1>
        <p class="subtitle">Converta suas moedas em SPACE tokens</p>

        <!-- Balance Display -->
        <div class="balance-section">
            <div class="balance-card">
                <div class="balance-label">🪙 In-Game</div>
                <div id="coin-balance" class="balance-value">0</div>
                <div class="balance-unit">moedas</div>
            </div>

            <div class="bridge-arrow">⇄</div>

            <div class="balance-card">
                <div class="balance-label">⚡ Blockchain</div>
                <div id="token-balance" class="balance-value">0</div>
                <div class="balance-unit">SPACE</div>
            </div>
        </div>

        <!-- Conversion Form -->
        <div class="conversion-section">
            <div class="tabs">
                <button id="tab-withdraw" class="tab active">Sacar (→ Blockchain)</button>
                <button id="tab-deposit" class="tab">Depositar (← Blockchain)</button>
            </div>

            <div id="withdraw-form" class="form-section">
                <label for="withdraw-amount">Quantidade (10-10,000)</label>
                <input type="number" id="withdraw-amount" min="10" max="10000" placeholder="Ex: 100">

                <div class="info-box">
                    ℹ️ Você pagará taxa de gás (SOL) para mintar tokens
                </div>

                <button id="btn-withdraw" class="action-btn primary">
                    🚀 Sacar para Blockchain
                </button>
            </div>

            <div id="deposit-form" class="form-section" style="display: none;">
                <label for="deposit-amount">Quantidade (10-10,000)</label>
                <input type="number" id="deposit-amount" min="10" max="10000" placeholder="Ex: 50">

                <div class="info-box">
                    ℹ️ Tokens serão queimados permanentemente
                </div>

                <button id="btn-deposit" class="action-btn primary">
                    🔥 Depositar no Game
                </button>
            </div>
        </div>

        <!-- Transaction History -->
        <div class="history-section">
            <h2>📜 Histórico de Transações</h2>
            <div id="transaction-list" class="transaction-list">
                <p class="empty-state">Nenhuma transação ainda</p>
            </div>
        </div>

        <!-- Back Button -->
        <button class="back-btn" onclick="location.href='ranking.html'">
            ← Voltar
        </button>
    </div>

    <!-- Loading Overlay -->
    <div id="loading-overlay" class="loading-overlay" style="display: none;">
        <div class="loading-spinner"></div>
        <p id="loading-message">Processando...</p>
    </div>

    <!-- Solana Web3.js -->
    <script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js"></script>
    <script src="https://unpkg.com/@solana/spl-token@latest/lib/index.iife.js"></script>

    <script type="module" src="src/token-bridge.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create token bridge CSS**

Create `src/styles/token-bridge.css`:

```css
body {
    margin: 0;
    padding: 0;
    font-family: 'Press Start 2P', monospace;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    color: white;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

.container {
    max-width: 800px;
    width: 90%;
    padding: 40px;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 20px;
    border: 2px solid #667eea;
    box-shadow: 0 20px 60px rgba(102, 126, 234, 0.4);
}

.title {
    font-size: 24px;
    text-align: center;
    margin-bottom: 10px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.subtitle {
    font-size: 10px;
    text-align: center;
    color: #aaa;
    margin-bottom: 40px;
}

/* Balance Cards */
.balance-section {
    display: flex;
    justify-content: space-around;
    align-items: center;
    margin-bottom: 40px;
    gap: 20px;
}

.balance-card {
    flex: 1;
    background: rgba(102, 126, 234, 0.1);
    border: 2px solid #667eea;
    border-radius: 15px;
    padding: 20px;
    text-align: center;
}

.balance-label {
    font-size: 10px;
    color: #667eea;
    margin-bottom: 10px;
}

.balance-value {
    font-size: 28px;
    color: white;
    margin: 10px 0;
}

.balance-unit {
    font-size: 8px;
    color: #aaa;
}

.bridge-arrow {
    font-size: 32px;
    color: #667eea;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* Tabs */
.tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.tab {
    flex: 1;
    padding: 15px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid #667eea;
    border-radius: 10px;
    color: white;
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    cursor: pointer;
    transition: all 0.3s;
}

.tab.active {
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-color: #764ba2;
}

.tab:hover {
    transform: translateY(-2px);
}

/* Forms */
.form-section {
    margin-bottom: 30px;
}

label {
    display: block;
    font-size: 10px;
    margin-bottom: 10px;
    color: #667eea;
}

input[type="number"] {
    width: 100%;
    padding: 15px;
    font-size: 16px;
    font-family: 'Press Start 2P', monospace;
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid #667eea;
    border-radius: 10px;
    color: white;
    margin-bottom: 15px;
}

input[type="number"]:focus {
    outline: none;
    border-color: #764ba2;
    box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
}

.info-box {
    background: rgba(255, 193, 7, 0.1);
    border: 2px solid #ffc107;
    border-radius: 10px;
    padding: 10px;
    font-size: 8px;
    color: #ffc107;
    margin-bottom: 15px;
}

.action-btn {
    width: 100%;
    padding: 18px;
    font-family: 'Press Start 2P', monospace;
    font-size: 12px;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s;
}

.action-btn.primary {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.action-btn.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.action-btn.primary:active {
    transform: translateY(0);
}

.action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Transaction History */
.history-section {
    margin-top: 40px;
    padding-top: 30px;
    border-top: 2px solid #667eea;
}

.history-section h2 {
    font-size: 14px;
    margin-bottom: 20px;
}

.transaction-list {
    max-height: 300px;
    overflow-y: auto;
}

.transaction-item {
    background: rgba(102, 126, 234, 0.1);
    border: 1px solid #667eea;
    border-radius: 10px;
    padding: 15px;
    margin-bottom: 10px;
    font-size: 8px;
}

.transaction-item .tx-type {
    color: #667eea;
    font-weight: bold;
}

.transaction-item .tx-amount {
    color: #4caf50;
    font-size: 10px;
}

.transaction-item .tx-signature {
    color: #aaa;
    font-size: 7px;
    word-break: break-all;
}

.empty-state {
    text-align: center;
    color: #aaa;
    font-size: 10px;
    padding: 40px;
}

/* Back Button */
.back-btn {
    margin-top: 30px;
    padding: 12px 24px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid #667eea;
    border-radius: 10px;
    color: white;
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    cursor: pointer;
    transition: all 0.3s;
}

.back-btn:hover {
    background: rgba(255, 255, 255, 0.2);
}

/* Loading Overlay */
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.loading-spinner {
    border: 4px solid rgba(102, 126, 234, 0.3);
    border-top: 4px solid #667eea;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

#loading-message {
    margin-top: 20px;
    font-size: 12px;
    color: #667eea;
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .balance-section {
        flex-direction: column;
    }

    .bridge-arrow {
        transform: rotate(90deg);
    }

    .tabs {
        flex-direction: column;
    }

    .title {
        font-size: 18px;
    }

    .balance-value {
        font-size: 20px;
    }
}
```

- [ ] **Step 3: Create token bridge JavaScript**

Create `src/token-bridge.js`:

```javascript
import walletManager from './classes/SolanaWalletManager.js';
import tokenManager from './classes/TokenManager.js';
import { NavigationHelper } from './navigation.js';
import { supabase } from './supabase.js';

// Elements
const coinBalanceEl = document.getElementById('coin-balance');
const tokenBalanceEl = document.getElementById('token-balance');
const withdrawForm = document.getElementById('withdraw-form');
const depositForm = document.getElementById('deposit-form');
const tabWithdraw = document.getElementById('tab-withdraw');
const tabDeposit = document.getElementById('tab-deposit');
const btnWithdraw = document.getElementById('btn-withdraw');
const btnDeposit = document.getElementById('btn-deposit');
const withdrawAmountInput = document.getElementById('withdraw-amount');
const depositAmountInput = document.getElementById('deposit-amount');
const transactionList = document.getElementById('transaction-list');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingMessage = document.getElementById('loading-message');

// Wire up wallet buttons
document.getElementById('wallet-connect-btn')
    ?.addEventListener('click', () => walletManager.connect());

document.getElementById('wallet-disconnect-btn')
    ?.addEventListener('click', () => walletManager.disconnect());

// Tab switching
tabWithdraw.addEventListener('click', () => {
    tabWithdraw.classList.add('active');
    tabDeposit.classList.remove('active');
    withdrawForm.style.display = 'block';
    depositForm.style.display = 'none';
});

tabDeposit.addEventListener('click', () => {
    tabDeposit.classList.add('active');
    tabWithdraw.classList.remove('active');
    depositForm.style.display = 'block';
    withdrawForm.style.display = 'none';
});

// Withdraw handler
btnWithdraw.addEventListener('click', async () => {
    const amount = parseInt(withdrawAmountInput.value);

    if (!amount || amount < 10 || amount > 10000) {
        alert('Quantidade inválida! (10-10,000)');
        return;
    }

    if (!walletManager.isWalletConnected()) {
        alert('Conecte sua wallet primeiro!');
        return;
    }

    const currentUser = NavigationHelper.getCurrentUser();
    if (!currentUser) {
        alert('Você precisa estar logado!');
        return;
    }

    if (currentUser.coins < amount) {
        alert('Moedas insuficientes!');
        return;
    }

    try {
        showLoading('Processando saque...');
        btnWithdraw.disabled = true;

        const result = await tokenManager.withdrawCoins(amount);

        if (result.success) {
            alert(`✅ Saque realizado!\n\nTX: ${result.signature.slice(0, 8)}...`);
            withdrawAmountInput.value = '';
            await refreshBalances();
            await loadTransactionHistory();
        }

    } catch (err) {
        console.error('Erro ao sacar:', err);
        alert('❌ Erro ao sacar: ' + err.message);
    } finally {
        hideLoading();
        btnWithdraw.disabled = false;
    }
});

// Deposit handler
btnDeposit.addEventListener('click', async () => {
    const amount = parseInt(depositAmountInput.value);

    if (!amount || amount < 10 || amount > 10000) {
        alert('Quantidade inválida! (10-10,000)');
        return;
    }

    if (!walletManager.isWalletConnected()) {
        alert('Conecte sua wallet primeiro!');
        return;
    }

    const currentUser = NavigationHelper.getCurrentUser();
    if (!currentUser) {
        alert('Você precisa estar logado!');
        return;
    }

    // Check token balance
    const tokenBalance = await tokenManager.getTokenBalance();
    if (tokenBalance < amount) {
        alert('Tokens insuficientes na wallet!');
        return;
    }

    try {
        showLoading('Processando depósito...');
        btnDeposit.disabled = true;

        const result = await tokenManager.depositCoins(amount);

        if (result.success) {
            alert(`✅ Depósito realizado!\n\nTX: ${result.signature.slice(0, 8)}...`);
            depositAmountInput.value = '';
            await refreshBalances();
            await loadTransactionHistory();
        }

    } catch (err) {
        console.error('Erro ao depositar:', err);
        alert('❌ Erro ao depositar: ' + err.message);
    } finally {
        hideLoading();
        btnDeposit.disabled = false;
    }
});

// Refresh balances
async function refreshBalances() {
    const currentUser = NavigationHelper.getCurrentUser();
    if (!currentUser) return;

    // In-game coins
    const { data: userData } = await supabase
        .from('players')
        .select('coins')
        .eq('id', currentUser.id)
        .single();

    if (userData) {
        coinBalanceEl.textContent = userData.coins.toLocaleString();
        currentUser.coins = userData.coins;
        NavigationHelper.setCurrentUser(currentUser);
    }

    // Blockchain tokens
    if (walletManager.isWalletConnected()) {
        const tokenBalance = await tokenManager.getTokenBalance();
        tokenBalanceEl.textContent = tokenBalance.toLocaleString();
    } else {
        tokenBalanceEl.textContent = '---';
    }
}

// Load transaction history
async function loadTransactionHistory() {
    const currentUser = NavigationHelper.getCurrentUser();
    if (!currentUser) return;

    const { data: transactions } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('player_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(10);

    if (!transactions || transactions.length === 0) {
        transactionList.innerHTML = '<p class="empty-state">Nenhuma transação ainda</p>';
        return;
    }

    transactionList.innerHTML = transactions.map(tx => `
        <div class="transaction-item">
            <div class="tx-type">${tx.type === 'WITHDRAW' ? '🚀 Saque' : '🔥 Depósito'}</div>
            <div class="tx-amount">${tx.amount} ${tx.type === 'WITHDRAW' ? 'SPACE' : 'moedas'}</div>
            <div class="tx-signature">TX: ${tx.tx_signature.slice(0, 20)}...</div>
            <div style="color: #aaa; font-size: 7px; margin-top: 5px;">
                ${new Date(tx.created_at).toLocaleString('pt-BR')}
            </div>
        </div>
    `).join('');
}

// Loading overlay
function showLoading(message) {
    loadingMessage.textContent = message;
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Initialize
(async () => {
    const currentUser = NavigationHelper.getCurrentUser();
    if (!currentUser) {
        alert('Você precisa estar logado!');
        location.href = 'login.html';
        return;
    }

    await refreshBalances();
    await loadTransactionHistory();

    // Refresh every 10 seconds
    setInterval(refreshBalances, 10000);
})();
```

- [ ] **Step 4: Add link to token bridge in ranking page**

Edit `ranking.html` to add a button to the token bridge. Find the buttons section and add:

```html
<button class="button" onclick="location.href='token-bridge.html'">
    ⚡ Token Bridge
</button>
```

- [ ] **Step 5: Test token bridge UI**

1. Open `token-bridge.html` in browser
2. Login if not logged in
3. Connect wallet
4. Try withdrawing 100 coins

Expected:
- Balances update
- Transaction appears in history
- Wallet shows SPACE tokens

- [ ] **Step 6: Commit**

```bash
git add token-bridge.html src/styles/token-bridge.css src/token-bridge.js ranking.html
git commit -m "feat(ui): add token bridge interface

- Create token-bridge.html with conversion form
- Add balance display for coins and tokens
- Implement withdraw (coins → tokens) flow
- Implement deposit (tokens → coins) flow
- Add transaction history viewer
- Add loading overlay with status messages
- Link from ranking page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## PHASE 3: NFT SYSTEM

### Task 9: Create NFT Collection (Manual Step)

**Files:**
- Modify: `src/config/solana-config.js`

**Interfaces:**
- Consumes: Metaplex CLI, Solana Devnet
- Produces: NFT collection mint address

**⚠️ MANUAL DEPLOYMENT REQUIRED**

- [ ] **Step 1: Install Metaplex Sugar CLI**

```bash
bash <(curl -sSf https://sugar.metaplex.com/install.sh)
```

Verify:
```bash
sugar --version
```

Expected: `sugar-cli 2.x.x` or later

- [ ] **Step 2: Create collection config**

Create `nft-collection/config.json`:

```json
{
  "number": 1,
  "symbol": "SPACESKIN",
  "sellerFeeBasisPoints": 500,
  "isMutable": true,
  "isSequential": false,
  "creators": [
    {
      "address": "[YOUR_CREATOR_WALLET]",
      "share": 100
    }
  ],
  "uploadMethod": "bundlr",
  "awsS3Bucket": null,
  "nftStorageAuthToken": null,
  "shdwStorageAccount": null,
  "pinataJwt": null,
  "pinataGateway": null,
  "awsConfig": null,
  "shdwStorageConfig": null,
  "hiddenSettings": null
}
```

Replace `[YOUR_CREATOR_WALLET]` with your creator wallet address from:
```bash
solana address
```

- [ ] **Step 3: Create collection metadata**

Create `nft-collection/collection.json`:

```json
{
  "name": "Space Invaders Skins",
  "symbol": "SPACESKIN",
  "description": "Exclusive skins for Space Invaders game",
  "seller_fee_basis_points": 500,
  "image": "collection.png",
  "attributes": [],
  "properties": {
    "files": [
      {
        "uri": "collection.png",
        "type": "image/png"
      }
    ],
    "category": "image"
  }
}
```

- [ ] **Step 4: Create collection image**

Create or download a 1000x1000px PNG image for the collection and save as `nft-collection/collection.png`.

- [ ] **Step 5: Deploy collection**

```bash
cd nft-collection
sugar create-config
sugar upload
sugar deploy
```

Output will include: `Collection mint: [COLLECTION_MINT_ADDRESS]`

**Copy the COLLECTION_MINT_ADDRESS!**

- [ ] **Step 6: Verify collection**

```bash
sugar verify
```

Expected: `✅ Verification complete`

- [ ] **Step 7: Update solana-config.js**

Edit `src/config/solana-config.js`:

```javascript
collectionMint: NETWORK === 'devnet'
    ? '[YOUR_COLLECTION_MINT_ADDRESS]'  // Paste address from Step 5
    : null,
```

- [ ] **Step 8: Commit**

```bash
git add nft-collection/ src/config/solana-config.js
git commit -m "feat(nft): create NFT collection on Devnet

- Deploy Space Invaders Skins collection
- Configure 5% royalty for creators
- Add collection metadata and image
- Update config with collection mint address

Collection Mint: [COLLECTION_MINT_ADDRESS]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 10: NFTManager Class

**Files:**
- Create: `src/classes/NFTManager.js`
- Create: `src/data/nft-metadata.json`

**Interfaces:**
- Consumes: SolanaWalletManager, SOLANA_CONFIG, Metaplex SDK
- Produces: NFTManager with methods: mintNFT(), burnNFT(), getNFTsByOwner()

- [ ] **Step 1: Create NFT metadata file**

Create `src/data/nft-metadata.json`:

```json
{
  "skin_01": {
    "name": "Galactic Invader",
    "description": "A shimmering alien from distant galaxies",
    "image": "https://your-cdn.com/skins/skin_01.png",
    "attributes": [
      { "trait_type": "Rarity", "value": "Common" },
      { "trait_type": "Color", "value": "Blue" },
      { "trait_type": "Type", "value": "Alien" }
    ]
  },
  "skin_02": {
    "name": "Neon Phantom",
    "description": "Glowing with radioactive energy",
    "image": "https://your-cdn.com/skins/skin_02.png",
    "attributes": [
      { "trait_type": "Rarity", "value": "Rare" },
      { "trait_type": "Color", "value": "Green" },
      { "trait_type": "Type", "value": "Ghost" }
    ]
  },
  "skin_03": {
    "name": "Chrome Warrior",
    "description": "Forged in the fires of a dying star",
    "image": "https://your-cdn.com/skins/skin_03.png",
    "attributes": [
      { "trait_type": "Rarity", "value": "Epic" },
      { "trait_type": "Color", "value": "Silver" },
      { "trait_type": "Type", "value": "Robot" }
    ]
  }
}
```

**Note:** Replace `https://your-cdn.com` with actual image URLs.

- [ ] **Step 2: Add Metaplex CDN script**

Add to all HTML files (after Solana scripts):

```html
<!-- Metaplex -->
<script src="https://unpkg.com/@metaplex-foundation/js@latest/dist/index.umd.js"></script>
```

- [ ] **Step 3: Create NFTManager class**

Create `src/classes/NFTManager.js`:

```javascript
import walletManager from './SolanaWalletManager.js';
import SOLANA_CONFIG from '../config/solana-config.js';
import { supabase } from '../supabase.js';
import { NavigationHelper } from '../navigation.js';
import { PublicKey } from '@solana/web3.js';

// Import NFT metadata
import nftMetadataDb from '../data/nft-metadata.json' assert { type: 'json' };

class NFTManager {
    constructor() {
        this.connection = walletManager.getConnection();
        this.metaplex = null;
        this.initMetaplex();
    }

    async initMetaplex() {
        const { Metaplex } = window.MetaplexJS;
        const { walletAdapterIdentity } = window.MetaplexJS.walletAdapterIdentity;

        this.metaplex = Metaplex.make(this.connection)
            .use(walletAdapterIdentity(window.solana));
    }

    // Mint item as NFT
    async mintNFT(itemId) {
        try {
            console.log('🎨 Mintando NFT para item:', itemId);

            const playerWallet = walletManager.getPublicKey();
            if (!playerWallet) {
                throw new Error('Wallet not connected');
            }

            const currentUser = NavigationHelper.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not logged in');
            }

            // Check rate limit
            const { data: canProceed } = await supabase.rpc('check_rate_limit', {
                p_player_id: currentUser.id,
                p_action: 'MINT_NFT',
                p_max_count: SOLANA_CONFIG.rateLimits.MINT_NFT.max,
                p_window_seconds: SOLANA_CONFIG.rateLimits.MINT_NFT.windowSeconds
            });

            if (!canProceed) {
                throw new Error('Rate limit: Max 3 NFTs per day');
            }

            // Check if user owns the item
            const { data: playerItem } = await supabase
                .from('player_items')
                .select('*')
                .eq('player_id', currentUser.id)
                .eq('item_id', itemId)
                .eq('is_on_chain', false)
                .single();

            if (!playerItem) {
                throw new Error('Item not found in inventory');
            }

            // Get metadata
            const metadata = nftMetadataDb[itemId];
            if (!metadata) {
                throw new Error('NFT metadata not found');
            }

            // Mint NFT via Metaplex
            console.log('⛓️ Criando NFT on-chain...');

            const { nft } = await this.metaplex.nfts().create({
                uri: this.uploadMetadata(metadata),
                name: metadata.name,
                sellerFeeBasisPoints: SOLANA_CONFIG.royaltyBasisPoints,
                collection: new PublicKey(SOLANA_CONFIG.collectionMint),
                tokenOwner: playerWallet
            });

            console.log('✅ NFT mintado! Mint:', nft.address.toString());

            // Update player_items (mark as on-chain)
            await supabase
                .from('player_items')
                .update({
                    nft_mint_address: nft.address.toString(),
                    is_on_chain: true,
                    minted_at: new Date().toISOString()
                })
                .eq('id', playerItem.id);

            // Save to nft_metadata table
            await supabase
                .from('nft_metadata')
                .insert({
                    mint_address: nft.address.toString(),
                    player_id: currentUser.id,
                    item_id: itemId,
                    name: metadata.name,
                    image_url: metadata.image,
                    metadata_uri: nft.uri,
                    rarity: metadata.attributes.find(a => a.trait_type === 'Rarity')?.value
                });

            return {
                success: true,
                mintAddress: nft.address.toString(),
                name: metadata.name
            };

        } catch (err) {
            console.error('❌ Erro ao mintar NFT:', err);
            throw err;
        }
    }

    // Burn NFT and restore in-game item
    async burnNFT(mintAddress) {
        try {
            console.log('🔥 Queimando NFT:', mintAddress);

            const playerWallet = walletManager.getPublicKey();
            if (!playerWallet) {
                throw new Error('Wallet not connected');
            }

            const currentUser = NavigationHelper.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not logged in');
            }

            // Get NFT metadata from database
            const { data: nftData } = await supabase
                .from('nft_metadata')
                .select('*')
                .eq('mint_address', mintAddress)
                .eq('player_id', currentUser.id)
                .single();

            if (!nftData) {
                throw new Error('NFT not found or not owned by you');
            }

            // Burn NFT on-chain
            console.log('⛓️ Queimando NFT on-chain...');

            const mintPublicKey = new PublicKey(mintAddress);
            await this.metaplex.nfts().delete({ mintAddress: mintPublicKey });

            console.log('✅ NFT queimado on-chain');

            // Restore item via RPC
            const { data: result, error } = await supabase
                .rpc('restore_item_from_nft', {
                    p_player_id: currentUser.id,
                    p_item_id: nftData.item_id,
                    p_nft_mint: mintAddress
                });

            if (error || !result.success) {
                throw new Error(result?.error || error.message);
            }

            console.log('✅ Item restaurado no inventário');

            return {
                success: true,
                itemId: nftData.item_id,
                itemName: nftData.name
            };

        } catch (err) {
            console.error('❌ Erro ao queimar NFT:', err);
            throw err;
        }
    }

    // Get player's NFTs
    async getNFTsByOwner(ownerPublicKey) {
        try {
            const owner = ownerPublicKey || walletManager.getPublicKey();
            if (!owner) {
                return [];
            }

            const nfts = await this.metaplex.nfts().findAllByOwner({ owner });

            // Filter only collection NFTs
            const collectionMint = new PublicKey(SOLANA_CONFIG.collectionMint);
            const collectionNFTs = nfts.filter(nft =>
                nft.collection?.address.equals(collectionMint) && nft.collection?.verified
            );

            return collectionNFTs;

        } catch (err) {
            console.error('❌ Erro ao buscar NFTs:', err);
            return [];
        }
    }

    // Upload metadata to decentralized storage (mock for now)
    uploadMetadata(metadata) {
        // TODO: Replace with actual IPFS/Arweave upload
        // For now, return a data URI
        const jsonString = JSON.stringify(metadata);
        return `data:application/json;base64,${btoa(jsonString)}`;
    }
}

export default new NFTManager();
```

- [ ] **Step 4: Test NFTManager import**

Open browser console:
```javascript
import('./src/classes/NFTManager.js').then(m => console.log('NFTManager loaded:', m.default));
```

Expected: `NFTManager loaded: Object`

- [ ] **Step 5: Commit**

```bash
git add src/classes/NFTManager.js src/data/nft-metadata.json index.html login.html register.html ranking.html game.html shop.html
git commit -m "feat(nft): add NFTManager for minting and burning

- Create NFTManager class with Metaplex integration
- Implement mintNFT (item → blockchain)
- Implement burnNFT (blockchain → item)
- Add getNFTsByOwner query
- Create nft-metadata.json with skin attributes
- Add rate limiting (3 mints per day)
- Add Metaplex CDN to all pages

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## PHASE 4: MARKETPLACE (Simplified without Anchor)

Due to the complexity of Anchor smart contracts, we'll implement a simplified off-chain marketplace using Metaplex's built-in features for this phase. A full on-chain marketplace can be added later.

### Task 11: MarketplaceManager Class

**Files:**
- Create: `src/classes/MarketplaceManager.js`

**Interfaces:**
- Consumes: NFTManager, SolanaWalletManager, Metaplex
- Produces: MarketplaceManager with methods: listNFT(), cancelListing(), buyNFT()

- [ ] **Step 1: Create MarketplaceManager class**

Create `src/classes/MarketplaceManager.js`:

```javascript
import walletManager from './SolanaWalletManager.js';
import SOLANA_CONFIG from '../config/solana-config.js';
import { supabase } from '../supabase.js';
import { NavigationHelper } from '../navigation.js';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

class MarketplaceManager {
    constructor() {
        this.connection = walletManager.getConnection();
        this.metaplex = null;
        this.initMetaplex();
    }

    async initMetaplex() {
        const { Metaplex } = window.MetaplexJS;
        const { walletAdapterIdentity } = window.MetaplexJS.walletAdapterIdentity;

        this.metaplex = Metaplex.make(this.connection)
            .use(walletAdapterIdentity(window.solana));
    }

    // List NFT for sale
    async listNFT(mintAddress, priceInSOL) {
        try {
            console.log('🏷️ Listando NFT:', mintAddress, 'por', priceInSOL, 'SOL');

            const playerWallet = walletManager.getPublicKey();
            if (!playerWallet) {
                throw new Error('Wallet not connected');
            }

            const currentUser = NavigationHelper.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not logged in');
            }

            // Validate price
            if (priceInSOL <= 0 || priceInSOL > 1000) {
                throw new Error('Invalid price (0.01-1000 SOL)');
            }

            // Check rate limit
            const { data: canProceed } = await supabase.rpc('check_rate_limit', {
                p_player_id: currentUser.id,
                p_action: 'LIST_NFT',
                p_max_count: SOLANA_CONFIG.rateLimits.LIST_NFT.max,
                p_window_seconds: SOLANA_CONFIG.rateLimits.LIST_NFT.windowSeconds
            });

            if (!canProceed) {
                throw new Error('Rate limit: Max 20 listings per day');
            }

            // Get NFT metadata from DB
            const { data: nftData } = await supabase
                .from('nft_metadata')
                .select('*')
                .eq('mint_address', mintAddress)
                .eq('player_id', currentUser.id)
                .single();

            if (!nftData) {
                throw new Error('NFT not found or not owned by you');
            }

            // List via Metaplex (using Auction House)
            const mintPublicKey = new PublicKey(mintAddress);
            const priceInLamports = priceInSOL * LAMPORTS_PER_SOL;

            const { listing } = await this.metaplex.auctionHouse().list({
                mintAccount: mintPublicKey,
                price: { basisPoints: priceInLamports, currency: { symbol: 'SOL' } }
            });

            console.log('✅ NFT listado! Endereço da listing:', listing.address.toString());

            // Save listing to database
            await supabase
                .from('marketplace_listings')
                .insert({
                    listing_address: listing.address.toString(),
                    seller_wallet: playerWallet.toString(),
                    nft_mint: mintAddress,
                    price: BigInt(priceInLamports),
                    status: 'ACTIVE'
                });

            return {
                success: true,
                listingAddress: listing.address.toString()
            };

        } catch (err) {
            console.error('❌ Erro ao listar NFT:', err);
            throw err;
        }
    }

    // Cancel listing
    async cancelListing(listingAddress) {
        try {
            console.log('❌ Cancelando listing:', listingAddress);

            const playerWallet = walletManager.getPublicKey();
            if (!playerWallet) {
                throw new Error('Wallet not connected');
            }

            // Get listing from DB
            const { data: listing } = await supabase
                .from('marketplace_listings')
                .select('*')
                .eq('listing_address', listingAddress)
                .eq('seller_wallet', playerWallet.toString())
                .eq('status', 'ACTIVE')
                .single();

            if (!listing) {
                throw new Error('Listing not found or not owned by you');
            }

            // Cancel via Metaplex
            const listingPublicKey = new PublicKey(listingAddress);
            await this.metaplex.auctionHouse().cancelListing({ listing: listingPublicKey });

            console.log('✅ Listing cancelada');

            // Update database
            await supabase
                .from('marketplace_listings')
                .update({ status: 'CANCELLED' })
                .eq('listing_address', listingAddress);

            return { success: true };

        } catch (err) {
            console.error('❌ Erro ao cancelar listing:', err);
            throw err;
        }
    }

    // Buy NFT
    async buyNFT(listingAddress) {
        try {
            console.log('💰 Comprando NFT:', listingAddress);

            const playerWallet = walletManager.getPublicKey();
            if (!playerWallet) {
                throw new Error('Wallet not connected');
            }

            const currentUser = NavigationHelper.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not logged in');
            }

            // Get listing from DB
            const { data: listing } = await supabase
                .from('marketplace_listings')
                .select('*')
                .eq('listing_address', listingAddress)
                .eq('status', 'ACTIVE')
                .single();

            if (!listing) {
                throw new Error('Listing not found or already sold');
            }

            if (listing.seller_wallet === playerWallet.toString()) {
                throw new Error('Cannot buy your own NFT');
            }

            // Buy via Metaplex
            const listingPublicKey = new PublicKey(listingAddress);

            const { purchase } = await this.metaplex.auctionHouse().buy({
                listing: listingPublicKey
            });

            console.log('✅ Compra realizada! TX:', purchase.response.signature);

            // Update listing status
            await supabase
                .from('marketplace_listings')
                .update({
                    status: 'SOLD',
                    sold_at: new Date().toISOString(),
                    buyer_wallet: playerWallet.toString()
                })
                .eq('listing_address', listingAddress);

            // Record sale
            await supabase
                .from('marketplace_sales')
                .insert({
                    listing_address: listingAddress,
                    seller: listing.seller_wallet,
                    buyer: playerWallet.toString(),
                    nft_mint: listing.nft_mint,
                    price: listing.price,
                    royalty: BigInt(listing.price) * BigInt(SOLANA_CONFIG.royaltyBasisPoints) / BigInt(10000),
                    marketplace_fee: BigInt(listing.price) * BigInt(SOLANA_CONFIG.marketplaceFeeBasisPoints) / BigInt(10000),
                    tx_signature: purchase.response.signature
                });

            // Transfer NFT ownership in database
            await supabase
                .from('nft_metadata')
                .update({ player_id: currentUser.id })
                .eq('mint_address', listing.nft_mint);

            return {
                success: true,
                signature: purchase.response.signature
            };

        } catch (err) {
            console.error('❌ Erro ao comprar NFT:', err);
            throw err;
        }
    }

    // Get active listings
    async getActiveListings(filters = {}) {
        try {
            let query = supabase
                .from('marketplace_listings')
                .select(`
                    *,
                    nft_metadata (
                        name,
                        image_url,
                        rarity,
                        item_id
                    )
                `)
                .eq('status', 'ACTIVE')
                .order('created_at', { ascending: false });

            if (filters.maxPrice) {
                query = query.lte('price', filters.maxPrice);
            }

            if (filters.rarity) {
                query = query.eq('nft_metadata.rarity', filters.rarity);
            }

            const { data, error } = await query.limit(50);

            if (error) throw error;

            return data || [];

        } catch (err) {
            console.error('❌ Erro ao buscar listings:', err);
            return [];
        }
    }

    // Get user's listings
    async getMyListings() {
        const playerWallet = walletManager.getPublicKey();
        if (!playerWallet) return [];

        const { data } = await supabase
            .from('marketplace_listings')
            .select(`
                *,
                nft_metadata (
                    name,
                    image_url,
                    rarity
                )
            `)
            .eq('seller_wallet', playerWallet.toString())
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false });

        return data || [];
    }
}

export default new MarketplaceManager();
```

- [ ] **Step 2: Test MarketplaceManager import**

Browser console:
```javascript
import('./src/classes/MarketplaceManager.js').then(m => console.log('MarketplaceManager loaded:', m.default));
```

Expected: `MarketplaceManager loaded: Object`

- [ ] **Step 3: Commit**

```bash
git add src/classes/MarketplaceManager.js
git commit -m "feat(marketplace): add MarketplaceManager

- Implement listNFT for creating listings
- Implement cancelListing for removing listings
- Implement buyNFT for purchases
- Add getActiveListings with filters
- Add getMyListings query
- Integrate with Metaplex Auction House
- Record sales in database
- Add rate limiting (20 listings per day)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## PHASE 5: INTEGRATION & TESTING

### Task 12: Integration Testing

**Files:**
- Create: `tests/blockchain-integration.test.js`

**Interfaces:**
- Consumes: All blockchain classes
- Produces: Test suite covering critical flows

- [ ] **Step 1: Create test file**

Create `tests/blockchain-integration.test.js`:

```javascript
/**
 * Manual Integration Tests for Blockchain Features
 * Run these tests in browser console after deployment
 */

export const BlockchainTests = {
    // Test 1: Wallet Connection
    async testWalletConnection() {
        console.log('🧪 Test 1: Wallet Connection');

        try {
            const { default: walletManager } = await import('../src/classes/SolanaWalletManager.js');

            if (!window.solana) {
                throw new Error('Phantom wallet not detected');
            }

            const connected = await walletManager.connect();
            if (!connected) {
                throw new Error('Failed to connect wallet');
            }

            const publicKey = walletManager.getPublicKey();
            console.log('✅ Wallet connected:', publicKey.toString());
            return true;

        } catch (err) {
            console.error('❌ Test failed:', err.message);
            return false;
        }
    },

    // Test 2: Token Withdrawal
    async testTokenWithdrawal() {
        console.log('🧪 Test 2: Token Withdrawal');

        try {
            const { default: tokenManager } = await import('../src/classes/TokenManager.js');
            const { NavigationHelper } = await import('../src/navigation.js');

            const user = NavigationHelper.getCurrentUser();
            if (!user) {
                throw new Error('User not logged in');
            }

            console.log('Current balance:', user.coins);

            // Withdraw 10 coins (minimum)
            const result = await tokenManager.withdrawCoins(10);

            if (!result.success) {
                throw new Error('Withdrawal failed');
            }

            console.log('✅ Withdrawal successful:', result.signature);
            console.log('New balance:', result.newBalance);
            return true;

        } catch (err) {
            console.error('❌ Test failed:', err.message);
            return false;
        }
    },

    // Test 3: NFT Minting
    async testNFTMint() {
        console.log('🧪 Test 3: NFT Minting');

        try {
            const { default: nftManager } = await import('../src/classes/NFTManager.js');

            // Mint skin_01 as NFT
            const result = await nftManager.mintNFT('skin_01');

            if (!result.success) {
                throw new Error('Minting failed');
            }

            console.log('✅ NFT minted:', result.mintAddress);
            console.log('Name:', result.name);
            return true;

        } catch (err) {
            console.error('❌ Test failed:', err.message);
            return false;
        }
    },

    // Test 4: Marketplace Listing
    async testMarketplaceListing() {
        console.log('🧪 Test 4: Marketplace Listing');

        try {
            const { default: marketplaceManager } = await import('../src/classes/MarketplaceManager.js');
            const { default: nftManager } = await import('../src/classes/NFTManager.js');

            // Get user's NFTs
            const nfts = await nftManager.getNFTsByOwner();

            if (nfts.length === 0) {
                throw new Error('No NFTs to list');
            }

            const nftToList = nfts[0];

            // List for 0.1 SOL
            const result = await marketplaceManager.listNFT(
                nftToList.address.toString(),
                0.1
            );

            if (!result.success) {
                throw new Error('Listing failed');
            }

            console.log('✅ NFT listed:', result.listingAddress);
            return true;

        } catch (err) {
            console.error('❌ Test failed:', err.message);
            return false;
        }
    },

    // Test 5: Rate Limiting
    async testRateLimiting() {
        console.log('🧪 Test 5: Rate Limiting');

        try {
            const { default: tokenManager } = await import('../src/classes/TokenManager.js');

            const attempts = [];

            // Try to withdraw 6 times (should fail on 6th)
            for (let i = 0; i < 6; i++) {
                try {
                    await tokenManager.withdrawCoins(10);
                    attempts.push({ attempt: i + 1, success: true });
                } catch (err) {
                    attempts.push({ attempt: i + 1, success: false, error: err.message });
                }
            }

            const lastAttempt = attempts[attempts.length - 1];

            if (lastAttempt.success) {
                throw new Error('Rate limit not enforced');
            }

            if (!lastAttempt.error.includes('Rate limit')) {
                throw new Error('Wrong error message');
            }

            console.log('✅ Rate limiting works:', attempts);
            return true;

        } catch (err) {
            console.error('❌ Test failed:', err.message);
            return false;
        }
    },

    // Run all tests
    async runAll() {
        console.log('🚀 Running all blockchain integration tests...\n');

        const results = {
            walletConnection: await this.testWalletConnection(),
            tokenWithdrawal: await this.testTokenWithdrawal(),
            nftMint: await this.testNFTMint(),
            marketplaceListing: await this.testMarketplaceListing(),
            rateLimiting: await this.testRateLimiting()
        };

        const total = Object.keys(results).length;
        const passed = Object.values(results).filter(r => r).length;

        console.log('\n📊 Test Results:');
        console.log(`Passed: ${passed}/${total}`);
        console.log('Details:', results);

        return results;
    }
};

// Export for browser console
window.BlockchainTests = BlockchainTests;
```

- [ ] **Step 2: Add test runner to HTML**

Add to `token-bridge.html` (before closing `</body>`):

```html
<script type="module">
    import { BlockchainTests } from './tests/blockchain-integration.test.js';
    window.BlockchainTests = BlockchainTests;
    console.log('💡 Blockchain tests loaded. Run: BlockchainTests.runAll()');
</script>
```

- [ ] **Step 3: Run tests manually**

1. Open `token-bridge.html`
2. Open browser console
3. Run:
```javascript
await BlockchainTests.runAll()
```

Expected: All tests pass (or fail gracefully with clear errors)

- [ ] **Step 4: Document test results**

Create `tests/test-results.md` and document what passed/failed.

- [ ] **Step 5: Commit**

```bash
git add tests/blockchain-integration.test.js tests/test-results.md token-bridge.html
git commit -m "test(blockchain): add integration test suite

- Create BlockchainTests with 5 test scenarios
- Test wallet connection flow
- Test token withdrawal with validation
- Test NFT minting process
- Test marketplace listing creation
- Test rate limiting enforcement
- Add test runner to token-bridge page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Deployment Documentation

**Files:**
- Create: `docs/BLOCKCHAIN-DEPLOYMENT.md`

**Interfaces:**
- Consumes: All implementation work
- Produces: Complete deployment guide

- [ ] **Step 1: Create deployment guide**

Create `docs/BLOCKCHAIN-DEPLOYMENT.md`:

```markdown
# Blockchain Integration Deployment Guide

## Prerequisites

- [x] Solana CLI installed
- [x] Phantom Wallet installed
- [x] Devnet SOL airdropped
- [x] Supabase project configured
- [x] All migrations run

## Step 1: Deploy SPACE Token

```bash
solana config set --url devnet
solana airdrop 2
spl-token create-token --decimals 9
```

Copy the token mint address and update `src/config/solana-config.js`:

```javascript
spaceTokenMint: '[YOUR_TOKEN_MINT]'
```

## Step 2: Create NFT Collection

```bash
cd nft-collection
sugar create-config
sugar upload
sugar deploy
```

Copy the collection mint and update `src/config/solana-config.js`:

```javascript
collectionMint: '[YOUR_COLLECTION_MINT]'
```

## Step 3: Database Setup

Run these SQL migrations in Supabase:

1. `migrations/001_blockchain_tables.sql`
2. `migrations/002_blockchain_rpcs.sql`

Verify tables exist:
- player_wallets
- token_transactions
- nft_metadata
- marketplace_listings
- marketplace_sales
- rate_limits

## Step 4: Configure CDN Scripts

Verify all HTML files have these scripts:

```html
<!-- Solana -->
<script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js"></script>
<script src="https://unpkg.com/@solana/spl-token@latest/lib/index.iife.js"></script>

<!-- Metaplex -->
<script src="https://unpkg.com/@metaplex-foundation/js@latest/dist/index.umd.js"></script>
```

## Step 5: Update NFT Metadata

Upload skin images to CDN (e.g., Cloudflare R2, AWS S3, IPFS).

Update `src/data/nft-metadata.json` with actual image URLs:

```json
{
  "skin_01": {
    "image": "https://your-cdn.com/skins/skin_01.png",
    ...
  }
}
```

## Step 6: Test on Devnet

1. Open `token-bridge.html`
2. Connect Phantom wallet (Devnet)
3. Run test suite:
```javascript
await BlockchainTests.runAll()
```

4. Manually test:
   - Withdraw coins → SPACE tokens
   - Deposit tokens → coins
   - Mint NFT from shop item
   - List NFT on marketplace
   - Buy NFT from listing
   - Burn NFT to restore item

## Step 7: Switch to Mainnet (Production)

**⚠️ WARNING: Real money involved!**

1. Change `src/config/solana-config.js`:
```javascript
const NETWORK = 'mainnet-beta';
```

2. Deploy new SPACE token on Mainnet:
```bash
solana config set --url mainnet-beta
spl-token create-token --decimals 9
```

3. Deploy new NFT collection on Mainnet:
```bash
cd nft-collection
sugar deploy
```

4. Update config with Mainnet addresses

5. Thoroughly test with small amounts first!

## Monitoring

Check transaction logs:
```sql
SELECT * FROM token_transactions
ORDER BY created_at DESC
LIMIT 50;

SELECT * FROM marketplace_sales
ORDER BY created_at DESC
LIMIT 20;
```

Check rate limits:
```sql
SELECT player_id, action, COUNT(*) as count
FROM rate_limits
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY player_id, action
ORDER BY count DESC;
```

## Troubleshooting

### Issue: "Wallet not connected"
- Check if Phantom is installed
- Check if wallet has SOL for gas
- Try disconnecting and reconnecting

### Issue: "Rate limit exceeded"
- Check rate_limits table
- Wait for time window to expire
- Adjust limits in solana-config.js if needed

### Issue: "Transaction failed"
- Check Solana Explorer: https://explorer.solana.com
- Paste transaction signature
- Look for error messages

### Issue: "NFT mint failed"
- Verify collection exists: `sugar verify`
- Check wallet has enough SOL
- Verify Metaplex script loaded

## Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] Rate limits configured correctly
- [ ] Withdraw/deposit amounts capped
- [ ] RPC functions use SECURITY DEFINER
- [ ] No sensitive keys in frontend code
- [ ] Transaction replay protection active
- [ ] Wallet signatures required for critical operations

## Next Steps

1. **Add Real Marketplace**: Deploy custom Anchor program
2. **Add Staking**: Let players stake SPACE for rewards
3. **Add Governance**: DAO voting with SPACE tokens
4. **Add Trading**: P2P trades with escrow
5. **Add Leaderboard Rewards**: Top players get SPACE airdrops

## Support

Questions? Check:
- Solana Docs: https://docs.solana.com
- Metaplex Docs: https://docs.metaplex.com
- Phantom Docs: https://docs.phantom.app

---

**Status**: ✅ Deployment guide complete
```

- [ ] **Step 2: Commit**

```bash
git add docs/BLOCKCHAIN-DEPLOYMENT.md
git commit -m "docs(blockchain): add deployment guide

- Document complete deployment process
- Add prerequisites checklist
- Include step-by-step instructions
- Add troubleshooting section
- Add security checklist
- Add monitoring queries
- Document Mainnet migration steps

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## FINAL STEP: Plan Review & Approval

This implementation plan is now complete with all phases:

✅ **Phase 1: Foundation** (Tasks 1-5)
- Database schema
- RPC functions
- Solana config
- Wallet manager
- Wallet UI

✅ **Phase 2: SPL Token System** (Tasks 6-8)
- Token deployment
- TokenManager class
- Token bridge UI

✅ **Phase 3: NFT System** (Tasks 9-10)
- NFT collection creation
- NFTManager class

✅ **Phase 4: Marketplace** (Task 11)
- MarketplaceManager class (simplified with Metaplex)

✅ **Phase 5: Integration & Testing** (Tasks 12-13)
- Integration test suite
- Deployment documentation

**Total Tasks**: 13 tasks covering complete blockchain integration

**Estimated Implementation Time**: 2-3 weeks with careful testing

---

Plan complete and saved to `docs/superpowers/plans/2026-08-22-blockchain-integration.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
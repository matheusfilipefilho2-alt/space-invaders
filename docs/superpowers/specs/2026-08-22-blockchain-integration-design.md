# Space Invaders - Blockchain Integration Design Specification

**Date**: 2026-08-22
**Author**: Claude Sonnet 4.5
**Status**: Approved

---

## Executive Summary

Transform Space Invaders into a Web3 game where players truly own their in-game assets. Items (skins, cosmetics) become NFTs on Solana blockchain, and in-game coins can be converted to SPL tokens. A full marketplace enables player-to-player trading.

**Key Features:**
- Hybrid system: Play normally (off-chain) or opt-in to blockchain features
- Solana blockchain for low transaction costs (~$0.00025)
- NFT skins with true ownership and tradability
- SPACE token (SPL) for convertible in-game currency
- Full marketplace with fixed-price listings and offer system
- 5% creator royalties + 2.5% marketplace fee

---

## 1. Architecture Overview

### 1.1 System Components

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (Browser)                     │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Game Logic │  │ Supabase SDK │  │ Solana Wallet   │  │
│  │ (existing) │  │ (existing)   │  │ Adapter (NEW)   │  │
│  └────────────┘  └──────────────┘  └─────────────────┘  │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Web3.js    │  │ Metaplex SDK │  │ Anchor Client   │  │
│  │ (NEW)      │  │ (NEW)        │  │ (NEW)           │  │
│  └────────────┘  └──────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴────────────────┐
            │                                │
            ▼                                ▼
┌────────────────────────┐      ┌────────────────────────┐
│   SUPABASE (Off-Chain) │      │   SOLANA (On-Chain)    │
│                        │      │                        │
│ • Players (users)      │◄────►│ • SPL Token (SPACE)    │
│ • Player Items         │      │ • NFT Collection       │
│ • Player Wallets       │      │ • Marketplace Program  │
│ • Marketplace Cache    │      │ • Escrow Accounts      │
│ • Transaction Logs     │      │                        │
└────────────────────────┘      └────────────────────────┘
```

### 1.2 Data Flow Principle

**Core Philosophy: Hybrid Architecture**

- **Default**: All gameplay happens off-chain (Supabase) - fast, free, no blockchain knowledge required
- **Opt-in**: Players can convert assets to blockchain on-demand
- **Bidirectional**: Assets can move between off-chain ↔ on-chain freely

**Benefits:**
- Onboards non-Web3 users seamlessly
- Reduces operational costs (99% of operations are free)
- Maintains gameplay performance
- Provides true asset ownership when desired

---

## 2. Smart Contracts and Programs

### 2.1 SPL Token: SPACE Token

**Token Specification:**
```
Name: SPACE Token
Symbol: SPACE
Decimals: 9 (Solana standard)
Supply: Unlimited (mintable by authority)
Mint Authority: Project wallet
Freeze Authority: None (cannot freeze user tokens)
```

**Purpose:**
- Represents in-game coins on blockchain
- Used for marketplace transactions
- Can be traded on DEXs
- Convertible 1:1 with in-game coins

**Key Operations:**
- `mintTo()`: Create tokens when player withdraws coins
- `burn()`: Destroy tokens when player deposits coins back
- `transfer()`: P2P transfers, marketplace payments

### 2.2 NFT Collection (Metaplex)

**Collection Structure:**
```
Space Invaders NFT Collection
├─ Collection NFT (master)
│   ├─ Mint: [COLLECTION_MINT_ADDRESS]
│   ├─ Update Authority: Project wallet
│   └─ Verified: true
│
└─ Individual NFTs (verified members)
    ├─ Golden Ship NFT
    ├─ Neon Theme NFT
    ├─ Retro Theme NFT
    └─ Future skins...
```

**NFT Metadata Standard:**
```json
{
  "name": "Space Invaders - Golden Ship",
  "symbol": "SPCSKIN",
  "description": "Epic golden ship skin from Space Invaders game",
  "image": "https://arweave.net/[HASH]",
  "attributes": [
    {"trait_type": "Rarity", "value": "Epic"},
    {"trait_type": "Type", "value": "Ship Skin"},
    {"trait_type": "Game", "value": "Space Invaders"},
    {"trait_type": "Item ID", "value": "ship_golden"}
  ],
  "properties": {
    "files": [
      {"uri": "ship_golden.png", "type": "image/png"}
    ],
    "category": "image",
    "creators": [
      {
        "address": "YOUR_WALLET_ADDRESS",
        "verified": true,
        "share": 100
      }
    ]
  },
  "collection": {
    "name": "Space Invaders Skins",
    "family": "Space Invaders"
  }
}
```

**Royalty Configuration:**
- Seller Fee Basis Points: 500 (5%)
- Enforced on all marketplaces (Metaplex standard)
- Royalties go to project wallet

**Eligible Items:**
- ✅ Skins (permanent cosmetics)
- ✅ Themes (permanent UI changes)
- ❌ Boosts (temporary buffs)
- ❌ Consumables (one-time use)

### 2.3 Marketplace Program (Anchor)

**Program Structure:**

**Accounts:**
```rust
#[account]
pub struct Listing {
    pub seller: Pubkey,           // Who listed
    pub nft_mint: Pubkey,          // NFT being sold
    pub price: u64,                // Price in SPACE tokens (with decimals)
    pub is_active: bool,           // Still available?
    pub created_at: i64,           // Unix timestamp
    pub bump: u8,                  // PDA bump seed
}

#[account]
pub struct Offer {
    pub buyer: Pubkey,             // Who made offer
    pub listing: Pubkey,           // Which listing
    pub amount: u64,               // Offered amount
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct Escrow {
    pub listing: Pubkey,
    pub nft_mint: Pubkey,
    pub bump: u8,
}
```

**Instructions:**
```rust
pub mod marketplace {
    // List NFT for sale
    pub fn list_nft(ctx: Context<ListNFT>, price: u64) -> Result<()>;

    // Cancel listing (seller only)
    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()>;

    // Buy at fixed price
    pub fn buy_nft(ctx: Context<BuyNFT>) -> Result<()>;

    // Make offer below listing price
    pub fn make_offer(ctx: Context<MakeOffer>, amount: u64) -> Result<()>;

    // Accept offer (seller only)
    pub fn accept_offer(ctx: Context<AcceptOffer>) -> Result<()>;

    // Cancel offer (buyer only)
    pub fn cancel_offer(ctx: Context<CancelOffer>) -> Result<()>;
}
```

**Payment Distribution Logic:**
```rust
// Example: 100 SPACE sale
let total_price = 100_000_000_000; // 100 SPACE (9 decimals)

// 5% royalty to creator
let royalty = total_price * 5 / 100;  // 5 SPACE
transfer_tokens(buyer, creator, royalty)?;

// 2.5% marketplace fee
let marketplace_fee = total_price * 25 / 1000;  // 2.5 SPACE
transfer_tokens(buyer, marketplace_authority, marketplace_fee)?;

// 92.5% to seller
let seller_amount = total_price - royalty - marketplace_fee;  // 92.5 SPACE
transfer_tokens(buyer, seller, seller_amount)?;

// Transfer NFT
transfer_nft(escrow, buyer)?;
```

**Security Features:**
- Escrow system (NFT locked until sale completes)
- Atomic transactions (all-or-nothing)
- PDA-based accounts (no signature spoofing)
- Reentrancy protection
- Overflow checks

---

## 3. Token Conversion System

### 3.1 Withdrawal (In-Game → Blockchain)

**User Flow:**
1. Player has 1000 coins in Supabase
2. Navigates to "Token Bridge" page
3. Enters amount: 500 coins
4. System shows: "You will receive ~500 SPACE tokens"
5. Confirms → Wallet signature requested
6. Transaction confirmed → 500 SPACE appears in wallet

**Technical Implementation:**

**Step 1: Validate & Deduct (Supabase RPC)**
```sql
CREATE FUNCTION withdraw_coins(
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

    -- Validate caller is owner (RLS)
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

    -- Deduct coins
    UPDATE players
    SET coins = coins - p_amount
    WHERE id = p_user_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Mint Tokens (Solana)**
```javascript
import {
    createMintToInstruction,
    getAssociatedTokenAddress
} from '@solana/spl-token';

async function mintSpaceTokens(playerWallet, amount) {
    // Get or create player's token account
    const playerTokenAccount = await getAssociatedTokenAddress(
        SPACE_TOKEN_MINT,
        playerWallet
    );

    // Create mint instruction
    const mintIx = createMintToInstruction(
        SPACE_TOKEN_MINT,           // Token mint
        playerTokenAccount,         // Destination
        MINT_AUTHORITY.publicKey,   // Authority (your wallet)
        amount * 10**9              // Amount with decimals
    );

    // Build and send transaction
    const tx = new Transaction().add(mintIx);
    const signature = await sendAndConfirmTransaction(
        connection,
        tx,
        [MINT_AUTHORITY]            // Signer
    );

    return signature;
}
```

**Step 3: Log Transaction**
```javascript
await supabase
    .from('token_transactions')
    .insert({
        player_id: userId,
        type: 'WITHDRAW',
        amount: amount,
        tx_signature: signature,
        status: 'CONFIRMED',
        created_at: new Date().toISOString()
    });
```

### 3.2 Deposit (Blockchain → In-Game)

**User Flow:**
1. Player has 500 SPACE in wallet
2. Navigates to "Token Bridge"
3. Enters amount: 200 SPACE
4. System shows: "You will receive 200 coins in-game"
5. Confirms → Burns 200 SPACE tokens
6. Coins added to Supabase account

**Technical Implementation:**

**Step 1: Burn Tokens (Solana)**
```javascript
import { createBurnInstruction } from '@solana/spl-token';

async function burnSpaceTokens(playerWallet, amount) {
    const playerTokenAccount = await getAssociatedTokenAddress(
        SPACE_TOKEN_MINT,
        playerWallet
    );

    // Create burn instruction
    const burnIx = createBurnInstruction(
        playerTokenAccount,         // Account to burn from
        SPACE_TOKEN_MINT,
        playerWallet,               // Owner
        amount * 10**9
    );

    // Player signs transaction
    const tx = new Transaction().add(burnIx);
    const signature = await walletAdapter.sendTransaction(tx, connection);

    await connection.confirmTransaction(signature);
    return signature;
}
```

**Step 2: Add Coins (Supabase RPC)**
```sql
CREATE FUNCTION deposit_coins(
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

    -- TODO: Verify burn happened on-chain (via backend oracle)

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
```

### 3.3 Rate Limiting

**Limits:**
- Withdrawals: 5 per hour
- Deposits: 10 per hour
- Min amount: 10 coins/tokens
- Max amount: 10,000 coins/tokens per transaction

**Implementation:**
```sql
CREATE TABLE rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE FUNCTION check_rate_limit(
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
```

---

## 4. NFT System

### 4.1 Minting (In-Game Item → NFT)

**Eligibility:**
- Item must be in `player_items` table
- Item must have `permanent: true` flag
- Item must not already be minted (`nft_mint_address IS NULL`)
- Player must have connected wallet

**Process:**

**1. Validate Ownership**
```javascript
async function canMintNFT(itemId, userId) {
    const { data, error } = await supabase
        .from('player_items')
        .select('*')
        .eq('player_id', userId)
        .eq('item_id', itemId)
        .is('nft_mint_address', null)
        .single();

    if (error || !data) return false;

    // Check if item is permanent
    const itemConfig = SHOP_ITEMS.find(i => i.id === itemId);
    if (!itemConfig?.permanent) return false;

    return true;
}
```

**2. Prepare Metadata**
```javascript
function generateNFTMetadata(item) {
    return {
        name: `Space Invaders - ${item.name}`,
        symbol: "SPCSKIN",
        description: item.description,
        image: `https://arweave.net/${item.imageHash}`,
        attributes: [
            {
                trait_type: "Rarity",
                value: item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)
            },
            {
                trait_type: "Type",
                value: item.category
            },
            {
                trait_type: "Game",
                value: "Space Invaders"
            },
            {
                trait_type: "Item ID",
                value: item.id
            }
        ],
        properties: {
            files: [
                { uri: `${item.id}.png`, type: "image/png" }
            ],
            category: "image",
            creators: [
                {
                    address: CREATOR_WALLET.toString(),
                    verified: true,
                    share: 100
                }
            ]
        },
        collection: {
            name: "Space Invaders Skins",
            family: "Space Invaders"
        }
    };
}
```

**3. Upload Metadata to Arweave**
```javascript
import { Metaplex, bundlrStorage } from '@metaplex-foundation/js';

async function uploadMetadata(metadata) {
    const metaplex = new Metaplex(connection).use(bundlrStorage());

    const { uri } = await metaplex.nfts().uploadMetadata(metadata);
    return uri;
}
```

**4. Mint NFT**
```javascript
async function mintNFT(itemId, userId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    const metadata = generateNFTMetadata(item);
    const metadataUri = await uploadMetadata(metadata);

    const { nft } = await metaplex.nfts().create({
        uri: metadataUri,
        name: metadata.name,
        symbol: metadata.symbol,
        sellerFeeBasisPoints: 500,  // 5%
        collection: COLLECTION_MINT,
        creators: [
            {
                address: CREATOR_WALLET,
                verified: true,
                share: 100
            }
        ]
    });

    return nft;
}
```

**5. Update Database**
```javascript
await supabase
    .from('player_items')
    .update({
        nft_mint_address: nft.address.toString(),
        is_on_chain: true,
        minted_at: new Date().toISOString()
    })
    .eq('id', itemDbId)
    .is('nft_mint_address', null);  // Prevent race condition

// Cache metadata
await supabase
    .from('nft_metadata')
    .insert({
        mint_address: nft.address.toString(),
        player_id: userId,
        item_id: itemId,
        name: metadata.name,
        image_url: metadata.image,
        metadata_uri: metadataUri,
        rarity: item.rarity,
        minted_at: new Date().toISOString()
    });
```

### 4.2 Burning (NFT → In-Game Item)

**Purpose**: Player wants to use skin in-game again

**Process:**

**1. Verify Ownership**
```javascript
async function verifyNFTOwnership(nftMint, playerWallet) {
    const nft = await metaplex.nfts().findByMint({
        mintAddress: nftMint
    });

    return nft.ownerAddress.equals(playerWallet);
}
```

**2. Burn NFT (Permanent)**
```javascript
async function burnNFT(nftMint) {
    await metaplex.nfts().delete({
        mintAddress: nftMint
    });

    // NFT is now permanently destroyed
}
```

**3. Restore Item in Supabase**
```sql
CREATE FUNCTION restore_item_from_nft(
    p_player_id UUID,
    p_item_id TEXT,
    p_nft_mint TEXT
) RETURNS JSON AS $$
BEGIN
    -- Mark NFT as burned
    UPDATE nft_metadata
    SET burned_at = NOW()
    WHERE mint_address = p_nft_mint;

    -- Check if item already exists (might have been re-bought)
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
```

---

## 5. Marketplace System

### 5.1 Listing NFT

**User Flow:**
1. Player owns NFT in wallet
2. Clicks "Sell NFT" in marketplace
3. Sets price (e.g., 100 SPACE)
4. Sees distribution preview: 92.5 SPACE to them, 5 SPACE royalty, 2.5 SPACE fee
5. Confirms → 2 transactions: transfer to escrow + create listing
6. NFT appears in marketplace

**Technical Implementation:**

**Frontend:**
```javascript
async function listNFT(nftMint, price) {
    const program = new Program(IDL, PROGRAM_ID, provider);

    // Derive PDAs
    const [listingPDA] = await PublicKey.findProgramAddress(
        [
            Buffer.from("listing"),
            nftMint.toBuffer(),
            wallet.publicKey.toBuffer()
        ],
        PROGRAM_ID
    );

    const [escrowPDA] = await PublicKey.findProgramAddress(
        [Buffer.from("escrow"), listingPDA.toBuffer()],
        PROGRAM_ID
    );

    // Call program
    await program.methods
        .listNft(new BN(price * 10**9))
        .accounts({
            seller: wallet.publicKey,
            listing: listingPDA,
            nftMint: nftMint,
            escrow: escrowPDA,
            sellerNftAccount: getAssociatedTokenAddress(nftMint, wallet.publicKey),
            escrowNftAccount: getAssociatedTokenAddress(nftMint, escrowPDA),
            // ... system accounts
        })
        .rpc();

    // Cache in Supabase for fast querying
    await supabase
        .from('marketplace_listings')
        .insert({
            listing_address: listingPDA.toString(),
            seller_wallet: wallet.publicKey.toString(),
            nft_mint: nftMint.toString(),
            price: price,
            status: 'ACTIVE'
        });
}
```

### 5.2 Buying NFT

**User Flow:**
1. Browse marketplace
2. Click NFT card
3. See details: image, attributes, price, seller
4. Click "Buy Now"
5. Wallet prompts for approval (100 SPACE payment)
6. Transaction confirms → NFT in wallet

**Technical Implementation:**
```javascript
async function buyNFT(listingPDA) {
    const program = new Program(IDL, PROGRAM_ID, provider);

    // Fetch listing details
    const listing = await program.account.listing.fetch(listingPDA);

    await program.methods
        .buyNft()
        .accounts({
            buyer: wallet.publicKey,
            seller: listing.seller,
            listing: listingPDA,
            nftMint: listing.nftMint,
            escrow: escrowPDA,
            // Token accounts for payment
            buyerTokenAccount: buyerSpaceAccount,
            sellerTokenAccount: sellerSpaceAccount,
            creatorTokenAccount: creatorSpaceAccount,
            marketplaceTokenAccount: marketplaceSpaceAccount,
            // NFT accounts
            escrowNftAccount: escrowNftAccount,
            buyerNftAccount: buyerNftAccount,
            // ... system accounts
        })
        .rpc();

    // Update Supabase
    await supabase
        .from('marketplace_listings')
        .update({
            status: 'SOLD',
            buyer_wallet: wallet.publicKey.toString(),
            sold_at: new Date().toISOString()
        })
        .eq('listing_address', listingPDA.toString());

    await supabase
        .from('marketplace_sales')
        .insert({
            listing_address: listingPDA.toString(),
            seller: listing.seller.toString(),
            buyer: wallet.publicKey.toString(),
            nft_mint: listing.nftMint.toString(),
            price: listing.price.toString(),
            tx_signature: signature
        });
}
```

### 5.3 Offer System

**Making Offer:**
```javascript
async function makeOffer(listingPDA, amount) {
    const [offerPDA] = await PublicKey.findProgramAddress(
        [
            Buffer.from("offer"),
            listingPDA.toBuffer(),
            wallet.publicKey.toBuffer()
        ],
        PROGRAM_ID
    );

    await program.methods
        .makeOffer(new BN(amount * 10**9))
        .accounts({
            buyer: wallet.publicKey,
            listing: listingPDA,
            offer: offerPDA,
            buyerTokenAccount: buyerSpaceAccount,
            escrowTokenAccount: escrowTokenAccount,
            // ...
        })
        .rpc();

    // Tokens are now locked in escrow until offer is accepted/cancelled
}
```

**Accepting Offer:**
```javascript
async function acceptOffer(offerPDA) {
    const offer = await program.account.offer.fetch(offerPDA);

    await program.methods
        .acceptOffer()
        .accounts({
            seller: wallet.publicKey,
            buyer: offer.buyer,
            listing: offer.listing,
            offer: offerPDA,
            // Payment distribution accounts
            escrowTokenAccount: escrowTokenAccount,
            sellerTokenAccount: sellerTokenAccount,
            creatorTokenAccount: creatorTokenAccount,
            marketplaceTokenAccount: marketplaceTokenAccount,
            // NFT transfer accounts
            escrowNftAccount: escrowNftAccount,
            buyerNftAccount: buyerNftAccount,
            // ...
        })
        .rpc();

    // Same distribution logic as fixed-price buy
}
```

---

## 6. Frontend Integration

### 6.1 New JavaScript Classes

**SolanaWalletManager.js**
- Detect and connect wallets (Phantom, Solflare, Backpack)
- Persist connection across sessions
- Handle wallet disconnect
- Auto-reconnect on page load

**TokenManager.js**
- Withdraw coins → SPACE tokens
- Deposit SPACE tokens → coins
- Validate amounts and rate limits
- Display token balance

**NFTManager.js**
- Mint item → NFT
- Burn NFT → item
- Fetch NFTs from wallet
- Validate minting eligibility

**MarketplaceManager.js**
- List NFT for sale
- Cancel listing
- Buy NFT
- Make/accept/cancel offers
- Fetch marketplace listings

### 6.2 New HTML Pages

**wallet-connect.html**
- Wallet selection modal
- Connection status
- Disconnect button

**token-bridge.html**
- Coin ↔ Token conversion UI
- Balance display (in-game vs on-chain)
- Transaction history

**marketplace.html**
- Browse listings (grid view)
- Filters (rarity, price, type)
- Sort options
- NFT detail view

**my-nfts.html**
- Display owned NFTs
- Mint/burn actions
- List for sale
- NFT metadata viewer

**account-history.html**
- Transaction log
- Withdrawals/deposits
- NFT mints/burns
- Marketplace activity
- Links to Solscan

### 6.3 UI Components

**Wallet Connection Button (Header)**
```html
<div class="header-wallet">
    <button id="wallet-connect-btn" class="wallet-btn">
        <span>🔗</span> Conectar Wallet
    </button>

    <div id="wallet-display" style="display: none;">
        <span class="wallet-icon">👛</span>
        <span id="wallet-address">7xK9...mP4z</span>
        <button id="wallet-disconnect-btn">❌</button>
    </div>
</div>
```

**Token Balance Widget**
```html
<div class="balance-widget">
    <div class="balance-item">
        <span class="label">In-Game</span>
        <span class="amount">1,000 moedas</span>
    </div>
    <div class="balance-item">
        <span class="label">Blockchain</span>
        <span class="amount">500 SPACE</span>
    </div>
</div>
```

**NFT Card**
```html
<div class="nft-card" data-rarity="epic">
    <img src="nft-image.png" class="nft-image" />
    <div class="nft-rarity">Epic</div>
    <h3 class="nft-name">Golden Ship</h3>
    <div class="nft-price">100 SPACE</div>
    <button class="nft-buy-btn">Comprar</button>
</div>
```

---

## 7. Database Schema Changes

### 7.1 New Tables

**player_wallets**
```sql
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
```

**token_transactions**
```sql
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
```

**nft_metadata**
```sql
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
```

**marketplace_listings**
```sql
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
```

**marketplace_sales**
```sql
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
```

**rate_limits**
```sql
CREATE TABLE rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_player_action
    ON rate_limits(player_id, action, created_at);
```

### 7.2 Modified Tables

**player_items** (add columns)
```sql
ALTER TABLE player_items
ADD COLUMN nft_mint_address TEXT,
ADD COLUMN is_on_chain BOOLEAN DEFAULT false,
ADD COLUMN minted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN burned_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_player_items_nft ON player_items(nft_mint_address);
CREATE INDEX idx_player_items_on_chain ON player_items(is_on_chain);
```

---

## 8. Security Measures

### 8.1 Attack Vectors and Mitigations

**Attack 1: Unauthorized Withdrawal**
- Mitigation: Row Level Security (RLS) on Supabase
- Validation: `auth.uid()` must match `player_id`
- Lock: `FOR UPDATE` on player row

**Attack 2: Replay Attack**
- Mitigation: Unique constraint on `tx_signature`
- Validation: Check signature not already processed
- Backend: Optional on-chain verification

**Attack 3: Minting Items Not Owned**
- Mitigation: Validate ownership in Supabase before mint
- Double-check: Re-validate with `is_on_chain = false` constraint in UPDATE
- Rollback: If DB update fails, burn newly minted NFT

**Attack 4: Front-running**
- Mitigation: Atomic listing (NFT transfer + create listing in one tx)
- Escrow: NFT locked before listing goes live
- PDA: Deterministic addresses prevent signature replay

**Attack 5: Price Manipulation**
- Mitigation: Use decentralized oracle (Jupiter Aggregator)
- Cache: 5-minute price cache with refresh
- Fallback: If oracle fails, show "Price unavailable"

### 8.2 Rate Limiting

**Limits:**
- Withdrawals: 5 per hour
- Deposits: 10 per hour
- NFT Mints: 3 per day
- Marketplace Listings: 20 per day
- Offers: 50 per day

**Enforcement:** Supabase function `check_rate_limit()`

### 8.3 Input Validation

**Wallet Addresses:**
- Must be valid Solana PublicKey
- Must be on-curve
- Length validation (44 characters base58)

**Amounts:**
- Must be positive integers
- Min: 10 (for conversions)
- Max: 10,000 (per transaction)
- No decimals allowed for coin amounts

**NFT Metadata:**
- String length limits (name: 50, description: 200)
- URL validation (HTTPS or IPFS only)
- HTML tag sanitization
- Attribute value sanitization

---

## 9. Testing Strategy

### 9.1 Unit Tests (60%)

**Target Coverage:**
- TokenManager class: validate amounts, rate limits, conversions
- NFTManager class: minting eligibility, metadata generation
- MarketplaceManager class: listing validation, offer logic
- Utility functions: address validation, sanitization

**Framework:** Vitest

### 9.2 Integration Tests (30%)

**Scenarios:**
- Full withdrawal flow (Supabase → Solana)
- Full deposit flow (Solana → Supabase)
- NFT mint → list → buy lifecycle
- Offer system (make → accept → complete)

**Environment:** Solana Devnet

### 9.3 Smart Contract Tests (Anchor)

**Coverage:**
- All marketplace instructions
- Payment distribution accuracy
- Escrow security
- PDA derivation correctness
- Error handling

**Framework:** Anchor test suite (TypeScript)

### 9.4 E2E Tests (10%)

**Critical Paths:**
- New user → play → connect wallet → mint NFT
- Mint NFT → list → sell → receive payment
- Buy NFT → burn → use in game

**Framework:** Playwright

### 9.5 Manual Testing Checklist

Pre-launch verification:
- [ ] All wallet types connect
- [ ] Token conversions work bidirectionally
- [ ] NFT minting and burning work
- [ ] Marketplace listings and purchases work
- [ ] Offers system works
- [ ] Payment distribution is correct
- [ ] Royalties enforced
- [ ] Rate limits active
- [ ] Security measures working
- [ ] Mobile responsive

---

## 10. Deployment Strategy

### 10.1 Phase 1: Devnet Testing (2 weeks)

**Goals:**
- Deploy all contracts to Devnet
- Full feature testing with test wallets
- Bug fixes and optimizations
- Performance benchmarking

**Deliverables:**
- Working Devnet deployment
- Test report with metrics
- Known issues documented

### 10.2 Phase 2: Mainnet Beta (2 weeks)

**Goals:**
- Deploy to Mainnet with limited access
- Invite 50-100 beta testers
- Monitor for issues
- Collect feedback

**Safeguards:**
- Transaction limits per user
- Admin kill switch for emergency
- Real-time monitoring dashboard

### 10.3 Phase 3: Public Launch

**Goals:**
- Remove beta restrictions
- Public announcement
- Marketing push
- Community engagement

**Success Metrics:**
- Wallets connected
- NFTs minted
- Marketplace volume
- Transaction throughput
- User retention

---

## 11. Cost Estimates

### 11.1 One-Time Costs

- Arweave storage (100 NFT images): ~$50
- Token mint creation: ~$2
- Collection NFT mint: ~$2
- Program deployment: ~$5
- Total: **~$60**

### 11.2 Ongoing Costs

**Per User:**
- Mint NFT: $0.01 (paid by user)
- List NFT: $0.0005 (paid by user)
- Buy NFT: $0.00025 (paid by user)

**Platform:**
- RPC calls: Free (public) or $50/month (Helius Pro)
- Supabase: Existing plan (no change)
- Hosting: Existing (no change)

**Revenue:**
- 5% royalty on all sales (perpetual)
- 2.5% marketplace fee (in-app sales only)

---

## 12. Success Criteria

### 12.1 Technical Metrics

- Transaction success rate: >99%
- Average transaction time: <5 seconds
- Uptime: >99.9%
- Zero critical security incidents

### 12.2 Business Metrics

- 20% of players connect wallet (Month 1)
- 500+ NFTs minted (Month 1)
- 100+ marketplace transactions (Month 1)
- $1,000+ in royalty revenue (Month 1)

### 12.3 User Experience Metrics

- Wallet connection: <30 seconds
- NFT mint: <10 seconds
- Marketplace purchase: <10 seconds
- User satisfaction: >4/5 stars

---

## 13. Risk Mitigation

### 13.1 Technical Risks

**Risk**: Smart contract bug leads to locked funds
**Mitigation**: Thorough testing, audits, escrow time-locks

**Risk**: Blockchain congestion delays transactions
**Mitigation**: Priority fees, retry logic, user communication

**Risk**: Metadata storage failure
**Mitigation**: Use Arweave (permanent), backups on Supabase

### 13.2 Business Risks

**Risk**: Low adoption of blockchain features
**Mitigation**: Gradual rollout, education, incentives

**Risk**: Regulatory changes
**Mitigation**: Legal review, compliance monitoring, adaptability

**Risk**: Competition from other Web3 games
**Mitigation**: Unique IP, quality gameplay, community focus

---

## 14. Future Enhancements

**Post-Launch Features:**
- Staking SPACE tokens for rewards
- NFT crafting (combine 2 NFTs → rare NFT)
- Seasonal limited-edition NFTs
- Guild system with shared wallets
- Cross-game NFT interoperability
- Mobile app with WalletConnect

---

## Appendices

### A. Technology Stack

**Frontend:**
- HTML5/CSS3/JavaScript (existing)
- @solana/web3.js
- @solana/wallet-adapter-react
- @metaplex-foundation/js
- @coral-xyz/anchor (client)

**Backend:**
- Supabase (PostgreSQL)
- Solana Blockchain
- Arweave (metadata storage)

**Smart Contracts:**
- Anchor framework (Rust)
- SPL Token program
- Metaplex Token Metadata program

**Infrastructure:**
- Helius RPC (or QuickNode)
- Vercel/Netlify (frontend hosting)
- GitHub Actions (CI/CD)

### B. Key Addresses (Placeholder)

```
SPACE Token Mint: [TO_BE_DEPLOYED]
NFT Collection: [TO_BE_DEPLOYED]
Marketplace Program: [TO_BE_DEPLOYED]
Creator Wallet: [YOUR_WALLET]
Marketplace Fee Wallet: [YOUR_WALLET]
```

### C. Glossary

- **SPL Token**: Solana Program Library token (fungible token standard)
- **NFT**: Non-Fungible Token (unique digital asset)
- **Metaplex**: NFT standard and tooling on Solana
- **PDA**: Program Derived Address (deterministic account)
- **Escrow**: Temporary holding account for secure transactions
- **Mint**: Create new token/NFT
- **Burn**: Permanently destroy token/NFT
- **Royalty**: Percentage paid to creator on secondary sales
- **RPC**: Remote Procedure Call (blockchain API)

---

**Document Version**: 1.0
**Last Updated**: 2026-08-22
**Status**: Ready for Implementation

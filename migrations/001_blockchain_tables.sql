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
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('WITHDRAW', 'DEPOSIT')),
    amount BIGINT NOT NULL CHECK (amount > 0),
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
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
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
    buyer_wallet TEXT,

    CHECK (
        (status != 'SOLD' AND buyer_wallet IS NULL) OR
        (status = 'SOLD' AND buyer_wallet IS NOT NULL)
    )
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
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
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

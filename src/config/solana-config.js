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

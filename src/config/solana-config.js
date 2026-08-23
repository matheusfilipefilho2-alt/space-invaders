// Solana Blockchain Configuration
// Toggle between devnet (testing) and mainnet (production)

const NETWORK = 'devnet'; // Change to 'mainnet-beta' for production

export const SOLANA_CONFIG = {
    // Network
    network: NETWORK,
    rpcEndpoint: NETWORK === 'devnet'
        ? 'https://api.devnet.solana.com'
        : 'https://api.mainnet-beta.solana.com',

    // Supabase (for Edge Functions)
    supabaseUrl: 'https://apbbhuhtdqfwfmlzxnwv.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwYmJodWh0ZHFmd2ZtbHp4bnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTcyNjUsImV4cCI6MjA3MTI5MzI2NX0.D330nS8F9ZIMqnZHzvFIST-wv4ccCyyumV6s4zSmAGs',

    // SPL Token (SPACE)
    // TODO: Deploy token and update these addresses
    spaceTokenMint: NETWORK === 'devnet'
        ? '8agg22nPJnCZ91gxDYc1JikpuQJ2rXiJrEpxK2L8jyZo'  // Deploy token first
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
        ? 'HTkgYAFgfFfEk1rZEj4sXpnZCNKFojJbHXaLKM5UoByH'  // Your devnet wallet
        : null, // Your mainnet wallet

    marketplaceFeeWallet: NETWORK === 'devnet'
        ? 'HTkgYAFgfFfEk1rZEj4sXpnZCNKFojJbHXaLKM5UoByH'  // Your devnet wallet
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

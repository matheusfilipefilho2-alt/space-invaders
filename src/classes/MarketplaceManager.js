// Access Solana and SPL Token libraries from CDN globals
const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = window.solanaWeb3 || {};
const {
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction,
    getAccount
} = window.splToken || {};

import walletManager from './SolanaWalletManager.js';
import nftManager from './NFTManager.js';
import SOLANA_CONFIG from '../config/solana-config.js';
import { supabase } from '../supabase.js';
import { NavigationHelper } from '../navigation.js';

class MarketplaceManager {
    constructor() {
        this.connection = walletManager.getConnection();
        this.initialized = false;
    }

    // Initialize marketplace (lazy loading)
    async init() {
        if (this.initialized) return;

        // Verify SPACE token is configured
        if (!SOLANA_CONFIG.spaceTokenMint) {
            console.warn('⚠️ SPACE token not configured. Deploy token first.');
            return;
        }

        // Verify marketplace fee wallet is configured
        if (!SOLANA_CONFIG.marketplaceFeeWallet) {
            console.warn('⚠️ Marketplace fee wallet not configured.');
            return;
        }

        this.initialized = true;
        console.log('✅ MarketplaceManager initialized');
    }

    // List NFT for sale
    async listNFT(mintAddress, priceInTokens) {
        try {
            await this.init();

            console.log('🏷️ Listing NFT for sale:', mintAddress, 'Price:', priceInTokens, 'SPACE');

            // Validate wallet
            const sellerWallet = walletManager.getPublicKey();
            if (!sellerWallet) {
                throw new Error('Wallet not connected');
            }

            const currentUser = NavigationHelper.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not logged in');
            }

            // Validate price
            if (typeof priceInTokens !== 'number' || priceInTokens <= 0) {
                throw new Error('Price must be a positive number');
            }

            // Check rate limit (20 listings per day)
            const { data: canProceed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
                p_player_id: currentUser.id,
                p_action: 'LIST_NFT',
                p_max_count: SOLANA_CONFIG.rateLimits.LIST_NFT.max,
                p_window_seconds: SOLANA_CONFIG.rateLimits.LIST_NFT.windowSeconds
            });

            if (rateLimitError) {
                throw new Error('Rate limit check failed: ' + rateLimitError.message);
            }

            if (!canProceed) {
                throw new Error('Rate limit exceeded. You can list 20 NFTs per day.');
            }

            // Verify NFT ownership
            const nftDetails = await nftManager.getNFTDetails(mintAddress);
            if (!nftDetails || nftDetails.owner !== sellerWallet.toString()) {
                throw new Error('You do not own this NFT');
            }

            // Check if NFT is already listed
            const { data: existingListing, error: listingCheckError } = await supabase
                .from('marketplace_listings')
                .select('*')
                .eq('nft_mint', mintAddress)
                .eq('status', 'ACTIVE')
                .single();

            if (!listingCheckError && existingListing) {
                throw new Error('NFT is already listed for sale');
            }

            // Convert price to lamports (9 decimals for SPACE token)
            const priceInLamports = Math.floor(priceInTokens * 1_000_000_000);

            // Create listing on blockchain (placeholder)
            console.log('⛓️ Creating listing on-chain...');
            const listingAddress = await this.createListingOnChain(mintAddress, priceInLamports);

            // Record listing in database
            console.log('📊 Recording listing in database...');
            const { data: listing, error: dbError } = await supabase
                .from('marketplace_listings')
                .insert({
                    listing_address: listingAddress,
                    seller_wallet: sellerWallet.toString(),
                    nft_mint: mintAddress,
                    price: priceInLamports,
                    status: 'ACTIVE'
                })
                .select()
                .single();

            if (dbError) {
                console.error('❌ Database error:', dbError);
                throw new Error('Failed to record listing: ' + dbError.message);
            }

            console.log('✅ NFT listed successfully!', listing);
            return {
                success: true,
                listing,
                listingAddress
            };

        } catch (error) {
            console.error('❌ Error listing NFT:', error);
            throw error;
        }
    }

    // Buy listed NFT
    async buyNFT(listingId) {
        try {
            await this.init();

            console.log('🛒 Buying NFT from listing:', listingId);

            // Validate wallet
            const buyerWallet = walletManager.getPublicKey();
            if (!buyerWallet) {
                throw new Error('Wallet not connected');
            }

            const currentUser = NavigationHelper.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not logged in');
            }

            // Get listing details
            const { data: listing, error: listingError } = await supabase
                .from('marketplace_listings')
                .select('*')
                .eq('id', listingId)
                .eq('status', 'ACTIVE')
                .single();

            if (listingError || !listing) {
                throw new Error('Listing not found or no longer active');
            }

            // Prevent buying own listing
            if (listing.seller_wallet === buyerWallet.toString()) {
                throw new Error('Cannot buy your own listing');
            }

            // Check buyer has enough SPACE tokens
            const tokenBalance = await this.getTokenBalance(buyerWallet);
            const priceInTokens = listing.price / 1_000_000_000;

            if (tokenBalance < priceInTokens) {
                throw new Error(`Insufficient SPACE tokens. Need ${priceInTokens}, have ${tokenBalance}`);
            }

            // Calculate fees
            const royaltyAmount = Math.floor(listing.price * SOLANA_CONFIG.royaltyBasisPoints / 10000); // 5%
            const marketplaceFee = Math.floor(listing.price * SOLANA_CONFIG.marketplaceFeeBasisPoints / 10000); // 2.5%
            const sellerAmount = listing.price - royaltyAmount - marketplaceFee;

            console.log('💰 Payment breakdown:');
            console.log('  Total:', listing.price / 1_000_000_000, 'SPACE');
            console.log('  Royalty (5%):', royaltyAmount / 1_000_000_000, 'SPACE');
            console.log('  Marketplace Fee (2.5%):', marketplaceFee / 1_000_000_000, 'SPACE');
            console.log('  Seller receives:', sellerAmount / 1_000_000_000, 'SPACE');

            // Execute purchase on blockchain
            console.log('⛓️ Executing purchase on-chain...');
            const txSignature = await this.executePurchaseOnChain(
                listing,
                buyerWallet,
                sellerAmount,
                royaltyAmount,
                marketplaceFee
            );

            // Update listing status
            console.log('📊 Updating listing status...');
            const { error: updateError } = await supabase
                .from('marketplace_listings')
                .update({
                    status: 'SOLD',
                    buyer_wallet: buyerWallet.toString(),
                    sold_at: new Date().toISOString()
                })
                .eq('id', listingId);

            if (updateError) {
                console.error('⚠️ Failed to update listing status:', updateError);
            }

            // Record sale in sales table
            console.log('📊 Recording sale...');
            const { error: saleError } = await supabase
                .from('marketplace_sales')
                .insert({
                    listing_address: listing.listing_address,
                    seller: listing.seller_wallet,
                    buyer: buyerWallet.toString(),
                    nft_mint: listing.nft_mint,
                    price: listing.price,
                    royalty: royaltyAmount,
                    marketplace_fee: marketplaceFee,
                    tx_signature: txSignature
                });

            if (saleError) {
                console.error('⚠️ Failed to record sale:', saleError);
            }

            console.log('✅ NFT purchased successfully!');
            return {
                success: true,
                txSignature,
                listing,
                priceInTokens
            };

        } catch (error) {
            console.error('❌ Error buying NFT:', error);
            throw error;
        }
    }

    // Cancel listing
    async cancelListing(listingId) {
        try {
            await this.init();

            console.log('🚫 Cancelling listing:', listingId);

            // Validate wallet
            const sellerWallet = walletManager.getPublicKey();
            if (!sellerWallet) {
                throw new Error('Wallet not connected');
            }

            const currentUser = NavigationHelper.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not logged in');
            }

            // Get listing details
            const { data: listing, error: listingError } = await supabase
                .from('marketplace_listings')
                .select('*')
                .eq('id', listingId)
                .eq('status', 'ACTIVE')
                .single();

            if (listingError || !listing) {
                throw new Error('Listing not found or no longer active');
            }

            // Verify ownership
            if (listing.seller_wallet !== sellerWallet.toString()) {
                throw new Error('Only the seller can cancel this listing');
            }

            // Cancel listing on blockchain
            console.log('⛓️ Cancelling listing on-chain...');
            await this.cancelListingOnChain(listing.listing_address);

            // Update database
            console.log('📊 Updating listing status...');
            const { error: updateError } = await supabase
                .from('marketplace_listings')
                .update({ status: 'CANCELLED' })
                .eq('id', listingId);

            if (updateError) {
                throw new Error('Failed to update listing: ' + updateError.message);
            }

            console.log('✅ Listing cancelled successfully!');
            return { success: true };

        } catch (error) {
            console.error('❌ Error cancelling listing:', error);
            throw error;
        }
    }

    // Make offer on listing
    async makeOffer(listingId, offerAmount) {
        try {
            await this.init();

            console.log('💵 Making offer on listing:', listingId, 'Amount:', offerAmount, 'SPACE');

            // Validate wallet
            const buyerWallet = walletManager.getPublicKey();
            if (!buyerWallet) {
                throw new Error('Wallet not connected');
            }

            const currentUser = NavigationHelper.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not logged in');
            }

            // Validate offer amount
            if (typeof offerAmount !== 'number' || offerAmount <= 0) {
                throw new Error('Offer amount must be a positive number');
            }

            // Check rate limit (50 offers per day)
            const { data: canProceed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
                p_player_id: currentUser.id,
                p_action: 'MAKE_OFFER',
                p_max_count: SOLANA_CONFIG.rateLimits.MAKE_OFFER.max,
                p_window_seconds: SOLANA_CONFIG.rateLimits.MAKE_OFFER.windowSeconds
            });

            if (rateLimitError) {
                throw new Error('Rate limit check failed: ' + rateLimitError.message);
            }

            if (!canProceed) {
                throw new Error('Rate limit exceeded. You can make 50 offers per day.');
            }

            // Get listing details
            const { data: listing, error: listingError } = await supabase
                .from('marketplace_listings')
                .select('*')
                .eq('id', listingId)
                .eq('status', 'ACTIVE')
                .single();

            if (listingError || !listing) {
                throw new Error('Listing not found or no longer active');
            }

            // Prevent offering on own listing
            if (listing.seller_wallet === buyerWallet.toString()) {
                throw new Error('Cannot make offer on your own listing');
            }

            // Verify offer is below listing price
            const listingPriceInTokens = listing.price / 1_000_000_000;
            if (offerAmount >= listingPriceInTokens) {
                throw new Error('Offer must be below listing price. Use buyNFT() to purchase at full price.');
            }

            // Check buyer has enough tokens
            const tokenBalance = await this.getTokenBalance(buyerWallet);
            if (tokenBalance < offerAmount) {
                throw new Error(`Insufficient SPACE tokens. Need ${offerAmount}, have ${tokenBalance}`);
            }

            // Convert to lamports
            const offerInLamports = Math.floor(offerAmount * 1_000_000_000);

            // Create offer on blockchain (placeholder)
            console.log('⛓️ Creating offer on-chain...');
            const offerAddress = await this.createOfferOnChain(listing.listing_address, offerInLamports);

            console.log('✅ Offer created successfully!');
            return {
                success: true,
                offerAddress,
                offerAmount,
                listingPrice: listingPriceInTokens
            };

        } catch (error) {
            console.error('❌ Error making offer:', error);
            throw error;
        }
    }

    // Get active marketplace listings
    async getActiveListings(filters = {}) {
        try {
            console.log('📋 Fetching active listings...');

            let query = supabase
                .from('marketplace_listings')
                .select(`
                    *,
                    nft_metadata (
                        name,
                        description,
                        image,
                        attributes
                    )
                `)
                .eq('status', 'ACTIVE')
                .order('created_at', { ascending: false });

            // Apply filters
            if (filters.minPrice) {
                query = query.gte('price', filters.minPrice * 1_000_000_000);
            }
            if (filters.maxPrice) {
                query = query.lte('price', filters.maxPrice * 1_000_000_000);
            }
            if (filters.seller) {
                query = query.eq('seller_wallet', filters.seller);
            }

            const { data: listings, error } = await query;

            if (error) {
                throw new Error('Failed to fetch listings: ' + error.message);
            }

            // Convert prices to tokens
            const formattedListings = listings.map(listing => ({
                ...listing,
                priceInTokens: listing.price / 1_000_000_000
            }));

            console.log('✅ Found', formattedListings.length, 'active listings');
            return formattedListings;

        } catch (error) {
            console.error('❌ Error fetching listings:', error);
            throw error;
        }
    }

    // Get listing by ID
    async getListing(listingId) {
        try {
            const { data: listing, error } = await supabase
                .from('marketplace_listings')
                .select(`
                    *,
                    nft_metadata (
                        name,
                        description,
                        image,
                        attributes
                    )
                `)
                .eq('id', listingId)
                .single();

            if (error || !listing) {
                throw new Error('Listing not found');
            }

            return {
                ...listing,
                priceInTokens: listing.price / 1_000_000_000
            };

        } catch (error) {
            console.error('❌ Error fetching listing:', error);
            throw error;
        }
    }

    // Get player's listings
    async getPlayerListings(walletAddress = null) {
        try {
            const wallet = walletAddress || walletManager.getPublicKey()?.toString();
            if (!wallet) {
                throw new Error('Wallet address required');
            }

            console.log('📋 Fetching listings for wallet:', wallet);

            const { data: listings, error } = await supabase
                .from('marketplace_listings')
                .select(`
                    *,
                    nft_metadata (
                        name,
                        description,
                        image,
                        attributes
                    )
                `)
                .eq('seller_wallet', wallet)
                .in('status', ['ACTIVE', 'SOLD'])
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error('Failed to fetch player listings: ' + error.message);
            }

            // Convert prices to tokens
            const formattedListings = listings.map(listing => ({
                ...listing,
                priceInTokens: listing.price / 1_000_000_000
            }));

            console.log('✅ Found', formattedListings.length, 'listings');
            return formattedListings;

        } catch (error) {
            console.error('❌ Error fetching player listings:', error);
            throw error;
        }
    }

    // Get sales history
    async getSalesHistory(filters = {}) {
        try {
            console.log('📊 Fetching sales history...');

            let query = supabase
                .from('marketplace_sales')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(filters.limit || 50);

            if (filters.nftMint) {
                query = query.eq('nft_mint', filters.nftMint);
            }
            if (filters.seller) {
                query = query.eq('seller', filters.seller);
            }
            if (filters.buyer) {
                query = query.eq('buyer', filters.buyer);
            }

            const { data: sales, error } = await query;

            if (error) {
                throw new Error('Failed to fetch sales history: ' + error.message);
            }

            // Convert prices to tokens
            const formattedSales = sales.map(sale => ({
                ...sale,
                priceInTokens: sale.price / 1_000_000_000,
                royaltyInTokens: sale.royalty / 1_000_000_000,
                feeInTokens: sale.marketplace_fee / 1_000_000_000
            }));

            console.log('✅ Found', formattedSales.length, 'sales');
            return formattedSales;

        } catch (error) {
            console.error('❌ Error fetching sales history:', error);
            throw error;
        }
    }

    // Get token balance
    async getTokenBalance(wallet) {
        try {
            if (!SOLANA_CONFIG.spaceTokenMint) {
                throw new Error('SPACE token not configured');
            }

            const walletPubkey = typeof wallet === 'string' ? new PublicKey(wallet) : wallet;
            const mintPubkey = new PublicKey(SOLANA_CONFIG.spaceTokenMint);

            const ata = await getAssociatedTokenAddress(
                mintPubkey,
                walletPubkey,
                false,
                TOKEN_PROGRAM_ID
            );

            const tokenAccount = await getAccount(this.connection, ata);
            const balance = Number(tokenAccount.amount) / 1_000_000_000; // Convert from lamports

            return balance;

        } catch (error) {
            // Account might not exist yet
            if (error.message?.includes('could not find account')) {
                return 0;
            }
            console.error('❌ Error getting token balance:', error);
            throw error;
        }
    }

    // ============================================
    // BLOCKCHAIN OPERATIONS (PLACEHOLDERS)
    // ============================================
    // These methods contain placeholder implementations
    // TODO: Implement actual marketplace program calls when program is deployed

    async createListingOnChain(nftMint, priceInLamports) {
        // TODO: Implement actual marketplace program call
        // This should:
        // 1. Create PDA for listing account
        // 2. Transfer NFT to escrow account
        // 3. Initialize listing with price and seller info
        // 4. Return listing PDA address

        console.log('⚠️ createListingOnChain is a placeholder');
        console.log('NFT:', nftMint);
        console.log('Price:', priceInLamports, 'lamports');

        // Generate a placeholder listing address (in production, this would be a PDA)
        const placeholderAddress = `listing_${nftMint}_${Date.now()}`;

        // TODO: When marketplace program is deployed, replace with:
        /*
        const [listingPDA, bump] = await PublicKey.findProgramAddress(
            [
                Buffer.from('listing'),
                new PublicKey(nftMint).toBuffer(),
                sellerWallet.toBuffer()
            ],
            new PublicKey(SOLANA_CONFIG.marketplaceProgramId)
        );

        const transaction = new Transaction().add(
            await marketplaceProgram.instruction.createListing(
                new BN(priceInLamports),
                {
                    accounts: {
                        listing: listingPDA,
                        seller: sellerWallet,
                        nftMint: new PublicKey(nftMint),
                        nftAccount: sellerNftAccount,
                        escrowNftAccount: escrowNftAccount,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                        rent: SYSVAR_RENT_PUBKEY
                    }
                }
            )
        );

        const signature = await walletManager.sendTransaction(transaction);
        await this.connection.confirmTransaction(signature);
        return listingPDA.toString();
        */

        return placeholderAddress;
    }

    async executePurchaseOnChain(listing, buyerWallet, sellerAmount, royaltyAmount, marketplaceFee) {
        // TODO: Implement actual marketplace program call
        // This should:
        // 1. Transfer tokens from buyer to seller (minus fees)
        // 2. Transfer royalty to creator
        // 3. Transfer marketplace fee to fee wallet
        // 4. Transfer NFT from escrow to buyer
        // 5. Close listing account
        // 6. Return transaction signature

        console.log('⚠️ executePurchaseOnChain is a placeholder');
        console.log('Listing:', listing.listing_address);
        console.log('Buyer:', buyerWallet.toString());
        console.log('Seller Amount:', sellerAmount);
        console.log('Royalty:', royaltyAmount);
        console.log('Marketplace Fee:', marketplaceFee);

        // Generate placeholder transaction signature
        const placeholderSignature = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // TODO: When marketplace program is deployed, replace with:
        /*
        const tokenMint = new PublicKey(SOLANA_CONFIG.spaceTokenMint);
        const sellerWalletPubkey = new PublicKey(listing.seller_wallet);
        const creatorWallet = new PublicKey(SOLANA_CONFIG.creatorWallet);
        const feeWallet = new PublicKey(SOLANA_CONFIG.marketplaceFeeWallet);

        // Get all token accounts
        const buyerATA = await getAssociatedTokenAddress(tokenMint, buyerWallet);
        const sellerATA = await getAssociatedTokenAddress(tokenMint, sellerWalletPubkey);
        const creatorATA = await getAssociatedTokenAddress(tokenMint, creatorWallet);
        const feeATA = await getAssociatedTokenAddress(tokenMint, feeWallet);

        const transaction = new Transaction();

        // Transfer seller amount
        transaction.add(
            createTransferInstruction(
                buyerATA,
                sellerATA,
                buyerWallet,
                sellerAmount,
                [],
                TOKEN_PROGRAM_ID
            )
        );

        // Transfer royalty
        transaction.add(
            createTransferInstruction(
                buyerATA,
                creatorATA,
                buyerWallet,
                royaltyAmount,
                [],
                TOKEN_PROGRAM_ID
            )
        );

        // Transfer marketplace fee
        transaction.add(
            createTransferInstruction(
                buyerATA,
                feeATA,
                buyerWallet,
                marketplaceFee,
                [],
                TOKEN_PROGRAM_ID
            )
        );

        // Add marketplace program instruction to transfer NFT and close listing
        transaction.add(
            await marketplaceProgram.instruction.purchase({
                accounts: {
                    listing: new PublicKey(listing.listing_address),
                    buyer: buyerWallet,
                    seller: sellerWalletPubkey,
                    nftMint: new PublicKey(listing.nft_mint),
                    escrowNftAccount: escrowAccount,
                    buyerNftAccount: buyerNftAccount,
                    tokenProgram: TOKEN_PROGRAM_ID
                }
            })
        );

        const signature = await walletManager.sendTransaction(transaction);
        await this.connection.confirmTransaction(signature);
        return signature;
        */

        return placeholderSignature;
    }

    async cancelListingOnChain(listingAddress) {
        // TODO: Implement actual marketplace program call
        // This should:
        // 1. Transfer NFT from escrow back to seller
        // 2. Close listing account
        // 3. Return transaction signature

        console.log('⚠️ cancelListingOnChain is a placeholder');
        console.log('Listing:', listingAddress);

        // TODO: When marketplace program is deployed, replace with:
        /*
        const transaction = new Transaction().add(
            await marketplaceProgram.instruction.cancelListing({
                accounts: {
                    listing: new PublicKey(listingAddress),
                    seller: walletManager.getPublicKey(),
                    nftMint: new PublicKey(nftMint),
                    escrowNftAccount: escrowAccount,
                    sellerNftAccount: sellerNftAccount,
                    tokenProgram: TOKEN_PROGRAM_ID
                }
            })
        );

        const signature = await walletManager.sendTransaction(transaction);
        await this.connection.confirmTransaction(signature);
        return signature;
        */

        return `cancel_tx_${Date.now()}`;
    }

    async createOfferOnChain(listingAddress, offerAmountInLamports) {
        // TODO: Implement actual marketplace program call
        // This should:
        // 1. Create PDA for offer account
        // 2. Lock offer amount in escrow
        // 3. Record offer details (buyer, amount, listing)
        // 4. Return offer PDA address

        console.log('⚠️ createOfferOnChain is a placeholder');
        console.log('Listing:', listingAddress);
        console.log('Offer Amount:', offerAmountInLamports);

        // Generate placeholder offer address
        const placeholderOfferAddress = `offer_${listingAddress}_${Date.now()}`;

        // TODO: When marketplace program is deployed, replace with:
        /*
        const [offerPDA, bump] = await PublicKey.findProgramAddress(
            [
                Buffer.from('offer'),
                new PublicKey(listingAddress).toBuffer(),
                walletManager.getPublicKey().toBuffer()
            ],
            new PublicKey(SOLANA_CONFIG.marketplaceProgramId)
        );

        const transaction = new Transaction().add(
            await marketplaceProgram.instruction.makeOffer(
                new BN(offerAmountInLamports),
                {
                    accounts: {
                        offer: offerPDA,
                        listing: new PublicKey(listingAddress),
                        buyer: walletManager.getPublicKey(),
                        escrowTokenAccount: escrowTokenAccount,
                        buyerTokenAccount: buyerTokenAccount,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                        rent: SYSVAR_RENT_PUBKEY
                    }
                }
            )
        );

        const signature = await walletManager.sendTransaction(transaction);
        await this.connection.confirmTransaction(signature);
        return offerPDA.toString();
        */

        return placeholderOfferAddress;
    }
}

// Export singleton instance
export default new MarketplaceManager();

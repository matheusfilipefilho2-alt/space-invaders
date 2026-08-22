// Access Solana and Metaplex libraries from CDN globals
const { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY } = window.solanaWeb3 || {};
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } = window.splToken || {};

import walletManager from './SolanaWalletManager.js';
import SOLANA_CONFIG from '../config/solana-config.js';
import { supabase } from '../supabase.js';
import { NavigationHelper } from '../navigation.js';
import NFT_METADATA from '../data/nft-metadata.json' assert { type: 'json' };

class NFTManager {
    constructor() {
        this.connection = walletManager.getConnection();
        this.metaplex = null;
        this.initialized = false;
    }

    // Initialize Metaplex (lazy loading)
    async init() {
        if (this.initialized) return;

        // Check if Metaplex is available
        if (!window.mplTokenMetadata) {
            console.warn('⚠️ Metaplex library not loaded. Add CDN script to HTML.');
            return;
        }

        this.initialized = true;
        console.log('✅ NFTManager initialized');
    }

    // Validate item can become NFT
    validateNFTEligibility(itemId) {
        const metadata = NFT_METADATA[itemId];

        if (!metadata) {
            throw new Error('Item not eligible for NFT minting');
        }

        if (metadata.type === 'consumable' || metadata.type === 'boost') {
            throw new Error('Only permanent items (skins) can become NFTs');
        }

        return true;
    }

    // Mint NFT from in-game item
    async mintNFT(itemId) {
        try {
            await this.init();

            console.log('🎨 Iniciando mint de NFT para item:', itemId);

            // Validate wallet
            const playerWallet = walletManager.getPublicKey();
            if (!playerWallet) {
                throw new Error('Wallet not connected');
            }

            const currentUser = NavigationHelper.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not logged in');
            }

            // Validate item eligibility
            this.validateNFTEligibility(itemId);

            // Check rate limit (3 mints per day)
            const { data: canProceed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
                p_player_id: currentUser.id,
                p_action: 'MINT_NFT',
                p_max_count: SOLANA_CONFIG.rateLimits.MINT_NFT.max,
                p_window_seconds: SOLANA_CONFIG.rateLimits.MINT_NFT.windowSeconds
            });

            if (rateLimitError) {
                throw new Error('Rate limit check failed: ' + rateLimitError.message);
            }

            if (!canProceed) {
                throw new Error('Rate limit exceeded. You can mint 3 NFTs per day.');
            }

            // Check if player owns this item in-game
            const { data: playerItem, error: itemError } = await supabase
                .from('player_items')
                .select('*')
                .eq('player_id', currentUser.id)
                .eq('item_id', itemId)
                .eq('is_on_chain', false)
                .single();

            if (itemError || !playerItem) {
                throw new Error('Item not found in inventory or already minted as NFT');
            }

            // Get metadata for this item
            const metadata = NFT_METADATA[itemId];

            // Create NFT mint account
            console.log('⛓️ Creating NFT on Solana...');
            const mintResult = await this.createNFTOnChain(
                playerWallet,
                metadata,
                itemId
            );

            console.log('✅ NFT created! Mint:', mintResult.mintAddress);

            // Update database
            await this.recordNFTMint(
                currentUser.id,
                playerItem.id,
                mintResult.mintAddress,
                metadata
            );

            return {
                success: true,
                mintAddress: mintResult.mintAddress,
                signature: mintResult.signature,
                metadata: metadata
            };

        } catch (err) {
            console.error('❌ Erro ao mintar NFT:', err);
            throw err;
        }
    }

    // Create NFT on Solana blockchain using Metaplex
    async createNFTOnChain(playerWallet, metadata, itemId) {
        // NOTE: This is a simplified implementation that shows the structure.
        // In production, you would use Metaplex JS SDK to mint verified collection NFTs.
        // For now, this demonstrates the data flow and error handling.

        // LIMITATION: This requires Metaplex CDN library and proper setup.
        // The actual minting would use mplTokenMetadata.createNft() or similar.
        // See: https://developers.metaplex.com/token-metadata

        throw new Error('NFT minting requires Metaplex Token Metadata program integration. Add Metaplex CDN script and implement createNft() call.');

        // TODO: Implement actual Metaplex mint call
        // Example structure (when Metaplex SDK is loaded):
        /*
        const { createNft } = window.mplTokenMetadata;

        const nft = await createNft(this.connection, {
            mint: Keypair.generate(),
            name: metadata.name,
            symbol: 'SPCSKIN',
            uri: metadata.metadataUri,
            sellerFeeBasisPoints: SOLANA_CONFIG.royaltyBasisPoints,
            creators: [
                {
                    address: new PublicKey(SOLANA_CONFIG.creatorWallet),
                    verified: true,
                    share: 100
                }
            ],
            collection: {
                verified: true,
                key: new PublicKey(SOLANA_CONFIG.collectionMint)
            },
            uses: null
        });

        return {
            mintAddress: nft.mint.toString(),
            signature: nft.signature
        };
        */
    }

    // Record NFT mint in database
    async recordNFTMint(playerId, playerItemId, mintAddress, metadata) {
        // Mark item as on-chain
        const { error: updateError } = await supabase
            .from('player_items')
            .update({
                nft_mint_address: mintAddress,
                is_on_chain: true,
                minted_at: new Date().toISOString()
            })
            .eq('id', playerItemId);

        if (updateError) {
            throw new Error('Failed to update player_items: ' + updateError.message);
        }

        // Cache NFT metadata
        const { error: cacheError } = await supabase
            .from('nft_metadata')
            .insert({
                mint_address: mintAddress,
                player_id: playerId,
                item_id: metadata.itemId,
                name: metadata.name,
                image_url: metadata.image,
                metadata_uri: metadata.metadataUri,
                rarity: metadata.rarity
            });

        if (cacheError) {
            console.error('⚠️ Failed to cache NFT metadata:', cacheError);
            // Non-critical - don't throw
        }

        console.log('✅ NFT recorded in database');
    }

    // Burn NFT and restore in-game item
    async burnNFT(mintAddress) {
        try {
            console.log('🔥 Iniciando burn de NFT:', mintAddress);

            const playerWallet = walletManager.getPublicKey();
            if (!playerWallet) {
                throw new Error('Wallet not connected');
            }

            const currentUser = NavigationHelper.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not logged in');
            }

            // Verify ownership
            const { data: nftData, error: nftError } = await supabase
                .from('nft_metadata')
                .select('*')
                .eq('mint_address', mintAddress)
                .eq('player_id', currentUser.id)
                .is('burned_at', null)
                .single();

            if (nftError || !nftData) {
                throw new Error('NFT not found or already burned');
            }

            // Burn NFT on-chain
            console.log('⛓️ Burning NFT on Solana...');
            const signature = await this.burnNFTOnChain(playerWallet, mintAddress);

            console.log('✅ NFT burned! TX:', signature);

            // Restore item in database
            const { data: restoreResult, error: restoreError } = await supabase.rpc('restore_item_from_nft', {
                p_player_id: currentUser.id,
                p_item_id: nftData.item_id,
                p_nft_mint: mintAddress
            });

            if (restoreError || !restoreResult.success) {
                throw new Error(restoreResult?.error || restoreError.message);
            }

            return {
                success: true,
                signature: signature,
                itemId: nftData.item_id
            };

        } catch (err) {
            console.error('❌ Erro ao queimar NFT:', err);
            throw err;
        }
    }

    // Burn NFT on Solana blockchain
    async burnNFTOnChain(playerWallet, mintAddress) {
        // NOTE: This is a simplified implementation.
        // In production, you would use Metaplex JS SDK to burn the NFT.
        // The burn process involves:
        // 1. Burning the SPL token (quantity 1)
        // 2. Closing the token account
        // 3. Optionally closing the metadata account

        throw new Error('NFT burning requires Metaplex Token Metadata program integration.');

        // TODO: Implement actual burn call
        // Example structure:
        /*
        const mintPubkey = new PublicKey(mintAddress);
        const tokenAccount = await getAssociatedTokenAddress(mintPubkey, playerWallet);

        const tx = new Transaction();

        // Burn instruction (from SPL Token)
        tx.add(
            createBurnInstruction(
                tokenAccount,
                mintPubkey,
                playerWallet,
                1  // NFTs have quantity 1
            )
        );

        // Close token account to reclaim rent
        tx.add(
            createCloseAccountInstruction(
                tokenAccount,
                playerWallet,
                playerWallet
            )
        );

        tx.feePayer = playerWallet;
        tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

        const signedTx = await window.solana.signTransaction(tx);
        const signature = await this.connection.sendRawTransaction(signedTx.serialize());

        await this.connection.confirmTransaction(signature, SOLANA_CONFIG.commitment);

        return signature;
        */
    }

    // Get all player's NFTs (from cache)
    async getPlayerNFTs(playerId) {
        try {
            const { data: nfts, error } = await supabase
                .from('nft_metadata')
                .select('*')
                .eq('player_id', playerId || NavigationHelper.getCurrentUser().id)
                .is('burned_at', null)
                .order('minted_at', { ascending: false });

            if (error) {
                throw error;
            }

            return nfts || [];

        } catch (err) {
            console.error('❌ Erro ao buscar NFTs:', err);
            return [];
        }
    }

    // Get NFT details by mint address
    async getNFTDetails(mintAddress) {
        try {
            // Check cache first
            const { data: cached, error } = await supabase
                .from('nft_metadata')
                .select('*')
                .eq('mint_address', mintAddress)
                .single();

            if (!error && cached) {
                return cached;
            }

            // Fetch from chain if not cached
            // TODO: Implement on-chain fetch using Metaplex SDK
            console.warn('⚠️ NFT not in cache, on-chain fetch not implemented');
            return null;

        } catch (err) {
            console.error('❌ Erro ao buscar detalhes do NFT:', err);
            return null;
        }
    }

    // Get available items that can be minted as NFTs
    async getMintableItems() {
        try {
            const currentUser = NavigationHelper.getCurrentUser();
            if (!currentUser) {
                return [];
            }

            // Get player's permanent items that are not on-chain
            const { data: items, error } = await supabase
                .from('player_items')
                .select('item_id')
                .eq('player_id', currentUser.id)
                .eq('is_on_chain', false);

            if (error) {
                throw error;
            }

            // Filter for NFT-eligible items
            const mintableItems = items
                .filter(item => {
                    const metadata = NFT_METADATA[item.item_id];
                    return metadata && metadata.type !== 'consumable' && metadata.type !== 'boost';
                })
                .map(item => ({
                    itemId: item.item_id,
                    ...NFT_METADATA[item.item_id]
                }));

            return mintableItems;

        } catch (err) {
            console.error('❌ Erro ao buscar itens mintáveis:', err);
            return [];
        }
    }

    // Check if player can mint more NFTs today
    async canMintToday() {
        try {
            const currentUser = NavigationHelper.getCurrentUser();
            if (!currentUser) {
                return { canMint: false, remaining: 0 };
            }

            // Count mints in last 24 hours
            const { count, error } = await supabase
                .from('rate_limits')
                .select('*', { count: 'exact', head: true })
                .eq('player_id', currentUser.id)
                .eq('action', 'MINT_NFT')
                .gte('created_at', new Date(Date.now() - 86400000).toISOString());

            if (error) {
                console.error('Error checking mint rate limit:', error);
                return { canMint: false, remaining: 0 };
            }

            const maxMints = SOLANA_CONFIG.rateLimits.MINT_NFT.max;
            const remaining = Math.max(0, maxMints - (count || 0));

            return {
                canMint: remaining > 0,
                remaining: remaining,
                total: maxMints
            };

        } catch (err) {
            console.error('❌ Erro ao verificar limite de mint:', err);
            return { canMint: false, remaining: 0 };
        }
    }
}

export default new NFTManager();

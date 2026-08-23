// Access Solana libraries from CDN globals
const { Transaction, PublicKey, SystemProgram, TransactionInstruction } = window.solanaWeb3 || {};
const {
    getAccount
} = window.splToken || {};

// SPL Token Program IDs (constants)
const SPL_TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// Helper: Write u64 little-endian
function writeU64LE(value, buffer, offset) {
    const bigValue = BigInt(value);
    for (let i = 0; i < 8; i++) {
        buffer[offset + i] = Number((bigValue >> BigInt(i * 8)) & BigInt(0xFF));
    }
}

// Helper: Convert Uint8Array to base64 (browser-compatible)
function uint8ArrayToBase64(uint8Array) {
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
}

// Manual calculation of associated token address
async function getAssociatedTokenAddressManual(mint, owner) {
    const [address] = await PublicKey.findProgramAddress(
        [
            owner.toBuffer(),
            SPL_TOKEN_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
        ],
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    );
    return address;
}

// Manual creation of associated token account instruction
function createAssociatedTokenAccountInstructionManual(payer, associatedToken, owner, mint) {
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: associatedToken, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
        keys,
        programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
        data: new Uint8Array(0),
    });
}

// Manual creation of mint to instruction
function createMintToInstructionManual(mint, destination, authority, amount) {
    const keys = [
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false },
    ];

    // Instruction data: [instruction_type (1 byte), amount (8 bytes)]
    const data = new Uint8Array(9);
    data[0] = 7; // MintTo instruction = 7
    writeU64LE(amount, data, 1);

    return new TransactionInstruction({
        keys,
        programId: SPL_TOKEN_PROGRAM_ID,
        data,
    });
}

// Manual creation of burn instruction
function createBurnInstructionManual(account, mint, owner, amount) {
    const keys = [
        { pubkey: account, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
    ];

    // Instruction data: [instruction_type (1 byte), amount (8 bytes)]
    const data = new Uint8Array(9);
    data[0] = 8; // Burn instruction = 8
    writeU64LE(amount, data, 1);

    return new TransactionInstruction({
        keys,
        programId: SPL_TOKEN_PROGRAM_ID,
        data,
    });
}

// Manual creation of transfer instruction
function createTransferInstructionManual(source, destination, owner, amount) {
    const keys = [
        { pubkey: source, isSigner: false, isWritable: true },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
    ];

    // Instruction data: [instruction_type (1 byte), amount (8 bytes)]
    const data = new Uint8Array(9);
    data[0] = 3; // Transfer instruction = 3
    writeU64LE(amount, data, 1);

    return new TransactionInstruction({
        keys,
        programId: SPL_TOKEN_PROGRAM_ID,
        data,
    });
}
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
            const { data: canProceed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
                p_player_id: currentUser.id,
                p_action: 'WITHDRAW',
                p_max_count: SOLANA_CONFIG.rateLimits.WITHDRAW.max,
                p_window_seconds: SOLANA_CONFIG.rateLimits.WITHDRAW.windowSeconds
            });

            if (rateLimitError) {
                throw new Error('Rate limit check failed: ' + rateLimitError.message);
            }

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

            // Transfer tokens from treasury to player
            console.log('⛓️ Transferindo SPACE tokens da treasury...');
            let signature;
            try {
                signature = await this.transferFromTreasury(playerWallet, amount);
                console.log('✅ Tokens transferidos! TX:', signature);
            } catch (transferError) {
                console.error('❌ Erro ao transferir tokens, revertendo transação...', transferError);

                // ROLLBACK: Restore coins to database
                try {
                    await supabase.rpc('deposit_coins', {
                        p_user_id: currentUser.id,
                        p_amount: amount,
                        p_tx_signature: 'ROLLBACK_' + Date.now()
                    });
                    console.log('✅ Rollback completo: moedas restauradas');
                } catch (rollbackError) {
                    console.error('❌ CRITICAL: Rollback falhou!', rollbackError);
                    throw new Error('Transfer failed and rollback failed. Contact support. Original error: ' + transferError.message);
                }

                throw new Error('Transfer failed: ' + transferError.message);
            }

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

    // Transfer SPACE tokens from treasury to player wallet (TREASURY APPROACH)
    async transferFromTreasury(playerWallet, amount) {
        const tokenMint = new PublicKey(SOLANA_CONFIG.spaceTokenMint);
        const treasuryWallet = new PublicKey(SOLANA_CONFIG.creatorWallet); // Treasury = Creator wallet

        // Get treasury's token account
        const treasuryTokenAccount = await getAssociatedTokenAddressManual(
            tokenMint,
            treasuryWallet
        );

        // Get or create player's token account
        const playerTokenAccount = await getAssociatedTokenAddressManual(
            tokenMint,
            playerWallet
        );

        // Check if player's account exists
        let playerAccountExists = true;
        try {
            await getAccount(this.connection, playerTokenAccount);
        } catch {
            playerAccountExists = false;
        }

        const tx = new Transaction();

        // Create player's account if needed (player pays for account creation)
        if (!playerAccountExists) {
            tx.add(
                createAssociatedTokenAccountInstructionManual(
                    playerWallet,           // Payer (player pays)
                    playerTokenAccount,     // Account to create
                    playerWallet,           // Owner (player)
                    tokenMint              // Mint
                )
            );
        }

        // Transfer tokens from treasury to player
        tx.add(
            createTransferInstructionManual(
                treasuryTokenAccount,      // Source (treasury)
                playerTokenAccount,        // Destination (player)
                treasuryWallet,           // Authority (treasury owner)
                amount * 10**9            // Amount in lamports
            )
        );

        // Player signs first (pays gas fee)
        tx.feePayer = playerWallet;
        tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

        const signedTx = await window.solana.signTransaction(tx);
        const serializedBytes = signedTx.serialize({ requireAllSignatures: false });
        const serializedTx = uint8ArrayToBase64(serializedBytes);

        // Send to backend for treasury signature
        console.log('📤 Enviando transação para backend assinar...');
        const currentUser = NavigationHelper.getCurrentUser();

        const response = await fetch(`${SOLANA_CONFIG.supabaseUrl}/functions/v1/solana-transfer-tokens`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SOLANA_CONFIG.supabaseAnonKey}`
            },
            body: JSON.stringify({
                playerWallet: playerWallet.toString(),
                amount: amount,
                playerId: currentUser.id,
                partiallySignedTx: serializedTx
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Backend transfer failed');
        }

        const result = await response.json();
        return result.signature;
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
            const { data: canProceed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
                p_player_id: currentUser.id,
                p_action: 'DEPOSIT',
                p_max_count: SOLANA_CONFIG.rateLimits.DEPOSIT.max,
                p_window_seconds: SOLANA_CONFIG.rateLimits.DEPOSIT.windowSeconds
            });

            if (rateLimitError) {
                throw new Error('Rate limit check failed: ' + rateLimitError.message);
            }

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

        const playerTokenAccount = await getAssociatedTokenAddressManual(
            tokenMint,
            playerWallet
        );

        const tx = new Transaction().add(
            createBurnInstructionManual(
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
            const playerTokenAccount = await getAssociatedTokenAddressManual(
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

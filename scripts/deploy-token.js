#!/usr/bin/env node

/**
 * Space Invaders - Token Deployment Script
 *
 * This script deploys the SPACE SPL token to Solana
 *
 * Prerequisites:
 * 1. Install dependencies: npm install @solana/web3.js @solana/spl-token
 * 2. Have a wallet with SOL for deployment (devnet or mainnet)
 * 3. Set up your keypair in ~/.config/solana/id.json or provide custom path
 *
 * Usage:
 *   node scripts/deploy-token.js --network devnet
 *   node scripts/deploy-token.js --network mainnet-beta --keypair /path/to/keypair.json
 */

import * as web3 from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const networkArg = args.find(arg => arg.startsWith('--network='))?.split('=')[1] ||
                   (args[args.indexOf('--network') + 1]) || 'devnet';
const keypairArg = args.find(arg => arg.startsWith('--keypair='))?.split('=')[1] ||
                   (args[args.indexOf('--keypair') + 1]);

const NETWORK = networkArg;
const RPC_ENDPOINT = NETWORK === 'devnet'
    ? 'https://api.devnet.solana.com'
    : 'https://api.mainnet-beta.solana.com';

// Token configuration
const TOKEN_CONFIG = {
    name: 'Space Invaders Token',
    symbol: 'SPACE',
    decimals: 9,
    initialSupply: 1000000000, // 1 billion tokens
    description: 'In-game currency for Space Invaders'
};

console.log('🚀 Space Invaders Token Deployment Script');
console.log('==========================================\n');
console.log(`Network: ${NETWORK}`);
console.log(`RPC Endpoint: ${RPC_ENDPOINT}`);
console.log(`Token: ${TOKEN_CONFIG.symbol} (${TOKEN_CONFIG.name})`);
console.log(`Decimals: ${TOKEN_CONFIG.decimals}`);
console.log(`Initial Supply: ${TOKEN_CONFIG.initialSupply.toLocaleString()}\n`);

// Load keypair
function loadKeypair() {
    let keypairPath;

    if (keypairArg) {
        keypairPath = keypairArg;
    } else {
        // Default Solana CLI keypair location
        const home = process.env.HOME || process.env.USERPROFILE;
        keypairPath = path.join(home, '.config', 'solana', 'id.json');
    }

    console.log(`📂 Loading keypair from: ${keypairPath}`);

    if (!fs.existsSync(keypairPath)) {
        console.error('❌ Error: Keypair file not found!');
        console.error('   Please create a keypair first:');
        console.error('   solana-keygen new --outfile ~/.config/solana/id.json');
        console.error('   Or specify custom path: --keypair /path/to/keypair.json');
        process.exit(1);
    }

    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    const keypair = web3.Keypair.fromSecretKey(Uint8Array.from(keypairData));

    console.log(`✅ Loaded keypair: ${keypair.publicKey.toBase58()}\n`);

    return keypair;
}

// Check SOL balance
async function checkBalance(connection, publicKey) {
    console.log('💰 Checking SOL balance...');
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / web3.LAMPORTS_PER_SOL;

    console.log(`   Balance: ${solBalance.toFixed(4)} SOL`);

    if (balance === 0) {
        console.error('\n❌ Error: Insufficient balance!');
        if (NETWORK === 'devnet') {
            console.error('   Get devnet SOL from: https://faucet.solana.com');
        } else {
            console.error('   You need SOL to deploy on mainnet');
        }
        process.exit(1);
    }

    console.log('✅ Balance sufficient\n');
    return solBalance;
}

// Create SPL Token
async function createToken(connection, payer) {
    console.log('🪙 Creating SPL Token...');

    try {
        // Create mint
        const mint = await splToken.createMint(
            connection,
            payer,
            payer.publicKey,  // mint authority
            payer.publicKey,  // freeze authority
            TOKEN_CONFIG.decimals
        );

        console.log(`✅ Token created!`);
        console.log(`   Mint address: ${mint.toBase58()}\n`);

        return mint;
    } catch (error) {
        console.error('❌ Error creating token:', error.message);
        throw error;
    }
}

// Create token account and mint initial supply
async function mintInitialSupply(connection, payer, mint) {
    console.log('💵 Minting initial supply...');

    try {
        // Get or create associated token account
        const tokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            mint,
            payer.publicKey
        );

        console.log(`   Token account: ${tokenAccount.address.toBase58()}`);

        // Mint tokens
        const amount = TOKEN_CONFIG.initialSupply * Math.pow(10, TOKEN_CONFIG.decimals);
        await splToken.mintTo(
            connection,
            payer,
            mint,
            tokenAccount.address,
            payer.publicKey,
            amount
        );

        console.log(`✅ Minted ${TOKEN_CONFIG.initialSupply.toLocaleString()} ${TOKEN_CONFIG.symbol}\n`);

        return tokenAccount.address;
    } catch (error) {
        console.error('❌ Error minting tokens:', error.message);
        throw error;
    }
}

// Update solana-config.js with deployed addresses
function updateConfig(mintAddress, deployerAddress) {
    console.log('📝 Updating configuration file...');

    const configPath = path.join(__dirname, '..', 'src', 'config', 'solana-config.js');

    if (!fs.existsSync(configPath)) {
        console.error('❌ Error: solana-config.js not found');
        return false;
    }

    let config = fs.readFileSync(configPath, 'utf-8');

    // Update token mint address
    if (NETWORK === 'devnet') {
        config = config.replace(
            /spaceTokenMint: NETWORK === 'devnet'\s*\?\s*null/,
            `spaceTokenMint: NETWORK === 'devnet'\n        ? '${mintAddress}'`
        );
        config = config.replace(
            /creatorWallet: NETWORK === 'devnet'\s*\?\s*null/,
            `creatorWallet: NETWORK === 'devnet'\n        ? '${deployerAddress}'`
        );
        config = config.replace(
            /marketplaceFeeWallet: NETWORK === 'devnet'\s*\?\s*null/,
            `marketplaceFeeWallet: NETWORK === 'devnet'\n        ? '${deployerAddress}'`
        );
    } else {
        config = config.replace(
            /: null, \/\/ Deploy token first$/m,
            `: '${mintAddress}', // Deployed on ${new Date().toISOString()}`
        );
        config = config.replace(
            /: null, \/\/ Your mainnet wallet$/m,
            `: '${deployerAddress}', // Deployed on ${new Date().toISOString()}`
        );
    }

    fs.writeFileSync(configPath, config, 'utf-8');

    console.log('✅ Configuration updated!\n');
    return true;
}

// Save deployment info
function saveDeploymentInfo(info) {
    const deployDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deployDir)) {
        fs.mkdirSync(deployDir, { recursive: true });
    }

    const filename = `${NETWORK}-${Date.now()}.json`;
    const filepath = path.join(deployDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(info, null, 2));
    console.log(`💾 Deployment info saved to: deployments/${filename}\n`);
}

// Main deployment function
async function deploy() {
    try {
        // 1. Load keypair
        const payer = loadKeypair();

        // 2. Connect to Solana
        console.log('🔌 Connecting to Solana...');
        const connection = new web3.Connection(RPC_ENDPOINT, 'confirmed');
        console.log('✅ Connected\n');

        // 3. Check balance
        const balance = await checkBalance(connection, payer.publicKey);

        // 4. Create token
        const mint = await createToken(connection, payer);

        // 5. Mint initial supply
        const tokenAccount = await mintInitialSupply(connection, payer, mint);

        // 6. Get deployment info
        const deploymentInfo = {
            network: NETWORK,
            timestamp: new Date().toISOString(),
            token: {
                name: TOKEN_CONFIG.name,
                symbol: TOKEN_CONFIG.symbol,
                decimals: TOKEN_CONFIG.decimals,
                mintAddress: mint.toBase58(),
                initialSupply: TOKEN_CONFIG.initialSupply
            },
            deployer: {
                publicKey: payer.publicKey.toBase58(),
                tokenAccount: tokenAccount.toBase58(),
                balance: balance
            },
            explorer: NETWORK === 'devnet'
                ? `https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`
                : `https://explorer.solana.com/address/${mint.toBase58()}`
        };

        // 7. Update config file
        updateConfig(mint.toBase58(), payer.publicKey.toBase58());

        // 8. Save deployment info
        saveDeploymentInfo(deploymentInfo);

        // 9. Print summary
        console.log('🎉 DEPLOYMENT SUCCESSFUL!');
        console.log('========================\n');
        console.log('Token Information:');
        console.log(`  Name: ${TOKEN_CONFIG.name}`);
        console.log(`  Symbol: ${TOKEN_CONFIG.symbol}`);
        console.log(`  Mint Address: ${mint.toBase58()}`);
        console.log(`  Decimals: ${TOKEN_CONFIG.decimals}`);
        console.log(`  Initial Supply: ${TOKEN_CONFIG.initialSupply.toLocaleString()} ${TOKEN_CONFIG.symbol}`);
        console.log(`\nDeployer:`);
        console.log(`  Public Key: ${payer.publicKey.toBase58()}`);
        console.log(`  Token Account: ${tokenAccount.toBase58()}`);
        console.log(`\nExplorer:`);
        console.log(`  ${deploymentInfo.explorer}`);
        console.log('\n✅ Configuration file updated!');
        console.log('✅ Ready to use in your game!\n');

    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

// Run deployment
deploy();

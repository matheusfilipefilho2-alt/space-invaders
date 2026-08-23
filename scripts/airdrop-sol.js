#!/usr/bin/env node

/**
 * Request SOL airdrop from devnet
 */

import * as web3 from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

console.log('💰 Requesting SOL airdrop from devnet...\n');

// Load keypair
const home = process.env.HOME || process.env.USERPROFILE;
const keypairPath = path.join(home, '.config', 'solana', 'id.json');

if (!fs.existsSync(keypairPath)) {
    console.error('❌ Keypair not found!');
    console.error('   Run: node scripts/generate-keypair.js');
    process.exit(1);
}

const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
const keypair = web3.Keypair.fromSecretKey(Uint8Array.from(keypairData));

console.log(`Wallet: ${keypair.publicKey.toBase58()}\n`);

// Connect to devnet
const connection = new web3.Connection('https://api.devnet.solana.com', 'confirmed');

async function requestAirdrop() {
    try {
        // Request airdrop (2 SOL)
        console.log('📡 Requesting 2 SOL from devnet faucet...');
        const signature = await connection.requestAirdrop(
            keypair.publicKey,
            2 * web3.LAMPORTS_PER_SOL
        );

        console.log('⏳ Waiting for confirmation...');
        await connection.confirmTransaction(signature);

        // Check balance
        const balance = await connection.getBalance(keypair.publicKey);
        const solBalance = balance / web3.LAMPORTS_PER_SOL;

        console.log('\n✅ Airdrop successful!');
        console.log(`💰 New balance: ${solBalance.toFixed(4)} SOL\n`);
        console.log('🚀 Ready to deploy! Run:');
        console.log('   npm run deploy:token:devnet\n');

    } catch (error) {
        console.error('\n❌ Airdrop failed:', error.message);

        if (error.message.includes('429') || error.message.includes('rate limit')) {
            console.error('\n⚠️  Rate limit reached!');
            console.error('   Try again in a few minutes, or visit:');
            console.error('   https://faucet.solana.com\n');
        } else {
            console.error('\n💡 Alternative: Visit https://faucet.solana.com');
            console.error(`   Use address: ${keypair.publicKey.toBase58()}\n`);
        }
        process.exit(1);
    }
}

requestAirdrop();

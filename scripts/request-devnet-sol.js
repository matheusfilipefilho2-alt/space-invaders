#!/usr/bin/env node

import * as web3 from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

const home = process.env.HOME || process.env.USERPROFILE;
const keypairPath = path.join(home, '.config', 'solana', 'id.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
const keypair = web3.Keypair.fromSecretKey(Uint8Array.from(keypairData));

console.log('💰 Requesting SOL from devnet...');
console.log(`Wallet: ${keypair.publicKey.toBase58()}\n`);

const endpoints = [
    'https://api.devnet.solana.com',
    'https://api.testnet.solana.com',
    'https://rpc.ankr.com/solana_devnet'
];

async function tryAirdrop() {
    for (const endpoint of endpoints) {
        try {
            console.log(`📡 Trying ${endpoint}...`);
            const connection = new web3.Connection(endpoint, 'confirmed');

            // Check current balance
            const currentBalance = await connection.getBalance(keypair.publicKey);
            console.log(`   Current balance: ${(currentBalance / web3.LAMPORTS_PER_SOL).toFixed(4)} SOL`);

            // Request airdrop
            console.log('   Requesting 2 SOL...');
            const signature = await connection.requestAirdrop(
                keypair.publicKey,
                2 * web3.LAMPORTS_PER_SOL
            );

            console.log('   Confirming transaction...');
            await connection.confirmTransaction(signature, 'confirmed');

            // Check new balance
            const newBalance = await connection.getBalance(keypair.publicKey);
            console.log(`\n✅ Success! New balance: ${(newBalance / web3.LAMPORTS_PER_SOL).toFixed(4)} SOL`);
            console.log(`\n🚀 Ready to deploy! Run:`);
            console.log(`   npm run deploy:token:devnet\n`);
            return true;

        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}\n`);
        }
    }

    console.log('❌ All endpoints failed. Please try manually:\n');
    console.log('1. Visit: https://faucet.solana.com');
    console.log(`2. Enter address: ${keypair.publicKey.toBase58()}`);
    console.log('3. Request airdrop');
    console.log('4. Run: npm run deploy:token:devnet\n');
    return false;
}

tryAirdrop();

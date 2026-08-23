#!/usr/bin/env node

/**
 * Mint SPACE tokens to treasury wallet
 */

import * as web3 from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NETWORK = 'devnet';
const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const TOKEN_MINT = '8agg22nPJnCZ91gxDYc1JikpuQJ2rXiJrEpxK2L8jyZo';
const AMOUNT_TO_MINT = 1000000; // 1 million tokens

console.log('🪙 Minting SPACE tokens to treasury...\n');
console.log(`Network: ${NETWORK}`);
console.log(`Token Mint: ${TOKEN_MINT}`);
console.log(`Amount: ${AMOUNT_TO_MINT.toLocaleString()} SPACE\n`);

async function mintToTreasury() {
    try {
        // Load keypair (treasury = creator wallet)
        const home = process.env.HOME || process.env.USERPROFILE;
        const keypairPath = path.join(home, '.config', 'solana', 'id.json');

        console.log(`Loading keypair from: ${keypairPath}`);
        const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
        const payer = web3.Keypair.fromSecretKey(Uint8Array.from(keypairData));

        console.log(`Treasury wallet: ${payer.publicKey.toBase58()}\n`);

        // Connect to Solana
        const connection = new web3.Connection(RPC_ENDPOINT, 'confirmed');

        // Check balance
        const balance = await connection.getBalance(payer.publicKey);
        console.log(`SOL balance: ${(balance / web3.LAMPORTS_PER_SOL).toFixed(4)} SOL`);

        if (balance < 0.01 * web3.LAMPORTS_PER_SOL) {
            console.error('❌ Insufficient SOL balance. Need at least 0.01 SOL');
            process.exit(1);
        }

        // Get mint
        const mintPublicKey = new web3.PublicKey(TOKEN_MINT);

        // Get or create associated token account
        console.log('\n🔍 Getting/creating token account...');
        const tokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            mintPublicKey,
            payer.publicKey
        );

        console.log(`Token account: ${tokenAccount.address.toBase58()}`);

        // Check current balance
        const currentBalance = await connection.getTokenAccountBalance(tokenAccount.address);
        console.log(`Current balance: ${Number(currentBalance.value.amount) / 10**9} SPACE`);

        // Mint tokens
        console.log(`\n💰 Minting ${AMOUNT_TO_MINT.toLocaleString()} SPACE...`);
        const amount = AMOUNT_TO_MINT * Math.pow(10, 9); // 9 decimals

        const signature = await splToken.mintTo(
            connection,
            payer,
            mintPublicKey,
            tokenAccount.address,
            payer.publicKey,
            amount
        );

        console.log(`✅ Minted! TX: ${signature}`);

        // Check new balance
        const newBalance = await connection.getTokenAccountBalance(tokenAccount.address);
        console.log(`\n🎉 New balance: ${Number(newBalance.value.amount) / 10**9} SPACE`);
        console.log(`\nExplorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

mintToTreasury();

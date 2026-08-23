#!/usr/bin/env node

/**
 * Add metadata to SPACE token using Metaplex Token Metadata (Umi)
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createMetadataAccountV3 } from '@metaplex-foundation/mpl-token-metadata';
import { createSignerFromKeypair, signerIdentity, publicKey } from '@metaplex-foundation/umi';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NETWORK = 'devnet';
const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const TOKEN_MINT = '8agg22nPJnCZ91gxDYc1JikpuQJ2rXiJrEpxK2L8jyZo';

// Token Metadata
const TOKEN_NAME = 'Space Invaders Token';
const TOKEN_SYMBOL = 'SPACE';
const TOKEN_URI = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'; // Placeholder

console.log('🎨 Adding metadata to SPACE token...\n');
console.log(`Network: ${NETWORK}`);
console.log(`Token Mint: ${TOKEN_MINT}`);
console.log(`Name: ${TOKEN_NAME}`);
console.log(`Symbol: ${TOKEN_SYMBOL}\n`);

async function addMetadata() {
    try {
        // Load keypair (mint authority)
        const home = process.env.HOME || process.env.USERPROFILE;
        const keypairPath = path.join(home, '.config', 'solana', 'id.json');

        console.log(`Loading keypair from: ${keypairPath}`);
        const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));

        // Create Umi instance
        const umi = createUmi(RPC_ENDPOINT);

        // Create signer from keypair
        const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypairData));
        const signer = createSignerFromKeypair(umi, keypair);

        // Set the signer as the identity
        umi.use(signerIdentity(signer));

        console.log(`Authority wallet: ${signer.publicKey}`);

        // Get SOL balance
        const balance = await umi.rpc.getBalance(signer.publicKey);
        console.log(`SOL balance: ${Number(balance.basisPoints) / 1e9} SOL\n`);

        if (Number(balance.basisPoints) < 0.01 * 1e9) {
            console.error('❌ Insufficient SOL balance. Need at least 0.01 SOL');
            process.exit(1);
        }

        const mint = publicKey(TOKEN_MINT);

        console.log('📝 Creating metadata account...');

        // Create metadata account V3
        const tx = await createMetadataAccountV3(umi, {
            mint,
            mintAuthority: signer,
            payer: signer,
            updateAuthority: signer.publicKey,
            data: {
                name: TOKEN_NAME,
                symbol: TOKEN_SYMBOL,
                uri: TOKEN_URI,
                sellerFeeBasisPoints: 0,
                creators: null,
                collection: null,
                uses: null,
            },
            isMutable: true,
            collectionDetails: null,
        }).sendAndConfirm(umi);

        console.log(`\n✅ Metadata added successfully!`);
        console.log(`TX: ${tx.signature}`);
        console.log(`\nExplorer: https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`);
        console.log(`\n🎉 Token should now display as "${TOKEN_SYMBOL}" in wallets!`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.logs) {
            console.error('Transaction logs:', error.logs);
        }
        process.exit(1);
    }
}

addMetadata();

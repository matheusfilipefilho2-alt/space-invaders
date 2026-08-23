#!/usr/bin/env node

/**
 * Generate a new Solana keypair
 */

import * as web3 from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

console.log('🔑 Generating new Solana keypair...\n');

// Generate new keypair
const keypair = web3.Keypair.generate();

// Get home directory
const home = process.env.HOME || process.env.USERPROFILE;
const configDir = path.join(home, '.config', 'solana');
const keypairPath = path.join(configDir, 'id.json');

// Create directory if it doesn't exist
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log(`✅ Created directory: ${configDir}`);
}

// Save keypair
const secretKey = Array.from(keypair.secretKey);
fs.writeFileSync(keypairPath, JSON.stringify(secretKey));

console.log('✅ Keypair generated successfully!\n');
console.log('Public Key (Wallet Address):');
console.log(`   ${keypair.publicKey.toBase58()}\n`);
console.log('Keypair saved to:');
console.log(`   ${keypairPath}\n`);
console.log('⚠️  IMPORTANT: Keep your keypair file secure!');
console.log('   Never share it or commit it to git.\n');
console.log('📝 Next steps:');
console.log('   1. Get devnet SOL: Visit https://faucet.solana.com');
console.log(`   2. Use this address: ${keypair.publicKey.toBase58()}`);
console.log('   3. Run: npm run deploy:token:devnet\n');

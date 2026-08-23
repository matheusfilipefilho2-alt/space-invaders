import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  TransactionInstruction,
  SystemProgram,
} from 'npm:@solana/web3.js@1.87.6';
import nacl from 'npm:tweetnacl@1.0.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SOLANA_RPC_URL = Deno.env.get('SOLANA_RPC_URL') || 'https://api.devnet.solana.com';
const TREASURY_PRIVATE_KEY = Deno.env.get('TREASURY_PRIVATE_KEY')!; // Base58 encoded private key
const TOKEN_MINT = Deno.env.get('SPACE_TOKEN_MINT')!;

const SPL_TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

console.log('🚀 Solana Transfer Tokens Function initialized');

// Helper: Get associated token address
async function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): Promise<PublicKey> {
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

// Helper: Write u64 little-endian
function writeU64LE(value: bigint, buffer: Uint8Array, offset: number) {
  for (let i = 0; i < 8; i++) {
    buffer[offset + i] = Number((value >> BigInt(i * 8)) & BigInt(0xFF));
  }
}

// Helper: Convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: Convert Uint8Array to base64
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

// Helper: Create transfer instruction
function createTransferInstruction(
  source: PublicKey,
  destination: PublicKey,
  owner: PublicKey,
  amount: bigint
): TransactionInstruction {
  const keys = [
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];

  const data = new Uint8Array(9);
  data[0] = 3; // Transfer instruction = 3
  writeU64LE(amount, data, 1);

  return new TransactionInstruction({
    keys,
    programId: SPL_TOKEN_PROGRAM_ID,
    data,
  });
}

// Helper: Create associated token account instruction
function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey
): TransactionInstruction {
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

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const body = await req.json();
    const { playerWallet, amount, playerId, step, signedTx } = body;

    if (!playerWallet || !amount || !playerId) {
      return new Response('Missing required fields', {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('📥 Transfer request:', { playerWallet, amount, playerId, step });

    // Connect to Solana
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

    // Load treasury keypair from env
    const treasuryKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(TREASURY_PRIVATE_KEY))
    );

    const tokenMint = new PublicKey(TOKEN_MINT);
    const playerPublicKey = new PublicKey(playerWallet);

    // Get token accounts
    const treasuryTokenAccount = await getAssociatedTokenAddress(tokenMint, treasuryKeypair.publicKey);
    const playerTokenAccount = await getAssociatedTokenAddress(tokenMint, playerPublicKey);

    if (step === 'prepare') {
      // STEP 1: Backend creates transaction and signs with treasury
      console.log('📝 Creating transaction...');

      // Check if player token account exists
      let playerAccountExists = true;
      try {
        await connection.getAccountInfo(playerTokenAccount);
      } catch {
        playerAccountExists = false;
      }

      const tx = new Transaction();

      // Create player's account if needed
      if (!playerAccountExists) {
        console.log('➕ Adding create ATA instruction');
        tx.add(
          createAssociatedTokenAccountInstruction(
            playerPublicKey,     // Payer
            playerTokenAccount,  // ATA
            playerPublicKey,     // Owner
            tokenMint           // Mint
          )
        );
      }

      // Transfer tokens from treasury to player
      console.log('💸 Adding transfer instruction');
      tx.add(
        createTransferInstruction(
          treasuryTokenAccount,  // Source
          playerTokenAccount,    // Destination
          treasuryKeypair.publicKey,  // Owner
          BigInt(amount) * BigInt(1e9)  // Amount
        )
      );

      // Set fee payer and recent blockhash
      tx.feePayer = playerPublicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      // Treasury signs first
      tx.partialSign(treasuryKeypair);

      console.log('✅ Treasury signed, returning to player');

      // Return partially signed transaction
      return new Response(
        JSON.stringify({
          success: true,
          partiallySignedTx: uint8ArrayToBase64(tx.serialize({ requireAllSignatures: false }))
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );

    } else if (step === 'submit') {
      // STEP 2: Receive fully signed transaction from player and submit
      console.log('📤 Submitting fully signed transaction...');

      const tx = Transaction.from(base64ToUint8Array(signedTx));
      const txSignature = await connection.sendRawTransaction(tx.serialize());

      console.log('📤 Transaction sent:', txSignature);

      // Wait for confirmation
      await connection.confirmTransaction(txSignature, 'confirmed');
      console.log('✅ Transaction confirmed:', txSignature);

      return new Response(
        JSON.stringify({
          success: true,
          signature: txSignature,
          playerWallet,
          amount
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } else {
      return new Response('Invalid step', {
        status: 400,
        headers: corsHeaders
      });
    }

  } catch (error) {
    console.error('❌ Transfer error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

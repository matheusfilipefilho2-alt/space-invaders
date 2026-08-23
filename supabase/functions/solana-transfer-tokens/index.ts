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
    const { playerWallet, amount, playerId, partiallySignedTx } = await req.json();

    if (!playerWallet || !amount || !playerId) {
      return new Response('Missing required fields', {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('📥 Transfer request:', { playerWallet, amount, playerId });

    // Verify player owns this wallet (optional - add verification logic)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

    // Deserialize the partially signed transaction from player
    const tx = Transaction.from(base64ToUint8Array(partiallySignedTx));

    // Treasury signs the transaction
    tx.partialSign(treasuryKeypair);

    // Send the fully signed transaction
    const signature = await connection.sendRawTransaction(tx.serialize());
    console.log('📤 Transaction sent:', signature);

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ Transaction confirmed:', signature);

    return new Response(
      JSON.stringify({
        success: true,
        signature,
        playerWallet,
        amount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

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

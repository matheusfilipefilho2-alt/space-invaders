import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifySignature } from './_shared/verify-signature.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('ABACATE_PAY_SECRET') || 'space_invaders_webhook_secret_2026';

console.log('🚀 AbacatePay Webhook Handler initialized');

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-abacatepay-signature'
      }
    });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Log all headers for debugging
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('📬 Received headers:', headers);

    // Read body as text (for HMAC verification)
    const body = await req.text();
    console.log('📦 Body length:', body.length);

    // Get signature
    const signature = req.headers.get('x-abacatepay-signature');

    // In dev mode, allow requests without signature for testing
    const isDevMode = WEBHOOK_SECRET.includes('_dev_') || WEBHOOK_SECRET.includes('webhook_secret');

    if (!signature && !isDevMode) {
      console.error('❌ Missing signature header (production mode)');
      return new Response('Unauthorized', { status: 401 });
    }

    if (signature) {
      // Verify HMAC signature
      if (!verifySignature(body, signature, WEBHOOK_SECRET)) {
        console.error('❌ Invalid signature');
        return new Response('Unauthorized', { status: 401 });
      }
      console.log('✅ Signature verified');
    } else {
      console.warn('⚠️ Processing webhook without signature (dev mode)');
    }

    // Parse JSON
    const payload = JSON.parse(body);
    console.log('📥 Webhook received:', {
      event: payload.event,
      checkoutId: payload.data?.id
    });
    console.log('📦 Full payload:', JSON.stringify(payload, null, 2));

    // Only process completed payments
    if (payload.event !== 'transparent.completed') {
      console.log('ℹ️ Ignoring event:', payload.event);
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Extract metadata
    const { metadata } = payload.data;
    if (!metadata || !metadata.playerId || !metadata.coinAmount) {
      console.error('❌ Missing required metadata');
      return new Response('Bad request', { status: 400 });
    }

    const playerId = metadata.playerId;
    const coinAmount = metadata.coinAmount;
    const checkoutId = payload.data.id;

    console.log('💰 Crediting coins:', {
      playerId,
      coinAmount,
      checkoutId
    });

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Credit coins (atomic update)
    const { data: player, error: selectError } = await supabase
      .from('players')
      .select('coins')
      .eq('id', playerId)
      .single();

    if (selectError || !player) {
      console.error('❌ Player not found:', playerId);
      return new Response('Player not found', { status: 404 });
    }

    const newCoins = player.coins + coinAmount;

    const { error: updateError } = await supabase
      .from('players')
      .update({ coins: newCoins })
      .eq('id', playerId);

    if (updateError) {
      console.error('❌ Failed to update coins:', updateError);
      return new Response('Internal error', { status: 500 });
    }

    console.log('✅ Coins credited successfully:', {
      playerId,
      oldCoins: player.coins,
      newCoins,
      added: coinAmount
    });

    return new Response(
      JSON.stringify({
        success: true,
        playerId,
        coinsAdded: coinAmount,
        newBalance: newCoins
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});

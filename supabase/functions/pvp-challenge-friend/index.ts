import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * PvP Friend Challenge - Direct 1v1 Challenges
 *
 * Allows players to challenge specific friends:
 * - Validates challenged user exists
 * - Checks rate limits (max 10 challenges per hour)
 * - Creates challenge record
 * - Notifies challenged player via Realtime
 * - Auto-expires after 2 minutes
 */

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { challengerId, challengedId, betAmount } = await req.json();

    // Validate input
    if (!challengerId || !challengedId || !betAmount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (challengerId === challengedId) {
      return new Response(JSON.stringify({ error: 'Cannot challenge yourself' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate bet amount (10, 50, 100, 500)
    if (![10, 50, 100, 500].includes(betAmount)) {
      return new Response(JSON.stringify({ error: 'Invalid bet amount' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if challenged user exists
    const { data: challengedUser, error: userError } = await supabase
      .from('players')
      .select('id, username')
      .eq('id', challengedId)
      .single();

    if (userError || !challengedUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check rate limit (10 challenges per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentChallenges, error: countError } = await supabase
      .from('pvp_challenges')
      .select('id')
      .eq('challenger_id', challengerId)
      .gte('created_at', oneHourAgo);

    if (countError) throw countError;

    if (recentChallenges && recentChallenges.length >= 10) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded (max 10 challenges per hour)' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user has enough coins
    const { data: challenger } = await supabase
      .from('players')
      .select('coins')
      .eq('id', challengerId)
      .single();

    if (!challenger || challenger.coins < betAmount) {
      return new Response(JSON.stringify({ error: 'Insufficient coins' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create challenge record
    const { data: challenge, error: challengeError } = await supabase
      .from('pvp_challenges')
      .insert({
        challenger_id: challengerId,
        challenged_id: challengedId,
        bet_amount: betAmount,
        status: 'pending',
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString() // 2 minutes
      })
      .select()
      .single();

    if (challengeError) throw challengeError;

    // Notify challenged player via Realtime (they're subscribed to pvp_challenges)
    console.log(`Challenge created: ${challengerId} -> ${challengedId} (bet: ${betAmount})`);

    return new Response(JSON.stringify({
      success: true,
      challengeId: challenge.id,
      challengedUsername: challengedUser.username
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Challenge error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

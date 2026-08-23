import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * PvP Challenge Response - Accept/Decline Challenges
 */

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { challengeId, playerId, response } = await req.json();

    if (!['accepted', 'declined'].includes(response)) {
      return new Response(JSON.stringify({ error: 'Invalid response' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('pvp_challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      return new Response(JSON.stringify({ error: 'Challenge not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify player is the challenged one
    if (challenge.challenged_id !== playerId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if challenge is still valid
    if (challenge.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Challenge already responded to' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (new Date(challenge.expires_at) < new Date()) {
      await supabase
        .from('pvp_challenges')
        .update({ status: 'expired' })
        .eq('id', challengeId);

      return new Response(JSON.stringify({ error: 'Challenge expired' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (response === 'declined') {
      await supabase
        .from('pvp_challenges')
        .update({ status: 'declined' })
        .eq('id', challengeId);

      return new Response(JSON.stringify({ success: true, message: 'Challenge declined' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Accepted - create match
    const roomId = crypto.randomUUID();
    const gameSeed = `${roomId}_${Date.now()}`;

    const { data: match, error: matchError } = await supabase
      .from('pvp_matches')
      .insert({
        player1_id: challenge.challenger_id,
        player2_id: challenge.challenged_id,
        bet_amount: challenge.bet_amount,
        escrowed_coins: challenge.bet_amount * 2,
        room_id: roomId,
        game_seed: gameSeed,
        status: 'matched'
      })
      .select()
      .single();

    if (matchError) throw matchError;

    await supabase
      .from('pvp_challenges')
      .update({ status: 'accepted', match_id: match.id })
      .eq('id', challengeId);

    return new Response(JSON.stringify({
      success: true,
      matchId: match.id,
      roomId: roomId,
      gameSeed: gameSeed
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Response error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

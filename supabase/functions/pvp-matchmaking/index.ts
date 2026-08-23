import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * PvP Matchmaking - Queue Pairing Logic
 *
 * Runs every 2 seconds to match waiting players:
 * - Same bet amount
 * - Similar ELO (±50, expands to ±100 after 30s, ±200 after 60s)
 * - Creates match records with room_id and game_seed
 * - Notifies players via Supabase Realtime
 */

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get all players in queue
    const { data: queuedPlayers, error: queueError } = await supabase
      .from('pvp_queue')
      .select('player_id, bet_amount, joined_at')
      .eq('status', 'searching')
      .order('joined_at', { ascending: true });

    if (queueError) throw queueError;

    if (!queuedPlayers || queuedPlayers.length < 2) {
      return new Response(JSON.stringify({ message: 'Not enough players' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const matches = [];
    const matched = new Set();

    // Group by bet amount
    const betGroups = new Map();
    for (const player of queuedPlayers) {
      if (!betGroups.has(player.bet_amount)) {
        betGroups.set(player.bet_amount, []);
      }
      betGroups.get(player.bet_amount).push(player);
    }

    // Match players within each bet group
    for (const [betAmount, players] of betGroups) {
      if (players.length < 2) continue;

      // Get ELO for all players in this group
      const playerIds = players.map(p => p.player_id);
      const { data: rankings } = await supabase
        .from('pvp_rankings')
        .select('player_id, elo')
        .in('player_id', playerIds);

      const eloMap = new Map(rankings?.map(r => [r.player_id, r.elo]) || []);

      // Try to match pairs
      for (let i = 0; i < players.length; i++) {
        if (matched.has(players[i].player_id)) continue;

        const p1 = players[i];
        const p1Elo = eloMap.get(p1.player_id) || 1000;
        const p1WaitTime = Date.now() - new Date(p1.joined_at).getTime();

        // Calculate ELO range based on wait time
        let eloRange = 50; // Start with ±50
        if (p1WaitTime > 60000) eloRange = 200; // ±200 after 60s
        else if (p1WaitTime > 30000) eloRange = 100; // ±100 after 30s

        // Find best match
        for (let j = i + 1; j < players.length; j++) {
          if (matched.has(players[j].player_id)) continue;

          const p2 = players[j];
          const p2Elo = eloMap.get(p2.player_id) || 1000;

          const eloDiff = Math.abs(p1Elo - p2Elo);

          if (eloDiff <= eloRange) {
            // Match found!
            matches.push({ p1, p2, betAmount });
            matched.add(p1.player_id);
            matched.add(p2.player_id);
            break;
          }
        }
      }
    }

    // Create match records
    for (const match of matches) {
      const roomId = crypto.randomUUID();
      const gameSeed = `${roomId}_${Date.now()}`;

      // Randomly assign offerer role
      const p1IsOfferer = Math.random() < 0.5;

      const { data: matchRecord, error: matchError } = await supabase
        .from('pvp_matches')
        .insert({
          player1_id: match.p1.player_id,
          player2_id: match.p2.player_id,
          bet_amount: match.betAmount,
          escrowed_coins: match.betAmount * 2,
          room_id: roomId,
          game_seed: gameSeed,
          status: 'matched'
        })
        .select()
        .single();

      if (matchError) {
        console.error('Error creating match:', matchError);
        continue;
      }

      // Update queue statuses
      await supabase
        .from('pvp_queue')
        .update({ status: 'matched', match_id: matchRecord.id })
        .in('player_id', [match.p1.player_id, match.p2.player_id]);

      // Notify players via Realtime (they're subscribed to pvp_queue changes)
      console.log(`Match created: ${match.p1.player_id} vs ${match.p2.player_id} (bet: ${match.betAmount})`);
    }

    return new Response(JSON.stringify({
      matched: matches.length,
      total_queued: queuedPlayers.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Matchmaking error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

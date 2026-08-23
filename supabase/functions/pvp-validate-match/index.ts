import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * PvP Match Validation - Result Verification and Finalization
 *
 * Collects results from both players and validates:
 * - Winner agreement
 * - Kill counts match
 * - Duration is reasonable
 * - Calculates ELO changes
 * - Calls finalize_pvp_match() RPC
 * - Flags conflicts for manual review
 */

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ELO_K_FACTOR = 32;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchResult {
  matchId: string;
  playerId: string;
  winnerId: string;
  player1Kills: number;
  player2Kills: number;
  duration: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const result: MatchResult = await req.json();

    // Get match record
    const { data: match, error: matchError } = await supabase
      .from('pvp_matches')
      .select('*')
      .eq('id', result.matchId)
      .single();

    if (matchError || !match) {
      return new Response(JSON.stringify({ error: 'Match not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Store player result
    const resultField = match.player1_id === result.playerId ? 'player1_result' : 'player2_result';

    await supabase
      .from('pvp_matches')
      .update({
        [resultField]: {
          winnerId: result.winnerId,
          player1Kills: result.player1Kills,
          player2Kills: result.player2Kills,
          duration: result.duration
        }
      })
      .eq('id', result.matchId);

    // Check if both players have submitted
    const { data: updatedMatch } = await supabase
      .from('pvp_matches')
      .select('*')
      .eq('id', result.matchId)
      .single();

    if (!updatedMatch?.player1_result || !updatedMatch?.player2_result) {
      return new Response(JSON.stringify({ message: 'Waiting for other player' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Both results received - validate
    const p1Result = updatedMatch.player1_result;
    const p2Result = updatedMatch.player2_result;

    const resultsMatch =
      p1Result.winnerId === p2Result.winnerId &&
      p1Result.player1Kills === p2Result.player1Kills &&
      p1Result.player2Kills === p2Result.player2Kills &&
      Math.abs(p1Result.duration - p2Result.duration) < 5000; // Within 5 seconds

    if (!resultsMatch) {
      // Conflict detected!
      await supabase
        .from('pvp_matches')
        .update({
          status: 'conflict',
          conflict_reason: 'Results mismatch'
        })
        .eq('id', result.matchId);

      console.error(`Match ${result.matchId}: Results conflict detected`);

      return new Response(JSON.stringify({
        error: 'Results conflict',
        p1Result,
        p2Result
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Results match - calculate ELO and finalize
    const winnerId = p1Result.winnerId;
    const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;

    // Get current ELO ratings
    const { data: rankings } = await supabase
      .from('pvp_rankings')
      .select('player_id, elo')
      .in('player_id', [match.player1_id, match.player2_id]);

    const winnerElo = rankings?.find(r => r.player_id === winnerId)?.elo || 1000;
    const loserElo = rankings?.find(r => r.player_id === loserId)?.elo || 1000;

    // Calculate ELO changes
    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

    const winnerEloChange = Math.round(ELO_K_FACTOR * (1 - expectedWinner));
    const loserEloChange = Math.round(ELO_K_FACTOR * (0 - expectedLoser));

    // Call finalize RPC
    const { error: finalizeError } = await supabase.rpc('finalize_pvp_match', {
      p_match_id: result.matchId,
      p_winner_id: winnerId,
      p_loser_id: loserId,
      p_winner_elo_change: winnerEloChange,
      p_loser_elo_change: loserEloChange,
      p_bet_amount: match.bet_amount,
      p_duration: p1Result.duration
    });

    if (finalizeError) {
      console.error('Finalize error:', finalizeError);
      return new Response(JSON.stringify({ error: finalizeError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      winnerId,
      winnerEloChange,
      loserEloChange
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * PvP Signaling Server - WebRTC Offer/Answer/ICE Exchange
 *
 * Stores and relays WebRTC signaling data between peers using Supabase database.
 * Each room (match) stores:
 * - offer: SDP offer from offerer
 * - answer: SDP answer from answerer
 * - ice_candidates: Array of ICE candidates from both peers
 */

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { action, roomId, data } = await req.json();

    if (!action || !roomId) {
      return new Response(JSON.stringify({ error: 'action and roomId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Signaling] Action: ${action}, Room: ${roomId}`);

    switch (action) {
      case 'offer': {
        // Upsert room with offer
        const { error } = await supabase
          .from('pvp_signaling')
          .upsert({
            room_id: roomId,
            offer: data,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        console.log(`Offer stored for room ${roomId}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'answer': {
        // Update room with answer
        const { error } = await supabase
          .from('pvp_signaling')
          .update({
            answer: data,
            updated_at: new Date().toISOString()
          })
          .eq('room_id', roomId);

        if (error) throw error;

        console.log(`Answer stored for room ${roomId}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'ice_candidate': {
        // Get current room
        const { data: room, error: fetchError } = await supabase
          .from('pvp_signaling')
          .select('ice_candidates')
          .eq('room_id', roomId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        // Add new candidate
        const candidates = room?.ice_candidates || [];
        candidates.push(data);

        // Update room
        const { error: updateError } = await supabase
          .from('pvp_signaling')
          .upsert({
            room_id: roomId,
            ice_candidates: candidates,
            updated_at: new Date().toISOString()
          });

        if (updateError) throw updateError;

        console.log(`ICE candidate added for room ${roomId} (total: ${candidates.length})`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_offer': {
        const { data: room } = await supabase
          .from('pvp_signaling')
          .select('offer')
          .eq('room_id', roomId)
          .single();

        console.log(`Get offer for room ${roomId}: ${room?.offer ? 'found' : 'not found'}`);
        return new Response(JSON.stringify({ offer: room?.offer || null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_answer': {
        const { data: room } = await supabase
          .from('pvp_signaling')
          .select('answer')
          .eq('room_id', roomId)
          .single();

        console.log(`Get answer for room ${roomId}: ${room?.answer ? 'found' : 'not found'}`);
        return new Response(JSON.stringify({ answer: room?.answer || null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_ice_candidates': {
        const { data: room } = await supabase
          .from('pvp_signaling')
          .select('ice_candidates')
          .eq('room_id', roomId)
          .single();

        const candidates = room?.ice_candidates || [];

        // Clear candidates after retrieving
        if (candidates.length > 0) {
          await supabase
            .from('pvp_signaling')
            .update({ ice_candidates: [] })
            .eq('room_id', roomId);
        }

        return new Response(JSON.stringify({ candidates }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Signaling error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

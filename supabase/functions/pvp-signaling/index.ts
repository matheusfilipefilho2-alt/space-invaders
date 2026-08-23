import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * PvP Signaling Server - WebRTC Offer/Answer/ICE Exchange
 *
 * Stores and relays WebRTC signaling data between peers.
 * Each room (match) stores:
 * - offer: SDP offer from offerer
 * - answer: SDP answer from answerer
 * - candidates: Array of ICE candidates from both peers
 */

// In-memory storage (resets on function redeploy - fine for short-lived signaling)
const rooms = new Map<string, {
  offer?: any;
  answer?: any;
  candidates: any[];
  createdAt: number;
}>();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cleanup old rooms (>10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > 10 * 60 * 1000) {
      rooms.delete(roomId);
      console.log(`Cleaned up room: ${roomId}`);
    }
  }
}, 60 * 1000); // Run every minute

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

  try {
    const { action, roomId, data } = await req.json();

    if (!roomId) {
      return new Response(JSON.stringify({ error: 'roomId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Ensure room exists
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        candidates: [],
        createdAt: Date.now()
      });
    }

    const room = rooms.get(roomId)!;

    switch (action) {
      case 'offer':
        room.offer = data;
        console.log(`Offer stored for room ${roomId}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'answer':
        room.answer = data;
        console.log(`Answer stored for room ${roomId}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'ice_candidate':
        room.candidates.push(data);
        console.log(`ICE candidate added for room ${roomId} (total: ${room.candidates.length})`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_offer':
        return new Response(JSON.stringify({ offer: room.offer || null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_answer':
        return new Response(JSON.stringify({ answer: room.answer || null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_ice_candidates':
        // Return and clear candidates (so they're not sent multiple times)
        const candidates = [...room.candidates];
        room.candidates = [];
        return new Response(JSON.stringify({ candidates }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

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

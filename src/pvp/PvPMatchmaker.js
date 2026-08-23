/**
 * PvPMatchmaker - Frontend Matchmaking Service
 *
 * Manages:
 * - Queue join/leave
 * - Match found notifications via Realtime
 * - WebRTC connection initiation
 * - Friend challenges (send/receive)
 */

class PvPMatchmaker {
  constructor() {
    // Usar o cliente global do Supabase (window.supabase já está carregado via script tag)
    if (!window.supabase) {
      throw new Error('Supabase not loaded. Include Supabase script in HTML.');
    }

    const SUPABASE_URL = 'https://apbbhuhtdqfwfmlzxnwv.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwYmJodWh0ZHFmd2ZtbHp4bnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTcyNjUsImV4cCI6MjA3MTI5MzI2NX0.D330nS8F9ZIMqnZHzvFIST-wv4ccCyyumV6s4zSmAGs';

    this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    this.currentUser = null;
    this.queueSubscription = null;
    this.challengeSubscription = null;
    this.currentBet = null;

    // Callbacks
    this.onMatchFoundCallback = null;
    this.onChallengeReceivedCallback = null;
  }

  /**
   * Set current user
   * @param {object} user - User object with id
   */
  setUser(user) {
    this.currentUser = user;
  }

  /**
   * Join matchmaking queue
   * @param {number} betAmount - Bet amount (10, 50, 100, 500)
   */
  async joinQueue(betAmount) {
    if (!this.currentUser) {
      throw new Error('User not set');
    }

    if (![10, 50, 100, 500].includes(betAmount)) {
      throw new Error('Invalid bet amount');
    }

    this.currentBet = betAmount;

    // Insert into queue
    const { data, error } = await this.supabase
      .from('pvp_queue')
      .insert({
        player_id: this.currentUser.id,
        bet_amount: betAmount,
        status: 'searching'
      })
      .select()
      .single();

    if (error) throw error;

    // Subscribe to queue changes
    this.subscribeToQueue();

    console.log(`[PvPMatchmaker] Joined queue with bet ${betAmount}`);
    return data;
  }

  /**
   * Leave matchmaking queue
   */
  async leaveQueue() {
    if (!this.currentUser) return;

    await this.supabase
      .from('pvp_queue')
      .delete()
      .eq('player_id', this.currentUser.id);

    this.unsubscribeFromQueue();
    this.currentBet = null;

    console.log('[PvPMatchmaker] Left queue');
  }

  /**
   * Subscribe to queue updates (match found)
   */
  subscribeToQueue() {
    if (this.queueSubscription) return;

    this.queueSubscription = this.supabase
      .channel('pvp_queue_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pvp_queue',
        filter: `player_id=eq.${this.currentUser.id}`
      }, (payload) => {
        if (payload.new.status === 'matched' && payload.new.match_id) {
          this.handleMatchFound(payload.new.match_id);
        }
      })
      .subscribe();
  }

  /**
   * Unsubscribe from queue updates
   */
  unsubscribeFromQueue() {
    if (this.queueSubscription) {
      this.queueSubscription.unsubscribe();
      this.queueSubscription = null;
    }
  }

  /**
   * Handle match found event
   * @param {string} matchId - Match ID
   */
  async handleMatchFound(matchId) {
    console.log(`[PvPMatchmaker] Match found: ${matchId}`);

    // Get match details
    const { data: match, error } = await this.supabase
      .from('pvp_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (error) {
      console.error('[PvPMatchmaker] Error getting match:', error);
      return;
    }

    // Determine if we're the offerer
    const isOfferer = match.player1_id === this.currentUser.id;

    // Notify callback
    if (this.onMatchFoundCallback) {
      this.onMatchFoundCallback({
        matchId: match.id,
        roomId: match.room_id,
        gameSeed: match.game_seed,
        isOfferer,
        betAmount: match.bet_amount
      });
    }

    // Clean up queue subscription
    this.unsubscribeFromQueue();
  }

  /**
   * Send friend challenge
   * @param {string} friendId - Friend's user ID
   * @param {number} betAmount - Bet amount
   */
  async challengeFriend(friendId, betAmount) {
    if (!this.currentUser) {
      throw new Error('User not set');
    }

    const response = await fetch(`${window.location.origin}/functions/v1/pvp-challenge-friend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengerId: this.currentUser.id,
        challengedId: friendId,
        betAmount
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Challenge failed');
    }

    const result = await response.json();
    console.log(`[PvPMatchmaker] Challenge sent to ${result.challengedUsername}`);
    return result;
  }

  /**
   * Subscribe to challenge notifications
   */
  subscribeToChallenges() {
    if (this.challengeSubscription || !this.currentUser) return;

    this.challengeSubscription = this.supabase
      .channel('pvp_challenges')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pvp_challenges',
        filter: `challenged_id=eq.${this.currentUser.id}`
      }, (payload) => {
        this.handleChallengeReceived(payload.new);
      })
      .subscribe();
  }

  /**
   * Unsubscribe from challenge notifications
   */
  unsubscribeFromChallenges() {
    if (this.challengeSubscription) {
      this.challengeSubscription.unsubscribe();
      this.challengeSubscription = null;
    }
  }

  /**
   * Handle challenge received
   * @param {object} challenge - Challenge record
   */
  async handleChallengeReceived(challenge) {
    // Get challenger info
    const { data: challenger } = await this.supabase
      .from('players')
      .select('username')
      .eq('id', challenge.challenger_id)
      .single();

    console.log(`[PvPMatchmaker] Challenge received from ${challenger?.username}`);

    if (this.onChallengeReceivedCallback) {
      this.onChallengeReceivedCallback({
        challengeId: challenge.id,
        challengerId: challenge.challenger_id,
        challengerUsername: challenger?.username,
        betAmount: challenge.bet_amount,
        expiresAt: challenge.expires_at
      });
    }
  }

  /**
   * Respond to challenge (accept/decline)
   * @param {string} challengeId - Challenge ID
   * @param {boolean} accept - True to accept, false to decline
   */
  async respondToChallenge(challengeId, accept) {
    if (!this.currentUser) {
      throw new Error('User not set');
    }

    const response = await fetch(`${window.location.origin}/functions/v1/pvp-challenge-respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId,
        playerId: this.currentUser.id,
        response: accept ? 'accepted' : 'declined'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Response failed');
    }

    const result = await response.json();

    if (accept && result.matchId) {
      // Challenge accepted - initiate match
      if (this.onMatchFoundCallback) {
        this.onMatchFoundCallback({
          matchId: result.matchId,
          roomId: result.roomId,
          gameSeed: result.gameSeed,
          isOfferer: false, // Challenger is always offerer
          betAmount: 0 // Bet already deducted
        });
      }
    }

    return result;
  }

  /**
   * Register callback for match found
   * @param {function} callback - Callback(matchData)
   */
  onMatchFound(callback) {
    this.onMatchFoundCallback = callback;
  }

  /**
   * Register callback for challenge received
   * @param {function} callback - Callback(challengeData)
   */
  onChallengeReceived(callback) {
    this.onChallengeReceivedCallback = callback;
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup() {
    this.unsubscribeFromQueue();
    this.unsubscribeFromChallenges();
  }
}

export default PvPMatchmaker;

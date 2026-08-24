import PvPMatchmaker from './PvPMatchmaker.js';
import PvPGameSimple from './PvPGameSimple.js';

/**
 * PvPLobby - Main PvP Lobby Controller
 *
 * Manages:
 * - Mode selection (quick match vs challenge friend)
 * - Bet selection and queue joining
 * - Challenge sending/receiving
 * - Match initiation
 * - Stats display
 */

class PvPLobby {
  constructor() {
    this.matchmaker = new PvPMatchmaker();
    this.currentUser = this.loadCurrentUser();
    this.selectedBet = null;
    this.pendingChallenge = null;

    if (this.currentUser) {
      this.matchmaker.setUser(this.currentUser);
    }

    this.setupEventListeners();
    this.setupMatchmaker();
    this.loadStats();
  }

  /**
   * Load current user from localStorage
   */
  loadCurrentUser() {
    const user = localStorage.getItem('spaceInvaders_currentUser');
    return user ? JSON.parse(user) : null;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Back button
    document.getElementById('back-btn')?.addEventListener('click', () => {
      window.location.href = 'index.html';
    });

    // Mode selection
    document.getElementById('quick-match-btn')?.addEventListener('click', () => {
      this.showSection('quick-match');
    });

    document.getElementById('challenge-friend-btn')?.addEventListener('click', () => {
      this.showSection('challenge');
    });

    // Bet selection
    document.querySelectorAll('.bet-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedBet = parseInt(btn.dataset.bet);
        this.joinQueue(this.selectedBet);
      });
    });

    // Cancel queue
    document.getElementById('cancel-queue-btn')?.addEventListener('click', () => {
      this.leaveQueue();
    });

    // Send challenge
    document.getElementById('send-challenge-btn')?.addEventListener('click', () => {
      this.sendChallenge();
    });

    // Challenge modal responses
    document.getElementById('accept-challenge-btn')?.addEventListener('click', () => {
      this.respondToChallenge(true);
    });

    document.getElementById('decline-challenge-btn')?.addEventListener('click', () => {
      this.respondToChallenge(false);
    });
  }

  /**
   * Setup matchmaker callbacks
   */
  setupMatchmaker() {
    this.matchmaker.onMatchFound((matchData) => {
      this.startMatch(matchData);
    });

    this.matchmaker.onChallengeReceived((challengeData) => {
      this.showChallengeModal(challengeData);
    });

    this.matchmaker.subscribeToChallenges();
  }

  /**
   * Show section
   */
  showSection(section) {
    document.querySelectorAll('.pvp-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));

    if (section === 'quick-match') {
      document.getElementById('quick-match-section')?.classList.remove('hidden');
      document.getElementById('quick-match-btn')?.classList.add('active');
    } else if (section === 'challenge') {
      document.getElementById('challenge-section')?.classList.remove('hidden');
      document.getElementById('challenge-friend-btn')?.classList.add('active');
    }
  }

  /**
   * Join matchmaking queue
   */
  async joinQueue(betAmount) {
    try {
      await this.matchmaker.joinQueue(betAmount);

      // Show queue status
      document.getElementById('queue-status')?.classList.remove('hidden');
      document.querySelectorAll('.bet-btn').forEach(b => b.disabled = true);
    } catch (error) {
      console.error('Failed to join queue:', error);
      alert(`Erro: ${error.message}`);
    }
  }

  /**
   * Leave matchmaking queue
   */
  async leaveQueue() {
    await this.matchmaker.leaveQueue();

    document.getElementById('queue-status')?.classList.add('hidden');
    document.querySelectorAll('.bet-btn').forEach(b => b.disabled = false);
  }

  /**
   * Send friend challenge
   */
  async sendChallenge() {
    const username = document.getElementById('friend-username')?.value;
    const betAmount = parseInt(document.getElementById('challenge-bet')?.value);

    if (!username) {
      alert('Digite o nome do jogador');
      return;
    }

    try {
      // Get user ID from username
      const { data: player, error } = await this.matchmaker.supabase
        .from('players')
        .select('id')
        .eq('username', username)
        .single();

      if (error || !player) {
        alert(`Jogador "${username}" não encontrado`);
        return;
      }

      await this.matchmaker.challengeFriend(player.id, betAmount);
      alert('Desafio enviado!');
    } catch (error) {
      console.error('Failed to send challenge:', error);
      alert(`Erro: ${error.message}`);
    }
  }

  /**
   * Show challenge modal
   */
  showChallengeModal(challengeData) {
    console.log('🎯 showChallengeModal called:', challengeData);
    this.pendingChallenge = challengeData;

    const modal = document.getElementById('challenge-modal');
    const text = document.getElementById('challenge-text');

    if (!modal || !text) {
      console.error('❌ Modal elements not found!', { modal, text });
      return;
    }

    text.textContent = `${challengeData.challengerUsername} te desafiou para uma partida de ${challengeData.betAmount} moedas!`;
    modal.classList.remove('hidden');
    console.log('✅ Modal should be visible now');
  }

  /**
   * Respond to challenge
   */
  async respondToChallenge(accept) {
    console.log('🔔 respondToChallenge called:', { accept, hasPendingChallenge: !!this.pendingChallenge });

    if (!this.pendingChallenge) {
      console.log('⚠️ No pending challenge, ignoring');
      return;
    }

    try {
      await this.matchmaker.respondToChallenge(this.pendingChallenge.challengeId, accept);

      document.getElementById('challenge-modal')?.classList.add('hidden');
      this.pendingChallenge = null;

      if (accept) {
        // Match will be started via onMatchFound callback
        console.log('Challenge accepted, waiting for match start...');
      }
    } catch (error) {
      console.error('Failed to respond to challenge:', error);
      alert(`Erro: ${error.message}`);
    }
  }

  /**
   * Start match
   */
  startMatch(matchData) {
    console.log('Starting match:', matchData);

    // Hide lobby
    document.querySelector('.pvp-lobby')?.classList.add('hidden');

    // Hide modal if open
    document.getElementById('challenge-modal')?.classList.add('hidden');

    // Show game container
    document.getElementById('game-container')?.classList.remove('hidden');

    // Create game instance (convert matchId to string)
    const game = new PvPGameSimple(
      String(matchData.matchId),
      matchData.isOfferer,
      matchData.gameSeed,
      'game-canvas'
    );

    game.start();
  }

  /**
   * Load player stats
   */
  async loadStats() {
    // TODO: Load ELO and match history from Supabase
    // For now, using placeholder
    document.getElementById('elo-display').textContent = '1000';
  }
}

// Initialize lobby when page loads
window.addEventListener('DOMContentLoaded', () => {
  new PvPLobby();
});

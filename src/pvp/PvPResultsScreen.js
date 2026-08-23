/**
 * PvPResultsScreen - Match Results Display
 *
 * Shows:
 * - Winner/loser status
 * - Kill stats
 * - ELO changes
 * - Coins won/lost
 * - Rematch/back to lobby buttons
 */

class PvPResultsScreen {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  /**
   * Show results
   * @param {object} results - Match results
   */
  show(results) {
    const isWinner = results.isWinner;

    this.container.innerHTML = `
      <div class="results-overlay">
        <div class="results-modal">
          <h1 class="${isWinner ? 'victory' : 'defeat'}">
            ${isWinner ? '🏆 VITÓRIA!' : '💀 DERROTA'}
          </h1>

          <div class="results-stats">
            <div class="stat">
              <span class="label">Kills:</span>
              <span class="value">${results.kills}</span>
            </div>
            <div class="stat">
              <span class="label">Mortes:</span>
              <span class="value">${results.deaths}</span>
            </div>
            <div class="stat">
              <span class="label">Duração:</span>
              <span class="value">${this.formatDuration(results.duration)}</span>
            </div>
          </div>

          <div class="results-rewards">
            <div class="elo-change ${results.eloChange >= 0 ? 'positive' : 'negative'}">
              ELO: ${results.eloChange >= 0 ? '+' : ''}${results.eloChange}
            </div>
            <div class="coins-change ${results.coinsChange >= 0 ? 'positive' : 'negative'}">
              Moedas: ${results.coinsChange >= 0 ? '+' : ''}${results.coinsChange}
            </div>
          </div>

          <div class="results-actions">
            <button id="results-lobby-btn" class="btn-primary">Voltar ao Lobby</button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    document.getElementById('results-lobby-btn')?.addEventListener('click', () => {
      window.location.href = 'pvp.html';
    });

    this.container.style.display = 'block';
  }

  /**
   * Format duration in seconds to MM:SS
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Hide results screen
   */
  hide() {
    this.container.style.display = 'none';
  }
}

export default PvPResultsScreen;

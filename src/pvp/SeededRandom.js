/**
 * SeededRandom - Deterministic pseudo-random number generator
 *
 * Uses Linear Congruential Generator (LCG) algorithm to produce
 * identical sequences from the same seed across different clients.
 *
 * Critical for PvP: ensures meteors and aliens spawn at identical
 * positions on both players' screens.
 */
class SeededRandom {
  /**
   * @param {string} seed - Seed string (e.g., "matchId_timestamp")
   */
  constructor(seed) {
    this.seed = this.hashCode(seed);
    this.originalSeed = seed;
  }

  /**
   * Generate next random number in sequence
   * @returns {number} Random float between 0.0 and 1.0 (exclusive)
   */
  next() {
    // LCG formula: (a * seed + c) % m
    // Constants from Numerical Recipes
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Generate random integer in range
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (exclusive)
   * @returns {number} Random integer in [min, max)
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Generate random float in range
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random float in [min, max)
   */
  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  /**
   * Convert string seed to numeric hash
   * @param {string} str - Input string
   * @returns {number} Hash code
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Reset to original seed (for debugging/testing)
   */
  reset() {
    this.seed = this.hashCode(this.originalSeed);
  }
}

export default SeededRandom;

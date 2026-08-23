/**
 * WebRTCConnection - Manages peer-to-peer WebRTC connection for PvP matches
 *
 * Handles:
 * - WebRTC connection setup (offer/answer exchange)
 * - ICE candidate gathering
 * - Data channel for game messages
 * - Connection state monitoring
 * - Reconnection logic
 */

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const SIGNALING_URL = window.location.origin + '/functions/v1/pvp-signaling';

class WebRTCConnection {
  /**
   * @param {string} matchId - Unique match/room identifier
   * @param {boolean} isOfferer - True if this client creates the offer
   */
  constructor(matchId, isOfferer) {
    this.matchId = matchId;
    this.isOfferer = isOfferer;

    this.peerConnection = null;
    this.dataChannel = null;

    this.onMessageCallback = null;
    this.onDisconnectCallback = null;
    this.onConnectedCallback = null;

    this.connectionState = 'new'; // new, connecting, connected, disconnected, failed
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  /**
   * Initialize WebRTC connection
   * @param {number} timeout - Connection timeout in ms
   * @returns {Promise<void>}
   */
  async initialize(timeout = 10000) {
    console.log(`[WebRTC] Initializing as ${this.isOfferer ? 'offerer' : 'answerer'}`);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('WebRTC connection timeout'));
      }, timeout);

      this.setupPeerConnection()
        .then(() => {
          clearTimeout(timeoutId);
          resolve();
        })
        .catch(err => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });
  }

  /**
   * Set up RTCPeerConnection and data channel
   */
  async setupPeerConnection() {
    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10
    });

    // Monitor connection state
    this.peerConnection.onconnectionstatechange = () => {
      this.connectionState = this.peerConnection.connectionState;
      console.log('[WebRTC] Connection state:', this.connectionState);

      if (this.connectionState === 'connected' && this.onConnectedCallback) {
        this.onConnectedCallback();
      }

      if (this.connectionState === 'disconnected' || this.connectionState === 'failed') {
        if (this.onDisconnectCallback) {
          this.onDisconnectCallback();
        }
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = event => {
      if (event.candidate) {
        this.sendToSignalingServer('ice_candidate', event.candidate);
      }
    };

    if (this.isOfferer) {
      // Offerer creates the data channel
      this.dataChannel = this.peerConnection.createDataChannel('game-sync', {
        ordered: false,        // Allow out-of-order delivery for lower latency
        maxRetransmits: 0      // Don't retransmit (old data is useless)
      });

      this.setupDataChannel();

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      await this.sendToSignalingServer('offer', offer);

      // Wait for answer
      await this.waitForAnswer();

    } else {
      // Answerer waits for data channel
      this.peerConnection.ondatachannel = event => {
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };

      // Wait for offer
      const offer = await this.waitForOffer();
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      await this.sendToSignalingServer('answer', answer);
    }

    // Poll for ICE candidates from other peer
    this.pollForIceCandidates();
  }

  /**
   * Set up data channel event handlers
   */
  setupDataChannel() {
    this.dataChannel.onopen = () => {
      console.log('[WebRTC] Data channel opened');
    };

    this.dataChannel.onclose = () => {
      console.log('[WebRTC] Data channel closed');
    };

    this.dataChannel.onmessage = event => {
      if (this.onMessageCallback) {
        const message = JSON.parse(event.data);
        this.onMessageCallback(message);
      }
    };
  }

  /**
   * Send data to signaling server
   */
  async sendToSignalingServer(action, data) {
    const response = await fetch(SIGNALING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        roomId: this.matchId,
        data
      })
    });

    if (!response.ok) {
      throw new Error(`Signaling server error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Wait for offer from signaling server
   */
  async waitForOffer() {
    let attempts = 0;
    while (attempts < 30) { // 30 seconds max
      const response = await this.sendToSignalingServer('get_offer', null);
      if (response.offer) {
        return response.offer;
      }
      await this.sleep(1000);
      attempts++;
    }
    throw new Error('Timeout waiting for offer');
  }

  /**
   * Wait for answer from signaling server
   */
  async waitForAnswer() {
    let attempts = 0;
    while (attempts < 30) {
      const response = await this.sendToSignalingServer('get_answer', null);
      if (response.answer) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(response.answer));
        return;
      }
      await this.sleep(1000);
      attempts++;
    }
    throw new Error('Timeout waiting for answer');
  }

  /**
   * Poll for ICE candidates from other peer
   */
  async pollForIceCandidates() {
    setInterval(async () => {
      try {
        const response = await this.sendToSignalingServer('get_ice_candidates', null);
        if (response.candidates && response.candidates.length > 0) {
          for (const candidate of response.candidates) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
      } catch (err) {
        console.error('[WebRTC] Error polling ICE candidates:', err);
      }
    }, 1000); // Poll every second
  }

  /**
   * Send message through data channel
   * @param {object} message - Message object to send
   */
  send(message) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    } else {
      console.warn('[WebRTC] Cannot send - data channel not open');
    }
  }

  /**
   * Register callback for incoming messages
   * @param {function} callback - Callback(message)
   */
  onMessage(callback) {
    this.onMessageCallback = callback;
  }

  /**
   * Register callback for disconnect events
   * @param {function} callback - Callback()
   */
  onDisconnect(callback) {
    this.onDisconnectCallback = callback;
  }

  /**
   * Register callback for connection established
   * @param {function} callback - Callback()
   */
  onConnected(callback) {
    this.onConnectedCallback = callback;
  }

  /**
   * Attempt to reconnect
   */
  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebRTC] Max reconnect attempts reached');
      return false;
    }

    this.reconnectAttempts++;
    console.log(`[WebRTC] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    try {
      this.close();
      await this.sleep(1000 * this.reconnectAttempts); // Exponential backoff
      await this.initialize();
      this.reconnectAttempts = 0;
      return true;
    } catch (err) {
      console.error('[WebRTC] Reconnect failed:', err);
      return false;
    }
  }

  /**
   * Close connection
   */
  close() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.connectionState = 'closed';
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default WebRTCConnection;

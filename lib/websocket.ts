// GameWebSocket.ts

import { WEBSOCKET_CONFIG, SERVERS } from './constants';
import { encode, decode } from '@msgpack/msgpack';
import { ClientMessage, ServerMessage } from './messages';

// For raw data, we accept any type.
export type RawMessage = any;

export class GameWebSocket {
  private ws!: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS;
  private serverUrl: string;
  private onMessage: (msg: ServerMessage) => void;
  private onConnect: () => void;
  private onDisconnect: () => void;
  private connectionStartTime: number;
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingIntervalId: number | null = null;
  private pongTimeoutId: number | null = null;
  private messageTimeoutId: number | null = null;
  private lastPingTime: number = 0;
  private currentLatency: number = 0;
  private messageQueue: ClientMessage[] = [];
  private processingQueue = false;

  constructor(
    onMessage: (msg: ServerMessage) => void,
    onConnect: () => void,
    onDisconnect: () => void,
    serverUrl?: string
  ) {
    this.onMessage = onMessage;
    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;
    this.serverUrl = serverUrl || SERVERS[0].url;
    this.connectionStartTime = Date.now();
    
    console.log('[WebSocket] Connecting to:', this.serverUrl);
    this.connect();
  }

  private async processMessageQueue() {
    if (this.processingQueue || this.messageQueue.length === 0) return;
    
    this.processingQueue = true;
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (!message) continue;

      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          // For ping/pong, send as text
          if (message.type === 'ping' || message.type === 'pong') {
            this.ws.send(message.type);
          } else {
            // For game messages, use MessagePack with options to match rmp-serde
            const messageBytes = encode(message, {
              ignoreUndefined: true,  // Skip undefined values
              forceFloat32: true,     // Ensure float32 is used for all floats
              sortKeys: true,         // Match Rust's canonical struct serialization
              ignoreNil: true         // Helps with optional fields in Rust structs
            });
            
            // Debug message logging for troubleshooting
            console.debug('[WebSocket] Sending message type:', message.type);
            
            this.ws.send(messageBytes);
          }

          if (this.messageTimeoutId) {
            clearTimeout(this.messageTimeoutId);
          }
          this.messageTimeoutId = window.setTimeout(() => {
            console.warn('[WebSocket] Message timeout');
            this.handleConnectionFailure();
          }, WEBSOCKET_CONFIG.MESSAGE_TIMEOUT);
        }
      } catch (error) {
        console.error('[WebSocket] Failed to send message:', error);
        // Re-queue important messages if needed
        if (message.type === 'join' || message.type === 'direction') {
          this.messageQueue.unshift(message);
        }
        break;
      }
    }
    this.processingQueue = false;
  }

  private connect() {
    if (this.connectionStatus === 'connecting') return;

    console.log('[WebSocket] Attempting connection to:', this.serverUrl);
    this.cleanup();
    this.connectionStatus = 'connecting';

    try {
      this.ws = new WebSocket(this.serverUrl);
      this.ws.binaryType = 'arraybuffer'; // Enable receiving binary data as ArrayBuffer
      
      this.ws.addEventListener('error', (error) => {
        console.error(`[WebSocket] Connection error:`, error);
        this.handleConnectionFailure();
      });

      this.setupWebSocketHandlers();

      const connectionTimeoutId = setTimeout(() => {
        if (this.connectionStatus === 'connecting') {
          console.warn('[WebSocket] Connection timeout');
          this.handleConnectionFailure();
        }
      }, WEBSOCKET_CONFIG.CONNECTION_TIMEOUT);

      this.ws.addEventListener('open', () => clearTimeout(connectionTimeoutId));
    } catch (error) {
      console.error('[WebSocket] Failed to create WebSocket:', error);
      this.handleConnectionFailure();
    }
  }

  private setupWebSocketHandlers() {
    this.ws.onopen = () => {
      const connectionTime = Date.now() - this.connectionStartTime;
      console.log(`[WebSocket] Connected to ${this.serverUrl} after ${connectionTime}ms`);
      this.reconnectAttempts = 0;
      this.connectionStatus = 'connected';
      this.startPingInterval();
      this.onConnect();
      this.processMessageQueue();
    };

    this.ws.onclose = () => {
      console.log(`[WebSocket] Connection closed to ${this.serverUrl}`);
      this.handleConnectionFailure();
    };

    this.ws.onerror = (error) => {
      console.error(`[WebSocket] Error connecting to ${this.serverUrl}:`, error);
      this.handleConnectionFailure();
    };

    this.ws.onmessage = async (event) => {
      try {
        if (typeof event.data === 'string') {
          // Handle ping/pong messages
          switch (event.data) {
            case 'ping':
              this.ws.send('pong');
              return;
            case 'pong':
              this.handlePong();
              return;
            default:
              console.warn('[WebSocket] Unexpected text message:', event.data);
          }
          return;
        }

        if (event.data instanceof ArrayBuffer) {
          try {
            // Create a proper Uint8Array view of the data
            const uint8Array = new Uint8Array(event.data);
            
            // Log the first few bytes for debugging
            const hexBytes = Array.from(uint8Array.slice(0, Math.min(20, uint8Array.length)))
              .map(b => b.toString(16).padStart(2, '0'))
              .join(' ');
            
            if (uint8Array.length < 2) {
              console.error('[WebSocket] Received too small binary message:', hexBytes);
              return;
            }
            
            // Check first byte for MessagePack format validation
            const firstByte = uint8Array[0];
            if (![0x81, 0x82, 0x83].includes(firstByte)) { // Common map headers (1-3 elements)
              console.warn('[WebSocket] Unexpected MessagePack header byte:', firstByte, 'full data:', hexBytes);
            }
            
            // Decode with explicit options matching server's encoding
            const decoded = decode(uint8Array, {
              maxStrLength: Number.MAX_SAFE_INTEGER,
              maxBinLength: Number.MAX_SAFE_INTEGER,
              maxArrayLength: Number.MAX_SAFE_INTEGER,
              maxMapLength: Number.MAX_SAFE_INTEGER,
            });
            
            // Clear message timeout
            if (this.messageTimeoutId) {
              clearTimeout(this.messageTimeoutId);
              this.messageTimeoutId = null;
            }

            // Validate message structure before processing
            if (!decoded || typeof decoded !== 'object' || !decoded.type) {
              console.error('[WebSocket] Invalid message structure:', decoded);
              return;
            }
            
            console.debug('[WebSocket] Received message type:', decoded.type);
            
            // Pass decoded message to callback
            this.onMessage(decoded as ServerMessage);
          } catch (error) {
            console.error('[WebSocket] Failed to decode binary message:', error,
              '\nBuffer size:', event.data.byteLength,
              '\nFirst few bytes:', Array.from(new Uint8Array(event.data).slice(0, 20))
                .map(b => b.toString(16).padStart(2, '0'))
                .join(' '));
          }
          return;
        }

        console.warn('[WebSocket] Unknown message type:', typeof event.data);
      } catch (error) {
        console.error('[WebSocket] Message processing error:', error);
      }
    };
  }

  private handlePong() {
    if (this.pongTimeoutId !== null) {
      clearTimeout(this.pongTimeoutId);
      this.pongTimeoutId = null;
      this.currentLatency = Date.now() - this.lastPingTime;
    }
  }

  private handleConnectionFailure() {
    this.cleanup();
    this.connectionStatus = 'disconnected';
    this.onDisconnect();
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = WEBSOCKET_CONFIG.RECONNECT_INTERVAL * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.reconnectTimeout = setTimeout(() => this.connect(), delay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.connectionStatus = 'error';
    }
  }

  private cleanup() {
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    if (this.pingIntervalId !== null) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
    if (this.pongTimeoutId !== null) {
      clearTimeout(this.pongTimeoutId);
      this.pongTimeoutId = null;
    }
    if (this.messageTimeoutId !== null) {
      clearTimeout(this.messageTimeoutId);
      this.messageTimeoutId = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private startPingInterval() {
    this.pingIntervalId = window.setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        try {
          this.lastPingTime = Date.now();
          this.ws.send('ping');
          this.pongTimeoutId = window.setTimeout(() => {
            console.warn('[WebSocket] Pong timeout, reconnecting...');
            this.handleConnectionFailure();
          }, WEBSOCKET_CONFIG.PONG_TIMEOUT);
        } catch (error) {
          console.error('[WebSocket] Ping failed:', error);
          this.handleConnectionFailure();
        }
      }
    }, WEBSOCKET_CONFIG.PING_INTERVAL);
  }

  public sendMessage(message: ClientMessage) {
    this.messageQueue.push(message);
    if (!this.processingQueue) {
      this.processMessageQueue();
    }
  }

  public close() {
    console.log('[WebSocket] Closing connection');
    this.cleanup();
    this.connectionStatus = 'disconnected';
  }

  public getStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    return this.connectionStatus;
  }
  
  public getLatency() {
    return this.currentLatency;
  }

  // Test message encoding for diagnostics
  public testMessageEncoding(message: ClientMessage): Uint8Array {
    try {
      // Encode with the same options used when sending
      const encoded = encode(message, {
        ignoreUndefined: true,
        forceFloat32: true,
        sortKeys: true,
        ignoreNil: true
      });
      
      // Log hex representation for debugging
      const hexBytes = Array.from(new Uint8Array(encoded).slice(0, Math.min(40, encoded.length)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      
      console.log('[WebSocket] Test encoding result:', hexBytes);
      
      return encoded;
    } catch (error) {
      console.error('[WebSocket] Test encoding error:', error);
      throw error;
    }
  }
}
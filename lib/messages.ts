/**
 * Client-server message definitions
 * 
 * These types match the Rust server's message definitions
 */

import { Vector2D } from './types';

// Client Messages (browser to server)

export interface ClientMessage {
  type: 'ping' | 'pong' | 'join' | 'direction' | 'boost';
  data?: JoinData | DirectionData | BoostData;
}

export interface JoinData {
  name: string;
  skin: PlayerSkin;
  timestamp: number;
}

export interface PlayerSkin {
  id: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface DirectionData {
  direction: Vector2D;
  sequence: number;
  timestamp: number;
}

export interface BoostData {
  active: boolean;
  sequence: number;
  timestamp: number;
}

// Server Messages (server to browser)

export interface ServerMessage {
  type: 'ping' | 'pong' | 'gameState' | 'playerJoined' | 'playerDied';
  data?: GameStateData | PlayerJoinedData | PlayerDiedData;
}

export interface GameStateData {
  players: any[]; // Full player objects
  food: any[]; // Food objects
  tokens: any[]; // Token objects
  mapSize: number;
  nextCircleShrink: number | null;
  battleRoyale: boolean;
}

export interface PlayerJoinedData {
  player: any; // Player object
}

export interface PlayerDiedData {
  playerId: string;
} 
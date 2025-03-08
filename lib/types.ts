import { SERVERS } from './constants';

export interface Vector2D {
  x: number;
  y: number;
}

export interface GameServer {
  id: string;
  name: string;
  region: string;
  url: string;
  ping: number | null;
  players: number;
  maxPlayers: number;
  status: ServerStatus;
}

export type ServerStatus = 'online' | 'offline' | 'full';

export interface SnakeSkin {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  segments: Segment[];
  direction: Vector2D;
  boosting: boolean;
  primary_color: string;
  secondary_color: string;
  tokens: number;
  lastKillTime?: number;
}

export interface Token {
  id: string;
  position: Vector2D;
  value: number;
  color: string;
  size: number;
  spawn_time: number;
  collectible: boolean;
}

export interface Segment {
  position: Vector2D;
}

export interface Food {
  id: string;
  position: Vector2D;
  color: string;
  size: number;
}

export interface FoodState {
  position: Vector2D;
  velocity: Vector2D;
  lastUpdate: number;
  color: string;
  size: number;
  origin: Vector2D;
}

export interface PredictedState {
  position: Vector2D;
  timestamp: number;
}

export interface GameState {
  players: Map<string, Player>;
  playerId: string | null;
  food: Food[];
  tokens: Token[];
  mapSize: number;
  nextCircleShrink: number | null;
  leaderboard: LeaderboardEntry[];
  direction: Vector2D;
  boosting: boolean;
  socket: GameWebSocket | null;
  predictedStates: Map<string, PredictedState[]>;
  foodStates: Map<string, FoodState>;
  lastUpdate: number;
  lastInputSequence: number;
  pendingInputs: {
    sequence: number;
    timestamp: number;
    direction: Vector2D;
    boosting: boolean;
  }[];
  setPlayers: (players: Map<string, Player>) => void;
  setFood: (food: Food[]) => void;
  setTokens: (tokens: Token[]) => void;
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  setDirection: (direction: Vector2D) => void;
  setBoosting: (boosting: boolean) => void;
  initializeGame: (playerName: string, skin: SnakeSkin, onConnect?: () => void) => void;
  updateGame: () => void;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  tokens: number;
}

export interface ClientMessage {
  type: string;
  data: any;
}

export interface JoinData {
  name: string;
  skin: SnakeSkin;
}

export interface GameWebSocket {
  sendMessage: (message: any) => void;
  close: () => void;
  getLatency: () => number;
  getStatus: () => 'connecting' | 'connected' | 'disconnected' | 'error';
}

export interface ServerMessage {
  type: string;
  data: any;
}
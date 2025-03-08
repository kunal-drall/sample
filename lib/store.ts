import { create } from 'zustand';
import { GAME_CONFIG, PERFORMANCE_CONFIG, VISUAL_CONFIG, SERVERS } from './constants';
import { GameState, Player, Vector2D, Food, Token, GameWebSocket, ServerMessage, FoodState, SnakeSkin } from './types';
import { 
  createInitialSnake, 
  generateFood, 
  isOutOfBounds, 
  distance, 
  normalizeVector,
  sanitizePlayerName,
  SECURITY_CONFIG
} from './utils';
import { GameWebSocket as GameWebSocketImpl } from './websocket';
import { ClientMessage, DirectionData, BoostData, JoinData, PlayerSkin as MessagePlayerSkin } from './messages';

export const useGameStore = create<GameState>((set, get) => ({
  players: new Map(),
  playerId: null,
  food: [],
  mapSize: GAME_CONFIG.MAP_SIZE,
  nextCircleShrink: null,
  tokens: [],
  leaderboard: [],
  direction: { x: 1, y: 0 },
  boosting: false,
  socket: null,
  predictedStates: new Map(),
  foodStates: new Map(),
  lastUpdate: 0,
  lastInputSequence: 0,
  pendingInputs: [],
  setPlayers: (players) => set({ players }),
  setFood: (food) => {
    const currentTime = Date.now();
    const currentFoodStates = get().foodStates;
    const newFoodStates = new Map<string, FoodState>();

    food.forEach(f => {
      const currentState = currentFoodStates.get(f.id);
      
      if (!currentState) {
        newFoodStates.set(f.id, {
          position: { ...f.position },
          velocity: { x: 0, y: 0 },
          lastUpdate: currentTime,
          color: f.color,
          size: f.size,
          origin: { ...f.position }
        });
      } else {
        newFoodStates.set(f.id, {
          ...currentState,
          position: f.position,
          origin: f.position,
          lastUpdate: currentTime
        });
      }
    });

    set({ food, foodStates: newFoodStates });
  },
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setTokens: (tokens) => set({ tokens }),

  setDirection: (newDirection: Vector2D) => {
    const state = get();
    if (!state.playerId) return;

    const normalized = normalizeVector(newDirection);
    if (isNaN(normalized.x) || isNaN(normalized.y)) {
      console.warn('Invalid direction vector:', newDirection);
      return;
    }

    set({ direction: normalized });

    const input = {
      sequence: state.lastInputSequence + 1,
      timestamp: Math.floor(Date.now()),
      direction: normalized,
      boosting: state.boosting
    };

    set(state => ({
      lastInputSequence: state.lastInputSequence + 1,
      pendingInputs: [...state.pendingInputs, input]
    }));

    const socket = state.socket;
    if (socket?.getStatus() === 'connected') {
      const message: ClientMessage = {
        type: 'direction',
        data: {
          direction: normalized,
          sequence: input.sequence,
          timestamp: input.timestamp
        } as DirectionData
      };
      socket.sendMessage(message);
    }
  },
  setBoosting: (boosting: boolean) => {
    const state = get();
    if (!state.playerId) return;
    
    const currentPlayer = state.players.get(state.playerId);
    if (!currentPlayer || currentPlayer.boosting === boosting) return;

    set({ boosting });

    const input = {
      sequence: state.lastInputSequence + 1,
      timestamp: Math.floor(Date.now()),
      direction: state.direction,
      boosting
    };

    set(state => ({
      lastInputSequence: state.lastInputSequence + 1,
      pendingInputs: [...state.pendingInputs, input]
    }));

    const socket = state.socket;
    if (socket?.getStatus() === 'connected') {
      const message: ClientMessage = {
        type: 'boost',
        data: {
          active: boosting,
          sequence: input.sequence,
          timestamp: input.timestamp
        } as BoostData
      };
      socket.sendMessage(message);
    }
  },
  initializeGame: (playerName: string, skin: SnakeSkin, onConnect?: () => void) => {
    const sanitizedName = sanitizePlayerName(playerName);
    
    const state = get();
    if (!state.socket || state.socket.getStatus() !== 'connected') {
      if (state.socket) {
        state.socket.close();
      }
      
      set({
        players: new Map(),
        food: [],
        playerId: null,
        tokens: [],
        predictedStates: new Map(),
        foodStates: new Map(),
        socket: null,
        lastInputSequence: 0,
        pendingInputs: []
      });
    }
    
    const lastServerId = localStorage.getItem('lastServer');
    const serverUrl = lastServerId ? 
      SERVERS.find(s => s.id === lastServerId)?.url : 
      SERVERS[0].url;
    
    const socket = new GameWebSocketImpl( 
      (msg: ServerMessage) => {
        try {
          console.log('[GameStore] Received message:', msg.type);
          if (msg.type === 'gameState' && msg.data) {
            handleGameState(msg.data);
          } else if (msg.type === 'playerJoined' && msg.data) {
            handlePlayerJoined(msg.data);
          } else if (msg.type === 'playerDied' && msg.data) {
            handlePlayerDied(msg.data);
          }
        } catch (error) {
          console.error('[GameStore] Error processing message:', error);
        }
      },
      () => {
        const joinMessage: ClientMessage = {
          type: 'join',
          data: {
            name: sanitizedName,
            skin: {
              id: skin.id,
              primaryColor: skin.primaryColor,
              secondaryColor: skin.secondaryColor
            } as MessagePlayerSkin,
            timestamp: Math.floor(Date.now())
          } as JoinData
        };
        socket?.sendMessage(joinMessage);
        onConnect?.();
      },
      () => {
        const currentPlayerId = get().playerId;
        const socket = get().socket;
        
        if (socket) {
          socket.close();
        }
        
        set({
          players: new Map(),
          food: [],
          playerId: null,
          tokens: [],
          predictedStates: new Map(),
          foodStates: new Map(),
          socket: null
        });
      },
      serverUrl
    );

    const handlePlayerJoined = (data: any) => {
      try {
        if (!data || !data.player || !data.player.id) {
          throw new Error('Invalid player data');
        }
        
        const currentState = get();
        if (!currentState.playerId) {
          console.log('[GameStore] Setting initial player ID:', data.player.id);
          const angle = Math.random() * Math.PI * 2;
          set({ 
            playerId: data.player.id,
            direction: { 
              x: Math.cos(angle), 
              y: Math.sin(angle) 
            }
          });

          // Add player to players map
          set((state) => ({
            players: new Map(state.players).set(data.player.id, {
              ...data.player,
              segments: data.player.segments || []
            })
          }));
        } else if (data.player.id !== currentState.playerId) {
          // Only add other players, not ourselves
          set((state) => ({
            players: new Map(state.players).set(data.player.id, {
              ...data.player,
              segments: data.player.segments || []
            })
          }));
        }
      } catch (error) {
        console.error('[GameStore] Error handling message:', error);
      }
    };

    const handlePlayerDied = (data: any) => {
      try {
        const playerId = data.player_id;
        console.log('[GameStore] Received playerDied message:', playerId);
        
        if (playerId === get().playerId) {
          console.log('[GameStore] Player death confirmed');
          
          // Close socket and clear state
          if (socket) {
            socket.close();
          }
          
          set({ 
            players: new Map(),
            playerId: null,
            socket: null
          });
          
          // Clear localStorage and redirect
          if (typeof window !== 'undefined') {
            localStorage.removeItem('lastServer');
            window.location.href = '/';
          }
        } else {
          console.log('[GameStore] Other player died:', playerId);
          set((state) => {
            const players = new Map(state.players);
            players.delete(playerId);
            return { players };
          });
        }
      } catch (error) {
        console.error('[GameStore] Error handling playerDied:', error);
      }
    };

    const handleGameState = (data: any) => {
      try {
        if (!data || !Array.isArray(data.players) || !Array.isArray(data.food)) {
          throw new Error('Invalid gameState format');
        }

        const currentPlayerId = get().playerId;
        if (!currentPlayerId) return;

        const currentDirection = get().players.get(currentPlayerId)?.direction;

        if (data.lastProcessedInput) {
          const remainingInputs = get().pendingInputs.filter(
            input => input.sequence > data.lastProcessedInput
          );

          if (remainingInputs.length > 0) {
            const player = data.players.find((p: Player) => p.id === currentPlayerId);
            if (player) {
              remainingInputs.forEach(input => {
                const dt = (Date.now() - input.timestamp) / 1000;
                const speed = input.boosting ? 
                  GAME_CONFIG.BASE_SPEED * 2 : 
                  GAME_CONFIG.BASE_SPEED;

                const predictedX = player.segments[0].position.x + input.direction.x * speed * dt;
                const predictedY = player.segments[0].position.y + input.direction.y * speed * dt;

                player.segments[0].position.x += (predictedX - player.segments[0].position.x) * 0.5;
                player.segments[0].position.y += (predictedY - player.segments[0].position.y) * 0.5;
              });
            }
          }

          set({ pendingInputs: remainingInputs });
        }

        const newPlayers = new Map<string, Player>();
        data.players.forEach((p: Player) => {
          if (p.id === currentPlayerId && currentDirection) {
            p.direction = currentDirection;
          }
          newPlayers.set(p.id, p);
        });

        set({
          players: newPlayers,
          food: data.food,
          tokens: data.tokens || [],
          mapSize: data.map_size || GAME_CONFIG.MAP_SIZE,
          nextCircleShrink: data.next_circle_shrink || null
        });
      } catch (error) {
        console.error('Error processing gameState:', error);
      }
    };

    set({ socket });
  },
  updateGame: () => {
    const state = get();
    const { foodStates, players, playerId } = state;
    
    if (foodStates.size > 0) {
      const currentTime = Date.now();
      const newFoodStates = new Map(foodStates);
      
      foodStates.forEach((foodState, id) => {
        const dt = Math.min((currentTime - foodState.lastUpdate) / 1000, 0.1);
        if (dt > 0) {
          let attractionX = 0;
          let attractionY = 0;
          let totalAttraction = 0;

          if (playerId) {
            const player = players.get(playerId);
            if (player?.segments[0]) {
              const head = player.segments[0];
              const dx = head.position.x - foodState.position.x;
              const dy = head.position.y - foodState.position.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < GAME_CONFIG.FOOD_ATTRACTION_RADIUS) {
                const strength = Math.pow(1 - dist / GAME_CONFIG.FOOD_ATTRACTION_RADIUS, 3) * 
                               GAME_CONFIG.FOOD_ATTRACTION_STRENGTH * 2;
                attractionX = dx * strength;
                attractionY = dy * strength;
                totalAttraction = strength;
              }
            }
          }

          const targetX = foodState.origin.x + attractionX;
          const targetY = foodState.origin.y + attractionY;

          const interpolationSpeed = GAME_CONFIG.FOOD_INTERPOLATION_SPEED * dt * 2;
          const newPosition = {
            x: foodState.position.x + (targetX - foodState.position.x) * interpolationSpeed,
            y: foodState.position.y + (targetY - foodState.position.y) * interpolationSpeed
          };

          const wobbleAmount = 3;
          const wobbleSpeed = 4;
          newPosition.x += Math.sin(currentTime * 0.001 * wobbleSpeed) * wobbleAmount * totalAttraction;
          newPosition.y += Math.cos(currentTime * 0.001 * wobbleSpeed) * wobbleAmount * totalAttraction;

          newFoodStates.set(id, {
            ...foodState,
            position: newPosition,
            lastUpdate: currentTime
          });
        }
      });
      
      set({ foodStates: newFoodStates });
    }
  }
}));
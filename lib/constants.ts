// Game Configuration
export const GAME_CONFIG = {
  BASE_SPEED: 3,
  BOOST_COST: 0.1, // 0.1 points per second while boosting
  SEGMENT_SPACING: 5, // Very tight spacing like slither.io
  SEGMENT_SMOOTHING: 1.0,
  SEGMENT_GAP: 10, // Initial gap between segments
  DIRECTION_SMOOTHING: 0.5,
  MAP_SIZE: 2000,
  MIN_MAP_SIZE: 500,
  CIRCLE_SHRINK_INTERVAL: 10000, // 10 seconds
  CIRCLE_SHRINK_SPEED: 100, // How much to reduce radius by each interval
  INITIAL_SNAKE_LENGTH: 3, // Minimal initial length
  INITIAL_POSITION: { x: 0, y: 0 },
  BASE_SNAKE_WIDTH: 25,
  MAX_SNAKE_WIDTH: 250,
  WIDTH_GROWTH_FACTOR: 0.005, // Very slow growth factor
  FOOD_ATTRACTION_RADIUS: 100,
  FOOD_ATTRACTION_STRENGTH: 1.0,
  FOOD_INTERPOLATION_SPEED: 5,
  MOVEMENT_INTERPOLATION: 1.0, // Full movement response
  SERVER_TICK_RATE: 30,
  CLIENT_UPDATE_RATE: 30, // Match server tick rate
  INTERPOLATION_DELAY: 50, // Reduced for lower latency
  PREDICTION_STEPS: 3 // Number of steps to predict ahead
} as const;

// WebSocket Configuration
export const WEBSOCKET_CONFIG = {
  RECONNECT_INTERVAL: 500,
  MAX_RECONNECT_ATTEMPTS: 5,
  PING_INTERVAL: 5000,
  PONG_TIMEOUT: 3000,
  CONNECTION_TIMEOUT: 5000,
  MESSAGE_TIMEOUT: 5000
} as const;

// Touch Controls Configuration
export const TOUCH_CONFIG = {
  UPDATE_INTERVAL: 16,
  DEADZONE: 10,
  SENSITIVITY: 1.5,
  MAX_JOYSTICK_OFFSET: 50
} as const;

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  FPS_CAP: 144,
  FRAME_TIME: 1000 / 144,
  TOUCH_THROTTLE: 16,
  LATENCY_BUFFER_SIZE: 10,
  QUALITY_LEVELS: {
    LOW: {
      PARTICLES: false,
      SHADOWS: false,
      GLOW: false,
      BLUR: false,
      INTERPOLATION: false
    },
    MEDIUM: {
      PARTICLES: true,
      SHADOWS: true,
      GLOW: false,
      BLUR: true,
      INTERPOLATION: true
    },
    HIGH: {
      PARTICLES: true,
      SHADOWS: true,
      GLOW: true,
      BLUR: true,
      INTERPOLATION: true
    }
  },
  FRAME_BUDGET: 16.66,
  ADAPTIVE_QUALITY: true,
  PARTICLE_POOL_SIZE: 100,
  OBJECT_POOL_SIZE: 50,
  SPATIAL_GRID_SIZE: 100,
  MAX_VISIBLE_FOOD: 100,
  VIEWPORT_PADDING: 100
} as const;

// Server Configuration
export const SERVERS = [
  {
    id: 'in',
    name: 'India',
    region: 'Mumbai',
    url: 'wss://ws.4meme.org/ws',
    ping: null,
    players: 0,
    maxPlayers: 500,
    status: 'online' as const
  },
  {
    id: 'eu',
    name: 'EU West',
    region: 'Frankfurt',
    url: 'wss://ws.4meme.org/ws',
    ping: null,
    players: 0,
    maxPlayers: 500,
    status: 'online' as const
  }
] as const;

// Snake Skins
export const SNAKE_SKINS = [
  {
    id: 'solana',
    name: 'Solana',
    primaryColor: '#DC1FFF',   // Magenta
    secondaryColor: '#00FFA3'  // Mint
  },
  {
    id: 'cyber',
    name: 'Cyber',
    primaryColor: '#00ffea',   // Cyan
    secondaryColor: '#ff0099'  // Pink
  },
  {
    id: 'neon',
    name: 'Neon',
    primaryColor: '#0bff00',   // Electric Green
    secondaryColor: '#7f00ff'  // Purple
  }
] as const;

// Visual Configuration
export const VISUAL_CONFIG = {
  GRID_SIZE: 25,
  MIN_FOOD_SIZE: 4.0,
  MAX_FOOD_SIZE: 12.0, // Reduced max food size
  SNAKE_WIDTH: GAME_CONFIG.BASE_SNAKE_WIDTH,
  SNAKE_SHADOW_WIDTH: GAME_CONFIG.BASE_SNAKE_WIDTH + 6,
  SNAKE_SHADOW_ALPHA: 0.3,
  MAP_BORDER_COLOR: '#ffffff',
  FOOD_COLORS: [
    '#DC1FFF', // Solana magenta
    '#00FFA3', // Solana mint
    '#03E1FF', // Solana cyan
    '#DC1FFF', // Repeated for variety
    '#00FFA3',
    '#03E1FF',
    '#DC1FFF',
    '#00FFA3'
  ],
  FOOD_GLOW_INTENSITY: 0.8,
  FOOD_PULSE_SPEED: 0.005,
  FOOD_PULSE_RANGE: 2,
  FOOD_MOVEMENT: {
    ORBIT_SPEED: 0.8,
    ORBIT_RADIUS: 15,
    NOISE_STRENGTH: 0.5,
    ACCELERATION: 0.15,
    CHANGE_DIRECTION_TIME: 2000,
    BOUNCE_HEIGHT: 8,
    BOUNCE_SPEED: 1.2,
    ROTATION_SPEED: 0.8,
    WOBBLE_AMOUNT: 3,
    WOBBLE_SPEED: 1.5
  }
} as const;
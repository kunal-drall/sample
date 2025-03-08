import { Vector2D, Segment } from './types';
import { GAME_CONFIG } from './constants';

export class Player {
  id: string;
  name: string;
  score: number;
  segments: Segment[];
  direction: Vector2D;
  boosting: boolean;
  target_length: number;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.score = 0;
    this.segments = Array(GAME_CONFIG.INITIAL_SNAKE_LENGTH).fill(null).map(() => ({
      position: { x: 0, y: 0 }
    }));
    this.direction = { x: 1, y: 0 };
    this.boosting = false;
    this.target_length = GAME_CONFIG.INITIAL_SNAKE_LENGTH;
  }

  public die() {
    // Reset score and position
    this.score = 0;
    this.target_length = GAME_CONFIG.INITIAL_SNAKE_LENGTH;
    
    // Spawn in a random position within 80% of the map radius to avoid edge spawns
    const spawn_radius = 900.0 * 0.8;
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * spawn_radius;
    
    const spawnPosition = {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance
    };
    
    // Create initial segments with the new length
    this.segments = Array(GAME_CONFIG.INITIAL_SNAKE_LENGTH).fill(null).map(() => ({
      position: { ...spawnPosition }
    }));
    
    // Random initial direction
    const directionAngle = Math.random() * Math.PI * 2;
    this.direction = {
      x: Math.cos(directionAngle),
      y: Math.sin(directionAngle)
    };
    
    this.boosting = false;
  }
}
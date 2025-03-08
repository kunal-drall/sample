import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Vector2D, Food, Segment } from './types';
import { GAME_CONFIG, VISUAL_CONFIG } from './constants';

// Security constants
export const SECURITY_CONFIG = {
  PLAYER_NAME_MAX_LENGTH: 20,
  PLAYER_NAME_REGEX: /^[a-zA-Z0-9\s-_]{1,20}$/
} as const;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeVector(vector: Vector2D): Vector2D {
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (length === 0) return { x: 0, y: 0 };
  return {
    x: vector.x / length,
    y: vector.y / length
  };
}

// Security functions
export function sanitizePlayerName(name: string): string {
  const sanitized = name
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, SECURITY_CONFIG.PLAYER_NAME_MAX_LENGTH);
  
  return SECURITY_CONFIG.PLAYER_NAME_REGEX.test(sanitized) ? sanitized : 'Player';
}


export function calculateAngleDifference(v1: Vector2D, v2: Vector2D): number {
  const angle1 = Math.atan2(v1.y, v1.x);
  const angle2 = Math.atan2(v2.y, v2.x);
  
  let diff = angle2 - angle1;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  
  return diff;
}

export function distance(a: Vector2D, b: Vector2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isOutOfBounds(position: Vector2D): boolean {
  const radius = GAME_CONFIG.MAP_SIZE / 2;
  const distanceFromCenter = Math.sqrt(position.x * position.x + position.y * position.y);
  return distanceFromCenter > radius;
}

export function getDistanceFromBorder(position: Vector2D): number {
  const radius = GAME_CONFIG.MAP_SIZE / 2;
  const distanceFromCenter = Math.sqrt(position.x * position.x + position.y * position.y);
  return Math.max(0, radius - distanceFromCenter);
}

export function createInitialSnake(): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i < GAME_CONFIG.INITIAL_SNAKE_LENGTH; i++) {
    segments.push({
      position: {
        x: GAME_CONFIG.INITIAL_POSITION.x - i * GAME_CONFIG.SEGMENT_GAP,
        y: GAME_CONFIG.INITIAL_POSITION.y
      }
    });
  }
  return segments;
}

export function generateRandomPositionInCircle(radius: number): Vector2D {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.sqrt(Math.random()) * radius;
  
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance
  };
}

export function generateFood(count: number): Food[] {
  const radius = (GAME_CONFIG.MAP_SIZE / 2) * 0.95;
  return Array.from({ length: count }, () => ({
    id: crypto.randomUUID(),
    position: generateRandomPositionInCircle(radius),
    color: VISUAL_CONFIG.FOOD_COLORS[
      Math.floor(Math.random() * VISUAL_CONFIG.FOOD_COLORS.length)
    ],
    size: VISUAL_CONFIG.MIN_FOOD_SIZE + Math.random() * (VISUAL_CONFIG.MAX_FOOD_SIZE - VISUAL_CONFIG.MIN_FOOD_SIZE)
  }));
}

/**
 * MessagePack Debugging Utilities
 */

/**
 * Displays a hexdump of a MessagePack buffer for debugging
 */
export function hexDump(data: Uint8Array, bytesPerLine = 16): string {
  let result = '';
  for (let i = 0; i < data.length; i += bytesPerLine) {
    const bytes = Array.from(data.slice(i, i + bytesPerLine))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
    
    const ascii = Array.from(data.slice(i, i + bytesPerLine))
      .map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.')
      .join('');
    
    result += `${i.toString(16).padStart(8, '0')}: ${bytes.padEnd(bytesPerLine * 3, ' ')}  ${ascii}\n`;
  }
  return result;
}

/**
 * Compares two MessagePack blobs for debugging
 */
export function compareMsgPack(expected: Uint8Array, actual: Uint8Array): string {
  let result = '';
  
  if (expected.length !== actual.length) {
    result += `Size mismatch: expected ${expected.length} bytes, got ${actual.length} bytes\n`;
  }
  
  const minLength = Math.min(expected.length, actual.length);
  let diffCount = 0;
  
  for (let i = 0; i < minLength; i++) {
    if (expected[i] !== actual[i]) {
      diffCount++;
      result += `Difference at offset ${i.toString(16)}: expected 0x${expected[i].toString(16).padStart(2, '0')}, got 0x${actual[i].toString(16).padStart(2, '0')}\n`;
      
      if (diffCount > 10) {
        result += `... and ${minLength - i - 1} more differences\n`;
        break;
      }
    }
  }
  
  return result || 'Identical';
}
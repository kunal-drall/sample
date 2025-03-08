import { GAME_CONFIG, PERFORMANCE_CONFIG, VISUAL_CONFIG } from './constants';
import { ObjectPool } from './objectPool';
import { Food, Vector2D } from './types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface SpatialGrid {
  cells: Map<string, Food[]>;
  cellSize: number;
}

export class GameRenderer {
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private particlePool: ObjectPool<Particle>;
  private quality: keyof typeof PERFORMANCE_CONFIG.QUALITY_LEVELS = 'HIGH';
  private spatialGrid: SpatialGrid;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private viewportBounds = { left: 0, right: 0, top: 0, bottom: 0 };
  private foodBatchCanvas: HTMLCanvasElement;
  private foodBatchCtx: CanvasRenderingContext2D;
  private foodPositions: Map<string, Vector2D> = new Map();
  private foodVelocities: Map<string, Vector2D> = new Map();

  constructor() {
    // Initialize main offscreen canvas
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    })!;

    // Initialize food batch canvas
    this.foodBatchCanvas = document.createElement('canvas');
    this.foodBatchCtx = this.foodBatchCanvas.getContext('2d', {
      alpha: true,
      desynchronized: true
    })!;

    // Enable image smoothing for better quality
    this.offscreenCtx.imageSmoothingEnabled = true;
    this.offscreenCtx.imageSmoothingQuality = 'high';
    
    this.particlePool = new ObjectPool<Particle>(
      50,
      PERFORMANCE_CONFIG.PARTICLE_POOL_SIZE,
      () => ({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0,
        color: '#ffffff',
        size: 1
      }),
      (particle) => {
        particle.life = 0;
        particle.maxLife = 0;
      }
    );

    // Initialize spatial grid
    this.spatialGrid = {
      cells: new Map(),
      cellSize: PERFORMANCE_CONFIG.SPATIAL_GRID_SIZE
    };
  }

  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.spatialGrid.cellSize);
    const cellY = Math.floor(y / this.spatialGrid.cellSize);
    return `${cellX},${cellY}`;
  }

  private updateSpatialGrid(food: Food[]) {
    this.spatialGrid.cells.clear();
    
    food.forEach(f => {
      const key = this.getCellKey(f.position.x, f.position.y);
      const cell = this.spatialGrid.cells.get(key) || [];
      cell.push(f);
      this.spatialGrid.cells.set(key, cell);
    });
  }

  private getFoodInViewport(viewportBounds: { left: number, right: number, top: number, bottom: number }): Food[] {
    const visibleFood: Food[] = [];
    
    // Get cells that intersect with viewport
    const startX = Math.floor(viewportBounds.left / this.spatialGrid.cellSize);
    const endX = Math.ceil(viewportBounds.right / this.spatialGrid.cellSize);
    const startY = Math.floor(viewportBounds.top / this.spatialGrid.cellSize);
    const endY = Math.ceil(viewportBounds.bottom / this.spatialGrid.cellSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const key = `${x},${y}`;
        const cell = this.spatialGrid.cells.get(key);
        if (cell) {
          visibleFood.push(...cell);
        }
      }
    }

    return visibleFood.slice(0, PERFORMANCE_CONFIG.MAX_VISIBLE_FOOD);
  }

  private updateFoodPositions(food: Food[], deltaTime: number) {
    const newPositions = new Map<string, Vector2D>();
    const newVelocities = new Map<string, Vector2D>();

    food.forEach(f => {
      const currentPos = this.foodPositions.get(f.id);
      const currentVel = this.foodVelocities.get(f.id);

      if (!currentPos) {
        // New food item, initialize position and velocity
        newPositions.set(f.id, { ...f.position });
        newVelocities.set(f.id, { x: 0, y: 0 });
      } else {
        // Existing food item, interpolate position
        const dx = f.position.x - currentPos.x;
        const dy = f.position.y - currentPos.y;
        
        // Update velocity with smoothing
        const targetVel = {
          x: dx / deltaTime,
          y: dy / deltaTime
        };
        
        const smoothVel = {
          x: currentVel ? currentVel.x * 0.9 + targetVel.x * 0.1 : targetVel.x,
          y: currentVel ? currentVel.y * 0.9 + targetVel.y * 0.1 : targetVel.y
        };

        // Update position with velocity
        newPositions.set(f.id, {
          x: currentPos.x + smoothVel.x * deltaTime,
          y: currentPos.y + smoothVel.y * deltaTime
        });
        
        newVelocities.set(f.id, smoothVel);
      }
    });

    this.foodPositions = newPositions;
    this.foodVelocities = newVelocities;
  }

  setQuality(quality: keyof typeof PERFORMANCE_CONFIG.QUALITY_LEVELS) {
    this.quality = quality;
    const settings = PERFORMANCE_CONFIG.QUALITY_LEVELS[quality];

    // Apply quality settings
    this.offscreenCtx.imageSmoothingEnabled = settings.INTERPOLATION;
    this.offscreenCtx.imageSmoothingQuality = quality === 'HIGH' ? 'high' : 'medium';

    // Update food batch canvas settings
    this.foodBatchCtx.imageSmoothingEnabled = settings.INTERPOLATION;
    this.foodBatchCtx.imageSmoothingQuality = quality === 'HIGH' ? 'high' : 'medium';
  }

  resizeCanvas(width: number, height: number) {
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    this.foodBatchCanvas.width = width;
    this.foodBatchCanvas.height = height;
  }

  updateViewport(cameraX: number, cameraY: number) {
    const padding = PERFORMANCE_CONFIG.VIEWPORT_PADDING;
    this.viewportBounds = {
      left: -cameraX - padding,
      right: this.offscreenCanvas.width - cameraX + padding,
      top: -cameraY - padding,
      bottom: this.offscreenCanvas.height - cameraY + padding
    };
  }

  drawFood(food: Food[], cameraX: number, cameraY: number, timestamp: number, deltaTime: number) {
    // Update food positions with interpolation
    this.updateFoodPositions(food, deltaTime / 1000);
    
    // Update spatial grid with interpolated positions
    const interpolatedFood = food.map(f => ({
      ...f,
      position: this.foodPositions.get(f.id) || f.position
    }));
    
    this.updateSpatialGrid(interpolatedFood);
    
    // Get visible food
    const visibleFood = this.getFoodInViewport(this.viewportBounds);
    
    // Clear food batch canvas
    this.foodBatchCtx.clearRect(0, 0, this.foodBatchCanvas.width, this.foodBatchCanvas.height);

    // Batch food by color for efficient rendering
    const foodByColor = new Map<string, Food[]>();
    visibleFood.forEach(f => {
      const items = foodByColor.get(f.color) || [];
      items.push(f);
      foodByColor.set(f.color, items);
    });

    // Draw food with effects
    const settings = PERFORMANCE_CONFIG.QUALITY_LEVELS[this.quality];
    
    foodByColor.forEach((items, color) => {
      this.foodBatchCtx.fillStyle = color;
      
      items.forEach(f => {
        const interpolatedPos = this.foodPositions.get(f.id) || f.position;
        const x = interpolatedPos.x + cameraX;
        const y = interpolatedPos.y + cameraY;
        
        // Calculate pulse effect
        const pulse = Math.sin(timestamp * VISUAL_CONFIG.FOOD_PULSE_SPEED) * VISUAL_CONFIG.FOOD_PULSE_RANGE;
        const size = f.size + pulse;
        
        // Draw food with glow if enabled
        if (settings.GLOW) {
          this.foodBatchCtx.shadowColor = color;
          this.foodBatchCtx.shadowBlur = size * VISUAL_CONFIG.FOOD_GLOW_INTENSITY;
        }
        
        this.foodBatchCtx.beginPath();
        this.foodBatchCtx.arc(x, y, size, 0, Math.PI * 2);
        this.foodBatchCtx.fill();
        
        // Reset shadow for next item
        if (settings.GLOW) {
          this.foodBatchCtx.shadowBlur = 0;
        }
      });
    });

    // Draw food batch canvas to main canvas
    this.offscreenCtx.drawImage(this.foodBatchCanvas, 0, 0);
  }

  clear() {
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
  }

  getContext(): CanvasRenderingContext2D {
    return this.offscreenCtx;
  }

  render(ctx: CanvasRenderingContext2D) {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    
    // Draw the current frame
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(this.offscreenCanvas, 0, 0);
    
    this.lastFrameTime = now;
    this.frameCount++;
    
    return delta;
  }
}
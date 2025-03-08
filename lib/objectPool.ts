export class ObjectPool<T> {
  private pool: T[] = [];
  private create: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(initialSize: number, maxSize: number, create: () => T, reset: (obj: T) => void) {
    this.create = create;
    this.reset = reset;
    this.maxSize = maxSize;
    
    // Initialize pool with objects
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(create());
    }
  }

  get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    
    // Create new object if we haven't reached max size
    if (this.pool.length < this.maxSize) {
      return this.create();
    }
    
    // Reuse the oldest object if we've reached max size
    const obj = this.create();
    this.reset(obj);
    return obj;
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }

  clear(): void {
    this.pool = [];
  }

  size(): number {
    return this.pool.length;
  }
}
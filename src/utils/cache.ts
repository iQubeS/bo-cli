import fs from 'fs';
import path from 'path';
import os from 'os';

export interface CacheOptions {
  ttl?: number; // milliseconds
  key: string;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const FLUSH_INTERVAL = 30 * 1000; // 30 seconds

class CacheManager {
  private cacheDir: string;
  private cacheFile: string;
  private memoryCache: Record<string, unknown> = {};
  private dirty = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor() {
    this.cacheDir = path.join(os.homedir(), '.bo-cli', 'cache');
    this.cacheFile = path.join(this.cacheDir, 'cache.json');
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private loadCache(): Record<string, unknown> {
    if (this.initialized) {
      return this.memoryCache;
    }

    this.ensureCacheDir();
    
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf-8');
        const parsed = JSON.parse(data);
        this.memoryCache = parsed || {};
        this.initialized = true;
        return this.memoryCache;
      }
    } catch (error) {
      // Log error but continue with empty cache
      console.error('Warning: Failed to load cache, starting fresh:', error instanceof Error ? error.message : String(error));
    }
    
    this.memoryCache = {};
    this.initialized = true;
    return this.memoryCache;
  }

  private scheduleFlush(): void {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushToDisk();
      this.flushTimer = null;
    }, FLUSH_INTERVAL);
  }

  private flushToDisk(): void {
    if (!this.dirty) {
      return;
    }

    this.ensureCacheDir();
    
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.memoryCache, null, 2));
      this.dirty = false;
    } catch (error) {
      console.error('Warning: Failed to write cache to disk:', error instanceof Error ? error.message : String(error));
    }
  }

  private saveCache(): void {
    this.dirty = true;
    this.scheduleFlush();
  }

  /**
   * Get a value from cache
   * Returns null if not found or expired
   */
  get<T>(key: string): T | null {
    const cache = this.loadCache();
    const entry = cache[key] as { value: T; timestamp: number; ttl: number } | undefined;

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (entry.timestamp + entry.ttl < now) {
      // Expired - remove it
      this.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): void {
    const cache = this.loadCache();
    
    cache[key] = {
      value,
      timestamp: Date.now(),
      ttl,
    };

    this.saveCache();
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): void {
    const cache = this.loadCache();
    delete cache[key];
    this.saveCache();
  }

  /**
   * Clear all expired entries
   */
  clearExpired(): number {
    const cache = this.loadCache();
    const now = Date.now();
    let cleared = 0;

    for (const key of Object.keys(cache)) {
      const entry = cache[key] as { timestamp: number; ttl: number };
      if (entry && entry.timestamp + entry.ttl < now) {
        delete cache[key];
        cleared++;
      }
    }

    if (cleared > 0) {
      this.saveCache();
    }

    return cleared;
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.memoryCache = {};
    this.dirty = true;
    this.flushToDisk();
  }

  /**
   * Get cache status
   */
  getStatus(): { total: number; valid: number; expired: number } {
    const cache = this.loadCache();
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    for (const key of Object.keys(cache)) {
      const entry = cache[key] as { timestamp: number; ttl: number };
      if (entry && entry.timestamp + entry.ttl < now) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: Object.keys(cache).length,
      valid,
      expired,
    };
  }

  /**
   * Force flush any pending writes to disk
   */
  flush(): void {
    this.flushToDisk();
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

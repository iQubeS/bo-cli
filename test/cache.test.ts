import { describe, it, expect, beforeEach } from 'vitest';
import { cacheManager } from '../src/utils/cache.js';

describe('CacheManager', () => {
  beforeEach(() => {
    // Clear cache before each test
    cacheManager.clearAll();
  });

  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      cacheManager.set('test-key', { name: 'Test' }, 60000);
      const result = cacheManager.get<{ name: string }>('test-key');
      
      expect(result).toEqual({ name: 'Test' });
    });

    it('should return null for non-existent key', () => {
      const result = cacheManager.get('non-existent');
      expect(result).toBeNull();
    });

    it('should return null for expired key', async () => {
      cacheManager.set('expired-key', { value: 'test' }, 1); // 1ms TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = cacheManager.get('expired-key');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a specific key', () => {
      cacheManager.set('to-delete', { value: 'test' }, 60000);
      cacheManager.delete('to-delete');
      
      const result = cacheManager.get('to-delete');
      expect(result).toBeNull();
    });
  });

  describe('clearExpired', () => {
    it('should clear only expired entries', () => {
      cacheManager.set('valid', { value: 'valid' }, 60000);
      cacheManager.set('expired', { value: 'expired' }, 1);
      
      // Wait for expiration
      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        const cleared = cacheManager.clearExpired();
        
        expect(cleared).toBe(1);
        expect(cacheManager.get('valid')).toEqual({ value: 'valid' });
        expect(cacheManager.get('expired')).toBeNull();
      });
    });
  });

  describe('getStatus', () => {
    it('should return correct status', () => {
      cacheManager.set('key1', 'value1', 60000);
      cacheManager.set('key2', 'value2', 1);
      
      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        const status = cacheManager.getStatus();
        
        expect(status.total).toBe(2);
        expect(status.expired).toBe(1);
        expect(status.valid).toBe(1);
      });
    });
  });
});

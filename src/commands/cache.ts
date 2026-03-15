import { Command, Flags } from '@oclif/core';
import { printSuccess, printError, printInfo } from '../formatters/index.js';
import { cacheManager } from '../utils/cache.js';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export default class CacheCommand extends Command {
  static description = 'Manage CLI cache';

  static examples = [
    '$ bo cache',
    '$ bo cache --clear',
    '$ bo cache --clear --all',
    '$ bo cache --list',
    '$ bo cache --get <key>',
    '$ bo cache --set <key> <value> --ttl 60000',
    '$ bo cache --flush',
  ];

  static flags = {
    clear: Flags.boolean({ description: 'Clear cache' }),
    flush: Flags.boolean({ description: 'Force flush cache to disk' }),
    list: Flags.boolean({ description: 'List cache entries' }),
    get: Flags.string({ description: 'Get cache value by key' }),
    set: Flags.string({ description: 'Set cache value (key)' }),
    value: Flags.string({ description: 'Value to set (used with --set)', dependsOn: ['set'] }),
    ttl: Flags.integer({ description: 'Time to live in milliseconds', default: DEFAULT_TTL }),
    all: Flags.boolean({ description: 'Clear all cache including persistent' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(CacheCommand);

    if (flags.flush) {
      cacheManager.flush();
      printSuccess('Cache flushed to disk!');
      return;
    }

    if (flags.clear) {
      if (flags.all) {
        cacheManager.clearAll();
        printSuccess('All cache cleared!');
      } else {
        const cleared = cacheManager.clearExpired();
        printSuccess(`Cleared ${cleared} expired cache entries!`);
      }
      return;
    }

    if (flags.list) {
      const status = cacheManager.getStatus();
      const { total, valid, expired } = status;
      
      if (total === 0) {
        printInfo('Cache is empty');
        return;
      }

      console.log('\n📦 Cache Entries:\n');
      console.log('Status:');
      console.log(`  Total: ${total}`);
      console.log(`  Valid: ${valid}`);
      console.log(`  Expired: ${expired}`);
      console.log('');
      return;
    }

    if (flags.get) {
      const value = cacheManager.get(flags.get);
      
      if (value === null) {
        printError(`Cache key "${flags.get}" not found or expired`);
        this.exit(1);
      }

      console.log(JSON.stringify(value, null, 2));
      return;
    }

    if (flags.set) {
      if (!flags.value) {
        printError('Value is required when using --set');
        this.exit(1);
      }

      let parsedValue: unknown;
      
      // Try to parse as JSON, otherwise use as string
      try {
        parsedValue = JSON.parse(flags.value);
      } catch {
        parsedValue = flags.value;
      }

      cacheManager.set(flags.set, parsedValue, flags.ttl);
      printSuccess(`Cache key "${flags.set}" set (TTL: ${flags.ttl / 1000}s)`);
      return;
    }

    // Default: show cache status
    const status = cacheManager.getStatus();
    
    console.log('\n📦 Cache Status:\n');
    console.log(`  Total entries: ${status.total}`);
    console.log(`  Valid: ${status.valid}`);
    console.log(`  Expired: ${status.expired}`);
    console.log('');
  }
}

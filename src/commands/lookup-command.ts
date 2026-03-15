import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { formatOutput } from '../formatters/index.js';
import { cacheManager } from '../utils/cache.js';

const LOOKUP_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export abstract class LookupCommand extends BaseCommand {
  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  protected abstract readonly cacheKey: string;
  protected abstract readonly serverName: string;
  protected abstract readonly toolName: string;
  protected abstract readonly errorContext: string;

  async run(): Promise<void> {
    const { flags } = await this.parse(this.constructor as typeof LookupCommand);
    const format = this.getFormat(flags);

    const cached = cacheManager.get(this.cacheKey);
    if (cached) {
      console.log(formatOutput(cached, { format }));
      return;
    }

    try {
      const result = await this.withConnection(this.serverName, (client) =>
        client.callTool(this.toolName, {})
      );
      cacheManager.set(this.cacheKey, result, LOOKUP_CACHE_TTL);
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, this.errorContext);
      this.exit(1);
    }
  }
}

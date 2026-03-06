import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { formatOutput } from '../../formatters/index.js';
import { cacheManager } from '../../utils/cache.js';

export default class LeadsTypesCommand extends BaseCommand {
  static description = 'List all lead types';

  static examples = ['$ bo leads types'];

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(LeadsTypesCommand);
    const format = this.getFormat(flags);

    const cacheKey = 'lead_types';
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      console.log(formatOutput(cached, { format }));
      return;
    }

    try {
      const result = await this.withConnection('leads', (client) =>
        client.callTool('get_all_lead_types', {})
      );
      cacheManager.set(cacheKey, result, 10 * 60 * 1000);
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to get lead types');
      this.exit(1);
    }
  }
}

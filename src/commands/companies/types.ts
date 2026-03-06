import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { formatOutput } from '../../formatters/index.js';
import { cacheManager } from '../../utils/cache.js';

export default class CompaniesTypesCommand extends BaseCommand {
  static description = 'List all company types';

  static examples = ['$ bo companies types'];

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(CompaniesTypesCommand);
    const format = this.getFormat(flags);

    const cacheKey = 'company_types';
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      console.log(formatOutput(cached, { format }));
      return;
    }

    try {
      const result = await this.withConnection('customer', (client) =>
        client.callTool('get_all_company_types', {})
      );
      cacheManager.set(cacheKey, result, 10 * 60 * 1000);
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to get company types');
      this.exit(1);
    }
  }
}

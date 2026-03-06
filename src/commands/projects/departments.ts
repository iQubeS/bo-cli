import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { formatOutput } from '../../formatters/index.js';
import { cacheManager } from '../../utils/cache.js';

export default class ProjectsDepartmentsCommand extends BaseCommand {
  static description = 'List all departments';

  static examples = ['$ bo projects departments'];

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ProjectsDepartmentsCommand);
    const format = this.getFormat(flags);

    const cacheKey = 'departments';
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      console.log(formatOutput(cached, { format }));
      return;
    }

    try {
      const result = await this.withConnection('projects', (client) =>
        client.callTool('get_all_departments', {})
      );
      cacheManager.set(cacheKey, result, 10 * 60 * 1000);
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to get departments');
      this.exit(1);
    }
  }
}

import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { formatOutput } from '../../formatters/index.js';

export default class CompaniesGetCommand extends BaseCommand {
  static description = 'Get a company by ID';

  static examples = ['$ bo companies get <id>'];

  static args = {
    id: Args.string({ description: 'Company ID', required: true }),
  };

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CompaniesGetCommand);
    const format = this.getFormat(flags);

    try {
      const result = await this.withConnection('customer', (client) =>
        client.callTool('retrieve_company_by_id', { companyId: args.id })
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to get company');
      this.exit(1);
    }
  }
}

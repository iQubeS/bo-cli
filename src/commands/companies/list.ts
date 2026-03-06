import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { formatOutput } from '../../formatters/index.js';

export default class CompaniesListCommand extends BaseCommand {
  static description = 'List all companies';

  static examples = [
    '$ bo companies list',
    '$ bo companies list --search Acme',
    '$ bo companies list --type Customer',
  ];

  static flags = {
    search: Flags.string({ description: 'Search text' }),
    type: Flags.string({ description: 'Filter by company type name' }),
    sort: Flags.string({ description: 'Sort fields (comma-separated, prefix - for desc)' }),
    limit: Flags.integer({ description: 'Number of records per page' }),
    offset: Flags.integer({ description: 'Pagination offset' }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(CompaniesListCommand);
    const format = this.getFormat(flags);

    try {
      const params: Record<string, unknown> = {};
      if (flags.search) params.search = flags.search;
      if (flags.type) params.companyTypeName = flags.type;
      if (flags.sort) params.sort = flags.sort;
      if (flags.limit) params.limit = flags.limit;
      if (flags.offset) params.offset = flags.offset;

      const result = await this.withConnection('customer', (client) =>
        client.callTool('retrieve_companies', params)
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to list companies');
      this.exit(1);
    }
  }
}

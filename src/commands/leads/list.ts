import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { formatOutput } from '../../formatters/index.js';

export default class LeadsListCommand extends BaseCommand {
  static description = 'List all leads';

  static examples = [
    '$ bo leads list',
    '$ bo leads list --status Active',
    '$ bo leads list --type Customer',
    '$ bo leads list --company-id <id>',
  ];

  static flags = {
    'company-id': Flags.string({ description: 'Filter by company ID' }),
    status: Flags.string({ description: 'Filter by status (see: bo config enums --category leads)' }),
    type: Flags.string({ description: 'Filter by lead type' }),
    search: Flags.string({ description: 'Search text' }),
    sort: Flags.string({ description: 'Sort fields (comma-separated, prefix - for desc)' }),
    limit: Flags.integer({ description: 'Number of records per page' }),
    offset: Flags.integer({ description: 'Pagination offset' }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(LeadsListCommand);
    const format = this.getFormat(flags);

    try {
      const params: Record<string, unknown> = {};
      if (flags['company-id']) params.companyId = flags['company-id'];
      if (flags.status) params.status = flags.status;
      if (flags.type) params.type = flags.type;
      if (flags.search) params.search = flags.search;
      if (flags.sort) params.sort = flags.sort;
      if (flags.limit) params.limit = flags.limit;
      if (flags.offset) params.offset = flags.offset;

      const result = await this.withConnection('leads', (client) =>
        client.callTool('retrieve_all_leads', params)
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to list leads');
      this.exit(1);
    }
  }
}

import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { formatOutput } from '../../formatters/index.js';

export default class LeadsDashboardCommand extends BaseCommand {
  static description = 'Show leads dashboard';

  static examples = [
    '$ bo leads dashboard --type Customer',
    '$ bo leads dashboard --type Customer --status Active',
    '$ bo leads dashboard --type Customer --lcm-status Evaluation',
  ];

  static flags = {
    type: Flags.string({ description: 'Lead type (required)', required: true }),
    status: Flags.string({ description: 'Filter by status (see: bo config enums --category leads)' }),
    'lcm-status': Flags.string({ description: 'Filter by LCM status (see: bo config enums --category leads)' }),
    'internal-responsible': Flags.string({ description: 'Filter by internal responsible email' }),
    sort: Flags.string({ description: 'Sort fields (comma-separated, prefix - for desc)' }),
    limit: Flags.integer({ description: 'Number of records per page' }),
    offset: Flags.integer({ description: 'Pagination offset' }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(LeadsDashboardCommand);
    const format = this.getFormat(flags);

    try {
      const params: Record<string, unknown> = { type: flags.type };
      if (flags.status) params.status = flags.status;
      if (flags['lcm-status']) params.leadsLcmStatus = flags['lcm-status'];
      if (flags['internal-responsible']) params.internalResponsible = flags['internal-responsible'];
      if (flags.sort) params.sort = flags.sort;
      if (flags.limit) params.limit = flags.limit;
      if (flags.offset) params.offset = flags.offset;

      const result = await this.withConnection('leads', (client) =>
        client.callTool('retrieve_leads_dashboard', params)
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to get leads dashboard');
      this.exit(1);
    }
  }
}

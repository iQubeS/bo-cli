import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { formatOutput } from '../../formatters/index.js';

export default class NcrListCommand extends BaseCommand {
  static description = 'List all NCR cards';

  static examples = [
    '$ bo ncr list',
    '$ bo ncr list --type "Non-Conformance"',
    '$ bo ncr list --search issue',
    '$ bo ncr list --company-id <id>',
  ];

  static flags = {
    type: Flags.string({ description: 'Filter by NCR type (see: bo config enums --category ncr)' }),
    'company-id': Flags.string({ description: 'Filter by company ID' }),
    'project-id': Flags.string({ description: 'Filter by project ID' }),
    'lead-id': Flags.string({ description: 'Filter by lead ID' }),
    'department-id': Flags.string({ description: 'Filter by department ID' }),
    search: Flags.string({ description: 'Search text' }),
    sort: Flags.string({ description: 'Sort fields (comma-separated, prefix - for desc)' }),
    limit: Flags.integer({ description: 'Number of records per page' }),
    offset: Flags.integer({ description: 'Pagination offset' }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(NcrListCommand);
    const format = this.getFormat(flags);

    try {
      const params: Record<string, unknown> = {};
      if (flags.type) params.typeRegistration = flags.type;
      if (flags['company-id']) params.companyId = flags['company-id'];
      if (flags['project-id']) params.projectId = flags['project-id'];
      if (flags['lead-id']) params.leadId = flags['lead-id'];
      if (flags['department-id']) params.departmentId = flags['department-id'];
      if (flags.search) params.search = flags.search;
      if (flags.sort) params.sort = flags.sort;
      if (flags.limit) params.limit = flags.limit;
      if (flags.offset) params.offset = flags.offset;

      const result = await this.withConnection('ncr', (client) =>
        client.callTool('retrieve_all_ncrs', params)
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to list NCRs');
      this.exit(1);
    }
  }
}

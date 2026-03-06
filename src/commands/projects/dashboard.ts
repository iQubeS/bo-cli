import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { formatOutput } from '../../formatters/index.js';

export default class ProjectsDashboardCommand extends BaseCommand {
  static description = 'Show projects dashboard';

  static examples = [
    '$ bo projects dashboard --type "Internal"',
    '$ bo projects dashboard --type "Internal" --activity Started',
    '$ bo projects dashboard --type "Internal" --department "Engineering"',
  ];

  static flags = {
    type: Flags.string({ description: 'Project type (required)', required: true }),
    activity: Flags.string({ description: 'Filter by activity' }),
    department: Flags.string({ description: 'Filter by department' }),
    sort: Flags.string({ description: 'Sort fields (comma-separated, prefix - for desc)' }),
    limit: Flags.integer({ description: 'Number of records per page' }),
    offset: Flags.integer({ description: 'Pagination offset' }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ProjectsDashboardCommand);
    const format = this.getFormat(flags);

    try {
      const params: Record<string, unknown> = { type: flags.type };
      if (flags.activity) params.activity = flags.activity;
      if (flags.department) params.department = flags.department;
      if (flags.sort) params.sort = flags.sort;
      if (flags.limit) params.limit = flags.limit;
      if (flags.offset) params.offset = flags.offset;

      const result = await this.withConnection('projects', (client) =>
        client.callTool('retrieve_projects_dashboard', params)
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to get projects dashboard');
      this.exit(1);
    }
  }
}

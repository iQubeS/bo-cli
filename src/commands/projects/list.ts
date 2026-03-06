import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { formatOutput } from '../../formatters/index.js';

export default class ProjectsListCommand extends BaseCommand {
  static description = 'List all projects';

  static examples = [
    '$ bo projects list',
    '$ bo projects list --activity Started',
    '$ bo projects list --type Customer',
  ];

  static flags = {
    activity: Flags.string({ description: 'Filter by activity' }),
    type: Flags.string({ description: 'Filter by project type' }),
    search: Flags.string({ description: 'Search text' }),
    sort: Flags.string({ description: 'Sort fields (comma-separated, prefix - for desc)' }),
    limit: Flags.integer({ description: 'Number of records per page' }),
    offset: Flags.integer({ description: 'Pagination offset' }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ProjectsListCommand);
    const format = this.getFormat(flags);

    try {
      const params: Record<string, unknown> = {};
      if (flags.activity) params.activity = flags.activity;
      if (flags.type) params.type = flags.type;
      if (flags.search) params.search = flags.search;
      if (flags.sort) params.sort = flags.sort;
      if (flags.limit) params.limit = flags.limit;
      if (flags.offset) params.offset = flags.offset;

      const result = await this.withConnection('projects', (client) =>
        client.callTool('retrieve_all_projects', params)
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to list projects');
      this.exit(1);
    }
  }
}

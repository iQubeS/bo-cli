import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput } from '../../formatters/index.js';

export default class TimelineListCommand extends BaseCommand {
  static description = 'List timeline events for an entity';

  static examples = [
    '$ bo timeline list company <entity-id>',
    '$ bo timeline list lead <entity-id> --log-type Meeting',
  ];

  static args = {
    module: Args.string({ description: 'Module (company, lead, project)', required: true }),
    'entity-id': Args.string({ description: 'Entity ID', required: true }),
  };

  static flags = {
    'log-type': Flags.string({ description: 'Filter by log type' }),
    sort: Flags.string({ description: 'Sort fields (comma-separated, prefix - for desc)' }),
    limit: Flags.integer({ description: 'Number of records per page' }),
    offset: Flags.integer({ description: 'Pagination offset' }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TimelineListCommand);
    const format = this.getFormat(flags);

    const toolMap: Record<string, string> = {
      company: 'retrieve_company_timeline_events',
      lead: 'retrieve_lead_timeline_events',
      project: 'retrieve_project_timeline_events',
    };

    const toolName = toolMap[args.module];
    if (!toolName) {
      printError(`Invalid module: ${args.module}. Use company, lead, or project`);
      this.exit(1);
    }

    try {
      const params: Record<string, unknown> = {
        [this.entityIdParam(args.module)]: args['entity-id'],
      };
      if (flags['log-type']) params.logType = flags['log-type'];
      if (flags.sort) params.sort = flags.sort;
      if (flags.limit) params.limit = flags.limit;
      if (flags.offset) params.offset = flags.offset;

      const serverName = this.resolveServerName(args.module);
      const result = await this.withConnection(serverName, (client) =>
        client.callTool(toolName, params)
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to list timeline events');
      this.exit(1);
    }
  }
}

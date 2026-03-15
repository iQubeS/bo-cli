import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput } from '../../formatters/index.js';

export default class TimelineGetCommand extends BaseCommand {
  static description = 'Get a timeline event by ID';

  static examples = ['$ bo timeline get company <entity-id> <timeline-id>'];

  static args = {
    module: Args.string({ description: 'Module (company, lead, project)', required: true }),
    'entity-id': Args.string({ description: 'Entity ID', required: true }),
    'timeline-id': Args.string({ description: 'Timeline event ID', required: true }),
  };

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TimelineGetCommand);
    const format = this.getFormat(flags);

    const toolName = this.resolveTimelineTool(args.module, 'get');
    if (!toolName) {
      printError(`Invalid module: ${args.module}. Use company, lead, or project`);
      this.exit(1);
    }

    try {
      const serverName = this.resolveServerName(args.module);
      const result = await this.withConnection(serverName, (client) =>
        client.callTool(toolName, {
          [this.entityIdParam(args.module)]: args['entity-id'],
          timelineId: args['timeline-id'],
        })
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to get timeline event');
      this.exit(1);
    }
  }
}

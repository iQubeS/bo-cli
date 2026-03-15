import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput } from '../../formatters/index.js';

export default class QcpListCommand extends BaseCommand {
  static description = 'List QCPs for an entity';

  static examples = [
    '$ bo qcp list company <entity-id>',
    '$ bo qcp list lead <entity-id>',
    '$ bo qcp list project <entity-id>',
  ];

  static args = {
    module: Args.string({ description: 'Module (company, lead, project)', required: true }),
    'entity-id': Args.string({ description: 'Entity ID', required: true }),
  };

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(QcpListCommand);
    const format = this.getFormat(flags);

    const toolName = this.resolveQcpTool(args.module, 'list');
    if (!toolName) {
      printError(`Invalid module: ${args.module}. Use company, lead, or project`);
      this.exit(1);
    }

    try {
      const serverName = this.resolveServerName(args.module);
      const result = await this.withConnection(serverName, (client) =>
        client.callTool(toolName, { [this.entityIdParam(args.module)]: args['entity-id'] })
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to list QCPs');
      this.exit(1);
    }
  }
}

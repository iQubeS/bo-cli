import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput } from '../../formatters/index.js';

export default class QcpGetCommand extends BaseCommand {
  static description = 'Get a QCP by ID';

  static examples = ['$ bo qcp get company <entity-id> <qcp-id>'];

  static args = {
    module: Args.string({ description: 'Module (company, lead, project)', required: true }),
    'entity-id': Args.string({ description: 'Entity ID', required: true }),
    'qcp-id': Args.string({ description: 'QCP ID', required: true }),
  };

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(QcpGetCommand);
    const format = this.getFormat(flags);

    const toolMap: Record<string, string> = {
      company: 'retrieve_company_qcp',
      lead: 'retrieve_lead_qcp',
      project: 'retrieve_project_qcp',
    };

    const toolName = toolMap[args.module];
    if (!toolName) {
      printError(`Invalid module: ${args.module}. Use company, lead, or project`);
      this.exit(1);
    }

    try {
      const serverName = this.resolveServerName(args.module);
      const result = await this.withConnection(serverName, (client) =>
        client.callTool(toolName, {
          [this.entityIdParam(args.module)]: args['entity-id'],
          qcpId: args['qcp-id'],
        })
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to get QCP');
      this.exit(1);
    }
  }
}

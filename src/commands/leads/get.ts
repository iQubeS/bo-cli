import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { formatOutput } from '../../formatters/index.js';

export default class LeadsGetCommand extends BaseCommand {
  static description = 'Get a lead by ID';

  static examples = ['$ bo leads get <id>'];

  static args = {
    id: Args.string({ description: 'Lead ID', required: true }),
  };

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(LeadsGetCommand);
    const format = this.getFormat(flags);

    try {
      const result = await this.withConnection('leads', (client) =>
        client.callTool('retrieve_lead', { leadId: args.id })
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to get lead');
      this.exit(1);
    }
  }
}

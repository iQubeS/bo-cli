import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { formatOutput } from '../../formatters/index.js';

export default class LeadsMeddicCommand extends BaseCommand {
  static description = 'Collect MEDDIC data for a lead';

  static examples = ['$ bo leads meddic <id>'];

  static args = {
    id: Args.string({ description: 'Lead ID', required: true }),
  };

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(LeadsMeddicCommand);
    const format = this.getFormat(flags);

    try {
      const result = await this.withConnection('leads', (client) =>
        client.callTool('collect_meddic_data', { leadId: args.id })
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to collect MEDDIC data');
      this.exit(1);
    }
  }
}

import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { formatOutput } from '../../formatters/index.js';

export default class NcrGetCommand extends BaseCommand {
  static description = 'Get an NCR card by ID';

  static examples = ['$ bo ncr get <id>'];

  static args = {
    id: Args.string({ description: 'NCR ID', required: true }),
  };

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(NcrGetCommand);
    const format = this.getFormat(flags);

    try {
      const result = await this.withConnection('ncr', (client) =>
        client.callTool('retrieve_specific_ncr_card', { ncrCardId: args.id })
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to get NCR');
      this.exit(1);
    }
  }
}

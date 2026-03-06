import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { formatOutput } from '../../formatters/index.js';

export default class ContactsGetCommand extends BaseCommand {
  static description = 'Get a contact by ID';

  static examples = ['$ bo contacts get <id>'];

  static args = {
    id: Args.string({ description: 'Contact ID', required: true }),
  };

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ContactsGetCommand);
    const format = this.getFormat(flags);

    try {
      const result = await this.withConnection('customer', (client) =>
        client.callTool('retrieve_contact_info', { contactId: args.id })
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to get contact');
      this.exit(1);
    }
  }
}

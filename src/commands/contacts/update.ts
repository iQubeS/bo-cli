import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput, checkResponseError } from '../../formatters/index.js';
import { promptText, promptSelect, promptConfirm, createSpinner, printPreview, type PreviewData } from '../../utils/interactive.js';
import { validateEnum } from '../../enums/index.js';
import { contactStatus, contactLegalBasis } from '../../enums/cache.js';

export default class ContactsUpdateCommand extends BaseCommand {
  static description = 'Update a contact';

  static examples = [
    '$ bo contacts update <id> --email newemail@example.com',
    '$ bo contacts update <id> --interactive',
    '$ bo contacts update <id> --preview --email newemail@example.com',
  ];

  static args = {
    id: Args.string({ description: 'Contact ID', required: true }),
  };

  static flags = {
    name: Flags.string({ description: 'Contact name' }),
    email: Flags.string({ description: 'Email address' }),
    phone: Flags.string({ description: 'Phone number' }),
    role: Flags.string({ description: 'Job title' }),
    'legal-basis': Flags.string({ description: 'Legal basis for processing' }),
    'company-id': Flags.string({ description: 'Company ID' }),
    status: Flags.string({ description: 'Contact status' }),
    'marketing-consent': Flags.boolean({ description: 'Marketing consent', allowNo: true }),
    interactive: Flags.boolean({ description: 'Run in interactive mode with prompts', default: false }),
    preview: Flags.boolean({ description: 'Show what would be updated without executing', default: false }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ContactsUpdateCommand);
    const format = this.getFormat(flags);

    try {
      await this.withConnection('customer', async (client) => {
        const updateData = await this.collectFields(flags);

        if (flags.preview) {
          const previewData: PreviewData = { action: 'update', entity: `Contact ${args.id}`, fields: updateData };
          printPreview(previewData);
          return;
        }

        if (flags.interactive) {
          const confirmed = await promptConfirm(`Update contact ${args.id}?`);
          if (!confirmed) {
            console.log('Cancelled.');
            return;
          }
        }

        if (Object.keys(updateData).length === 0) {
          printError('No fields to update. Please provide at least one field to update.');
          this.exit(1);
        }

        const spinner = createSpinner('Updating contact...');
        spinner.start();
        const result = await client.callTool('update_contact', { contactId: args.id, ...updateData });
        const serverError = checkResponseError(result);
        if (serverError) {
          spinner.fail(serverError);
        } else {
          spinner.succeed('Contact updated successfully!');
        }
        console.log(formatOutput(result, { format }));
      }, { loadEnums: true });
    } catch (error) {
      this.printClassifiedError(error, 'Failed to update contact');
      this.exit(1);
    }
  }

  private async collectFields(flags: Record<string, unknown>): Promise<Record<string, unknown>> {
    const updateData: Record<string, unknown> = {};

    if (flags.interactive) {
      const name = await promptText('Contact name (leave empty to skip):');
      if (name) updateData.contactName = name;
      const email = await promptText('Email (leave empty to skip):');
      if (email) updateData.email = email;
      const phone = await promptText('Phone (leave empty to skip):');
      if (phone) updateData.cellPhone = phone;
      const role = await promptText('Job title (leave empty to skip):');
      if (role) updateData.jobTitle = role;
      const companyId = await promptText('Company ID (leave empty to skip):');
      if (companyId) updateData.companyId = companyId;
      const legalBasis = await promptSelect('Legal basis:', contactLegalBasis());
      if (legalBasis) updateData.contactLegalBasis = legalBasis;
      const status = await promptSelect('Status:', contactStatus());
      if (status) updateData.contactStatus = status;
      const marketingConsent = await promptConfirm('Marketing consent?', false);
      updateData.contactMarketingConsent = marketingConsent;
    } else {
      validateEnum(flags['legal-basis'] as string | undefined, contactLegalBasis(), 'legal basis');
      validateEnum(flags.status as string | undefined, contactStatus(), 'status');

      if (flags.name) updateData.contactName = flags.name;
      if (flags['company-id']) updateData.companyId = flags['company-id'];
      if (flags.email) updateData.email = flags.email;
      if (flags.phone) updateData.cellPhone = flags.phone;
      if (flags.role) updateData.jobTitle = flags.role;
      if (flags['legal-basis']) updateData.contactLegalBasis = flags['legal-basis'];
      if (flags.status) updateData.contactStatus = flags.status;
      if (flags['marketing-consent'] !== undefined) updateData.contactMarketingConsent = flags['marketing-consent'];
    }

    return updateData;
  }
}

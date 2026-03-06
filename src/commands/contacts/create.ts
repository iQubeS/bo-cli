import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput, checkResponseError } from '../../formatters/index.js';
import { promptText, promptSelect, promptConfirm, createSpinner, printPreview, type PreviewData } from '../../utils/interactive.js';
import { validateEnum } from '../../enums/index.js';
import { contactLegalBasis, contactStatus } from '../../enums/cache.js';

export default class ContactsCreateCommand extends BaseCommand {
  static description = 'Create a new contact';

  static examples = [
    '$ bo contacts create --name "John Doe" --legal-basis "Not applicable" --status Active',
    '$ bo contacts create --interactive',
    '$ bo contacts create --preview --name "John Doe" --legal-basis "Not applicable" --status Active',
  ];

  static flags = {
    name: Flags.string({ description: 'Contact name' }),
    'company-id': Flags.string({ description: 'Company ID' }),
    email: Flags.string({ description: 'Email address' }),
    phone: Flags.string({ description: 'Phone number' }),
    'job-title': Flags.string({ description: 'Job title' }),
    'legal-basis': Flags.string({ description: 'Legal basis for processing' }),
    status: Flags.string({ description: 'Contact status' }),
    interactive: Flags.boolean({ description: 'Run in interactive mode with prompts', default: false }),
    preview: Flags.boolean({ description: 'Show what would be created without executing', default: false }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ContactsCreateCommand);

    try {
      await this.withConnection('customer', async (client) => {
        const fields = await this.collectFields(flags);

        if (flags.preview) {
          const previewData: PreviewData = { action: 'create', entity: 'Contact', fields };
          printPreview(previewData);
          return;
        }

        if (flags.interactive) {
          const confirmed = await promptConfirm(`Create contact "${fields.name}"?`);
          if (!confirmed) {
            console.log('Cancelled.');
            return;
          }
        }

        const format = this.getFormat(flags);
        const spinner = createSpinner('Creating contact...');
        spinner.start();
        const result = await client.callTool('create_contact', fields);
        const serverError = checkResponseError(result);
        if (serverError) {
          spinner.fail(serverError);
        } else {
          spinner.succeed('Contact created successfully!');
        }
        console.log(formatOutput(result, { format }));
      }, { loadEnums: true });
    } catch (error) {
      this.printClassifiedError(error, 'Failed to create contact');
      this.exit(1);
    }
  }

  private async collectFields(flags: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (flags.interactive) {
      const fields: Record<string, unknown> = {};
      fields.name = await promptText('Contact name:', { required: true, default: flags.name as string });
      fields.legalBasis = await promptSelect('Legal basis:', contactLegalBasis(), { required: true });
      fields.status = await promptSelect('Status:', contactStatus(), { required: true });
      const companyId = await promptText('Company ID (optional):');
      if (companyId) fields.companyId = companyId;
      const email = await promptText('Email (optional):');
      if (email) fields.email = email;
      const phone = await promptText('Phone (optional):');
      if (phone) fields.cellPhone = phone;
      const jobTitle = await promptText('Job title (optional):');
      if (jobTitle) fields.jobTitle = jobTitle;
      return fields;
    }

    if (!flags.name || !flags['legal-basis'] || !flags.status) {
      printError('Name, legal basis, and status are required. Use --name --legal-basis --status or --interactive');
      this.exit(1);
    }

    validateEnum(flags['legal-basis'] as string, contactLegalBasis(), 'legal basis');
    validateEnum(flags.status as string, contactStatus(), 'status');

    const fields: Record<string, unknown> = {
      name: flags.name,
      legalBasis: flags['legal-basis'],
      status: flags.status,
    };
    if (flags['company-id']) fields.companyId = flags['company-id'];
    if (flags.email) fields.email = flags.email;
    if (flags.phone) fields.cellPhone = flags.phone;
    if (flags['job-title']) fields.jobTitle = flags['job-title'];
    return fields;
  }
}

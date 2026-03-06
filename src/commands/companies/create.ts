import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput, checkResponseError } from '../../formatters/index.js';
import { promptText, promptConfirm, promptSelect, createSpinner, printPreview, type PreviewData } from '../../utils/interactive.js';
import { contactLegalBasis } from '../../enums/cache.js';

export default class CompaniesCreateCommand extends BaseCommand {
  static description = 'Create a new company';

  static examples = [
    '$ bo companies create --name "Acme Inc" --type-id <id> --contact-name "John" --contact-email john@acme.com --contact-phone 12345678 --contact-title CEO --contact-legal-basis Consent --contact-marketing',
    '$ bo companies create --interactive',
  ];

  static flags = {
    name: Flags.string({ description: 'Company name' }),
    'type-id': Flags.string({ description: 'Company type ID' }),
    phone: Flags.string({ description: 'Phone number' }),
    email: Flags.string({ description: 'Email address' }),
    address: Flags.string({ description: 'Company address' }),
    website: Flags.string({ description: 'Company website' }),
    'org-number': Flags.string({ description: 'Organization number' }),
    'internal-responsible': Flags.string({ description: 'Internal responsible email' }),
    'contact-name': Flags.string({ description: 'Main contact name' }),
    'contact-email': Flags.string({ description: 'Main contact email' }),
    'contact-phone': Flags.string({ description: 'Main contact phone' }),
    'contact-title': Flags.string({ description: 'Main contact job title' }),
    'contact-legal-basis': Flags.string({ description: 'Main contact legal basis' }),
    'contact-marketing': Flags.boolean({ description: 'Main contact marketing consent', allowNo: true }),
    interactive: Flags.boolean({ description: 'Run in interactive mode with prompts', default: false }),
    preview: Flags.boolean({ description: 'Show what would be created without executing', default: false }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(CompaniesCreateCommand);

    try {
      await this.withConnection('customer', async (client) => {
        const fields = await this.collectFields(flags);

        if (flags.preview) {
          const previewData: PreviewData = { action: 'create', entity: 'Company', fields };
          printPreview(previewData);
          return;
        }

        if (flags.interactive) {
          const confirmed = await promptConfirm(`Create company "${fields.name}"?`);
          if (!confirmed) {
            console.log('Cancelled.');
            return;
          }
        }

        const format = this.getFormat(flags);
        const spinner = createSpinner('Creating company...');
        spinner.start();
        const result = await client.callTool('create_company', fields);
        const serverError = checkResponseError(result);
        if (serverError) {
          spinner.fail(serverError);
        } else {
          spinner.succeed('Company created successfully!');
        }
        console.log(formatOutput(result, { format }));
      });
    } catch (error) {
      this.printClassifiedError(error, 'Failed to create company');
      this.exit(1);
    }
  }

  private async collectFields(flags: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (flags.interactive) {
      const fields: Record<string, unknown> = {};
      fields.name = await promptText('Company name:', { required: true, default: flags.name as string });
      fields.companyTypeId = await promptText('Company type ID:', { required: true, default: flags['type-id'] as string });
      const phone = await promptText('Phone (optional):');
      if (phone) fields.companyPhone = phone;
      const email = await promptText('Email (optional):');
      if (email) fields.email = email;
      const address = await promptText('Address (optional):');
      if (address) fields.address = address;
      const website = await promptText('Website (optional):');
      if (website) fields.website = website;
      const orgNumber = await promptText('Org number (optional):');
      if (orgNumber) fields.orgNumber = orgNumber;
      const responsible = await promptText('Internal responsible email (optional):');
      if (responsible) fields.internalResponsibleEmail = responsible;

      // Main contact (required by server)
      console.log('\nMain contact details:');
      const contactName = await promptText('Contact name:', { required: true });
      const contactEmail = await promptText('Contact email:', { required: true });
      const contactPhone = await promptText('Contact phone:', { required: true });
      const contactTitle = await promptText('Contact job title:', { required: true });
      const contactLegal = await promptSelect('Legal basis:', contactLegalBasis());
      const contactMarketing = await promptConfirm('Marketing consent?', false);
      fields.mainContact = {
        name: contactName,
        email: contactEmail,
        cellPhone: contactPhone,
        jobTitle: contactTitle,
        legalBasis: contactLegal,
        marketingConsent: contactMarketing,
      };

      return fields;
    }

    if (!flags.name || !flags['type-id']) {
      printError('Company name and type ID are required. Use --name --type-id or --interactive');
      this.exit(1);
    }

    if (!flags['contact-name'] || !flags['contact-email'] || !flags['contact-phone'] || !flags['contact-title'] || !flags['contact-legal-basis'] || flags['contact-marketing'] === undefined) {
      printError('Main contact is required: --contact-name, --contact-email, --contact-phone, --contact-title, --contact-legal-basis, --contact-marketing/--no-contact-marketing');
      this.exit(1);
    }

    const fields: Record<string, unknown> = {
      name: flags.name,
      companyTypeId: flags['type-id'],
      mainContact: {
        name: flags['contact-name'],
        email: flags['contact-email'],
        cellPhone: flags['contact-phone'],
        jobTitle: flags['contact-title'],
        legalBasis: flags['contact-legal-basis'],
        marketingConsent: flags['contact-marketing'],
      },
    };
    if (flags.phone) fields.companyPhone = flags.phone;
    if (flags.email) fields.email = flags.email;
    if (flags.address) fields.address = flags.address;
    if (flags.website) fields.website = flags.website;
    if (flags['org-number']) fields.orgNumber = flags['org-number'];
    if (flags['internal-responsible']) fields.internalResponsibleEmail = flags['internal-responsible'];
    return fields;
  }
}

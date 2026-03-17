import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput, checkResponseError } from '../../formatters/index.js';
import { promptText, promptSelect, promptConfirm, createSpinner, printPreview, type PreviewData } from '../../utils/interactive.js';
import { validateEnum } from '../../enums/index.js';
import { leadsStatus, leadsLcmStatus, leadsProbability } from '../../enums/cache.js';

export default class LeadsCreateCommand extends BaseCommand {
  static description = 'Create a new lead';

  static examples = [
    '$ bo leads create --name "Acme Deal" --company-id <id> --lead-type-id <type-id>',
    '$ bo leads create --interactive',
  ];

  static flags = {
    name: Flags.string({ description: 'Lead name' }),
    'company-id': Flags.string({ description: 'Company ID' }),
    'lead-type-id': Flags.string({ description: 'Lead type ID' }),
    description: Flags.string({ description: 'Lead description' }),
    status: Flags.string({ description: 'Lead status' }),
    probability: Flags.string({ description: 'Win probability' }),
    'lcm-status': Flags.string({ description: 'LCM status' }),
    'contract-value': Flags.string({ description: 'Contract value' }),
    'expected-close-date': Flags.string({ description: 'Expected close date (ISO format)' }),
    'next-follow-up-date': Flags.string({ description: 'Next follow-up date (ISO format)' }),
    'internal-responsible': Flags.string({ description: 'Internal responsible email' }),
    'leads-main-contact': Flags.string({ description: 'Main contact ID' }),
    interactive: Flags.boolean({ description: 'Run in interactive mode with prompts', default: false }),
    preview: Flags.boolean({ description: 'Show what would be created without executing', default: false }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(LeadsCreateCommand);

    try {
      await this.withConnection('leads', async (client) => {
        const fields = await this.collectFields(flags);

        if (flags.preview) {
          const previewData: PreviewData = { action: 'create', entity: 'Lead', fields };
          printPreview(previewData);
          return;
        }

        if (flags.interactive) {
          const confirmed = await promptConfirm(`Create lead "${fields.leadName}"?`);
          if (!confirmed) {
            console.log('Cancelled.');
            return;
          }
        }

        const format = this.getFormat(flags);
        const spinner = createSpinner('Creating lead...');
        spinner.start();
        const result = await client.callTool('create_lead', fields);
        const serverError = checkResponseError(result);
        if (serverError) {
          spinner.fail(serverError);
        } else {
          spinner.succeed('Lead created successfully!');
        }
        console.log(formatOutput(result, { format }));
      }, { loadEnums: true });
    } catch (error) {
      this.printClassifiedError(error, 'Failed to create lead');
      this.exit(1);
    }
  }

  private async collectFields(flags: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (flags.interactive) {
      const fields: Record<string, unknown> = {};
      fields.leadName = await promptText('Lead name:', { required: true, default: flags.name as string });
      fields.companyId = await promptText('Company ID:', { required: true, default: flags['company-id'] as string });
      fields.leadTypeId = await promptText('Lead type ID:', { required: true, default: flags['lead-type-id'] as string });
      const description = await promptText('Description (optional):');
      if (description) fields.description = description;
      const status = await promptSelect('Status:', leadsStatus());
      if (status) fields.leadsStatus = status;
      const probability = await promptSelect('Win probability:', leadsProbability());
      if (probability) fields.leadsProbabilityForSale = probability;
      const lcmStatus = await promptSelect('LCM status:', leadsLcmStatus());
      if (lcmStatus) fields.leadsLcmStatus = lcmStatus;
      const contractValue = await promptText('Contract value (optional):');
      if (contractValue) {
        const cv = parseFloat(contractValue);
        if (Number.isNaN(cv)) throw new Error('Invalid contract value: must be a number');
        fields.contractValue = cv;
      }
      const nextFollowUpDate = await promptText('Next follow-up date (ISO format, optional):');
      if (nextFollowUpDate) fields.nextFollowUpDate = nextFollowUpDate;
      const responsible = await promptText('Internal responsible email (optional):');
      if (responsible) fields.internalResponsibleEmail = responsible;
      const mainContact = await promptText('Main contact ID (optional):');
      if (mainContact) fields.leadsMainContact = mainContact;
      return fields;
    }

    if (!flags.name || !flags['company-id'] || !flags['lead-type-id']) {
      printError('Name, company ID, and lead type ID are required. Use --name --company-id --lead-type-id or --interactive');
      this.exit(1);
    }

    validateEnum(flags.status as string | undefined, leadsStatus(), 'status');
    validateEnum(flags.probability as string | undefined, leadsProbability(), 'probability');
    validateEnum(flags['lcm-status'] as string | undefined, leadsLcmStatus(), 'LCM status');

    const fields: Record<string, unknown> = {
      leadName: flags.name,
      companyId: flags['company-id'],
      leadTypeId: flags['lead-type-id'],
    };
    if (flags.description) fields.description = flags.description;
    if (flags.status) fields.leadsStatus = flags.status;
    if (flags.probability) fields.leadsProbabilityForSale = flags.probability;
    if (flags['lcm-status']) fields.leadsLcmStatus = flags['lcm-status'];
    if (flags['contract-value']) {
      const cv = parseFloat(flags['contract-value'] as string);
      if (Number.isNaN(cv)) throw new Error('Invalid --contract-value: must be a number');
      fields.contractValue = cv;
    }
    if (flags['expected-close-date']) fields.expectedCloseDate = flags['expected-close-date'];
    if (flags['next-follow-up-date']) fields.nextFollowUpDate = flags['next-follow-up-date'];
    if (flags['internal-responsible']) fields.internalResponsibleEmail = flags['internal-responsible'];
    if (flags['leads-main-contact']) fields.leadsMainContact = flags['leads-main-contact'];
    return fields;
  }
}

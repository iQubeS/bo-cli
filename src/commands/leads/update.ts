import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput, checkResponseError } from '../../formatters/index.js';
import { promptText, promptSelect, promptConfirm, createSpinner, printPreview, type PreviewData } from '../../utils/interactive.js';
import { validateEnum } from '../../enums/index.js';
import { leadsStatus, leadsLcmStatus, leadsProbability } from '../../enums/cache.js';

export default class LeadsUpdateCommand extends BaseCommand {
  static description = 'Update a lead';

  static examples = [
    '$ bo leads update <id> --status Won',
    '$ bo leads update <id> --interactive',
    '$ bo leads update <id> --preview --status Won',
  ];

  static args = {
    id: Args.string({ description: 'Lead ID', required: true }),
  };

  static flags = {
    name: Flags.string({ description: 'Lead name' }),
    'lead-type': Flags.string({ description: 'Lead type ID' }),
    status: Flags.string({ description: 'Lead status' }),
    probability: Flags.string({ description: 'Win probability' }),
    'lcm-status': Flags.string({ description: 'LCM status' }),
    description: Flags.string({ description: 'Lead description' }),
    'contract-value': Flags.string({ description: 'Contract value' }),
    'expected-close-date': Flags.string({ description: 'Expected close date (ISO format)' }),
    'internal-responsible': Flags.string({ description: 'Internal responsible email' }),
    interactive: Flags.boolean({ description: 'Run in interactive mode with prompts', default: false }),
    preview: Flags.boolean({ description: 'Show what would be updated without executing', default: false }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(LeadsUpdateCommand);
    const format = this.getFormat(flags);

    try {
      await this.withConnection('leads', async (client) => {
        const updateData = await this.collectFields(flags);

        if (flags.preview) {
          const previewData: PreviewData = { action: 'update', entity: `Lead ${args.id}`, fields: updateData };
          printPreview(previewData);
          return;
        }

        if (flags.interactive) {
          const confirmed = await promptConfirm(`Update lead ${args.id}?`);
          if (!confirmed) {
            console.log('Cancelled.');
            return;
          }
        }

        if (Object.keys(updateData).length === 0) {
          printError('No fields to update. Please provide at least one field to update.');
          this.exit(1);
        }

        const spinner = createSpinner('Updating lead...');
        spinner.start();
        const result = await client.callTool('update_lead', { leadId: args.id, ...updateData });
        const serverError = checkResponseError(result);
        if (serverError) {
          spinner.fail(serverError);
        } else {
          spinner.succeed('Lead updated successfully!');
        }
        console.log(formatOutput(result, { format }));
      }, { loadEnums: true });
    } catch (error) {
      this.printClassifiedError(error, 'Failed to update lead');
      this.exit(1);
    }
  }

  private async collectFields(flags: Record<string, unknown>): Promise<Record<string, unknown>> {
    const updateData: Record<string, unknown> = {};

    if (flags.interactive) {
      const name = await promptText('Lead name (leave empty to skip):');
      if (name) updateData.leadName = name;
      const leadType = await promptText('Lead type ID (leave empty to skip):');
      if (leadType) updateData.leadTypeId = leadType;
      const status = await promptSelect('Status:', leadsStatus());
      if (status) updateData.leadsStatus = status;
      const probability = await promptSelect('Win probability:', leadsProbability());
      if (probability) updateData.leadsProbabilityForSale = probability;
      const lcmStatus = await promptSelect('LCM status:', leadsLcmStatus());
      if (lcmStatus) updateData.leadsLcmStatus = lcmStatus;
      const description = await promptText('Description (leave empty to skip):');
      if (description) updateData.description = description;
      const contractValue = await promptText('Contract value (leave empty to skip):');
      if (contractValue) {
        const cv = parseFloat(contractValue);
        if (Number.isNaN(cv)) throw new Error('Invalid contract value: must be a number');
        updateData.contractValue = cv;
      }
      const expectedCloseDate = await promptText('Expected close date (ISO format, leave empty to skip):');
      if (expectedCloseDate) updateData.expectedCloseDate = expectedCloseDate;
      const internalResponsible = await promptText('Internal responsible email (leave empty to skip):');
      if (internalResponsible) updateData.internalResponsibleEmail = internalResponsible;
    } else {
      validateEnum(flags.status as string | undefined, leadsStatus(), 'status');
      validateEnum(flags.probability as string | undefined, leadsProbability(), 'probability');
      validateEnum(flags['lcm-status'] as string | undefined, leadsLcmStatus(), 'LCM status');

      if (flags.name) updateData.leadName = flags.name;
      if (flags['lead-type']) updateData.leadTypeId = flags['lead-type'];
      if (flags.status) updateData.leadsStatus = flags.status;
      if (flags.probability) updateData.leadsProbabilityForSale = flags.probability;
      if (flags['lcm-status']) updateData.leadsLcmStatus = flags['lcm-status'];
      if (flags.description) updateData.description = flags.description;
      if (flags['contract-value']) {
        const cv = parseFloat(flags['contract-value'] as string);
        if (Number.isNaN(cv)) throw new Error('Invalid contract-value: must be a number');
        updateData.contractValue = cv;
      }
      if (flags['expected-close-date']) updateData.expectedCloseDate = flags['expected-close-date'];
      if (flags['internal-responsible']) updateData.internalResponsibleEmail = flags['internal-responsible'];
    }

    return updateData;
  }
}

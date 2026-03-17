import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput, checkResponseError } from '../../formatters/index.js';
import { promptText, promptSelect, promptConfirm, createSpinner, printPreview, type PreviewData } from '../../utils/interactive.js';
import { validateEnum } from '../../enums/index.js';
import { ncrType, ncrDirectCause, ncrCategory, ncrLocation, ncrFeedbackType, ncrRootCause } from '../../enums/cache.js';

export default class NcrCreateCommand extends BaseCommand {
  static description = 'Create a new NCR card';

  static examples = [
    '$ bo ncr create --title "Quality Issue" --type "Non-Conformance"',
    '$ bo ncr create --interactive',
  ];

  static flags = {
    title: Flags.string({ description: 'NCR title' }),
    type: Flags.string({ description: 'NCR type (typeRegistration)' }),
    description: Flags.string({ description: 'NCR description' }),
    'direct-cause': Flags.string({ description: 'Direct cause' }),
    category: Flags.string({ description: 'Category' }),
    location: Flags.string({ description: 'Location' }),
    'feedback-type': Flags.string({ description: 'Feedback type' }),
    'company-id': Flags.string({ description: 'Related company ID' }),
    'project-id': Flags.string({ description: 'Related project ID' }),
    'lead-id': Flags.string({ description: 'Related lead ID' }),
    'department-id': Flags.string({ description: 'Department ID' }),
    'assigned-to': Flags.string({ description: 'Assigned to email' }),
    'immediate-actions': Flags.string({ description: 'Immediate actions taken' }),
    'long-term-proposal': Flags.string({ description: 'Long-term corrective action proposal' }),
    'root-cause': Flags.string({ description: 'Root cause' }),
    'purchase-order': Flags.string({ description: 'Purchase order reference' }),
    'part-no': Flags.string({ description: 'Part number' }),
    interactive: Flags.boolean({ description: 'Run in interactive mode with prompts', default: false }),
    preview: Flags.boolean({ description: 'Show what would be created without executing', default: false }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(NcrCreateCommand);

    try {
      await this.withConnection('ncr', async (client) => {
        const fields = await this.collectFields(flags);

        if (flags.preview) {
          const previewData: PreviewData = { action: 'create', entity: 'NCR', fields };
          printPreview(previewData);
          return;
        }

        if (flags.interactive) {
          const confirmed = await promptConfirm(`Create NCR "${fields.title}"?`);
          if (!confirmed) {
            console.log('Cancelled.');
            return;
          }
        }

        const format = this.getFormat(flags);
        const spinner = createSpinner('Creating NCR...');
        spinner.start();
        const result = await client.callTool('create_ncr_card', fields);
        const serverError = checkResponseError(result);
        if (serverError) {
          spinner.fail(serverError);
        } else {
          spinner.succeed('NCR created successfully!');
        }
        console.log(formatOutput(result, { format }));
      }, { loadEnums: true });
    } catch (error) {
      this.printClassifiedError(error, 'Failed to create NCR');
      this.exit(1);
    }
  }

  private async collectFields(flags: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (flags.interactive) {
      const fields: Record<string, unknown> = {};
      fields.title = await promptText('NCR title:', { required: true, default: flags.title as string });
      fields.typeRegistration = await promptSelect('NCR type:', ncrType(), { required: true });
      const description = await promptText('Description (optional):');
      if (description) fields.description = description;
      const directCause = await promptSelect('Direct cause:', ncrDirectCause());
      if (directCause) fields.directCause = directCause;
      const category = await promptSelect('Category:', ncrCategory());
      if (category) fields.category = category;
      const location = await promptSelect('Location:', ncrLocation());
      if (location) fields.location = location;
      const feedbackType = await promptSelect('Feedback type:', ncrFeedbackType());
      if (feedbackType) fields.feedbackType = feedbackType;
      const companyId = await promptText('Company ID (optional):');
      if (companyId) fields.companyId = companyId;
      const projectId = await promptText('Project ID (optional):');
      if (projectId) fields.projectId = projectId;
      const leadId = await promptText('Lead ID (optional):');
      if (leadId) fields.leadId = leadId;
      const departmentId = await promptText('Department ID (optional):');
      if (departmentId) fields.departmentId = departmentId;
      const assignedTo = await promptText('Assigned to email (optional):');
      if (assignedTo) fields.assignedToEmail = assignedTo;
      const immediateActions = await promptText('Immediate actions taken (optional):');
      if (immediateActions) fields.immediateActions = immediateActions;
      const longTermProposal = await promptText('Long-term corrective action proposal (optional):');
      if (longTermProposal) fields.longTermProposal = longTermProposal;
      const rootCause = await promptSelect('Root cause:', ncrRootCause());
      if (rootCause) fields.rootCause = rootCause;
      const purchaseOrder = await promptText('Purchase order reference (optional):');
      if (purchaseOrder) fields.purchaseOrder = purchaseOrder;
      const partNo = await promptText('Part number (optional):');
      if (partNo) fields.partNo = partNo;
      return fields;
    }

    if (!flags.title || !flags.type) {
      printError('Title and type are required. Use --title --type or --interactive');
      this.exit(1);
    }

    validateEnum(flags.type as string, ncrType(), 'type');
    validateEnum(flags['direct-cause'] as string | undefined, ncrDirectCause(), 'direct cause');
    validateEnum(flags.category as string | undefined, ncrCategory(), 'category');
    validateEnum(flags.location as string | undefined, ncrLocation(), 'location');
    validateEnum(flags['feedback-type'] as string | undefined, ncrFeedbackType(), 'feedback type');
    validateEnum(flags['root-cause'] as string | undefined, ncrRootCause(), 'root cause');

    const fields: Record<string, unknown> = {
      title: flags.title,
      typeRegistration: flags.type,
    };
    if (flags.description) fields.description = flags.description;
    if (flags['direct-cause']) fields.directCause = flags['direct-cause'];
    if (flags.category) fields.category = flags.category;
    if (flags.location) fields.location = flags.location;
    if (flags['feedback-type']) fields.feedbackType = flags['feedback-type'];
    if (flags['company-id']) fields.companyId = flags['company-id'];
    if (flags['project-id']) fields.projectId = flags['project-id'];
    if (flags['lead-id']) fields.leadId = flags['lead-id'];
    if (flags['department-id']) fields.departmentId = flags['department-id'];
    if (flags['assigned-to']) fields.assignedToEmail = flags['assigned-to'];
    if (flags['immediate-actions']) fields.immediateActions = flags['immediate-actions'];
    if (flags['long-term-proposal']) fields.longTermProposal = flags['long-term-proposal'];
    if (flags['root-cause']) fields.rootCause = flags['root-cause'];
    if (flags['purchase-order']) fields.purchaseOrder = flags['purchase-order'];
    if (flags['part-no']) fields.partNo = flags['part-no'];
    return fields;
  }
}

import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput, checkResponseError } from '../../formatters/index.js';
import { promptText, promptSelect, promptConfirm, createSpinner, printPreview, type PreviewData } from '../../utils/interactive.js';
import { validateEnum } from '../../enums/index.js';
import { ncrType, ncrDirectCause, ncrCategory, ncrLocation, ncrFeedbackType } from '../../enums/cache.js';

export default class NcrUpdateCommand extends BaseCommand {
  static description = 'Update an NCR card';

  static examples = [
    '$ bo ncr update <id> --status Closed',
    '$ bo ncr update <id> --interactive',
    '$ bo ncr update <id> --preview --status Closed',
  ];

  static args = {
    id: Args.string({ description: 'NCR ID', required: true }),
  };

  static flags = {
    title: Flags.string({ description: 'NCR title' }),
    description: Flags.string({ description: 'NCR description' }),
    type: Flags.string({ description: 'NCR type' }),
    status: Flags.string({ description: 'NCR status' }),
    'direct-cause': Flags.string({ description: 'Direct cause' }),
    category: Flags.string({ description: 'Category' }),
    location: Flags.string({ description: 'Location' }),
    'feedback-type': Flags.string({ description: 'Feedback type' }),
    interactive: Flags.boolean({ description: 'Run in interactive mode with prompts', default: false }),
    preview: Flags.boolean({ description: 'Show what would be updated without executing', default: false }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(NcrUpdateCommand);
    const format = this.getFormat(flags);

    try {
      await this.withConnection('ncr', async (client) => {
        const updateData = await this.collectFields(flags);

        if (flags.preview) {
          const previewData: PreviewData = { action: 'update', entity: `NCR ${args.id}`, fields: updateData };
          printPreview(previewData);
          return;
        }

        if (flags.interactive) {
          const confirmed = await promptConfirm(`Update NCR ${args.id}?`);
          if (!confirmed) {
            console.log('Cancelled.');
            return;
          }
        }

        if (Object.keys(updateData).length === 0) {
          printError('No fields to update. Please provide at least one field to update.');
          this.exit(1);
        }

        const spinner = createSpinner('Updating NCR...');
        spinner.start();
        const result = await client.callTool('update_specific_ncr_card', { ncrCardId: args.id, ...updateData });
        const serverError = checkResponseError(result);
        if (serverError) {
          spinner.fail(serverError);
        } else {
          spinner.succeed('NCR updated successfully!');
        }
        console.log(formatOutput(result, { format }));
      }, { loadEnums: true });
    } catch (error) {
      this.printClassifiedError(error, 'Failed to update NCR');
      this.exit(1);
    }
  }

  private async collectFields(flags: Record<string, unknown>): Promise<Record<string, unknown>> {
    const updateData: Record<string, unknown> = {};

    if (flags.interactive) {
      const title = await promptText('NCR title (leave empty to skip):');
      if (title) updateData.title = title;
      const description = await promptText('Description (leave empty to skip):');
      if (description) updateData.description = description;
      const type = await promptSelect('NCR type:', ncrType());
      if (type) updateData.typeRegistration = type;
      const status = await promptText('Status (leave empty to skip):');
      if (status) updateData.status = status;
      const directCause = await promptSelect('Direct cause:', ncrDirectCause());
      if (directCause) updateData.directCause = directCause;
      const category = await promptSelect('Category:', ncrCategory());
      if (category) updateData.category = category;
      const location = await promptSelect('Location:', ncrLocation());
      if (location) updateData.location = location;
      const feedbackType = await promptSelect('Feedback type:', ncrFeedbackType());
      if (feedbackType) updateData.feedbackType = feedbackType;
    } else {
      validateEnum(flags.type as string | undefined, ncrType(), 'type');
      validateEnum(flags['direct-cause'] as string | undefined, ncrDirectCause(), 'direct cause');
      validateEnum(flags.category as string | undefined, ncrCategory(), 'category');
      validateEnum(flags.location as string | undefined, ncrLocation(), 'location');
      validateEnum(flags['feedback-type'] as string | undefined, ncrFeedbackType(), 'feedback type');

      if (flags.title) updateData.title = flags.title;
      if (flags.description) updateData.description = flags.description;
      if (flags.type) updateData.typeRegistration = flags.type;
      if (flags.status) updateData.status = flags.status;
      if (flags['direct-cause']) updateData.directCause = flags['direct-cause'];
      if (flags.category) updateData.category = flags.category;
      if (flags.location) updateData.location = flags.location;
      if (flags['feedback-type']) updateData.feedbackType = flags['feedback-type'];
    }

    return updateData;
  }
}

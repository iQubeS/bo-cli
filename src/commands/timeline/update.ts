import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput, checkResponseError } from '../../formatters/index.js';
import { promptText, promptSelect, promptConfirm, createSpinner, printPreview, type PreviewData } from '../../utils/interactive.js';
import { validateEnum } from '../../enums/index.js';
import { logType } from '../../enums/cache.js';

export default class TimelineUpdateCommand extends BaseCommand {
  static description = 'Update a timeline event';

  static examples = [
    '$ bo timeline update company <entity-id> <timeline-id> --name "Meeting" --log-type Meeting --date 2026-01-01T10:00:00Z',
    '$ bo timeline update company <entity-id> <timeline-id> --interactive',
  ];

  static args = {
    module: Args.string({ description: 'Module (company, lead, project)', required: true }),
    'entity-id': Args.string({ description: 'Entity ID', required: true }),
    'timeline-id': Args.string({ description: 'Timeline event ID', required: true }),
  };

  static flags = {
    name: Flags.string({ description: 'Event name/title (required)' }),
    'log-type': Flags.string({ description: 'Log type (required)' }),
    description: Flags.string({ description: 'Description' }),
    date: Flags.string({ description: 'Event date (ISO format, defaults to now)' }),
    interactive: Flags.boolean({ description: 'Run in interactive mode with prompts', default: false }),
    preview: Flags.boolean({ description: 'Show what would be updated without executing', default: false }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TimelineUpdateCommand);
    const format = this.getFormat(flags);

    const toolName = this.resolveTimelineTool(args.module, 'update');
    if (!toolName) {
      printError(`Invalid module: ${args.module}. Use company, lead, or project`);
      this.exit(1);
    }

    try {
      const serverName = this.resolveServerName(args.module);
      await this.withConnection(serverName, async (client) => {
        const updateData = await this.collectFields(flags);

        if (flags.preview) {
          const previewData: PreviewData = { action: 'update', entity: `Timeline ${args['timeline-id']}`, fields: updateData };
          printPreview(previewData);
          return;
        }

        if (flags.interactive) {
          const confirmed = await promptConfirm(`Update timeline event ${args['timeline-id']}?`);
          if (!confirmed) {
            console.log('Cancelled.');
            return;
          }
        }

        if (Object.keys(updateData).length === 0) {
          printError('No fields to update. Please provide at least one field to update.');
          this.exit(1);
        }

        const spinner = createSpinner('Updating timeline event...');
        spinner.start();
        const result = await client.callTool(toolName, {
          [this.entityIdParam(args.module)]: args['entity-id'],
          timelineId: args['timeline-id'],
          ...updateData,
        });
        const serverError = checkResponseError(result);
        if (serverError) {
          spinner.fail(serverError);
        } else {
          spinner.succeed('Timeline event updated successfully!');
        }
        console.log(formatOutput(result, { format }));
      }, { loadEnums: true });
    } catch (error) {
      this.printClassifiedError(error, 'Failed to update timeline event');
      this.exit(1);
    }
  }

  private async collectFields(flags: Record<string, unknown>): Promise<Record<string, unknown>> {
    const updateData: Record<string, unknown> = {};

    if (flags.interactive) {
      const name = await promptText('Event name (required):');
      if (!name) {
        printError('Event name is required for timeline updates.');
        this.exit(1);
      }
      updateData.name = name;

      const lt = await promptSelect('Log type:', logType());
      if (!lt) {
        printError('Log type is required for timeline updates.');
        this.exit(1);
      }
      updateData.logType = lt;

      const description = await promptText('Description (leave empty to skip):');
      if (description) updateData.description = description;

      const date = await promptText('Event date (leave empty for now):');
      updateData.date = date || new Date().toISOString();
    } else {
      if (!flags.name) {
        printError('--name is required for timeline updates (server requires full replacement).');
        this.exit(1);
      }
      if (!flags['log-type']) {
        printError('--log-type is required for timeline updates (server requires full replacement).');
        this.exit(1);
      }

      validateEnum(flags['log-type'] as string, logType(), 'log type');

      updateData.name = flags.name;
      updateData.logType = flags['log-type'];
      if (flags.description) updateData.description = flags.description;
      updateData.date = (flags.date as string) || new Date().toISOString();
    }

    return updateData;
  }
}

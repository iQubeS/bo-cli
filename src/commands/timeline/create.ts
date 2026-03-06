import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput, checkResponseError } from '../../formatters/index.js';
import { promptText, promptSelect, promptConfirm, createSpinner, printPreview, type PreviewData } from '../../utils/interactive.js';
import { validateEnum } from '../../enums/index.js';
import { logType } from '../../enums/cache.js';

export default class TimelineCreateCommand extends BaseCommand {
  static description = 'Create a timeline event';

  static examples = [
    '$ bo timeline create company <entity-id> --name "Weekly sync" --log-type Meeting --description "Meeting notes"',
    '$ bo timeline create lead <entity-id> --interactive',
  ];

  static args = {
    module: Args.string({ description: 'Module (company, lead, project)', required: true }),
    'entity-id': Args.string({ description: 'Entity ID', required: true }),
  };

  static flags = {
    name: Flags.string({ description: 'Event name/title' }),
    'log-type': Flags.string({ description: 'Log type' }),
    description: Flags.string({ description: 'Description' }),
    date: Flags.string({ description: 'Event date (ISO format, e.g. 2025-01-15T10:00:00Z)' }),
    interactive: Flags.boolean({ description: 'Run in interactive mode with prompts', default: false }),
    preview: Flags.boolean({ description: 'Show what would be created without executing', default: false }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TimelineCreateCommand);

    const toolMap: Record<string, string> = {
      company: 'create_company_timeline_event',
      lead: 'create_lead_timeline_event',
      project: 'create_project_timeline_event',
    };

    const toolName = toolMap[args.module];
    if (!toolName) {
      printError(`Invalid module: ${args.module}. Use company, lead, or project`);
      this.exit(1);
    }

    try {
      const serverName = this.resolveServerName(args.module);
      await this.withConnection(serverName, async (client) => {
        const fields = await this.collectFields(args, flags);

        if (flags.preview) {
          const previewData: PreviewData = { action: 'create', entity: 'Timeline Event', fields };
          printPreview(previewData);
          return;
        }

        if (flags.interactive) {
          const confirmed = await promptConfirm(`Create timeline event "${fields.name}"?`);
          if (!confirmed) {
            console.log('Cancelled.');
            return;
          }
        }

        const format = this.getFormat(flags);
        const spinner = createSpinner('Creating timeline event...');
        spinner.start();
        const result = await client.callTool(toolName, fields);
        const serverError = checkResponseError(result);
        if (serverError) {
          spinner.fail(serverError);
        } else {
          spinner.succeed('Timeline event created successfully!');
        }
        console.log(formatOutput(result, { format }));
      });
    } catch (error) {
      this.printClassifiedError(error, 'Failed to create timeline event');
      this.exit(1);
    }
  }

  private async collectFields(args: Record<string, unknown>, flags: Record<string, unknown>): Promise<Record<string, unknown>> {
    const entityId = { [this.entityIdParam(args.module as string)]: args['entity-id'] };

    if (flags.interactive) {
      const fields: Record<string, unknown> = { ...entityId };
      fields.name = await promptText('Event name:', { required: true, default: flags.name as string });
      fields.logType = await promptSelect('Log type:', logType(), { required: true });
      const description = await promptText('Description (optional):');
      if (description) fields.description = description;
      const date = await promptText('Date (optional, ISO format):');
      fields.date = date || new Date().toISOString();
      return fields;
    }

    if (!flags.name || !flags['log-type']) {
      printError('Name and log type are required. Use --name --log-type or --interactive');
      this.exit(1);
    }

    validateEnum(flags['log-type'] as string, logType(), 'log type');

    return {
      ...entityId,
      name: flags.name,
      logType: flags['log-type'],
      date: (flags.date as string) || new Date().toISOString(),
      description: flags.description,
    };
  }
}

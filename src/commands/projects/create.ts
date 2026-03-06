import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput, checkResponseError } from '../../formatters/index.js';
import { promptText, promptSelect, promptConfirm, createSpinner, printPreview, type PreviewData } from '../../utils/interactive.js';
import { validateEnum } from '../../enums/index.js';
import { projectActivity } from '../../enums/cache.js';

export default class ProjectsCreateCommand extends BaseCommand {
  static description = 'Create a new project';

  static examples = [
    '$ bo projects create --name "Project X" --company-id <id> --department-id <id> --project-type-id <id> --internal-responsible user@example.com',
    '$ bo projects create --interactive',
  ];

  static flags = {
    name: Flags.string({ description: 'Project name' }),
    'company-id': Flags.string({ description: 'Company ID' }),
    'department-id': Flags.string({ description: 'Department ID' }),
    'project-type-id': Flags.string({ description: 'Project type ID' }),
    'internal-responsible': Flags.string({ description: 'Internal responsible email' }),
    description: Flags.string({ description: 'Project description' }),
    activity: Flags.string({ description: 'Project activity' }),
    'start-date': Flags.string({ description: 'Project start date (ISO format)' }),
    'end-date': Flags.string({ description: 'Project end date (ISO format)' }),
    interactive: Flags.boolean({ description: 'Run in interactive mode with prompts', default: false }),
    preview: Flags.boolean({ description: 'Show what would be created without executing', default: false }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ProjectsCreateCommand);

    try {
      await this.withConnection('projects', async (client) => {
        const fields = await this.collectFields(flags);

        if (flags.preview) {
          const previewData: PreviewData = { action: 'create', entity: 'Project', fields };
          printPreview(previewData);
          return;
        }

        if (flags.interactive) {
          const confirmed = await promptConfirm(`Create project "${fields.name}"?`);
          if (!confirmed) {
            console.log('Cancelled.');
            return;
          }
        }

        const format = this.getFormat(flags);
        const spinner = createSpinner('Creating project...');
        spinner.start();
        const result = await client.callTool('create_project', fields);
        const serverError = checkResponseError(result);
        if (serverError) {
          spinner.fail(serverError);
        } else {
          spinner.succeed('Project created successfully!');
        }
        console.log(formatOutput(result, { format }));
      });
    } catch (error) {
      this.printClassifiedError(error, 'Failed to create project');
      this.exit(1);
    }
  }

  private async collectFields(flags: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (flags.interactive) {
      const fields: Record<string, unknown> = {};
      fields.name = await promptText('Project name:', { required: true, default: flags.name as string });
      fields.companyId = await promptText('Company ID:', { required: true, default: flags['company-id'] as string });
      fields.departmentId = await promptText('Department ID:', { required: true, default: flags['department-id'] as string });
      fields.projectTypeId = await promptText('Project type ID:', { required: true, default: flags['project-type-id'] as string });
      fields.internalResponsibleEmail = await promptText('Internal responsible email:', { required: true, default: flags['internal-responsible'] as string });
      const description = await promptText('Description (optional):');
      if (description) fields.description = description;
      const activity = await promptSelect('Activity:', projectActivity());
      if (activity) fields.activity = activity;
      const startDate = await promptText('Start date (optional, ISO format):');
      if (startDate) fields.projectStartDate = startDate;
      const endDate = await promptText('End date (optional, ISO format):');
      if (endDate) fields.projectEndDate = endDate;
      return fields;
    }

    if (!flags.name || !flags['company-id'] || !flags['department-id'] || !flags['project-type-id'] || !flags['internal-responsible']) {
      printError('Name, company ID, department ID, project type ID, and internal responsible are required. Use --interactive for guided creation.');
      this.exit(1);
    }

    validateEnum(flags.activity as string | undefined, projectActivity(), 'activity');

    const fields: Record<string, unknown> = {
      name: flags.name,
      companyId: flags['company-id'],
      departmentId: flags['department-id'],
      projectTypeId: flags['project-type-id'],
      internalResponsibleEmail: flags['internal-responsible'],
    };
    if (flags.description) fields.description = flags.description;
    if (flags.activity) fields.activity = flags.activity;
    if (flags['start-date']) fields.projectStartDate = flags['start-date'];
    if (flags['end-date']) fields.projectEndDate = flags['end-date'];
    return fields;
  }
}

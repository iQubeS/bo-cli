import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput, checkResponseError } from '../../formatters/index.js';
import { promptText, promptSelect, promptConfirm, createSpinner, printPreview, type PreviewData } from '../../utils/interactive.js';
import { validateEnum } from '../../enums/index.js';
import { projectActivity } from '../../enums/cache.js';

export default class ProjectsUpdateCommand extends BaseCommand {
  static description = 'Update a project';

  static examples = [
    '$ bo projects update <id> --activity Completed',
    '$ bo projects update <id> --interactive',
    '$ bo projects update <id> --preview --activity Completed',
  ];

  static args = {
    id: Args.string({ description: 'Project ID', required: true }),
  };

  static flags = {
    name: Flags.string({ description: 'Project name' }),
    description: Flags.string({ description: 'Project description' }),
    'project-type': Flags.string({ description: 'Project type ID' }),
    activity: Flags.string({ description: 'Project activity' }),
    department: Flags.string({ description: 'Department ID' }),
    'start-date': Flags.string({ description: 'Project start date (ISO format)' }),
    'end-date': Flags.string({ description: 'Project end date (ISO format)' }),
    'internal-responsible': Flags.string({ description: 'Internal responsible email' }),
    interactive: Flags.boolean({ description: 'Run in interactive mode with prompts', default: false }),
    preview: Flags.boolean({ description: 'Show what would be updated without executing', default: false }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ProjectsUpdateCommand);
    const format = this.getFormat(flags);

    try {
      await this.withConnection('projects', async (client) => {
        const updateData = await this.collectFields(flags);

        if (flags.preview) {
          const previewData: PreviewData = { action: 'update', entity: `Project ${args.id}`, fields: updateData };
          printPreview(previewData);
          return;
        }

        if (flags.interactive) {
          const confirmed = await promptConfirm(`Update project ${args.id}?`);
          if (!confirmed) {
            console.log('Cancelled.');
            return;
          }
        }

        if (Object.keys(updateData).length === 0) {
          printError('No fields to update. Please provide at least one field to update.');
          this.exit(1);
        }

        const spinner = createSpinner('Updating project...');
        spinner.start();
        const result = await client.callTool('update_project', { projectId: args.id, ...updateData });
        const serverError = checkResponseError(result);
        if (serverError) {
          spinner.fail(serverError);
        } else {
          spinner.succeed('Project updated successfully!');
        }
        console.log(formatOutput(result, { format }));
      }, { loadEnums: true });
    } catch (error) {
      this.printClassifiedError(error, 'Failed to update project');
      this.exit(1);
    }
  }

  private async collectFields(flags: Record<string, unknown>): Promise<Record<string, unknown>> {
    const updateData: Record<string, unknown> = {};

    if (flags.interactive) {
      const name = await promptText('Project name (leave empty to skip):');
      if (name) updateData.projectName = name;
      const description = await promptText('Description (leave empty to skip):');
      if (description) updateData.description = description;
      const projType = await promptText('Project type ID (leave empty to skip):');
      if (projType) updateData.projectTypeId = projType;
      const activity = await promptSelect('Activity:', projectActivity());
      if (activity) updateData.projectActivity = activity;
      const department = await promptText('Department ID (leave empty to skip):');
      if (department) updateData.departmentId = department;
      const startDate = await promptText('Start date (ISO format, leave empty to skip):');
      if (startDate) updateData.projectStartDate = startDate;
      const endDate = await promptText('End date (ISO format, leave empty to skip):');
      if (endDate) updateData.projectEndDate = endDate;
      const internalResponsible = await promptText('Internal responsible email (leave empty to skip):');
      if (internalResponsible) updateData.internalResponsibleEmail = internalResponsible;
    } else {
      validateEnum(flags.activity as string | undefined, projectActivity(), 'activity');

      if (flags.name) updateData.projectName = flags.name;
      if (flags.description) updateData.description = flags.description;
      if (flags['project-type']) updateData.projectTypeId = flags['project-type'];
      if (flags.activity) updateData.projectActivity = flags.activity;
      if (flags.department) updateData.departmentId = flags.department;
      if (flags['start-date']) updateData.projectStartDate = flags['start-date'];
      if (flags['end-date']) updateData.projectEndDate = flags['end-date'];
      if (flags['internal-responsible']) updateData.internalResponsibleEmail = flags['internal-responsible'];
    }

    return updateData;
  }
}

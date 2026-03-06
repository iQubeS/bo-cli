import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { formatOutput } from '../../formatters/index.js';

export default class ProjectsGetCommand extends BaseCommand {
  static description = 'Get a project by ID';

  static examples = ['$ bo projects get <id>'];

  static args = {
    id: Args.string({ description: 'Project ID', required: true }),
  };

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ProjectsGetCommand);
    const format = this.getFormat(flags);

    try {
      const result = await this.withConnection('projects', (client) =>
        client.callTool('retrieve_project', { projectId: args.id })
      );
      console.log(formatOutput(result, { format }));
    } catch (error) {
      this.printClassifiedError(error, 'Failed to get project');
      this.exit(1);
    }
  }
}

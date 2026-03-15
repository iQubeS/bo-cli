import { LookupCommand } from '../lookup-command.js';

export default class ProjectsTypesCommand extends LookupCommand {
  static description = 'List all project types';
  static examples = ['$ bo projects types'];

  protected readonly cacheKey = 'project_types';
  protected readonly serverName = 'projects';
  protected readonly toolName = 'get_all_project_types';
  protected readonly errorContext = 'Failed to get project types';
}

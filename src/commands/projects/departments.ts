import { LookupCommand } from '../lookup-command.js';

export default class ProjectsDepartmentsCommand extends LookupCommand {
  static description = 'List all departments';
  static examples = ['$ bo projects departments'];

  protected readonly cacheKey = 'departments';
  protected readonly serverName = 'projects';
  protected readonly toolName = 'get_all_departments';
  protected readonly errorContext = 'Failed to get departments';
}

import { LookupCommand } from '../lookup-command.js';

export default class CompaniesTypesCommand extends LookupCommand {
  static description = 'List all company types';
  static examples = ['$ bo companies types'];

  protected readonly cacheKey = 'company_types';
  protected readonly serverName = 'customer';
  protected readonly toolName = 'get_all_company_types';
  protected readonly errorContext = 'Failed to get company types';
}

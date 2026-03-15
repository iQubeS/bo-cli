import { LookupCommand } from '../lookup-command.js';

export default class LeadsTypesCommand extends LookupCommand {
  static description = 'List all lead types';
  static examples = ['$ bo leads types'];

  protected readonly cacheKey = 'lead_types';
  protected readonly serverName = 'leads';
  protected readonly toolName = 'get_all_lead_types';
  protected readonly errorContext = 'Failed to get lead types';
}

import { Command, Flags } from '@oclif/core';
import { loadConfig, getActiveEnvironment } from '../../config/index.js';
import { printInfo, printSuccess } from '../../formatters/index.js';
import { clearEnvAuth, deleteAuthState, listAuthServers } from '../../auth/token-store.js';

export default class AuthLogoutCommand extends Command {
  static description = 'Clear stored OAuth tokens';

  static examples = [
    '$ bo auth logout',
    '$ bo auth logout --server customer',
    '$ bo auth logout --all',
  ];

  static flags = {
    server: Flags.string({
      description: 'Sign out of a single server only',
    }),
    all: Flags.boolean({
      description: 'Remove all stored auth state for this environment',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(AuthLogoutCommand);
    const config = await loadConfig();
    const env = getActiveEnvironment(config);

    if (flags.all) {
      clearEnvAuth(env);
      printSuccess(`Cleared all auth state for environment "${env}".`);
      return;
    }

    if (flags.server) {
      deleteAuthState(env, flags.server);
      printSuccess(`Signed out of ${flags.server} (env: ${env}).`);
      return;
    }

    const servers = listAuthServers(env);
    if (servers.length === 0) {
      printInfo(`No stored auth state for environment "${env}".`);
      return;
    }
    for (const s of servers) {
      deleteAuthState(env, s);
    }
    printSuccess(`Signed out of ${servers.length} server(s) in env "${env}": ${servers.join(', ')}`);
  }
}

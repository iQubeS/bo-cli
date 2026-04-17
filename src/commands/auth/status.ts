import { Command, Flags } from '@oclif/core';
import {
  loadConfig,
  getActiveEnvironment,
  isMcpConfig,
  resolveAuthMethod,
} from '../../config/index.js';
import type { McpEnvironmentConfig } from '../../config/index.js';
import { printInfo, formatJson } from '../../formatters/index.js';
import { listAuthServers, loadAuthState } from '../../auth/token-store.js';
import { isAccessTokenFresh } from '../../auth/oauth-client.js';

const SERVER_NAMES = ['customer', 'leads', 'projects', 'ncr'] as const;

interface ServerStatus {
  server: string;
  signedIn: boolean;
  accessTokenFresh: boolean | null;
  expiresAt: number | null;
  signedInAs: string | null;
  resource: string | null;
}

export default class AuthStatusCommand extends Command {
  static description = 'Show OAuth sign-in status for each server';

  static examples = ['$ bo auth status', '$ bo auth status --json'];

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON', default: false }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(AuthStatusCommand);
    const config = await loadConfig();
    const env = getActiveEnvironment(config);
    const envConfig = config.environments[env];

    if (!envConfig || !isMcpConfig(envConfig)) {
      printInfo('Current environment is not MCP — OAuth not applicable.');
      return;
    }

    const mcpConfig = envConfig as McpEnvironmentConfig;
    const method = resolveAuthMethod(mcpConfig);

    const servers = new Set<string>([...SERVER_NAMES, ...listAuthServers(env)]);

    const rows: ServerStatus[] = [];
    for (const name of servers) {
      const state = loadAuthState(env, name);
      const tokens = state?.tokens;
      rows.push({
        server: name,
        signedIn: !!tokens,
        accessTokenFresh: tokens ? isAccessTokenFresh(tokens) : null,
        expiresAt: tokens?.expiresAt ?? null,
        signedInAs:
          state?.signedInAs?.preferredUsername ??
          state?.signedInAs?.name ??
          state?.signedInAs?.sub ??
          null,
        resource: state?.discovery?.resourceCanonicalUri ?? null,
      });
    }

    if (flags.json) {
      this.log(formatJson({ environment: env, method, servers: rows }));
      return;
    }

    printInfo(`Environment: ${env}`);
    printInfo(`Auth method: ${method}`);
    if (method === 'bearer') {
      printInfo('(Using static bearer token — OAuth tokens below are not in use.)');
    }
    printInfo('');
    for (const r of rows) {
      const status = r.signedIn
        ? r.accessTokenFresh
          ? 'signed in (fresh)'
          : 'signed in (access token expired — will refresh)'
        : 'not signed in';
      const who = r.signedInAs ? ` — ${r.signedInAs}` : '';
      const expires = r.expiresAt
        ? ` — expires ${new Date(r.expiresAt * 1000).toISOString()}`
        : '';
      printInfo(`  ${r.server}: ${status}${who}${expires}`);
    }
  }
}

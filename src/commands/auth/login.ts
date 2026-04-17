import { Command, Flags } from '@oclif/core';
import { loadConfig, getActiveEnvironment, isMcpConfig } from '../../config/index.js';
import type { McpEnvironmentConfig } from '../../config/index.js';
import { printInfo, printSuccess, printError } from '../../formatters/index.js';
import { discoverServer } from '../../auth/discovery.js';
import { deviceCodeLogin } from '../../auth/device-flow.js';
import { decodeJwtPayload } from '../../auth/oauth-client.js';
import { loadAuthState, saveAuthState } from '../../auth/token-store.js';
import type { ServerAuthState } from '../../auth/types.js';

const SERVER_NAMES = ['customer', 'leads', 'projects', 'ncr'] as const;

export default class AuthLoginCommand extends Command {
  static description = 'Sign in to Business Online MCP servers via Entra device code flow';

  static examples = [
    '$ bo auth login',
    '$ bo auth login --server customer',
    '$ bo auth login --force',
  ];

  static flags = {
    server: Flags.string({
      description: 'Sign in to a single server only',
      options: [...SERVER_NAMES],
    }),
    force: Flags.boolean({
      description: 'Re-authorize even if tokens are still valid',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(AuthLoginCommand);
    const config = await loadConfig();
    const env = getActiveEnvironment(config);
    const envConfig = config.environments[env];

    if (!envConfig || !isMcpConfig(envConfig)) {
      printError('OAuth login requires an MCP environment. Current environment is not MCP.');
      this.exit(1);
    }

    const mcpConfig = envConfig as McpEnvironmentConfig;
    const targets = flags.server ? [flags.server] : [...SERVER_NAMES];
    const configuredTargets = targets.filter(
      (name) => mcpConfig.servers[name as keyof typeof mcpConfig.servers]?.url
    );

    if (configuredTargets.length === 0) {
      printError(`No configured servers to sign into (env: ${env}).`);
      this.exit(1);
    }

    printInfo(`Environment: ${env}`);
    printInfo(`Servers: ${configuredTargets.join(', ')}\n`);

    for (const serverName of configuredTargets) {
      await this.authorizeServer(env, serverName, mcpConfig, flags.force);
    }

    printSuccess('\nSign-in complete.');
  }

  private async authorizeServer(
    env: string,
    serverName: string,
    mcpConfig: McpEnvironmentConfig,
    force: boolean
  ): Promise<void> {
    const serverConfig = mcpConfig.servers[serverName as keyof typeof mcpConfig.servers];
    if (!serverConfig?.url) return;

    const existing = loadAuthState(env, serverName);
    if (!force && existing?.tokens?.refreshToken) {
      printInfo(`[${serverName}] Already signed in — skipping (use --force to re-authorize).`);
      return;
    }

    printInfo(`[${serverName}] Discovering...`);
    const discovery = await discoverServer(serverConfig.url);

    const tokens = await deviceCodeLogin({
      discovery,
      onUserCode: ({ userCode, verificationUri, message }) => {
        printInfo(`\n[${serverName}] To sign in:`);
        printInfo(`  Visit:  ${verificationUri}`);
        printInfo(`  Code:   ${userCode}`);
        if (message) printInfo(`  (${message})`);
        printInfo('  Waiting for sign-in...');
      },
    });

    const signedInAs = extractIdentity(tokens.accessToken);
    const state: ServerAuthState = { discovery, tokens, signedInAs };
    saveAuthState(env, serverName, state);

    const who = signedInAs?.preferredUsername || signedInAs?.name || signedInAs?.sub || 'unknown';
    printSuccess(`[${serverName}] Signed in as ${who}.`);
  }
}

function extractIdentity(accessToken: string): ServerAuthState['signedInAs'] {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return undefined;
  return {
    sub: typeof payload.sub === 'string' ? payload.sub : undefined,
    preferredUsername:
      typeof payload.preferred_username === 'string' ? payload.preferred_username : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
  };
}

import { BaseCommand } from '../base-command.js';
import { loadConfig, getActiveEnvironment, getEnvironmentMode, isRestConfig, DEFAULT_REST_BASE_URL } from '../config/index.js';
import type { McpEnvironmentConfig, RestEnvironmentConfig } from '../config/index.js';
import { connectionManager } from '../mcp/connection-manager.js';
import { HttpClient } from '../rest/http-client.js';
import { renderSplash, type ServerStatus, type SplashOptions } from '../formatters/splash.js';
import { printError, printInfo } from '../formatters/index.js';

export default class StatusCommand extends BaseCommand {
  static description = 'Show system status and connection info';

  static examples = ['$ bo status'];

  async run(): Promise<void> {
    const config = await loadConfig();
    const environment = getActiveEnvironment(config);
    const envConfig = config.environments[environment];
    const mode = getEnvironmentMode(envConfig);
    const version = `v${this.config.version}`;

    if (mode === 'rest' && isRestConfig(envConfig)) {
      await this.showRestStatus(version, environment, envConfig, config);
    } else {
      await this.showMcpStatus(version, environment, config, envConfig as McpEnvironmentConfig | undefined);
    }
  }

  private async showRestStatus(version: string, environment: string, envConfig: RestEnvironmentConfig, config: Awaited<ReturnType<typeof loadConfig>>): Promise<void> {
    const apiKey = process.env.BO_CLI_API_KEY || envConfig.apiKey;
    let connected = false;

    if (apiKey) {
      const httpClient = new HttpClient({
        baseUrl: envConfig.baseUrl ?? DEFAULT_REST_BASE_URL,
        tenantName: envConfig.tenantName,
        apiVersion: envConfig.apiVersion ?? 'v1',
        apiKey,
        maxRetries: 0,
      });

      try {
        await httpClient.get('/companytypes');
        connected = true;
      } catch {
        // Connection failed
      }
    }

    // Determine enum configuration status
    const tenantEnums = config.enums?.[envConfig.tenantName];
    const enumCategories = tenantEnums ? Object.keys(tenantEnums).length : 0;
    const enumSource: 'custom' | 'defaults' = tenantEnums ? 'custom' : 'defaults';

    const options: SplashOptions = {
      mode: 'rest',
      rest: {
        connected,
        baseUrl: envConfig.baseUrl ?? DEFAULT_REST_BASE_URL,
        tenantName: envConfig.tenantName,
        apiVersion: envConfig.apiVersion ?? 'v1',
        enumCategories,
        enumSource,
      },
    };

    console.log(renderSplash(version, environment, options));

    if (!apiKey) {
      printInfo('API key not configured. Run: bo config set --interactive');
    }
  }

  private async showMcpStatus(
    version: string,
    environment: string,
    config: typeof import('../config/index.js').DEFAULT_CONFIG,
    envConfig: McpEnvironmentConfig | undefined,
  ): Promise<void> {
    const serverNames = ['customer', 'leads', 'projects', 'ncr'] as const;
    const servers: ServerStatus[] = [];

    for (const name of serverNames) {
      const serverConfig = envConfig?.servers[name];
      servers.push({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        url: serverConfig?.url,
        connected: false,
        tools: 0,
      });
    }

    try {
      connectionManager.setConfig(config, environment);
      await connectionManager.connectAll({ listTools: true });

      for (const conn of connectionManager.getAllConnections()) {
        const serverIndex = servers.findIndex(
          (s) => s.name.toLowerCase() === conn.name.toLowerCase()
        );
        if (serverIndex >= 0) {
          servers[serverIndex].connected = conn.connected;
          servers[serverIndex].tools = conn.tools;
        }
      }
    } catch {
      printError('Failed to connect to some servers');
    } finally {
      try {
        await connectionManager.disconnectAll();
      } catch {
        // Ignore disconnect errors
      }
    }

    const options: SplashOptions = { mode: 'mcp', servers };
    console.log(renderSplash(version, environment, options));

    if (!envConfig?.token) {
      printInfo('Configuration not found. Run: bo config set');
    }
  }
}

import { Command } from '@oclif/core';
import { loadConfig, getActiveEnvironment, getEnvironmentMode, isRestConfig } from '../../config/index.js';
import type { RestEnvironmentConfig } from '../../config/index.js';
import { connectionManager } from '../../mcp/connection-manager.js';
import { HttpClient } from '../../rest/http-client.js';
import { printSuccess, printError, printInfo } from '../../formatters/index.js';

export default class ConfigTestCommand extends Command {
  static description = 'Test connection to all configured servers';

  static examples = ['$ bo config test'];

  async run(): Promise<void> {
    const config = await loadConfig();
    const environment = getActiveEnvironment(config);
    const envConfig = config.environments[environment];
    const mode = getEnvironmentMode(envConfig);

    printInfo(`Testing connections to ${environment} environment (${mode === 'rest' ? 'REST API' : 'MCP'})...`);
    console.log('');

    if (mode === 'rest' && isRestConfig(envConfig)) {
      await this.testRestConnection(envConfig);
    } else {
      await this.testMcpConnections(config, environment);
    }
  }

  private async testRestConnection(envConfig: RestEnvironmentConfig): Promise<void> {
    const apiKey = process.env.BO_CLI_API_KEY || envConfig.apiKey;
    if (!apiKey) {
      printError('REST API: No API key configured');
      printError('Run "bo config set --interactive" to set your API key');
      return;
    }

    const httpClient = new HttpClient({
      baseUrl: envConfig.baseUrl,
      tenantName: envConfig.tenantName,
      apiVersion: envConfig.apiVersion ?? 'v1',
      apiKey,
      maxRetries: 0,
    });

    try {
      const response = await httpClient.get('/companytypes');
      const typeCount = Array.isArray(response.data) ? response.data.length : 0;
      printSuccess(`REST API: Connected (${typeCount} company types found)`);
      printInfo(`  Base URL: ${envConfig.baseUrl}`);
      printInfo(`  Tenant: ${envConfig.tenantName}`);
      printInfo(`  API version: ${envConfig.apiVersion || 'v1'}`);
    } catch (error) {
      printError(`REST API: Connection failed`);
      if (error instanceof Error) {
        printError(`  ${error.message}`);
      }
    }
  }

  private async testMcpConnections(config: typeof import('../../config/index.js').DEFAULT_CONFIG, environment: string): Promise<void> {
    connectionManager.setConfig(config, environment);

    try {
      const connections = await connectionManager.connectAll();

      for (const conn of connections) {
        if (conn.connected) {
          printSuccess(`${conn.name}: Connected (${conn.tools} tools)`);
        } else {
          printError(`${conn.name}: Not connected`);
        }
      }
    } catch (error) {
      printError('Failed to test connections');
      if (error instanceof Error) {
        printError(error.message);
      }
    } finally {
      await connectionManager.disconnectAll();
    }
  }
}

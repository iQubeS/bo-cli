import { Command } from '@oclif/core';
import { loadConfig, getConfigPath, getActiveEnvironment, getEnvironmentMode, isRestConfig, DEFAULT_REST_BASE_URL } from '../../config/index.js';
import type { McpEnvironmentConfig, RestEnvironmentConfig } from '../../config/index.js';
import { printInfo } from '../../formatters/index.js';

export default class ConfigShowCommand extends Command {
  static description = 'Show current configuration';

  static examples = ['$ bo config show'];

  async run(): Promise<void> {
    const config = await loadConfig();
    const environment = getActiveEnvironment(config);
    const configPath = getConfigPath();

    printInfo(`Config file: ${configPath}`);
    printInfo(`Active environment: ${environment}`);
    printInfo(`Default environment: ${config.defaultEnvironment}`);

    const envConfig = config.environments[environment];
    if (!envConfig) {
      printInfo('\nNo configuration found for this environment.');
      return;
    }

    const mode = getEnvironmentMode(envConfig);
    printInfo(`\nMode: ${mode === 'rest' ? 'REST API' : 'MCP (Model Context Protocol)'}`);

    if (isRestConfig(envConfig)) {
      const rest = envConfig as RestEnvironmentConfig;
      printInfo(`Base URL: ${rest.baseUrl ?? DEFAULT_REST_BASE_URL}`);
      printInfo(`Tenant: ${rest.tenantName}`);
      printInfo(`API version: ${rest.apiVersion || 'v1'}`);
      printInfo(`API key: ${rest.apiKey ? '***configured***' : 'NOT configured'}`);

      // Show tenant enum status
      const tenantEnums = config.enums?.[rest.tenantName];
      if (tenantEnums) {
        const categoryCount = Object.keys(tenantEnums).length;
        printInfo(`\nCustom enums: ${categoryCount} categories configured`);
      } else {
        printInfo('\nCustom enums: Using defaults');
      }
    } else {
      const mcp = envConfig as McpEnvironmentConfig;
      printInfo('\nServers configured:');
      for (const [name, server] of Object.entries(mcp.servers)) {
        if (server?.url) {
          printInfo(`  - ${name}: ${server.url}`);
        }
      }
      printInfo(`\nToken: ${mcp.token ? '***configured***' : 'NOT configured'}`);
    }
  }
}

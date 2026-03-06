import { Command } from '@oclif/core';
import { loadConfig, getConfigPath, getActiveEnvironment } from '../../config/index.js';
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
    if (envConfig) {
      printInfo('\nServers configured:');
      for (const [name, server] of Object.entries(envConfig.servers)) {
        if (server?.url) {
          printInfo(`  - ${name}: ${server.url}`);
        }
      }
      printInfo(`\nToken: ${envConfig.token ? '***configured***' : 'NOT configured'}`);
    }
  }
}

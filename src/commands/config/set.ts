import { Command, Flags } from '@oclif/core';
import { input, password } from '@inquirer/prompts';
import { loadConfig, saveConfig, getConfigPath, type BoCliConfig } from '../../config/index.js';
import { printSuccess, printInfo } from '../../formatters/index.js';

export default class ConfigSetCommand extends Command {
  static description = 'Configure the CLI';

  static examples = [
    '$ bo config set',
    '$ bo config set --interactive',
  ];

  static flags = {
    interactive: Flags.boolean({ description: 'Use interactive mode' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ConfigSetCommand);
    let config = await loadConfig();

    if (flags.interactive) {
      config = await this.runInteractive(config);
    } else {
      this.error('Non-interactive mode not yet implemented. Use --interactive');
    }

    saveConfig(config);
    printSuccess('Configuration saved');
    printInfo(`Config location: ${getConfigPath()}`);
  }

  private async runInteractive(config: BoCliConfig): Promise<BoCliConfig> {
    const environment = await input({
      message: 'Environment name:',
      default: config.defaultEnvironment || 'production',
    });

    if (!config.environments[environment]) {
      config.environments[environment] = {
        servers: {},
        token: '',
      };
    }

    const token = await password({
      message: 'Bearer token:',
      mask: true,
    });

    config.environments[environment].token = token;
    config.defaultEnvironment = environment;

    // Ask for server URLs
    const servers = ['customer', 'leads', 'projects', 'ncr'] as const;

    for (const server of servers) {
      const url = await input({
        message: `${server} server URL:`,
        default: config.environments[environment].servers[server]?.url || '',
      });

      if (url) {
        config.environments[environment].servers[server] = { url };
      }
    }

    return config;
  }
}

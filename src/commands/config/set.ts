import { Command, Flags } from '@oclif/core';
import { input, password, select } from '@inquirer/prompts';
import { loadConfig, saveConfig, getConfigPath, DEFAULT_REST_BASE_URL, type BoCliConfig, type McpEnvironmentConfig, type RestEnvironmentConfig } from '../../config/index.js';
import { printSuccess, printInfo, printWarning } from '../../formatters/index.js';

export default class ConfigSetCommand extends Command {
  static description = 'Configure the CLI';

  static examples = [
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

    config.defaultEnvironment = environment;

    // Mode selection
    const mode = await select({
      message: 'Backend mode:',
      choices: [
        { name: 'MCP (Model Context Protocol)', value: 'mcp' },
        { name: 'REST API', value: 'rest' },
      ],
      default: config.environments[environment] && 'mode' in config.environments[environment] && config.environments[environment].mode === 'rest' ? 'rest' : 'mcp',
    }) as 'mcp' | 'rest';

    if (mode === 'rest') {
      config = await this.collectRestConfig(config, environment);
    } else {
      config = await this.collectMcpConfig(config, environment);
    }

    return config;
  }

  private async collectMcpConfig(config: BoCliConfig, environment: string): Promise<BoCliConfig> {
    const existing = config.environments[environment];
    const existingMcp = existing && !('mode' in existing && existing.mode === 'rest')
      ? existing as McpEnvironmentConfig
      : undefined;

    if (existing && 'mode' in existing && existing.mode === 'rest') {
      printWarning('Switching from REST to MCP mode. REST configuration will be replaced.');
    }

    const token = await password({
      message: 'Bearer token:',
      mask: true,
    });

    const mcpConfig: McpEnvironmentConfig = {
      servers: existingMcp?.servers ?? {},
      token,
    };

    // Ask for server URLs
    const servers = ['customer', 'leads', 'projects', 'ncr'] as const;

    for (const server of servers) {
      const url = await input({
        message: `${server} server URL:`,
        default: existingMcp?.servers[server]?.url || '',
      });

      if (url) {
        mcpConfig.servers[server] = { url };
      }
    }

    config.environments[environment] = mcpConfig;
    return config;
  }

  private async collectRestConfig(config: BoCliConfig, environment: string): Promise<BoCliConfig> {
    const existing = config.environments[environment];
    const existingRest = existing && 'mode' in existing && existing.mode === 'rest'
      ? existing as RestEnvironmentConfig
      : undefined;

    if (existing && !existingRest) {
      printWarning('Switching from MCP to REST mode. MCP configuration will be replaced.');
    }

    const baseUrl = await input({
      message: `API base URL (default: ${DEFAULT_REST_BASE_URL}):`,
      default: existingRest?.baseUrl ?? DEFAULT_REST_BASE_URL,
    });

    const tenantName = await input({
      message: 'Tenant name:',
      default: existingRest?.tenantName || '',
      validate: (v: string) => v.trim().length > 0 || 'Tenant name is required',
    });

    const apiVersion = await input({
      message: 'API version:',
      default: existingRest?.apiVersion || 'v1',
    });

    const apiKey = await password({
      message: 'API key:',
      mask: true,
    });

    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const restConfig: RestEnvironmentConfig = {
      mode: 'rest',
      ...(cleanBaseUrl !== DEFAULT_REST_BASE_URL ? { baseUrl: cleanBaseUrl } : {}),
      tenantName: tenantName.trim(),
      apiVersion,
      apiKey,
    };

    config.environments[environment] = restConfig;

    // Initialize default enums for this tenant if not already configured
    if (!config.enums?.[restConfig.tenantName]) {
      printInfo('Default enum values have been set for your tenant.');
      printInfo('Customize with: bo config enums --set --category <category> --field <field> --values "val1,val2"');
    }

    return config;
  }
}

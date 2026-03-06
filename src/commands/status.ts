import { BaseCommand } from '../base-command.js';
import { loadConfig, getActiveEnvironment } from '../config/index.js';
import { connectionManager } from '../mcp/connection-manager.js';
import { renderSplash, type ServerStatus } from '../formatters/splash.js';
import { printError, printInfo } from '../formatters/index.js';

export default class StatusCommand extends BaseCommand {
  static description = 'Show system status and connection info';

  static examples = ['$ bo status'];

  async run(): Promise<void> {
    const config = await loadConfig();
    const environment = getActiveEnvironment(config);

    const envConfig = config.environments[environment];
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
      await connectionManager.connectAll();

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

    const version = `v${this.config.version}`;
    console.log(renderSplash(version, environment, servers));

    if (!envConfig?.token) {
      printInfo(`Configuration not found. Run: bo config set`);
    }
  }
}

import { Command } from '@oclif/core';
import { loadConfig, getActiveEnvironment } from '../../config/index.js';
import { connectionManager } from '../../mcp/connection-manager.js';
import { printSuccess, printError, printInfo } from '../../formatters/index.js';

export default class ConfigTestCommand extends Command {
  static description = 'Test connection to all configured servers';

  static examples = ['$ bo config test'];

  async run(): Promise<void> {
    const config = await loadConfig();
    const environment = getActiveEnvironment(config);

    connectionManager.setConfig(config, environment);

    printInfo(`Testing connections to ${environment} environment...`);
    console.log('');

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

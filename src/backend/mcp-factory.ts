import { connectionManager } from '../mcp/connection-manager.js';
import type { BoCliConfig } from '../config/index.js';
import { McpBackendClient } from './mcp-backend.js';
import type { BackendClient, BackendFactory } from './types.js';

export class McpBackendFactory implements BackendFactory {
  readonly mode = 'mcp' as const;

  constructor(
    private config: BoCliConfig,
    private environment: string,
  ) {}

  async createClient(serverName: string): Promise<BackendClient> {
    connectionManager.setConfig(this.config, this.environment);
    await connectionManager.connectToServer(serverName);
    const mcpClient = connectionManager.getClient(serverName);
    if (!mcpClient) {
      throw new Error(`Failed to connect to ${serverName} server`);
    }
    return new McpBackendClient(mcpClient);
  }

  async createAllClients(): Promise<Map<string, BackendClient>> {
    connectionManager.setConfig(this.config, this.environment);
    await connectionManager.connectAll({ listTools: true });

    const result = new Map<string, BackendClient>();
    for (const conn of connectionManager.getAllConnections()) {
      if (conn.connected) {
        result.set(conn.name, new McpBackendClient(conn.client));
      }
    }
    return result;
  }

  /** Expose ConnectionManager for status/test commands that need raw connection info. */
  getConnectionManager() {
    return connectionManager;
  }
}

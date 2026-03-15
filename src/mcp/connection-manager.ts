import { McpClient, McpServerConfig } from './client.js';
import type { BoCliConfig, McpEnvironmentConfig } from '../config/index.js';
import { isMcpConfig } from '../config/index.js';

export interface ServerConnection {
  name: string;
  client: McpClient;
  connected: boolean;
  tools?: number;
}

export class ConnectionManager {
  private clients: Map<string, ServerConnection> = new Map();
  private config: BoCliConfig | null = null;
  private environment: string = 'production';

  setConfig(config: BoCliConfig, environment?: string): void {
    this.config = config;
    this.environment = environment || config.defaultEnvironment || 'production';
  }

  async connectToServer(serverName: string, options?: { listTools?: boolean }): Promise<ServerConnection> {
    if (!this.config) {
      throw new Error('Configuration not set');
    }

    const envConfig = this.config.environments[this.environment];
    if (!envConfig) {
      throw new Error(`Environment "${this.environment}" not found in config`);
    }

    if (!isMcpConfig(envConfig)) {
      throw new Error('MCP connection manager cannot be used in REST API mode');
    }

    // Check for existing connection
    const existing = this.clients.get(serverName);
    if (existing?.connected) {
      return existing;
    }

    const mcpConfig = envConfig as McpEnvironmentConfig;
    const serverConfig = mcpConfig.servers[serverName as keyof typeof mcpConfig.servers];
    if (!serverConfig || !serverConfig.url) {
      throw new Error(`Server "${serverName}" not configured`);
    }

    const client = new McpClient();

    try {
      await client.connect({
        serverUrl: serverConfig.url,
        token: mcpConfig.token,
      });

      let toolCount: number | undefined;
      if (options?.listTools) {
        const tools = await client.listTools();
        toolCount = tools.length;
      }

      const connection: ServerConnection = {
        name: serverName,
        client,
        connected: true,
        tools: toolCount,
      };

      this.clients.set(serverName, connection);
      return connection;
    } catch (error) {
      const connection: ServerConnection = {
        name: serverName,
        client,
        connected: false,
      };

      this.clients.set(serverName, connection);
      throw error;
    }
  }

  getClient(serverName: string): McpClient | null {
    const connection = this.clients.get(serverName);
    return connection?.client || null;
  }

  getConnection(serverName: string): ServerConnection | undefined {
    return this.clients.get(serverName);
  }

  getAllConnections(): ServerConnection[] {
    return Array.from(this.clients.values());
  }

  async connectAll(options?: { listTools?: boolean }): Promise<ServerConnection[]> {
    if (!this.config) {
      throw new Error('Configuration not set');
    }

    const serverNames = ['customer', 'leads', 'projects', 'ncr'] as const;
    const results = await Promise.allSettled(
      serverNames.map((name) => this.connectToServer(name, options))
    );

    return results.map((result, i) => {
      if (result.status === 'fulfilled') return result.value;
      return { name: serverNames[i], client: new McpClient(), connected: false };
    });
  }

  async disconnectAll(): Promise<void> {
    for (const connection of this.clients.values()) {
      await connection.client.disconnect();
    }
    this.clients.clear();
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager();

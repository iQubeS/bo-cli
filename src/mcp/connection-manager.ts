import { McpClient, McpServerConfig } from './client.js';
import type { BoCliConfig } from '../config/index.js';

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

  async connectToServer(serverName: string): Promise<ServerConnection> {
    if (!this.config) {
      throw new Error('Configuration not set');
    }

    const envConfig = this.config.environments[this.environment];
    if (!envConfig) {
      throw new Error(`Environment "${this.environment}" not found in config`);
    }

    const serverConfig = envConfig.servers[serverName as keyof typeof envConfig.servers];
    if (!serverConfig || !serverConfig.url) {
      throw new Error(`Server "${serverName}" not configured`);
    }

    const client = new McpClient();

    try {
      await client.connect({
        serverUrl: serverConfig.url,
        token: envConfig.token,
      });

      const tools = await client.listTools();

      const connection: ServerConnection = {
        name: serverName,
        client,
        connected: true,
        tools: tools.length,
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

  async connectAll(): Promise<ServerConnection[]> {
    if (!this.config) {
      throw new Error('Configuration not set');
    }

    const serverNames = ['customer', 'leads', 'projects', 'ncr'] as const;
    const connections: ServerConnection[] = [];

    for (const name of serverNames) {
      try {
        const connection = await this.connectToServer(name);
        connections.push(connection);
      } catch {
        // Continue connecting to other servers
        connections.push({
          name,
          client: new McpClient(),
          connected: false,
        });
      }
    }

    return connections;
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

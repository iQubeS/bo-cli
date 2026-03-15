import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createRequire } from 'module';
import type { DebugLogger } from '../backend/types.js';

export type { DebugLogger } from '../backend/types.js';

const require = createRequire(import.meta.url);
const { version: cliVersion } = require('../../package.json');

export interface McpServerConfig {
  url: string;
  token?: string;
}

export interface McpClientOptions {
  serverUrl: string;
  token?: string;
}

export class McpClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private connected = false;
  public debugLog: DebugLogger | null = null;

  async connect(options: McpClientOptions): Promise<void> {
    const headers: Record<string, string> = {};

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    this.transport = new StreamableHTTPClientTransport(new URL(options.serverUrl), {
      requestInit: {
        headers,
      },
    });

    this.client = new Client(
      {
        name: 'bo-cli',
        version: cliVersion,
      },
      {
        capabilities: {},
      }
    );

    await this.client.connect(this.transport);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.transport = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async listTools(): Promise<{ name: string; description: string }[]> {
    if (!this.client || !this.connected) {
      throw new Error('Client not connected');
    }

    const response = await this.client.listTools();
    return (response.tools || []).map((tool) => ({
      name: tool.name,
      description: tool.description || '',
    }));
  }

  async callTool(toolName: string, args?: Record<string, unknown>): Promise<unknown> {
    if (!this.client || !this.connected) {
      throw new Error('Client not connected');
    }

    this.debugLog?.('callTool', { tool: toolName, args: args || {} });
    const result = await this.client.callTool({
      name: toolName,
      arguments: args || {},
    });
    this.debugLog?.('response', result);
    return result;
  }

  async readResource(uri: string): Promise<unknown> {
    if (!this.client || !this.connected) {
      throw new Error('Client not connected');
    }

    return await this.client.readResource({ uri });
  }
}

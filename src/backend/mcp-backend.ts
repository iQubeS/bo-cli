import type { McpClient } from '../mcp/client.js';
import type { BackendClient, DebugLogger } from './types.js';

export class McpBackendClient implements BackendClient {
  constructor(private client: McpClient) {}

  async callTool(operation: string, params?: Record<string, unknown>): Promise<unknown> {
    return this.client.callTool(operation, params);
  }

  async healthCheck(): Promise<{ connected: boolean; info?: string }> {
    try {
      const tools = await this.client.listTools();
      return { connected: true, info: `${tools.length} tools` };
    } catch {
      return { connected: false };
    }
  }

  async dispose(): Promise<void> {
    await this.client.disconnect();
  }

  setDebugLog(logger: DebugLogger): void {
    this.client.debugLog = logger;
  }

  /** Expose underlying McpClient for enum loading via readResource. */
  getMcpClient(): McpClient {
    return this.client;
  }
}

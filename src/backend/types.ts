export type DebugLogger = (label: string, data: unknown) => void;

export interface BackendClient {
  /** Execute an operation (MCP tool name). Returns unwrapped data. */
  callTool(operation: string, params?: Record<string, unknown>): Promise<unknown>;

  /** Check if backend is reachable. */
  healthCheck(): Promise<{ connected: boolean; info?: string }>;

  /** Clean up resources. */
  dispose(): Promise<void>;

  /** Optional: set debug logger for request/response tracing. */
  setDebugLog?(logger: DebugLogger): void;
}

export interface BackendFactory {
  /** Create a client for the given logical server name (customer, leads, projects, ncr). */
  createClient(serverName: string): Promise<BackendClient>;

  /** Create clients for all configured servers. */
  createAllClients(): Promise<Map<string, BackendClient>>;

  /** The backend mode identifier. */
  readonly mode: 'mcp' | 'rest';
}

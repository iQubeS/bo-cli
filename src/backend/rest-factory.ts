import { DEFAULT_REST_BASE_URL, type RestEnvironmentConfig } from '../config/index.js';
import { RestBackendClient } from '../rest/rest-client.js';
import type { BackendClient, BackendFactory } from './types.js';

export class RestBackendFactory implements BackendFactory {
  readonly mode = 'rest' as const;

  constructor(private config: RestEnvironmentConfig) {}

  async createClient(_serverName: string): Promise<BackendClient> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new Error('API key is not configured. Run: bo config set --interactive');
    }
    return new RestBackendClient({
      baseUrl: this.config.baseUrl ?? DEFAULT_REST_BASE_URL,
      tenantName: this.config.tenantName,
      apiVersion: this.config.apiVersion ?? 'v1',
      apiKey,
    });
  }

  async createAllClients(): Promise<Map<string, BackendClient>> {
    // All "servers" share the same REST client since it's a single API
    const client = await this.createClient('all');
    const map = new Map<string, BackendClient>();
    for (const name of ['customer', 'leads', 'projects', 'ncr']) {
      map.set(name, client);
    }
    return map;
  }
}

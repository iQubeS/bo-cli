import type { BackendClient, DebugLogger } from '../backend/types.js';
import { HttpClient, type HttpClientOptions, type HttpResponse, type PaginationLinks } from './http-client.js';
import { OperationRouter, type RouteDefinition } from './operation-router.js';
import { ValidationError } from '../errors.js';

export class RestBackendClient implements BackendClient {
  private httpClient: HttpClient;
  private router: OperationRouter;

  constructor(options: HttpClientOptions) {
    this.httpClient = new HttpClient(options);
    this.router = new OperationRouter();
  }

  async callTool(operation: string, params?: Record<string, unknown>): Promise<unknown> {
    const route = this.router.resolve(operation, params);
    if (!route) {
      throw new ValidationError(`Unknown operation: ${operation}. This operation may not be supported in REST API mode.`);
    }

    const { pathParams, queryParams, body } = this.router.splitParams(route, params ?? {});
    const path = this.router.buildPath(route, pathParams);

    let response: HttpResponse;

    switch (route.method) {
      case 'GET':
        response = await this.httpClient.get(path, queryParams);
        break;
      case 'POST':
        response = await this.httpClient.post(path, Object.keys(body).length > 0 ? body : undefined);
        break;
      case 'PUT':
        response = await this.httpClient.put(path, Object.keys(body).length > 0 ? body : undefined);
        break;
      default:
        throw new ValidationError(`Unsupported HTTP method: ${route.method}`);
    }

    return this.normalizeResponse(response, route);
  }

  async healthCheck(): Promise<{ connected: boolean; info?: string }> {
    try {
      await this.httpClient.get('/companytypes');
      return { connected: true, info: 'REST API' };
    } catch {
      return { connected: false };
    }
  }

  async dispose(): Promise<void> {
    // HTTP client is stateless — nothing to clean up
  }

  setDebugLog(logger: DebugLogger): void {
    this.httpClient.debugLog = logger;
  }

  /**
   * Normalize REST responses to match the shape that formatOutput expects.
   * - List endpoints with X-Total-Count → { data: [...], totalCount: N, pagination?: {...} }
   * - Everything else → raw data as-is
   */
  private normalizeResponse(response: HttpResponse, route: RouteDefinition): unknown {
    if (
      route.method === 'GET' &&
      Array.isArray(response.data) &&
      response.totalCount !== undefined
    ) {
      const result: { data: unknown[]; totalCount: number; pagination?: PaginationLinks } = {
        data: response.data as unknown[],
        totalCount: response.totalCount,
      };
      if (response.pagination) {
        result.pagination = response.pagination;
      }
      return result;
    }

    return response.data;
  }
}

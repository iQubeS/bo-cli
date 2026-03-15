import type { DebugLogger } from '../backend/types.js';

export interface HttpClientOptions {
  baseUrl: string;
  tenantName: string;
  apiVersion: string;
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
  retryBaseDelay?: number;
}

export interface PaginationLinks {
  first?: string;
  last?: string;
  next?: string;
  prev?: string;
}

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
  totalCount?: number;
  pagination?: PaginationLinks;
}

export class RestApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: string[],
    public readonly retryAfterSeconds?: number,
    public readonly replenishTime?: string,
  ) {
    super(message);
    this.name = 'RestApiError';
  }
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelay: number;
  private readonly headers: Record<string, string>;
  public debugLog: DebugLogger | null = null;

  constructor(options: HttpClientOptions) {
    // Build base URL: {baseUrl}/{tenantName}/{apiVersion}
    const base = options.baseUrl.replace(/\/+$/, '');
    this.baseUrl = `${base}/${options.tenantName}/${options.apiVersion}`;
    if (!this.baseUrl.startsWith('https://') && !this.baseUrl.startsWith('http://localhost')) {
      console.warn('[bo-cli] Warning: API base URL does not use HTTPS. This is insecure in production.');
    }
    this.timeout = options.timeout ?? 30_000;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryBaseDelay = options.retryBaseDelay ?? 1000;
    this.headers = {
      'apikey': options.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  async get<T = unknown>(path: string, queryParams?: Record<string, string>): Promise<HttpResponse<T>> {
    return this.request<T>('GET', path, { query: queryParams });
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>('POST', path, { body });
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', path, { body });
  }

  async request<T = unknown>(
    method: string,
    path: string,
    options?: { query?: Record<string, string>; body?: unknown },
  ): Promise<HttpResponse<T>> {
    let url = `${this.baseUrl}${path}`;

    if (options?.query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      }
      const qs = params.toString();
      if (qs) {
        url += `?${qs}`;
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.executeRequest<T>(method, url, options?.body);

        this.debugLog?.('response', {
          status: response.status,
          totalCount: response.totalCount,
          dataType: Array.isArray(response.data) ? `array[${(response.data as unknown[]).length}]` : typeof response.data,
        });

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof RestApiError) {
          // Rate limited — retry after delay
          if (error.statusCode === 429 && attempt < this.maxRetries) {
            const rawWaitMs = (error.retryAfterSeconds ?? Math.pow(2, attempt)) * 1000;
            const waitMs = Math.min(rawWaitMs, 30_000);
            this.debugLog?.('rate-limited', { attempt: attempt + 1, waitMs });
            await this.sleep(waitMs);
            continue;
          }

          // Server errors — retry with backoff
          if (error.statusCode >= 500 && attempt < this.maxRetries) {
            const waitMs = this.retryBaseDelay * Math.pow(2, attempt);
            this.debugLog?.('retry', { attempt: attempt + 1, waitMs, status: error.statusCode });
            await this.sleep(waitMs);
            continue;
          }

          // All other errors — do not retry
          throw error;
        }

        // Network errors — retry with backoff
        if (attempt < this.maxRetries) {
          const waitMs = this.retryBaseDelay * Math.pow(2, attempt);
          this.debugLog?.('retry', { attempt: attempt + 1, waitMs, error: lastError.message });
          await this.sleep(waitMs);
          continue;
        }
      }
    }

    throw lastError ?? new Error('Request failed after retries');
  }

  private async executeRequest<T>(method: string, url: string, body?: unknown): Promise<HttpResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    this.debugLog?.('request', { method, url, body: body ?? undefined });

    try {
      const init: RequestInit = {
        method,
        headers: { ...this.headers },
        signal: controller.signal,
      };

      if (body !== undefined && (method === 'POST' || method === 'PUT')) {
        init.body = JSON.stringify(body);
      }

      const response = await fetch(url, init);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });

      const totalCountHeader = responseHeaders['x-total-count'];
      const totalCount = totalCountHeader ? parseInt(totalCountHeader, 10) : undefined;

      let data: T;
      const contentType = responseHeaders['content-type'] || '';
      if (contentType.includes('application/json')) {
        data = await response.json() as T;
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text) as T;
        } catch {
          data = text as unknown as T;
        }
      }

      const pagination = this.parseLinkHeader(responseHeaders['link']);

      return {
        status: response.status,
        data,
        headers: responseHeaders,
        totalCount: Number.isNaN(totalCount) ? undefined : totalCount,
        pagination,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse RFC 8288 Link header into pagination links.
   * Example: `<https://...?offset=0&limit=25>; rel="first", <https://...?offset=50&limit=25>; rel="next"`
   */
  private parseLinkHeader(linkHeader: string | undefined): PaginationLinks | undefined {
    if (!linkHeader) return undefined;

    const links: PaginationLinks = {};
    const parts = linkHeader.split(',');

    for (const part of parts) {
      const urlMatch = part.match(/<([^>]+)>/);
      const relMatch = part.match(/rel="([^"]+)"/);

      if (urlMatch && relMatch) {
        const rel = relMatch[1] as keyof PaginationLinks;
        if (rel === 'first' || rel === 'last' || rel === 'next' || rel === 'prev') {
          links[rel] = urlMatch[1];
        }
      }
    }

    return Object.keys(links).length > 0 ? links : undefined;
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let message = `HTTP ${response.status}: ${response.statusText}`;
    let details: string[] | undefined;
    let retryAfterSeconds: number | undefined;
    let replenishTime: string | undefined;

    try {
      const body = await response.json() as Record<string, unknown>;

      if (typeof body.message === 'string') {
        message = body.message;
      }
      if (Array.isArray(body.details)) {
        details = body.details.map(String);
      }

      // Parse rate limit info from 429
      if (response.status === 429) {
        const retryHeader = response.headers.get('retry-after');
        if (retryHeader) {
          retryAfterSeconds = parseInt(retryHeader, 10);
        }
        // Parse from message: "Try again in X seconds."
        const match = message.match(/try again in (\d+) seconds/i);
        if (match) {
          retryAfterSeconds = parseInt(match[1], 10);
        }
      }

      // Parse quota info from 403
      if (response.status === 403 && message.toLowerCase().includes('quota')) {
        const match = message.match(/replenished in ([\d:]+)/i);
        if (match) {
          replenishTime = match[1];
        }
      }
    } catch {
      // Response body not JSON — use status text
    }

    throw new RestApiError(message, response.status, details, retryAfterSeconds, replenishTime);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

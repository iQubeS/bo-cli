import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient, RestApiError } from '../src/rest/http-client.js';
import { RestBackendClient } from '../src/rest/rest-client.js';
import { ValidationError } from '../src/errors.js';

// ── HttpClient tests ────────────────────────────────────────────────

describe('HttpClient', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createClient(overrides?: Partial<ConstructorParameters<typeof HttpClient>[0]>) {
    return new HttpClient({
      baseUrl: 'https://api.example.com',
      tenantName: 'testco',
      apiVersion: 'v1',
      apiKey: 'test-key',
      maxRetries: 0,
      ...overrides,
    });
  }

  function mockResponse(data: unknown, options?: { status?: number; headers?: Record<string, string> }) {
    const status = options?.status ?? 200;
    const headers = new Map(Object.entries(options?.headers ?? {}));
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: {
        get: (key: string) => headers.get(key.toLowerCase()) ?? null,
        forEach: (cb: (value: string, key: string) => void) => headers.forEach(cb),
      },
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    };
  }

  it('constructs correct base URL', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockResponse([]));

    await client.get('/companies');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/testco/v1/companies',
      expect.any(Object),
    );
  });

  it('strips trailing slashes from base URL', async () => {
    const client = createClient({ baseUrl: 'https://api.example.com/' });
    mockFetch.mockResolvedValue(mockResponse([]));

    await client.get('/companies');

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe('https://api.example.com/testco/v1/companies');
  });

  it('sends apikey header', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockResponse([]));

    await client.get('/test');

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['apikey']).toBe('test-key');
  });

  it('appends query params', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockResponse([]));

    await client.get('/companies', { type: 'Customer', search: 'Acme' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('type=Customer');
    expect(url).toContain('search=Acme');
  });

  it('skips empty query params', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockResponse([]));

    await client.get('/companies', { type: '', search: 'Acme' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).not.toContain('type=');
    expect(url).toContain('search=Acme');
  });

  it('sends JSON body on POST', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockResponse({ id: '1' }));

    await client.post('/companies', { companyName: 'Acme' });

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ companyName: 'Acme' }));
  });

  it('sends JSON body on PUT', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockResponse({ id: '1' }));

    await client.put('/companies/123', { companyName: 'Updated' });

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(JSON.stringify({ companyName: 'Updated' }));
  });

  it('parses X-Total-Count header', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockResponse([{ id: '1' }], {
      headers: { 'x-total-count': '42', 'content-type': 'application/json' },
    }));

    const response = await client.get('/companies');

    expect(response.totalCount).toBe(42);
  });

  it('parses Link header with all rels', async () => {
    const client = createClient();
    const linkHeader = '<https://api.example.com/testco/v1/companies?offset=0&limit=25>; rel="first", <https://api.example.com/testco/v1/companies?offset=25&limit=25>; rel="next", <https://api.example.com/testco/v1/companies?offset=75&limit=25>; rel="last"';
    mockFetch.mockResolvedValue(mockResponse([{ id: '1' }], {
      headers: { 'x-total-count': '100', 'content-type': 'application/json', 'link': linkHeader },
    }));

    const response = await client.get('/companies');

    expect(response.pagination).toBeDefined();
    expect(response.pagination!.first).toContain('offset=0');
    expect(response.pagination!.next).toContain('offset=25');
    expect(response.pagination!.last).toContain('offset=75');
    expect(response.pagination!.prev).toBeUndefined();
  });

  it('parses Link header with prev', async () => {
    const client = createClient();
    const linkHeader = '<https://api.example.com/testco/v1/companies?offset=0&limit=25>; rel="prev", <https://api.example.com/testco/v1/companies?offset=50&limit=25>; rel="next"';
    mockFetch.mockResolvedValue(mockResponse([{ id: '1' }], {
      headers: { 'content-type': 'application/json', 'link': linkHeader },
    }));

    const response = await client.get('/companies');

    expect(response.pagination).toBeDefined();
    expect(response.pagination!.prev).toContain('offset=0');
    expect(response.pagination!.next).toContain('offset=50');
  });

  it('returns undefined pagination when no Link header', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockResponse([{ id: '1' }], {
      headers: { 'content-type': 'application/json' },
    }));

    const response = await client.get('/companies');

    expect(response.pagination).toBeUndefined();
  });

  it('throws RestApiError on 401', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: {
        get: () => null,
        forEach: () => {},
      },
      json: () => Promise.resolve({ message: 'Invalid API key' }),
    });

    await expect(client.get('/test')).rejects.toThrow(RestApiError);
    await expect(client.get('/test')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws RestApiError on 404', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: {
        get: () => null,
        forEach: () => {},
      },
      json: () => Promise.resolve({ message: 'Company not found' }),
    });

    await expect(client.get('/companies/999')).rejects.toThrow(RestApiError);
  });

  it('parses rate limit retry-after from message', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: {
        get: (key: string) => key === 'retry-after' ? '30' : null,
        forEach: () => {},
      },
      json: () => Promise.resolve({ message: 'Rate limit exceeded. Try again in 30 seconds.' }),
    });

    await expect(client.get('/test')).rejects.toThrow(RestApiError);
    await expect(client.get('/test')).rejects.toMatchObject({ statusCode: 429, retryAfterSeconds: 30 });
  });

  it('parses quota exceeded replenish time', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: {
        get: () => null,
        forEach: () => {},
      },
      json: () => Promise.resolve({ message: 'Out of call quota. Quota will be replenished in 01:30:00.' }),
    });

    await expect(client.get('/test')).rejects.toThrow(RestApiError);
    await expect(client.get('/test')).rejects.toMatchObject({ statusCode: 403, replenishTime: '01:30:00' });
  });
});

// ── RestBackendClient tests ─────────────────────────────────────────

describe('RestBackendClient', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockResponse(data: unknown, options?: { status?: number; headers?: Record<string, string> }) {
    const status = options?.status ?? 200;
    const headers = new Map(Object.entries(options?.headers ?? {}));
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: 'OK',
      headers: {
        get: (key: string) => headers.get(key.toLowerCase()) ?? null,
        forEach: (cb: (value: string, key: string) => void) => headers.forEach(cb),
      },
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    };
  }

  function createClient() {
    return new RestBackendClient({
      baseUrl: 'https://api.example.com',
      tenantName: 'testco',
      apiVersion: 'v1',
      apiKey: 'test-key',
      maxRetries: 0,
    });
  }

  it('routes retrieve_companies to GET /companies', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockResponse([{ id: '1' }], {
      headers: { 'x-total-count': '1', 'content-type': 'application/json' },
    }));

    const result = await client.callTool('retrieve_companies', { search: 'Acme' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/companies');
    expect(url).toContain('search=Acme');
    expect(result).toEqual({ data: [{ id: '1' }], totalCount: 1 });
  });

  it('routes retrieve_company_by_id with path param', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockResponse({ id: '123', companyName: 'Acme' }, {
      headers: { 'content-type': 'application/json' },
    }));

    const result = await client.callTool('retrieve_company_by_id', { companyId: '123' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/companies/123');
    expect(result).toEqual({ id: '123', companyName: 'Acme' });
  });

  it('routes create_company to POST /companies', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockResponse({ id: 'new-1' }, {
      headers: { 'content-type': 'application/json' },
    }));

    await client.callTool('create_company', { companyName: 'Acme', city: 'Oslo' });

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Acme', city: 'Oslo' });
  });

  it('maps MCP param names to REST names', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockResponse([], {
      headers: { 'content-type': 'application/json' },
    }));

    await client.callTool('retrieve_companies', { companyTypeName: 'Customer' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('type=Customer');
    expect(url).not.toContain('companyTypeName');
  });

  it('routes timeline events with nested path', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockResponse([], {
      headers: { 'x-total-count': '0', 'content-type': 'application/json' },
    }));

    await client.callTool('retrieve_company_timeline_events', { companyId: 'c-1' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/companies/c-1/timeline');
  });

  it('throws ValidationError for unknown operations', async () => {
    const client = createClient();
    await expect(client.callTool('nonexistent_tool')).rejects.toThrow(ValidationError);
  });

  it('healthCheck returns connected on success', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockResponse([{ id: '1', name: 'Customer' }], {
      headers: { 'content-type': 'application/json' },
    }));

    const result = await client.healthCheck();
    expect(result.connected).toBe(true);
  });

  it('healthCheck returns not connected on failure', async () => {
    const client = createClient();
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await client.healthCheck();
    expect(result.connected).toBe(false);
  });

  it('normalizes list response with totalCount', async () => {
    const client = createClient();
    const data = [{ id: '1' }, { id: '2' }];
    mockFetch.mockResolvedValue(mockResponse(data, {
      headers: { 'x-total-count': '50', 'content-type': 'application/json' },
    }));

    const result = await client.callTool('retrieve_companies', {});
    expect(result).toEqual({ data, totalCount: 50 });
  });

  it('returns single object as-is', async () => {
    const client = createClient();
    const data = { id: '1', companyName: 'Acme' };
    mockFetch.mockResolvedValue(mockResponse(data, {
      headers: { 'content-type': 'application/json' },
    }));

    const result = await client.callTool('retrieve_company_by_id', { companyId: '1' });
    expect(result).toEqual(data);
  });

  it('includes pagination links in normalized list response', async () => {
    const client = createClient();
    const data = [{ id: '1' }];
    const linkHeader = '<https://api.example.com/testco/v1/companies?offset=0&limit=25>; rel="first", <https://api.example.com/testco/v1/companies?offset=25&limit=25>; rel="next"';
    mockFetch.mockResolvedValue(mockResponse(data, {
      headers: { 'x-total-count': '50', 'content-type': 'application/json', 'link': linkHeader },
    }));

    const result = await client.callTool('retrieve_companies', {}) as { data: unknown[]; totalCount: number; pagination?: Record<string, string> };
    expect(result.totalCount).toBe(50);
    expect(result.pagination).toBeDefined();
    expect(result.pagination!.next).toContain('offset=25');
    expect(result.pagination!.first).toContain('offset=0');
  });

  it('omits pagination when no Link header', async () => {
    const client = createClient();
    const data = [{ id: '1' }];
    mockFetch.mockResolvedValue(mockResponse(data, {
      headers: { 'x-total-count': '1', 'content-type': 'application/json' },
    }));

    const result = await client.callTool('retrieve_companies', {}) as { data: unknown[]; totalCount: number; pagination?: unknown };
    expect(result.pagination).toBeUndefined();
  });
});

// ── Error classification for RestApiError ───────────────────────────

describe('RestApiError classification', () => {
  it('classifies 401 as AuthError', async () => {
    const { classifyError, AuthError } = await import('../src/errors.js');
    const err = new RestApiError('Invalid API key', 401);
    const classified = classifyError(err);
    expect(classified).toBeInstanceOf(AuthError);
  });

  it('classifies 429 as RateLimitError', async () => {
    const { classifyError, RateLimitError } = await import('../src/errors.js');
    const err = new RestApiError('Rate limit exceeded', 429, undefined, 30);
    const classified = classifyError(err);
    expect(classified).toBeInstanceOf(RateLimitError);
    expect((classified as InstanceType<typeof RateLimitError>).retryAfterSeconds).toBe(30);
  });

  it('classifies 403 with quota as QuotaExceededError', async () => {
    const { classifyError, QuotaExceededError } = await import('../src/errors.js');
    const err = new RestApiError('Out of call quota', 403, undefined, undefined, '01:30:00');
    const classified = classifyError(err);
    expect(classified).toBeInstanceOf(QuotaExceededError);
  });

  it('classifies 404 as ServerError', async () => {
    const { classifyError, ServerError } = await import('../src/errors.js');
    const err = new RestApiError('Company not found', 404);
    const classified = classifyError(err);
    expect(classified).toBeInstanceOf(ServerError);
  });

  it('classifies 500 as ServerError', async () => {
    const { classifyError, ServerError } = await import('../src/errors.js');
    const err = new RestApiError('Internal server error', 500);
    const classified = classifyError(err);
    expect(classified).toBeInstanceOf(ServerError);
  });
});

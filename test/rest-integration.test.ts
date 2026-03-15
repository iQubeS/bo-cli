import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RestBackendClient } from '../src/rest/rest-client.js';

describe('REST integration', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createClient() {
    return new RestBackendClient({
      baseUrl: 'https://api.example.com',
      tenantName: 'testco',
      apiVersion: 'v1',
      apiKey: 'test-key',
      maxRetries: 0,
    });
  }

  function mockJsonResponse(data: unknown, options?: { status?: number; headers?: Record<string, string> }) {
    const status = options?.status ?? 200;
    const allHeaders = { 'content-type': 'application/json', ...options?.headers };
    const headers = new Map(Object.entries(allHeaders));
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

  // ── Create operations translate field names correctly ──────────

  it('create_company maps companyName to name in request body', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse({ id: 'new-1' }));

    await client.callTool('create_company', {
      companyName: 'Acme',
      companyPhone: '12345678',
      email: 'info@acme.com',
    });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.name).toBe('Acme');
    expect(body.companyPhone).toBe('12345678');
    expect(body.companyName).toBeUndefined();
  });

  it('create_contact maps contactName/contactLegalBasis/contactStatus', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse({ id: 'new-1' }));

    await client.callTool('create_contact', {
      contactName: 'John',
      contactLegalBasis: 'Consent',
      contactStatus: 'Active',
      email: 'john@test.com',
    });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.name).toBe('John');
    expect(body.legalBasis).toBe('Consent');
    expect(body.status).toBe('Active');
    expect(body.email).toBe('john@test.com');
  });

  it('create_lead maps leadName/leadsStatus/leadsProbabilityForSale/leadsLcmStatus', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse({ id: 'new-1' }));

    await client.callTool('create_lead', {
      leadName: 'Big Deal',
      leadsStatus: 'Active',
      leadsProbabilityForSale: '60 %',
      leadsLcmStatus: 'Evaluation',
      companyId: 'c-1',
    });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.name).toBe('Big Deal');
    expect(body.status).toBe('Active');
    expect(body.probabilityForSale).toBe('60 %');
    expect(body.lcmStatus).toBe('Evaluation');
    expect(body.companyId).toBe('c-1');
  });

  it('create_project maps projectName/projectActivity', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse({ id: 'new-1' }));

    await client.callTool('create_project', {
      projectName: 'Project X',
      projectActivity: 'Started',
      companyId: 'c-1',
      departmentId: 'd-1',
    });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.name).toBe('Project X');
    expect(body.activity).toBe('Started');
    expect(body.companyId).toBe('c-1');
  });

  // ── Update operations translate field names correctly ──────────

  it('update_company maps companyName to name', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse({ id: 'c-1' }));

    await client.callTool('update_company', { companyId: 'c-1', companyName: 'New Name' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/companies/c-1');
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.name).toBe('New Name');
  });

  it('update_contact maps contactName/contactLegalBasis/contactStatus', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse({ id: 'ct-1' }));

    await client.callTool('update_contact', {
      contactId: 'ct-1',
      contactName: 'Jane',
      contactStatus: 'Retired',
    });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/contacts/ct-1');
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.name).toBe('Jane');
    expect(body.status).toBe('Retired');
  });

  it('update_lead maps leadName/leadsStatus', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse({ id: 'l-1' }));

    await client.callTool('update_lead', {
      leadId: 'l-1',
      leadName: 'Updated Deal',
      leadsStatus: 'Won',
    });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/leads/l-1');
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.name).toBe('Updated Deal');
    expect(body.status).toBe('Won');
  });

  it('update_project maps projectName/projectActivity', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse({ id: 'p-1' }));

    await client.callTool('update_project', {
      projectId: 'p-1',
      projectName: 'Updated Project',
      projectActivity: 'Completed',
    });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/projects/p-1');
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.name).toBe('Updated Project');
    expect(body.activity).toBe('Completed');
  });

  // ── Nested company-scoped routes ───────────────────────────────

  it('retrieve_all_leads with companyId uses nested route', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse([], { headers: { 'x-total-count': '0' } }));

    await client.callTool('retrieve_all_leads', { companyId: 'c-1', leadsStatus: 'Active' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/companies/c-1/leads');
    expect(url).toContain('status=Active');
  });

  it('retrieve_all_projects with companyId uses nested route', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse([], { headers: { 'x-total-count': '0' } }));

    await client.callTool('retrieve_all_projects', { companyId: 'c-1' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/companies/c-1/projects');
  });

  it('retrieve_contacts with companyId uses nested route', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse([], { headers: { 'x-total-count': '0' } }));

    await client.callTool('retrieve_contacts', { companyId: 'c-1' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/companies/c-1/contacts');
  });

  // ── Dashboard operations ───────────────────────────────────────

  it('retrieve_leads_dashboard routes to /leads/overview with mapped params', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse([], { headers: { 'x-total-count': '0' } }));

    await client.callTool('retrieve_leads_dashboard', {
      leadTypeName: 'Customer',
      leadsStatus: 'Active',
      leadsLcmStatus: 'Evaluation',
    });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/leads/overview');
    expect(url).toContain('type=Customer');
    expect(url).toContain('status=Active');
    expect(url).toContain('lcmstatus=Evaluation');
  });

  it('retrieve_projects_dashboard routes to /projects/overview', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse([], { headers: { 'x-total-count': '0' } }));

    await client.callTool('retrieve_projects_dashboard', {
      projectTypeName: 'Internal',
      projectActivity: 'Started',
    });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/projects/overview');
    expect(url).toContain('type=Internal');
    expect(url).toContain('activity=Started');
  });

  // ── QCP operations ─────────────────────────────────────────────

  it('retrieve_all_company_qcps routes with path param', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse([]));

    await client.callTool('retrieve_all_company_qcps', { companyId: 'c-1' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/companies/c-1/qcps');
  });

  it('retrieve_lead_qcp routes with two path params', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse({ id: 'q-1' }));

    await client.callTool('retrieve_lead_qcp', { leadId: 'l-1', qcpId: 'q-1' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/leads/l-1/qcps/q-1');
  });

  // ── Timeline operations ────────────────────────────────────────

  it('create_company_timeline_event posts to correct path', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse({ id: 't-1' }));

    await client.callTool('create_company_timeline_event', {
      companyId: 'c-1',
      name: 'Meeting',
      logType: 'Meeting',
    });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/companies/c-1/timeline');
    expect((mockFetch.mock.calls[0][1] as RequestInit).method).toBe('POST');
  });

  // ── NCR operations ─────────────────────────────────────────────

  it('retrieve_all_ncrs routes with query params', async () => {
    const client = createClient();
    mockFetch.mockResolvedValue(mockJsonResponse([], { headers: { 'x-total-count': '0' } }));

    await client.callTool('retrieve_all_ncrs', {
      departmentId: 'd-1',
      search: 'quality',
      typeRegistration: 'Non-Conformance',
    });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/ncrcards');
    expect(url).toContain('departmentId=d-1');
    expect(url).toContain('search=quality');
    expect(url).toContain('typeRegistration=Non-Conformance');
  });
});

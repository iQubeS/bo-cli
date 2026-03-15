import { describe, it, expect } from 'vitest';
import { OperationRouter } from '../src/rest/operation-router.js';

describe('OperationRouter', () => {
  const router = new OperationRouter();

  describe('resolve', () => {
    it('resolves known operations', () => {
      expect(router.resolve('retrieve_companies')).toBeDefined();
      expect(router.resolve('retrieve_all_leads')).toBeDefined();
      expect(router.resolve('create_project')).toBeDefined();
      expect(router.resolve('retrieve_all_ncrs')).toBeDefined();
    });

    it('returns undefined for unknown operations', () => {
      expect(router.resolve('nonexistent_tool')).toBeUndefined();
    });

    it('resolves to nested company route when companyId is present for leads', () => {
      const route = router.resolve('retrieve_all_leads', { companyId: 'c-1' });
      expect(route).toBeDefined();
      expect(route!.path).toBe('/companies/:companyId/leads');
      expect(route!.pathParams).toContain('companyId');
    });

    it('resolves to nested company route when companyId is present for projects', () => {
      const route = router.resolve('retrieve_all_projects', { companyId: 'c-1' });
      expect(route).toBeDefined();
      expect(route!.path).toBe('/companies/:companyId/projects');
    });

    it('resolves to nested company route when companyId is present for contacts', () => {
      const route = router.resolve('retrieve_contacts', { companyId: 'c-1' });
      expect(route).toBeDefined();
      expect(route!.path).toBe('/companies/:companyId/contacts');
    });

    it('resolves to flat route when companyId is NOT present', () => {
      const route = router.resolve('retrieve_all_leads');
      expect(route!.path).toBe('/leads');
    });

    it('resolves to flat route when companyId is undefined', () => {
      const route = router.resolve('retrieve_all_leads', {});
      expect(route!.path).toBe('/leads');
    });

    it('maps all expected operations', () => {
      const ops = router.getAllOperations();
      expect(ops).toContain('retrieve_companies');
      expect(ops).toContain('retrieve_company_by_id');
      expect(ops).toContain('create_company');
      expect(ops).toContain('update_company');
      expect(ops).toContain('retrieve_contacts');
      expect(ops).toContain('retrieve_all_leads');
      expect(ops).toContain('create_lead');
      expect(ops).toContain('update_lead');
      expect(ops).toContain('retrieve_all_projects');
      expect(ops).toContain('create_project');
      expect(ops).toContain('retrieve_all_ncrs');
      expect(ops).toContain('create_ncr_card');
      expect(ops).toContain('retrieve_company_timeline_events');
      expect(ops).toContain('retrieve_all_company_qcps');
    });
  });

  describe('splitParams', () => {
    it('separates path params from query params', () => {
      const route = router.resolve('retrieve_company_by_id')!;
      const result = router.splitParams(route, { companyId: '123', extra: 'val' });

      expect(result.pathParams).toEqual({ companyId: '123' });
      expect(result.queryParams).toEqual({ extra: 'val' });
      expect(result.body).toEqual({});
    });

    it('applies param name mappings', () => {
      const route = router.resolve('retrieve_companies')!;
      const result = router.splitParams(route, { companyTypeName: 'Customer', search: 'Acme', limit: 10 });

      // companyTypeName mapped to type
      expect(result.queryParams.type).toBe('Customer');
      expect(result.queryParams.search).toBe('Acme');
      expect(result.queryParams.limit).toBe('10');
      expect(result.queryParams.companyTypeName).toBeUndefined();
    });

    it('applies lead param mappings for create_lead', () => {
      const route = router.resolve('create_lead')!;
      const result = router.splitParams(route, {
        leadName: 'Big Deal',
        leadsStatus: 'Active',
        leadsProbabilityForSale: 'High',
        companyId: 'c-1',
      });

      expect(result.body).toEqual({
        name: 'Big Deal',
        status: 'Active',
        probabilityForSale: 'High',
        companyId: 'c-1',
      });
    });

    it('puts non-declared params into body for POST', () => {
      const route = router.resolve('create_company')!;
      const result = router.splitParams(route, { companyName: 'Acme', city: 'Oslo' });

      expect(result.body).toEqual({ name: 'Acme', city: 'Oslo' });
    });

    it('puts non-declared params into query for GET', () => {
      const route = router.resolve('get_all_company_types')!;
      const result = router.splitParams(route, { extra: 'value' });

      expect(result.queryParams).toEqual({ extra: 'value' });
    });

    it('ignores null and undefined values', () => {
      const route = router.resolve('retrieve_companies')!;
      const result = router.splitParams(route, { search: undefined, limit: null as unknown, sort: 'name' });

      expect(result.queryParams).toEqual({ sort: 'name' });
    });

    it('handles multiple path params', () => {
      const route = router.resolve('retrieve_company_timeline_event')!;
      const result = router.splitParams(route, { companyId: 'c-1', timelineId: 't-1' });

      expect(result.pathParams).toEqual({ companyId: 'c-1', timelineId: 't-1' });
    });

    it('routes NCR departmentId as query param', () => {
      const route = router.resolve('retrieve_all_ncrs')!;
      const result = router.splitParams(route, { departmentId: 'd-1', search: 'issue' });

      expect(result.queryParams.departmentId).toBe('d-1');
      expect(result.queryParams.search).toBe('issue');
    });

    it('routes nested leads with companyId as path param and status as query', () => {
      const route = router.resolve('retrieve_all_leads', { companyId: 'c-1' })!;
      const result = router.splitParams(route, { companyId: 'c-1', leadsStatus: 'Active', limit: 10 });

      expect(result.pathParams).toEqual({ companyId: 'c-1' });
      expect(result.queryParams.status).toBe('Active');
      expect(result.queryParams.limit).toBe('10');
    });
  });

  describe('buildPath', () => {
    it('replaces single path param', () => {
      const route = router.resolve('retrieve_company_by_id')!;
      const path = router.buildPath(route, { companyId: '123' });
      expect(path).toBe('/companies/123');
    });

    it('replaces multiple path params', () => {
      const route = router.resolve('retrieve_company_timeline_event')!;
      const path = router.buildPath(route, { companyId: 'c-1', timelineId: 't-1' });
      expect(path).toBe('/companies/c-1/timeline/t-1');
    });

    it('encodes special characters in path params', () => {
      const route = router.resolve('retrieve_company_by_id')!;
      const path = router.buildPath(route, { companyId: 'id with spaces' });
      expect(path).toBe('/companies/id%20with%20spaces');
    });

    it('returns path as-is when no path params', () => {
      const route = router.resolve('retrieve_companies')!;
      const path = router.buildPath(route, {});
      expect(path).toBe('/companies');
    });
  });
});

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  pathParams?: string[];
  queryParams?: string[];
  /** Maps MCP parameter names to REST parameter names. */
  paramMapping?: Record<string, string>;
}

/**
 * Complete mapping of MCP tool names to REST API endpoints.
 * Parameter names are translated via paramMapping where they differ.
 */
const ROUTES: Record<string, RouteDefinition> = {
  // ── Companies ──────────────────────────────────────────────
  retrieve_companies: {
    method: 'GET',
    path: '/companies',
    queryParams: ['type', 'limit', 'offset', 'sort', 'search', 'active', 'approvedSupplier'],
    paramMapping: { companyTypeName: 'type' },
  },
  retrieve_company_by_id: {
    method: 'GET',
    path: '/companies/:companyId',
    pathParams: ['companyId'],
  },
  create_company: {
    method: 'POST',
    path: '/companies',
    paramMapping: { companyName: 'name', companySupplierCategory: 'supplierCategory', companyApprovedSupplier: 'approvedSupplier' },
  },
  update_company: {
    method: 'PUT',
    path: '/companies/:companyId',
    pathParams: ['companyId'],
    paramMapping: { companyName: 'name', companySupplierCategory: 'supplierCategory', companyApprovedSupplier: 'approvedSupplier' },
  },
  get_all_company_types: {
    method: 'GET',
    path: '/companytypes',
  },

  // ── Company-scoped nested endpoints ───────────────────────
  // Used automatically when companyId is provided on the flat endpoint operations
  retrieve_all_leads__by_company: {
    method: 'GET',
    path: '/companies/:companyId/leads',
    pathParams: ['companyId'],
    queryParams: ['type', 'status', 'limit', 'offset'],
    paramMapping: { leadsStatus: 'status', leadTypeName: 'type' },
  },
  retrieve_all_projects__by_company: {
    method: 'GET',
    path: '/companies/:companyId/projects',
    pathParams: ['companyId'],
    queryParams: ['type', 'activity', 'limit', 'offset'],
    paramMapping: { projectActivity: 'activity', projectTypeName: 'type' },
  },
  retrieve_contacts__by_company: {
    method: 'GET',
    path: '/companies/:companyId/contacts',
    pathParams: ['companyId'],
    queryParams: ['limit', 'offset'],
  },

  // ── Contacts ───────────────────────────────────────────────
  retrieve_contacts: {
    method: 'GET',
    path: '/contacts',
    queryParams: ['companyId', 'limit', 'offset', 'sort', 'search'],
  },
  retrieve_contact_info: {
    method: 'GET',
    path: '/contacts/:contactId',
    pathParams: ['contactId'],
  },
  create_contact: {
    method: 'POST',
    path: '/contacts',
    paramMapping: { contactName: 'name', contactLegalBasis: 'legalBasis', contactStatus: 'status', contactMarketingConsent: 'marketingConsent' },
  },
  update_contact: {
    method: 'PUT',
    path: '/contacts/:contactId',
    pathParams: ['contactId'],
    paramMapping: { contactName: 'name', contactLegalBasis: 'legalBasis', contactStatus: 'status', contactMarketingConsent: 'marketingConsent' },
  },

  // ── Leads ──────────────────────────────────────────────────
  retrieve_all_leads: {
    method: 'GET',
    path: '/leads',
    queryParams: ['status', 'type', 'limit', 'offset', 'sort', 'search'],
    paramMapping: { leadsStatus: 'status', leadTypeName: 'type' },
  },
  retrieve_lead: {
    method: 'GET',
    path: '/leads/:leadId',
    pathParams: ['leadId'],
  },
  create_lead: {
    method: 'POST',
    path: '/leads',
    paramMapping: {
      leadName: 'name',
      leadsStatus: 'status',
      leadsLcmStatus: 'lcmStatus',
      leadsProbabilityForSale: 'probabilityForSale',
    },
  },
  update_lead: {
    method: 'PUT',
    path: '/leads/:leadId',
    pathParams: ['leadId'],
    paramMapping: {
      leadName: 'name',
      leadsStatus: 'status',
      leadsLcmStatus: 'lcmStatus',
      leadsProbabilityForSale: 'probabilityForSale',
    },
  },
  retrieve_leads_dashboard: {
    method: 'GET',
    path: '/leads/overview',
    queryParams: ['type', 'status', 'lcmstatus', 'internalResponsible', 'limit', 'offset', 'sort'],
    paramMapping: { leadsStatus: 'status', leadsLcmStatus: 'lcmstatus', leadTypeName: 'type' },
  },
  get_all_lead_types: {
    method: 'GET',
    path: '/leadtypes',
  },
  // MEDDIC — no dedicated REST endpoint; falls back to retrieving the lead
  collect_meddic_data: {
    method: 'GET',
    path: '/leads/:leadId',
    pathParams: ['leadId'],
  },

  // ── Projects ───────────────────────────────────────────────
  retrieve_all_projects: {
    method: 'GET',
    path: '/projects',
    queryParams: ['activity', 'type', 'limit', 'offset', 'sort', 'search'],
    paramMapping: { projectActivity: 'activity', projectTypeName: 'type' },
  },
  retrieve_project: {
    method: 'GET',
    path: '/projects/:projectId',
    pathParams: ['projectId'],
  },
  create_project: {
    method: 'POST',
    path: '/projects',
    paramMapping: { projectName: 'name', projectActivity: 'activity' },
  },
  update_project: {
    method: 'PUT',
    path: '/projects/:projectId',
    pathParams: ['projectId'],
    paramMapping: { projectName: 'name', projectActivity: 'activity' },
  },
  retrieve_projects_dashboard: {
    method: 'GET',
    path: '/projects/overview',
    queryParams: ['type', 'activity', 'department', 'projectStartDate', 'projectEndDate', 'progress', 'modifiedDate', 'limit', 'offset', 'sort'],
    paramMapping: { projectActivity: 'activity', projectTypeName: 'type' },
  },
  get_all_project_types: {
    method: 'GET',
    path: '/projecttypes',
  },
  get_all_departments: {
    method: 'GET',
    path: '/departments',
  },

  // ── NCR ────────────────────────────────────────────────────
  retrieve_all_ncrs: {
    method: 'GET',
    path: '/ncrcards',
    queryParams: ['typeRegistration', 'projectId', 'companyId', 'leadId', 'departmentId', 'search', 'limit', 'offset', 'sort'],
  },
  retrieve_specific_ncr_card: {
    method: 'GET',
    path: '/ncrcard/:ncrCardId',
    pathParams: ['ncrCardId'],
  },
  create_ncr_card: {
    method: 'POST',
    path: '/ncrcard',
    paramMapping: { assignedToEmail: 'assignedTo' },
  },
  update_specific_ncr_card: {
    method: 'PUT',
    path: '/ncrcard/:ncrCardId',
    pathParams: ['ncrCardId'],
    paramMapping: { assignedToEmail: 'assignedTo' },
  },

  // ── Company Timeline ───────────────────────────────────────
  retrieve_company_timeline_events: {
    method: 'GET',
    path: '/companies/:companyId/timeline',
    pathParams: ['companyId'],
    queryParams: ['logType', 'limit', 'offset', 'sort', 'search'],
  },
  retrieve_company_timeline_event: {
    method: 'GET',
    path: '/companies/:companyId/timeline/:timelineId',
    pathParams: ['companyId', 'timelineId'],
  },
  create_company_timeline_event: {
    method: 'POST',
    path: '/companies/:companyId/timeline',
    pathParams: ['companyId'],
  },
  update_company_timeline_event: {
    method: 'PUT',
    path: '/companies/:companyId/timeline/:timelineId',
    pathParams: ['companyId', 'timelineId'],
  },

  // ── Lead Timeline ──────────────────────────────────────────
  retrieve_lead_timeline_events: {
    method: 'GET',
    path: '/leads/:leadId/timeline',
    pathParams: ['leadId'],
    queryParams: ['logType', 'limit', 'offset', 'sort', 'search'],
  },
  retrieve_lead_timeline_event: {
    method: 'GET',
    path: '/leads/:leadId/timeline/:timelineId',
    pathParams: ['leadId', 'timelineId'],
  },
  create_lead_timeline_event: {
    method: 'POST',
    path: '/leads/:leadId/timeline',
    pathParams: ['leadId'],
  },
  update_lead_timeline_event: {
    method: 'PUT',
    path: '/leads/:leadId/timeline/:timelineId',
    pathParams: ['leadId', 'timelineId'],
  },

  // ── Project Timeline ───────────────────────────────────────
  retrieve_project_timeline_events: {
    method: 'GET',
    path: '/projects/:projectId/timeline',
    pathParams: ['projectId'],
    queryParams: ['logType', 'limit', 'offset', 'sort', 'search'],
  },
  retrieve_project_timeline_event: {
    method: 'GET',
    path: '/projects/:projectId/timeline/:timelineId',
    pathParams: ['projectId', 'timelineId'],
  },
  create_project_timeline_event: {
    method: 'POST',
    path: '/projects/:projectId/timeline',
    pathParams: ['projectId'],
  },
  update_project_timeline_event: {
    method: 'PUT',
    path: '/projects/:projectId/timeline/:timelineId',
    pathParams: ['projectId', 'timelineId'],
  },

  // ── Company QCPs ───────────────────────────────────────────
  retrieve_all_company_qcps: {
    method: 'GET',
    path: '/companies/:companyId/qcps',
    pathParams: ['companyId'],
  },
  retrieve_company_qcp: {
    method: 'GET',
    path: '/companies/:companyId/qcps/:qcpId',
    pathParams: ['companyId', 'qcpId'],
  },

  // ── Lead QCPs ──────────────────────────────────────────────
  retrieve_all_lead_qcps: {
    method: 'GET',
    path: '/leads/:leadId/qcps',
    pathParams: ['leadId'],
  },
  retrieve_lead_qcp: {
    method: 'GET',
    path: '/leads/:leadId/qcps/:qcpId',
    pathParams: ['leadId', 'qcpId'],
  },

  // ── Project QCPs ───────────────────────────────────────────
  retrieve_all_project_qcps: {
    method: 'GET',
    path: '/projects/:projectId/qcps',
    pathParams: ['projectId'],
  },
  retrieve_project_qcp: {
    method: 'GET',
    path: '/projects/:projectId/qcps/:qcpId',
    pathParams: ['projectId', 'qcpId'],
  },
};

export class OperationRouter {
  /**
   * Resolve an MCP operation to a REST route definition.
   * When params contain `companyId` and a nested company-scoped variant exists,
   * the nested route is preferred (e.g. `/companies/:companyId/leads` instead of `/leads`).
   */
  resolve(operation: string, params?: Record<string, unknown>): RouteDefinition | undefined {
    if (params?.companyId) {
      const nested = ROUTES[`${operation}__by_company`];
      if (nested) return nested;
    }
    return ROUTES[operation];
  }

  /**
   * Apply param name mapping (MCP names -> REST names) and split params
   * into path params, query params, and body.
   */
  splitParams(
    route: RouteDefinition,
    params: Record<string, unknown>,
  ): { pathParams: Record<string, string>; queryParams: Record<string, string>; body: Record<string, unknown> } {
    // 1. Apply name mappings (MCP name -> REST name)
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      const restKey = route.paramMapping?.[key] ?? key;
      mapped[restKey] = value;
    }

    const pathParams: Record<string, string> = {};
    const queryParams: Record<string, string> = {};
    const body: Record<string, unknown> = {};

    const pathParamSet = new Set(route.pathParams ?? []);
    const queryParamSet = new Set(route.queryParams ?? []);

    for (const [key, value] of Object.entries(mapped)) {
      if (value === undefined || value === null) continue;

      if (pathParamSet.has(key)) {
        pathParams[key] = String(value);
      } else if (queryParamSet.has(key)) {
        queryParams[key] = String(value);
      } else if (route.method === 'POST' || route.method === 'PUT') {
        body[key] = value;
      } else {
        // For GET without explicit queryParam declaration, add as query param
        queryParams[key] = String(value);
      }
    }

    return { pathParams, queryParams, body };
  }

  /**
   * Build the path with :param placeholders replaced by actual values.
   */
  buildPath(route: RouteDefinition, pathParams: Record<string, string>): string {
    let path = route.path;
    for (const [key, value] of Object.entries(pathParams)) {
      path = path.replace(`:${key}`, encodeURIComponent(value));
    }
    return path;
  }

  /** Get all registered operation names (for testing/diagnostics). */
  getAllOperations(): string[] {
    return Object.keys(ROUTES);
  }
}

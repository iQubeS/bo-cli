import type {
  AuthorizationServerMetadata,
  ProtectedResourceMetadata,
  ServerDiscovery,
} from './types.js';

export interface WwwAuthChallenge {
  scheme: string;
  resourceMetadata?: string;
  scope?: string;
  realm?: string;
}

/**
 * Parse a WWW-Authenticate header in the form:
 *   Bearer realm="...", resource_metadata="...", scope="..."
 * Returns the first Bearer challenge's parameters.
 */
export function parseWwwAuthenticate(header: string | null): WwwAuthChallenge | null {
  if (!header) return null;
  const match = header.match(/^(\w+)\s+(.*)$/s);
  if (!match) return null;
  const scheme = match[1];
  if (scheme.toLowerCase() !== 'bearer') return null;
  const params: Record<string, string> = {};
  const paramRe = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = paramRe.exec(match[2])) !== null) {
    params[m[1].toLowerCase()] = m[2];
  }
  return {
    scheme,
    resourceMetadata: params['resource_metadata'],
    scope: params['scope'],
    realm: params['realm'],
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/**
 * Probe the MCP server with an unauthenticated initialize request to surface
 * the 401 + WWW-Authenticate challenge, then fall back to well-known URIs.
 */
export async function discoverProtectedResource(
  mcpServerUrl: string
): Promise<ProtectedResourceMetadata> {
  let prmUrl: string | undefined;

  try {
    const probe = await fetch(mcpServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'bo-cli-discovery', version: '0' },
        },
      }),
    });
    if (probe.status === 401) {
      const challenge = parseWwwAuthenticate(probe.headers.get('www-authenticate'));
      if (challenge?.resourceMetadata) {
        prmUrl = challenge.resourceMetadata;
      }
    }
  } catch {
    // Probe failure is non-fatal — fall back to well-known.
  }

  if (!prmUrl) {
    const base = new URL(mcpServerUrl);
    const candidates: string[] = [];
    if (base.pathname && base.pathname !== '/') {
      candidates.push(`${base.origin}/.well-known/oauth-protected-resource${base.pathname}`);
    }
    candidates.push(`${base.origin}/.well-known/oauth-protected-resource`);
    for (const candidate of candidates) {
      try {
        return await fetchJson<ProtectedResourceMetadata>(candidate);
      } catch {
        // Try next candidate.
      }
    }
    throw new Error(`Unable to discover Protected Resource Metadata for ${mcpServerUrl}`);
  }

  return await fetchJson<ProtectedResourceMetadata>(prmUrl);
}

/**
 * Fetch Authorization Server metadata, trying RFC 8414 and OIDC well-known
 * endpoints in the priority order mandated by the MCP auth spec.
 */
export async function discoverAuthorizationServer(
  issuerUrl: string
): Promise<AuthorizationServerMetadata> {
  const issuer = new URL(issuerUrl);
  const hasPath = issuer.pathname && issuer.pathname !== '/';

  const candidates: string[] = hasPath
    ? [
        `${issuer.origin}/.well-known/oauth-authorization-server${issuer.pathname}`,
        `${issuer.origin}/.well-known/openid-configuration${issuer.pathname}`,
        `${issuerUrl.replace(/\/$/, '')}/.well-known/openid-configuration`,
      ]
    : [
        `${issuer.origin}/.well-known/oauth-authorization-server`,
        `${issuer.origin}/.well-known/openid-configuration`,
      ];

  let lastError: unknown;
  for (const url of candidates) {
    try {
      return await fetchJson<AuthorizationServerMetadata>(url);
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Unable to discover Authorization Server metadata for ${issuerUrl}: ${String(lastError)}`
  );
}

/**
 * Extract the Entra clientId from an `api://<guid>/...` scope.
 */
export function extractClientIdFromScope(scope: string): string | null {
  const match = scope.match(/^api:\/\/([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * Full discovery for one MCP server. We rely on the server's AS metadata to
 * tell us which Entra tenant to talk to and implicitly (via the advertised
 * scope) which Entra clientId we'll authenticate against.
 */
export async function discoverServer(mcpServerUrl: string): Promise<ServerDiscovery> {
  const prm = await discoverProtectedResource(mcpServerUrl);
  if (!prm.authorization_servers?.length) {
    throw new Error(`PRM for ${mcpServerUrl} has no authorization_servers`);
  }
  const asMetadata = await discoverAuthorizationServer(prm.authorization_servers[0]);

  if (!asMetadata.upstream_authorization_server) {
    throw new Error(
      `AS metadata for ${asMetadata.issuer} missing upstream_authorization_server — cannot use device code flow`
    );
  }

  const apiScope = prm.scopes_supported?.find((s) => s.startsWith('api://'));
  if (!apiScope) {
    throw new Error(`PRM for ${mcpServerUrl} does not advertise an api:// scope`);
  }
  const clientId = extractClientIdFromScope(apiScope);
  if (!clientId) {
    throw new Error(`Cannot extract clientId from scope "${apiScope}"`);
  }

  const scopes = [apiScope];
  if (prm.scopes_supported?.includes('offline_access')) {
    scopes.push('offline_access');
  }

  return {
    resourceCanonicalUri: prm.resource,
    upstreamAuthority: asMetadata.upstream_authorization_server.replace(/\/$/, ''),
    clientId,
    scopes,
    discoveredAt: Date.now(),
  };
}

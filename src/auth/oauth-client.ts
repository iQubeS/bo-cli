import type { ServerDiscovery, StoredTokenSet } from './types.js';

interface TokenEndpointResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

export function parseTokenResponse(json: unknown): StoredTokenSet {
  const r = json as TokenEndpointResponse;
  if (!r.access_token) {
    throw new Error('Token endpoint response missing access_token');
  }
  const expiresIn = typeof r.expires_in === 'number' ? r.expires_in : 3600;
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    tokenType: r.token_type ?? 'Bearer',
    scope: r.scope,
    expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
  };
}

/**
 * Refresh an access token against the upstream Entra tenant's v2.0 token
 * endpoint using the stored refresh token.
 */
export async function refreshTokens(opts: {
  discovery: ServerDiscovery;
  refreshToken: string;
}): Promise<StoredTokenSet> {
  const tokenEndpoint = `${opts.discovery.upstreamAuthority}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: opts.refreshToken,
    client_id: opts.discovery.clientId,
    scope: opts.discovery.scopes.join(' '),
  });
  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token refresh failed: ${res.status} ${res.statusText} ${text}`.trim());
  }
  return parseTokenResponse(await res.json());
}

/** Decode a JWT payload without verifying — informational only (e.g., for status display). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

/** Access token is considered expired if it's within 60 seconds of expiry. */
export function isAccessTokenFresh(tokens: StoredTokenSet, skewSeconds = 60): boolean {
  return tokens.expiresAt - skewSeconds > Math.floor(Date.now() / 1000);
}

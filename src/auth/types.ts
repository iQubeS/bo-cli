/**
 * Protected Resource Metadata (RFC 9728) returned by the MCP server's
 * .well-known/oauth-protected-resource endpoint.
 */
export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported?: string[];
  bearer_methods_supported?: string[];
  resource_parameter_supported?: boolean;
  mcp_server_url?: string;
}

/**
 * Authorization Server Metadata (RFC 8414). The MCP server exposes this
 * document, but — since we bypass its AS and go straight to the upstream
 * Entra tenant — we only care about `upstream_authorization_server` and the
 * embedded scope to extract the Entra clientId.
 */
export interface AuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  scopes_supported?: string[];
  code_challenge_methods_supported?: string[];
  grant_types_supported?: string[];
  jwks_uri?: string;
  end_session_endpoint?: string;
  upstream_authorization_server?: string;
}

/**
 * Everything the CLI needs to drive Entra device code flow for one MCP server.
 * `upstreamAuthority` is the Entra tenant URL (e.g. https://login.microsoftonline.com/<tid>);
 * `clientId` is extracted from the advertised scope (e.g. `api://<clientId>/access`).
 */
export interface ServerDiscovery {
  resourceCanonicalUri: string;
  upstreamAuthority: string;
  clientId: string;
  scopes: string[];
  discoveredAt: number;
}

export interface StoredTokenSet {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scope?: string;
  expiresAt: number;
}

export interface ServerAuthState {
  discovery: ServerDiscovery;
  tokens?: StoredTokenSet;
  signedInAs?: {
    sub?: string;
    preferredUsername?: string;
    name?: string;
  };
}

import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveAuthMethod } from '../src/config/index.js';
import type { McpEnvironmentConfig } from '../src/config/index.js';
import { parseWwwAuthenticate, extractClientIdFromScope } from '../src/auth/discovery.js';
import {
  decodeJwtPayload,
  isAccessTokenFresh,
} from '../src/auth/oauth-client.js';
import type { StoredTokenSet } from '../src/auth/types.js';

describe('resolveAuthMethod', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to bearer when neither auth block nor token present', () => {
    vi.stubEnv('BO_CLI_TOKEN', '');
    const env: McpEnvironmentConfig = { servers: {} };
    expect(resolveAuthMethod(env)).toBe('bearer');
  });

  it('honors explicit oauth method', () => {
    vi.stubEnv('BO_CLI_TOKEN', '');
    const env: McpEnvironmentConfig = { servers: {}, auth: { method: 'oauth' } };
    expect(resolveAuthMethod(env)).toBe('oauth');
  });

  it('BO_CLI_TOKEN overrides oauth to bearer', () => {
    vi.stubEnv('BO_CLI_TOKEN', 'override');
    const env: McpEnvironmentConfig = { servers: {}, auth: { method: 'oauth' } };
    expect(resolveAuthMethod(env)).toBe('bearer');
  });

  it('missing auth but present static token resolves to bearer (backward compat)', () => {
    vi.stubEnv('BO_CLI_TOKEN', '');
    const env: McpEnvironmentConfig = { servers: {}, token: 'legacy-token' };
    expect(resolveAuthMethod(env)).toBe('bearer');
  });
});

describe('extractClientIdFromScope', () => {
  it('extracts GUID from an api:// scope', () => {
    expect(
      extractClientIdFromScope('api://228d54db-8b3c-4c77-9bf8-71dab9ea1e08/access')
    ).toBe('228d54db-8b3c-4c77-9bf8-71dab9ea1e08');
  });

  it('returns null for non-api scopes', () => {
    expect(extractClientIdFromScope('offline_access')).toBeNull();
    expect(extractClientIdFromScope('openid')).toBeNull();
  });
});

describe('parseWwwAuthenticate', () => {
  it('parses Bearer challenge with multiple params', () => {
    const header =
      'Bearer realm="https://x", resource_metadata="https://x/.well-known/oauth-protected-resource", scope="api://abc/access"';
    const result = parseWwwAuthenticate(header);
    expect(result).toEqual({
      scheme: 'Bearer',
      realm: 'https://x',
      resourceMetadata: 'https://x/.well-known/oauth-protected-resource',
      scope: 'api://abc/access',
    });
  });

  it('returns null for non-Bearer schemes', () => {
    expect(parseWwwAuthenticate('Basic realm="api"')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(parseWwwAuthenticate(null)).toBeNull();
  });

  it('tolerates missing optional params', () => {
    const result = parseWwwAuthenticate('Bearer realm="https://x"');
    expect(result?.realm).toBe('https://x');
    expect(result?.resourceMetadata).toBeUndefined();
  });
});

describe('decodeJwtPayload', () => {
  it('decodes a valid JWT payload', () => {
    const payload = { sub: 'user-1', name: 'Test' };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `header.${encoded}.sig`;
    expect(decodeJwtPayload(token)).toEqual(payload);
  });

  it('returns null for malformed tokens', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('a.b')?.toString()).toBeUndefined();
  });
});

describe('isAccessTokenFresh', () => {
  const nowSec = () => Math.floor(Date.now() / 1000);
  const token = (expiresAt: number): StoredTokenSet => ({
    accessToken: 'x',
    tokenType: 'Bearer',
    expiresAt,
  });

  it('fresh when expiresAt is well in the future', () => {
    expect(isAccessTokenFresh(token(nowSec() + 600))).toBe(true);
  });

  it('expired when within skew window', () => {
    expect(isAccessTokenFresh(token(nowSec() + 30))).toBe(false);
  });

  it('expired when already past expiry', () => {
    expect(isAccessTokenFresh(token(nowSec() - 10))).toBe(false);
  });
});

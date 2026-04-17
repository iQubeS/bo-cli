import type { ServerDiscovery, StoredTokenSet } from './types.js';
import { parseTokenResponse } from './oauth-client.js';

export interface DeviceCodeChallenge {
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresInSec: number;
  message: string;
}

export interface DeviceFlowOptions {
  discovery: ServerDiscovery;
  onUserCode: (challenge: DeviceCodeChallenge) => void;
  signal?: AbortSignal;
}

interface DeviceCodeResponse {
  user_code: string;
  device_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval?: number;
  message?: string;
}

interface TokenErrorResponse {
  error: string;
  error_description?: string;
}

/**
 * Entra device code flow (RFC 8628). We post directly to the upstream Entra
 * tenant's /oauth2/v2.0/devicecode and /oauth2/v2.0/token endpoints, bypassing
 * the MCP server's own authorization endpoints. The resulting Entra-issued
 * JWT is what the MCP server validates.
 */
export async function deviceCodeLogin(opts: DeviceFlowOptions): Promise<StoredTokenSet> {
  const { discovery, onUserCode, signal } = opts;

  const deviceCodeEndpoint = `${discovery.upstreamAuthority}/oauth2/v2.0/devicecode`;
  const tokenEndpoint = `${discovery.upstreamAuthority}/oauth2/v2.0/token`;
  const scope = discovery.scopes.join(' ');

  const deviceRes = await fetch(deviceCodeEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({ client_id: discovery.clientId, scope }),
    signal,
  });

  if (!deviceRes.ok) {
    const text = await deviceRes.text().catch(() => '');
    throw new Error(
      `Device code request failed: ${deviceRes.status} ${deviceRes.statusText} ${text}`.trim()
    );
  }

  const device = (await deviceRes.json()) as DeviceCodeResponse;

  onUserCode({
    userCode: device.user_code,
    verificationUri: device.verification_uri,
    verificationUriComplete: device.verification_uri_complete,
    expiresInSec: device.expires_in,
    message:
      device.message ?? `Visit ${device.verification_uri} and enter code ${device.user_code}.`,
  });

  let intervalMs = (device.interval ?? 5) * 1000;
  const deadline = Date.now() + device.expires_in * 1000;

  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('Device code flow aborted by user');
    await sleep(intervalMs, signal);

    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        client_id: discovery.clientId,
        device_code: device.device_code,
      }),
      signal,
    });

    if (res.ok) {
      return parseTokenResponse(await res.json());
    }

    const errPayload = (await res.json().catch(() => ({}))) as TokenErrorResponse;
    const errCode = errPayload.error;
    if (errCode === 'authorization_pending') {
      continue;
    }
    if (errCode === 'slow_down') {
      intervalMs += 5_000;
      continue;
    }
    if (errCode === 'expired_token') {
      throw new Error('Device code expired. Run `bo auth login` again.');
    }
    if (errCode === 'authorization_declined') {
      throw new Error('Sign-in was declined.');
    }
    throw new Error(
      `Device code token error: ${errCode ?? 'unknown'}${
        errPayload.error_description ? ' — ' + errPayload.error_description : ''
      }`
    );
  }

  throw new Error('Device code expired before sign-in completed.');
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(new Error('Device code flow aborted by user'));
    };
    function cleanup(): void {
      clearTimeout(t);
      signal?.removeEventListener('abort', onAbort);
    }
    signal?.addEventListener('abort', onAbort);
  });
}

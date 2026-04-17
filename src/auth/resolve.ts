import type { McpEnvironmentConfig } from '../config/index.js';
import { resolveToken, resolveAuthMethod } from '../config/index.js';
import { ReAuthRequiredError } from '../errors.js';
import { refreshTokens, isAccessTokenFresh } from './oauth-client.js';
import { loadAuthState, saveAuthState } from './token-store.js';

/**
 * Resolve an access token for a given server in the active environment.
 *
 * - In bearer mode (or when BO_CLI_TOKEN is set), returns the static token.
 * - In oauth mode, loads the stored token set, refreshes silently if expired
 *   against the upstream Entra tenant, and returns a fresh access token.
 *   Throws ReAuthRequiredError if no tokens are stored or the refresh fails —
 *   callers must not auto-launch device flow from arbitrary commands.
 */
export async function resolveAccessToken(
  env: string,
  serverName: string,
  envConfig: McpEnvironmentConfig
): Promise<string | undefined> {
  const method = resolveAuthMethod(envConfig);

  if (method === 'bearer') {
    return resolveToken(envConfig);
  }

  const state = loadAuthState(env, serverName);
  if (!state?.tokens) {
    throw new ReAuthRequiredError(serverName);
  }

  if (isAccessTokenFresh(state.tokens)) {
    return state.tokens.accessToken;
  }

  if (!state.tokens.refreshToken) {
    throw new ReAuthRequiredError(serverName);
  }

  try {
    const refreshed = await refreshTokens({
      discovery: state.discovery,
      refreshToken: state.tokens.refreshToken,
    });
    const next = { ...state, tokens: refreshed };
    saveAuthState(env, serverName, next);
    return refreshed.accessToken;
  } catch {
    throw new ReAuthRequiredError(serverName);
  }
}

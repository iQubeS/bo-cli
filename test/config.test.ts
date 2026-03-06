import { describe, it, expect, afterEach, vi } from 'vitest';
import { getActiveEnvironment, DEFAULT_CONFIG, type BoCliConfig } from '../src/config/index.js';

describe('getActiveEnvironment', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns "production" with no arguments', () => {
    vi.stubEnv('BO_CLI_ENV', '');
    expect(getActiveEnvironment()).toBe('production');
  });

  it('uses config.defaultEnvironment when provided', () => {
    vi.stubEnv('BO_CLI_ENV', '');
    const config = { ...DEFAULT_CONFIG, defaultEnvironment: 'development' };
    expect(getActiveEnvironment(config)).toBe('development');
  });

  it('prefers BO_CLI_ENV env var over config', () => {
    vi.stubEnv('BO_CLI_ENV', 'staging');
    const config = { ...DEFAULT_CONFIG, defaultEnvironment: 'development' };
    expect(getActiveEnvironment(config)).toBe('staging');
  });

  it('falls back to production if config has no defaultEnvironment', () => {
    vi.stubEnv('BO_CLI_ENV', '');
    expect(getActiveEnvironment(undefined)).toBe('production');
  });
});

describe('DEFAULT_CONFIG', () => {
  it('has expected structure', () => {
    expect(DEFAULT_CONFIG.defaultEnvironment).toBe('production');
    expect(DEFAULT_CONFIG.environments).toHaveProperty('production');
    expect(DEFAULT_CONFIG.environments).toHaveProperty('development');
    expect(DEFAULT_CONFIG.defaults.outputFormat).toBe('table');
    expect(DEFAULT_CONFIG.defaults.pageSize).toBe(25);
    expect(DEFAULT_CONFIG.defaults.color).toBe(true);
  });

  it('production environment has servers object', () => {
    expect(DEFAULT_CONFIG.environments.production).toHaveProperty('servers');
  });
});

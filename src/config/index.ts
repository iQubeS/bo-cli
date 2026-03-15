import { cosmiconfig } from 'cosmiconfig';
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface ServerConfig {
  url: string;
}

// ── MCP environment config (original, backward compatible) ───────────

export interface McpEnvironmentConfig {
  mode?: 'mcp';
  servers: {
    customer?: ServerConfig;
    leads?: ServerConfig;
    projects?: ServerConfig;
    ncr?: ServerConfig;
  };
  token?: string;
}

// ── REST API environment config (new) ────────────────────────────────

export interface RestEnvironmentConfig {
  mode: 'rest';
  baseUrl: string;
  tenantName: string;
  apiVersion?: string;
  apiKey?: string;
}

export type EnvironmentConfig = McpEnvironmentConfig | RestEnvironmentConfig;

// ── Tenant-specific enum overrides ───────────────────────────────────

export interface EnumCategoryConfig {
  Company?: {
    companyActive?: string[];
    companySupplierCategory?: string[];
    companyApprovedSupplier?: string[];
  };
  Leads?: {
    leadsStatus?: string[];
    leadsLcmStatus?: string[];
    leadsProbabilityForSale?: string[];
  };
  Project?: {
    projectActivity?: string[];
  };
  Contact?: {
    contactLegalBasis?: string[];
    contactStatus?: string[];
    contactMarketingConsent?: string[];
  };
  NCR?: {
    ncrTypeRegistration?: string[];
    ncrDirectCause?: string[];
    ncrLocation?: string[];
    ncrFeedbackType?: string[];
    ncrCategory?: string[];
    ncrRootCause?: string[];
  };
}

export interface EnumConfig {
  [tenantName: string]: EnumCategoryConfig;
}

// ── Main config ──────────────────────────────────────────────────────

export interface BoCliConfig {
  defaultEnvironment: string;
  environments: {
    [key: string]: EnvironmentConfig;
  };
  defaults: {
    outputFormat: 'table' | 'json' | 'csv';
    pageSize: number;
    color: boolean;
  };
  enums?: EnumConfig;
}

export const DEFAULT_CONFIG: BoCliConfig = {
  defaultEnvironment: 'production',
  environments: {
    production: {
      servers: {},
      token: '',
    },
    development: {
      servers: {},
      token: '',
    },
  },
  defaults: {
    outputFormat: 'table',
    pageSize: 25,
    color: true,
  },
};

const CONFIG_DIR = join(homedir(), '.bo-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export async function loadConfig(): Promise<BoCliConfig> {
  const explorer = cosmiconfig('bo-cli');

  try {
    const result = await explorer.search();
    if (result && result.config) {
      return {
        ...DEFAULT_CONFIG,
        ...result.config,
        defaults: { ...DEFAULT_CONFIG.defaults, ...(result.config.defaults ?? {}) },
      };
    }
  } catch {
    // Config file not found, use defaults
  }

  // Try to read from ~/.bo-cli/config.json
  if (existsSync(CONFIG_FILE)) {
    try {
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content);
      return {
        ...DEFAULT_CONFIG,
        ...config,
        defaults: { ...DEFAULT_CONFIG.defaults, ...(config.defaults ?? {}) },
      };
    } catch {
      // Invalid JSON, use defaults
    }
  }

  return DEFAULT_CONFIG;
}

export function saveConfig(config: BoCliConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  try {
    chmodSync(CONFIG_FILE, 0o600);
  } catch {
    // chmod may not work on all platforms (e.g., Windows)
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export async function getToken(): Promise<string | undefined> {
  // First check environment variable
  if (process.env.BO_CLI_TOKEN) {
    return process.env.BO_CLI_TOKEN;
  }

  // Then check config file
  try {
    const config = await loadConfig();
    const env = config.defaultEnvironment || 'production';
    const envConfig = config.environments[env];
    if (isRestConfig(envConfig)) return undefined;
    return (envConfig as McpEnvironmentConfig)?.token;
  } catch {
    return undefined;
  }
}

export async function getApiKey(): Promise<string | undefined> {
  // First check environment variable
  if (process.env.BO_CLI_API_KEY) {
    return process.env.BO_CLI_API_KEY;
  }

  // Then check config file
  try {
    const config = await loadConfig();
    const env = config.defaultEnvironment || 'production';
    const envConfig = config.environments[env];
    if (isRestConfig(envConfig)) {
      return envConfig.apiKey;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function getActiveEnvironment(config?: BoCliConfig): string {
  return process.env.BO_CLI_ENV || config?.defaultEnvironment || 'production';
}

// ── Mode detection helpers ───────────────────────────────────────────

export function isRestConfig(env: EnvironmentConfig | undefined): env is RestEnvironmentConfig {
  if (!env) return false;
  return 'mode' in env && env.mode === 'rest';
}

export function isMcpConfig(env: EnvironmentConfig | undefined): env is McpEnvironmentConfig {
  if (!env) return false;
  return !('mode' in env) || env.mode === undefined || env.mode === 'mcp';
}

export function getEnvironmentMode(env: EnvironmentConfig | undefined): 'mcp' | 'rest' {
  return isRestConfig(env) ? 'rest' : 'mcp';
}

/**
 * Resolve the API key for a REST environment config.
 * Checks BO_CLI_API_KEY env var first, then config.
 */
export function resolveApiKey(envConfig: RestEnvironmentConfig): string | undefined {
  return process.env.BO_CLI_API_KEY || envConfig.apiKey;
}

/**
 * Resolve the token for an MCP environment config.
 * Checks BO_CLI_TOKEN env var first, then config.
 */
export function resolveToken(envConfig: McpEnvironmentConfig): string | undefined {
  return process.env.BO_CLI_TOKEN || envConfig.token;
}

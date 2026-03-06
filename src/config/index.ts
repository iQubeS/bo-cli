import { cosmiconfig } from 'cosmiconfig';
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface ServerConfig {
  url: string;
}

export interface EnvironmentConfig {
  servers: {
    customer?: ServerConfig;
    leads?: ServerConfig;
    projects?: ServerConfig;
    ncr?: ServerConfig;
  };
  token?: string;
}

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
      return { ...DEFAULT_CONFIG, ...result.config };
    }
  } catch {
    // Config file not found, use defaults
  }

  // Try to read from ~/.bo-cli/config.json
  if (existsSync(CONFIG_FILE)) {
    try {
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content);
      return { ...DEFAULT_CONFIG, ...config };
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
    return config.environments[env]?.token;
  } catch {
    return undefined;
  }
}

export function getActiveEnvironment(config?: BoCliConfig): string {
  return process.env.BO_CLI_ENV || config?.defaultEnvironment || 'production';
}

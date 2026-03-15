import { Command, Flags } from '@oclif/core';
import { loadConfig, getActiveEnvironment, getEnvironmentMode, isRestConfig } from './config/index.js';
import type { BoCliConfig, EnvironmentConfig, RestEnvironmentConfig } from './config/index.js';
import type { BackendClient, BackendFactory } from './backend/types.js';
import { McpBackendFactory } from './backend/mcp-factory.js';
import { McpBackendClient } from './backend/mcp-backend.js';
import { RestBackendFactory } from './backend/rest-factory.js';
import { type OutputFormat, printError, printWarning } from './formatters/index.js';
import { loadEnums, resetEnumCache } from './enums/cache.js';
import { classifyError, AuthError, ConnectionError, ServerError, ValidationError, RateLimitError, QuotaExceededError } from './errors.js';

export abstract class BaseCommand extends Command {

  static baseFlags = {
    debug: Flags.boolean({ description: 'Show debug output (request/response details)', default: false }),
  };

  protected debugMode = false;

  async init(): Promise<void> {
    await super.init();
    // Parse --debug from argv directly so subclasses don't need to wire it
    const argv = this.argv as string[];
    if (argv.includes('--debug')) {
      this.debugMode = true;
    }
  }

  protected debugLog(label: string, data: unknown): void {
    if (this.debugMode) {
      console.error(`[DEBUG] ${label}:`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    }
  }

  protected getFormat(flags: { json?: boolean; csv?: boolean }): OutputFormat {
    return flags.json ? 'json' : flags.csv ? 'csv' : 'table';
  }

  protected printClassifiedError(error: unknown, context: string): void {
    const classified = classifyError(error);
    if (classified instanceof AuthError) {
      printError(`${context}: ${classified.message}`);
      printError('Run "bo config set" to update your credentials.');
    } else if (classified instanceof ConnectionError) {
      printError(`${context}: ${classified.message}`);
      printError('Run "bo config test" to check connectivity.');
    } else if (classified instanceof RateLimitError) {
      printError(`${context}: ${classified.message}`);
      printWarning('The API is rate-limited. Wait and retry, or contact your administrator.');
    } else if (classified instanceof QuotaExceededError) {
      printError(`${context}: ${classified.message}`);
      printWarning('Your API quota has been exhausted for this period.');
    } else if (classified instanceof ServerError) {
      printError(`${context}: ${classified.message}`);
    } else if (classified instanceof ValidationError) {
      printError(`${context}: ${classified.message}`);
    } else {
      printError(`${context}: ${classified.message}`);
    }
  }

  private createBackendFactory(config: BoCliConfig, envName: string): BackendFactory {
    const envConfig = config.environments[envName];
    if (!envConfig) {
      throw new Error(`Environment "${envName}" not found in config`);
    }

    const mode = getEnvironmentMode(envConfig);
    this.debugLog('Mode', mode);

    if (mode === 'rest') {
      return new RestBackendFactory(envConfig as RestEnvironmentConfig);
    }
    return new McpBackendFactory(config, envName);
  }

  protected async withConnection<T>(
    serverName: string,
    fn: (client: BackendClient) => Promise<T>,
    options?: { loadEnums?: boolean }
  ): Promise<T> {
    const config = await loadConfig();
    const env = getActiveEnvironment(config);
    const envConfig = config.environments[env];
    const factory = this.createBackendFactory(config, env);

    this.debugLog('Server', serverName);
    this.debugLog('Environment', env);

    const client = await factory.createClient(serverName);

    try {
      if (this.debugMode && client.setDebugLog) {
        client.setDebugLog((label, data) => this.debugLog(label, data));
      }

      this.debugLog('Connected', `${serverName} OK`);

      if (options?.loadEnums) {
        // Reset so we always reload for the current environment
        resetEnumCache();

        if (factory.mode === 'rest' && isRestConfig(envConfig)) {
          // REST mode: load enums from config.enums[tenantName] or use static fallbacks
          const tenantEnums = config.enums?.[envConfig.tenantName];
          if (tenantEnums) {
            await loadEnums(tenantEnums);
          }
          // If no tenant enums configured, static fallbacks are used automatically
        } else if (client instanceof McpBackendClient) {
          // MCP mode: load from server resource
          await loadEnums(client.getMcpClient());
        }
      }

      return await fn(client);
    } finally {
      try {
        await client.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }

  protected async withAllConnections<T>(
    fn: (clients: Map<string, BackendClient>) => Promise<T>
  ): Promise<T> {
    const config = await loadConfig();
    const env = getActiveEnvironment(config);
    const factory = this.createBackendFactory(config, env);

    const clients = await factory.createAllClients();
    try {
      return await fn(clients);
    } finally {
      // Collect unique clients to avoid disposing the same REST client multiple times
      const disposed = new Set<BackendClient>();
      for (const client of clients.values()) {
        if (!disposed.has(client)) {
          disposed.add(client);
          try {
            await client.dispose();
          } catch {
            // Ignore dispose errors
          }
        }
      }
    }
  }

  private static readonly SERVER_NAME_MAP: Record<string, string> = {
    company: 'customer',
    lead: 'leads',
    project: 'projects',
  };

  private static readonly ENTITY_ID_MAP: Record<string, string> = {
    company: 'companyId',
    lead: 'leadId',
    project: 'projectId',
  };

  protected resolveServerName(module: string): string {
    return BaseCommand.SERVER_NAME_MAP[module] || module;
  }

  protected entityIdParam(module: string): string {
    return BaseCommand.ENTITY_ID_MAP[module] || 'id';
  }

  protected resolveTimelineTool(module: string, action: 'list' | 'get' | 'create' | 'update'): string | undefined {
    const map: Record<string, Record<string, string>> = {
      company: {
        list: 'retrieve_company_timeline_events',
        get: 'retrieve_company_timeline_event',
        create: 'create_company_timeline_event',
        update: 'update_company_timeline_event',
      },
      lead: {
        list: 'retrieve_lead_timeline_events',
        get: 'retrieve_lead_timeline_event',
        create: 'create_lead_timeline_event',
        update: 'update_lead_timeline_event',
      },
      project: {
        list: 'retrieve_project_timeline_events',
        get: 'retrieve_project_timeline_event',
        create: 'create_project_timeline_event',
        update: 'update_project_timeline_event',
      },
    };
    return map[module]?.[action];
  }

  protected resolveQcpTool(module: string, action: 'list' | 'get'): string | undefined {
    const map: Record<string, Record<string, string>> = {
      company: {
        list: 'retrieve_all_company_qcps',
        get: 'retrieve_company_qcp',
      },
      lead: {
        list: 'retrieve_all_lead_qcps',
        get: 'retrieve_lead_qcp',
      },
      project: {
        list: 'retrieve_all_project_qcps',
        get: 'retrieve_project_qcp',
      },
    };
    return map[module]?.[action];
  }
}

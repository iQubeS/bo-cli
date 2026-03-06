import { Command, Flags } from '@oclif/core';
import { loadConfig, getActiveEnvironment } from './config/index.js';
import { connectionManager } from './mcp/connection-manager.js';
import type { McpClient } from './mcp/client.js';
import { type OutputFormat, printError } from './formatters/index.js';
import { loadEnums } from './enums/cache.js';
import { classifyError, AuthError, ConnectionError, ServerError, ValidationError } from './errors.js';

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
      printError('Run "bo config set" to update your token.');
    } else if (classified instanceof ConnectionError) {
      printError(`${context}: ${classified.message}`);
      printError('Run "bo config test" to check connectivity.');
    } else if (classified instanceof ServerError) {
      printError(`${context}: ${classified.message}`);
    } else if (classified instanceof ValidationError) {
      printError(`${context}: ${classified.message}`);
    } else {
      printError(`${context}: ${classified.message}`);
    }
  }

  protected async withConnection<T>(
    serverName: string,
    fn: (client: McpClient) => Promise<T>,
    options?: { loadEnums?: boolean }
  ): Promise<T> {
    const config = await loadConfig();
    const env = getActiveEnvironment(config);
    connectionManager.setConfig(config, env);
    this.debugLog('Server', serverName);
    this.debugLog('Environment', env);
    try {
      await connectionManager.connectToServer(serverName);
      const client = connectionManager.getClient(serverName);
      if (!client) {
        throw new Error(`Failed to connect to ${serverName} server`);
      }
      this.debugLog('Connected', `${serverName} OK`);
      if (this.debugMode) {
        client.debugLog = (label, data) => this.debugLog(label, data);
      }
      if (options?.loadEnums) {
        await loadEnums(client);
      }
      return await fn(client);
    } finally {
      try {
        await connectionManager.disconnectAll();
      } catch {
        // Ignore disconnect errors
      }
    }
  }

  protected async withAllConnections<T>(
    fn: (clients: Map<string, McpClient>) => Promise<T>
  ): Promise<T> {
    const config = await loadConfig();
    connectionManager.setConfig(config, getActiveEnvironment(config));
    try {
      await connectionManager.connectAll();
      const clients = new Map<string, McpClient>();
      for (const conn of connectionManager.getAllConnections()) {
        if (conn.connected) {
          clients.set(conn.name, conn.client);
        }
      }
      return await fn(clients);
    } finally {
      try {
        await connectionManager.disconnectAll();
      } catch {
        // Ignore disconnect errors
      }
    }
  }

  protected resolveServerName(module: string): string {
    const map: Record<string, string> = {
      company: 'customer',
      lead: 'leads',
      project: 'projects',
    };
    return map[module] || module;
  }

  protected entityIdParam(module: string): string {
    const map: Record<string, string> = {
      company: 'companyId',
      lead: 'leadId',
      project: 'projectId',
    };
    return map[module] || 'id';
  }
}

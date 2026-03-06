import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock objects in hoisted scope so they're accessible everywhere
const mockClient = vi.hoisted(() => ({
  callTool: vi.fn(),
  readResource: vi.fn(),
  listTools: vi.fn().mockResolvedValue([]),
  connect: vi.fn(),
  disconnect: vi.fn(),
  isConnected: vi.fn().mockReturnValue(true),
  debugLog: null as unknown,
}));

vi.mock('../src/mcp/connection-manager.js', () => ({
  connectionManager: {
    setConfig: vi.fn(),
    connectToServer: vi.fn(),
    getClient: vi.fn().mockReturnValue(mockClient),
    getAllConnections: vi.fn().mockReturnValue([]),
    connectAll: vi.fn(),
    disconnectAll: vi.fn(),
  },
}));

vi.mock('../src/config/index.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({
      defaultEnvironment: 'test',
      environments: {
        test: {
          servers: {
            customer: { url: 'http://localhost:3001' },
            leads: { url: 'http://localhost:3002' },
            projects: { url: 'http://localhost:3003' },
            ncr: { url: 'http://localhost:3004' },
          },
          token: 'test-token',
        },
      },
      defaults: { outputFormat: 'table', pageSize: 25, color: true },
    }),
  };
});

vi.mock('../src/enums/cache.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    loadEnums: vi.fn().mockResolvedValue(undefined),
  };
});

// Helper to run oclif commands
async function runCommand(CommandClass: { run(argv: string[]): Promise<unknown> }, argv: string[] = []) {
  return CommandClass.run(argv);
}

describe('Command tests', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('companies list', () => {
    it('calls retrieve_companies and outputs result', async () => {
      const mcpResponse = {
        content: [{ type: 'text', text: JSON.stringify({ data: [{ id: '1', companyName: 'Acme' }], totalCount: 1 }) }],
      };
      mockClient.callTool.mockResolvedValue(mcpResponse);

      const { default: Cmd } = await import('../src/commands/companies/list.js');
      await runCommand(Cmd, ['--json']);

      expect(mockClient.callTool).toHaveBeenCalledWith('retrieve_companies', expect.any(Object));
      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Acme');
    });

    it('passes search and type params', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
      });

      const { default: Cmd } = await import('../src/commands/companies/list.js');
      await runCommand(Cmd, ['--search', 'Acme', '--type', 'Customer', '--json']);

      expect(mockClient.callTool).toHaveBeenCalledWith('retrieve_companies', expect.objectContaining({
        search: 'Acme',
        companyTypeName: 'Customer',
      }));
    });

    it('passes pagination params', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
      });

      const { default: Cmd } = await import('../src/commands/companies/list.js');
      await runCommand(Cmd, ['--limit', '10', '--offset', '5', '--sort', '-name', '--json']);

      expect(mockClient.callTool).toHaveBeenCalledWith('retrieve_companies', expect.objectContaining({
        limit: 10,
        offset: 5,
        sort: '-name',
      }));
    });
  });

  describe('leads list', () => {
    it('calls retrieve_all_leads with params', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify([{ id: '1', leadName: 'Deal' }]) }],
      });

      const { default: Cmd } = await import('../src/commands/leads/list.js');
      await runCommand(Cmd, ['--search', 'Deal', '--json']);

      expect(mockClient.callTool).toHaveBeenCalledWith('retrieve_all_leads', expect.objectContaining({
        search: 'Deal',
      }));
    });
  });

  describe('contacts list', () => {
    it('calls retrieve_contacts', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify([{ id: '1', contactName: 'John' }]) }],
      });

      const { default: Cmd } = await import('../src/commands/contacts/list.js');
      await runCommand(Cmd, ['--json']);

      expect(mockClient.callTool).toHaveBeenCalledWith('retrieve_contacts', expect.any(Object));
    });
  });

  describe('projects list', () => {
    it('calls retrieve_all_projects', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify([{ id: '1', projectName: 'Proj' }]) }],
      });

      const { default: Cmd } = await import('../src/commands/projects/list.js');
      await runCommand(Cmd, ['--json']);

      expect(mockClient.callTool).toHaveBeenCalledWith('retrieve_all_projects', expect.any(Object));
    });
  });

  describe('ncr list', () => {
    it('calls retrieve_all_ncrs', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify([{ id: '1', title: 'NCR-1' }]) }],
      });

      const { default: Cmd } = await import('../src/commands/ncr/list.js');
      await runCommand(Cmd, ['--json']);

      expect(mockClient.callTool).toHaveBeenCalledWith('retrieve_all_ncrs', expect.any(Object));
    });
  });

  describe('timeline list', () => {
    it('calls correct tool based on module', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify([{ id: '1', name: 'Event' }]) }],
      });

      const { default: Cmd } = await import('../src/commands/timeline/list.js');
      await runCommand(Cmd, ['company', 'entity-123', '--json']);

      expect(mockClient.callTool).toHaveBeenCalledWith('retrieve_company_timeline_events', expect.objectContaining({
        companyId: 'entity-123',
      }));
    });

    it('resolves lead module correctly', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
      });

      const { default: Cmd } = await import('../src/commands/timeline/list.js');
      await runCommand(Cmd, ['lead', 'lead-456', '--json']);

      expect(mockClient.callTool).toHaveBeenCalledWith('retrieve_lead_timeline_events', expect.objectContaining({
        leadId: 'lead-456',
      }));
    });
  });

  describe('output formats', () => {
    it('outputs JSON when --json flag is used', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ id: '1', name: 'Test' }) }],
      });

      const { default: Cmd } = await import('../src/commands/companies/list.js');
      await runCommand(Cmd, ['--json']);

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('outputs CSV when --csv flag is used', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify([{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }]) }],
      });

      const { default: Cmd } = await import('../src/commands/companies/list.js');
      await runCommand(Cmd, ['--csv']);

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('id,name');
      expect(output).toContain('1,Alice');
    });
  });

  describe('error handling', () => {
    it('prints classified error on connection failure', async () => {
      mockClient.callTool.mockRejectedValue(new Error('ECONNREFUSED'));

      const { default: Cmd } = await import('../src/commands/companies/list.js');

      await expect(runCommand(Cmd, ['--json'])).rejects.toThrow();

      const errorOutput = consoleErrorSpy.mock.calls.map(c => c[0]).join('\n');
      expect(errorOutput).toContain('Failed to list companies');
    });

    it('prints auth error hint for 401', async () => {
      mockClient.callTool.mockRejectedValue(new Error('401 Unauthorized'));

      const { default: Cmd } = await import('../src/commands/companies/list.js');

      await expect(runCommand(Cmd, ['--json'])).rejects.toThrow();

      const errorOutput = consoleErrorSpy.mock.calls.map(c => c[0]).join('\n');
      expect(errorOutput).toContain('config set');
    });
  });

  describe('server error detection', () => {
    it('detects success: false in MCP response', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Something went wrong' }) }],
      });

      // Use companies update — no enum validation, just sends fields through
      const { default: Cmd } = await import('../src/commands/companies/update.js');
      await runCommand(Cmd, ['company-123', '--name', 'Updated Name', '--json']);

      // The output should contain the error from the server response
      const allOutput = [...consoleSpy.mock.calls, ...consoleErrorSpy.mock.calls]
        .map(c => String(c[0]))
        .join('\n');
      expect(allOutput).toContain('Something went wrong');
    });
  });

  describe('BaseCommand helpers', () => {
    it('resolveServerName maps modules correctly', async () => {
      const { BaseCommand } = await import('../src/base-command.js');
      // Create a concrete subclass to test protected methods
      class TestCmd extends BaseCommand {
        async run() { /* noop */ }
        testResolve(m: string) { return this.resolveServerName(m); }
        testEntityId(m: string) { return this.entityIdParam(m); }
        testFormat(f: { json?: boolean; csv?: boolean }) { return this.getFormat(f); }
      }
      const cmd = new TestCmd([], {} as never);
      expect(cmd.testResolve('company')).toBe('customer');
      expect(cmd.testResolve('lead')).toBe('leads');
      expect(cmd.testResolve('project')).toBe('projects');
    });

    it('entityIdParam maps modules correctly', async () => {
      const { BaseCommand } = await import('../src/base-command.js');
      class TestCmd extends BaseCommand {
        async run() { /* noop */ }
        testEntityId(m: string) { return this.entityIdParam(m); }
      }
      const cmd = new TestCmd([], {} as never);
      expect(cmd.testEntityId('company')).toBe('companyId');
      expect(cmd.testEntityId('lead')).toBe('leadId');
      expect(cmd.testEntityId('project')).toBe('projectId');
    });

    it('getFormat returns correct format from flags', async () => {
      const { BaseCommand } = await import('../src/base-command.js');
      class TestCmd extends BaseCommand {
        async run() { /* noop */ }
        testFormat(f: { json?: boolean; csv?: boolean }) { return this.getFormat(f); }
      }
      const cmd = new TestCmd([], {} as never);
      expect(cmd.testFormat({ json: true })).toBe('json');
      expect(cmd.testFormat({ csv: true })).toBe('csv');
      expect(cmd.testFormat({})).toBe('table');
    });
  });
});

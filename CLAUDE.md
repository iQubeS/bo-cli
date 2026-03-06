# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

bo-cli is a CLI tool for the Business Online platform. It communicates with four remote MCP (Model Context Protocol) servers — Customer, Leads, Projects, and Nonconformance — over Streamable HTTP transport using JSON-RPC 2.0. Built with oclif (v4), TypeScript (ESM), and the official `@modelcontextprotocol/sdk`.

## Commands

```bash
npm run build        # Compile TypeScript (tsc) → dist/ + generate oclif.manifest.json
npm run dev          # Build + run (tsc && node ./dist/bin/run.js)
npm test             # Run tests with vitest
npm run lint         # Type-check only (tsc --noEmit)
```

Run the CLI locally: `./bin/bo <command>` (e.g. `./bin/bo status`, `./bin/bo companies list`).

Run a single test: `npx vitest run test/cache.test.ts`

## Architecture

### MCP Client Layer (`src/mcp/`)
- **`client.ts`** — `McpClient` wraps the MCP SDK's `Client` class. Uses `client.listTools()`, `client.callTool()`, and `client.readResource()` via `StreamableHTTPClientTransport` with Bearer token auth. Reads CLI version from `package.json` automatically.
- **`connection-manager.ts`** — Singleton `ConnectionManager` manages lazy connections to the four servers (`customer`, `leads`, `projects`, `ncr`).

### BaseCommand (`src/base-command.ts`)
All MCP-connected commands extend `BaseCommand` which provides:
- `withConnection(serverName, fn)` — handles config loading, connect, load enums, execute, and disconnect (in `finally`) in one call.
- `withAllConnections(fn)` — same but connects to all four servers.
- `getFormat(flags)` — resolves `--json`/`--csv` flags to OutputFormat.
- `resolveServerName(module)` — maps module names to server names: `company` → `customer`, `lead` → `leads`, `project` → `projects`.
- `entityIdParam(module)` — maps module names to MCP entity ID parameter names: `company` → `companyId`, `lead` → `leadId`, `project` → `projectId`.

### Command Pattern (`src/commands/`)
Commands are oclif command classes organized by module: `companies/`, `contacts/`, `leads/`, `projects/`, `ncr/`, `timeline/`, `qcp/`, `config/`.

Command flow: `this.withConnection(serverName, client => client.callTool(...))` → format output → done. Disconnect is always handled by BaseCommand's `finally` block.

Cross-module commands (`timeline/`, `qcp/`) use a `toolMap` to resolve module name → MCP tool name, and `this.resolveServerName()` for module → server mapping.

### Enums (`src/enums/`)
- **`cache.ts`** — Fetches enum values from the MCP server resource `business-online://enums` on first connection (via `loadEnums()` in `withConnection`). Getter functions (e.g. `leadsStatus()`, `projectActivity()`) return server values with static fallback.
- **`index.ts`** — Static `as const` arrays as fallback values, plus `validateEnum()` utility.
- Commands import getters from `cache.ts` for both validation (`validateEnum(value, leadsStatus(), ...)`) and interactive dropdowns (`promptSelect('Status:', leadsStatus())`).
- `bo config enums` command displays the current server enum values.

**IMPORTANT**: MCP tools use module-prefixed parameter names (e.g. `companyId`, `leadName`, `leadsStatus`, `contactLegalBasis`) not generic names (`id`, `name`, `status`). CLI flag names are user-friendly but must be mapped to MCP parameter names in `collectFields()` and `callTool()` calls.

### Config (`src/config/index.ts`)
Config lives at `~/.bo-cli/config.json` (created with 0600 permissions). Uses cosmiconfig for discovery. Supports multiple environments (production/development). Active env from `BO_CLI_ENV` env var or config default. Token from `BO_CLI_TOKEN` env var or config.

### Error Handling (`src/errors.ts`)
Typed error classes: `AuthError`, `ConnectionError`, `ServerError`, `ValidationError`. `classifyError()` inspects error messages and returns the appropriate type. `BaseCommand.printClassifiedError()` prints context-aware messages with remediation hints (e.g. "Run bo config set" for auth errors).

### Formatters (`src/formatters/`)
- `index.ts` — `unwrapMcpResponse()` extracts `content[0].text` from MCP SDK responses. `formatOutput()` unwraps, then renders as table (cli-table3), JSON, or CSV. Also exports `printSuccess`, `printError`, `printWarning`, `printInfo`.
- `splash.ts` — ASCII art banner for `bo status`.

### Utils (`src/utils/`)
- `cache.ts` — Singleton `CacheManager` with TTL-based memory cache + lazy disk persistence at `~/.bo-cli/cache/cache.json`. Used by reference data commands (types, departments) with 10-minute TTL.
- `interactive.ts` — `promptText`, `promptSelect` (dropdown from enum values), `promptConfirm`, `promptEditor`, `createSpinner`, `printPreview` for `--preview` dry-run mode.

## Key Conventions

- ESM throughout (`"type": "module"` in package.json, `.js` extensions in imports)
- Four MCP servers, each mapped to a module: `customer` (companies+contacts), `leads`, `projects`, `ncr`
- Module-to-server mapping: `company` → `customer`, `lead` → `leads`, `project` → `projects`
- All commands extend `BaseCommand` (except `cache`, `config/set`, `config/show`, `config/test`)
- All commands support `--json`, `--csv`, and `--debug` output flags
- List commands support `--limit`, `--offset`, `--sort`, `--search` pagination flags
- Create/update commands support `--interactive` and `--preview` flags
- Error handling uses typed errors (`src/errors.ts`) with `classifyError()` and `printClassifiedError()`
- Enum values fetched from server at runtime (`src/enums/cache.ts`), with static fallback (`src/enums/index.ts`)
- Enum fields use `promptSelect()` in interactive mode and `validateEnum()` in flag mode
- Config stored at `~/.bo-cli/config.json`, cache at `~/.bo-cli/cache/`
- Tests use vitest; test files in `test/` directory (formatters, enums, errors, config, cache, commands)
- BaseCommand lives in `src/base-command.ts` (NOT in `src/commands/` to avoid oclif command discovery)
- `oclif.manifest.json` generated by `postbuild` script; required for `bo --help` to show all topics
- Global install: `npm link` after build; shell completions via `bo autocomplete`

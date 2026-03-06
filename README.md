# bo-cli

Command-line interface for the [Business Online](https://business-online.no) platform.

Communicates with Business Online MCP servers over Streamable HTTP (JSON-RPC 2.0) to manage companies, contacts, leads, projects, NCRs, timelines, and QCPs.

## Installation

Requires [Node.js](https://nodejs.org) 18 or later.

**From GitHub (recommended):**

```bash
npm install -g github:iQubeS/bo-cli
```

**From source:**

```bash
git clone https://github.com/iQubeS/bo-cli.git
cd bo-cli
npm install
npm run build
npm link
```

## Setup

```bash
bo config set --interactive
```

This prompts for your environment name, Bearer token, and server URLs. Configuration is stored at `~/.bo-cli/config.json`.

Alternatively, set environment variables:

```bash
export BO_CLI_ENV=production
export BO_CLI_TOKEN=your-bearer-token
```

Verify your setup:

```bash
bo status        # Shows connection status for all servers
bo config test   # Tests connectivity and lists available tools
```

## Shell Completions

```bash
bo autocomplete bash         # Bash
bo autocomplete zsh          # Zsh
bo autocomplete powershell   # PowerShell
```

## Commands

### Companies

| Command | Description |
|---------|-------------|
| `bo companies list` | List all companies |
| `bo companies get <id>` | Get a company by ID |
| `bo companies create` | Create a new company |
| `bo companies update <id>` | Update a company |
| `bo companies types` | List company types |

### Contacts

| Command | Description |
|---------|-------------|
| `bo contacts list` | List all contacts |
| `bo contacts get <id>` | Get a contact by ID |
| `bo contacts create` | Create a new contact |
| `bo contacts update <id>` | Update a contact |

### Leads

| Command | Description |
|---------|-------------|
| `bo leads list` | List all leads |
| `bo leads get <id>` | Get a lead by ID |
| `bo leads create` | Create a new lead |
| `bo leads update <id>` | Update a lead |
| `bo leads dashboard` | Show leads dashboard |
| `bo leads types` | List lead types |
| `bo leads meddic <id>` | Collect MEDDIC data |

### Projects

| Command | Description |
|---------|-------------|
| `bo projects list` | List all projects |
| `bo projects get <id>` | Get a project by ID |
| `bo projects create` | Create a new project |
| `bo projects update <id>` | Update a project |
| `bo projects dashboard` | Show projects dashboard |
| `bo projects types` | List project types |
| `bo projects departments` | List departments |

### NCR (Non-Conformance Reports)

| Command | Description |
|---------|-------------|
| `bo ncr list` | List all NCRs |
| `bo ncr get <id>` | Get an NCR by ID |
| `bo ncr create` | Create a new NCR |
| `bo ncr update <id>` | Update an NCR |

### Timeline (cross-module)

| Command | Description |
|---------|-------------|
| `bo timeline list <module> <entity-id>` | List timeline events |
| `bo timeline get <module> <entity-id> <timeline-id>` | Get a timeline event |
| `bo timeline create <module> <entity-id>` | Create a timeline event |
| `bo timeline update <module> <entity-id> <timeline-id>` | Update a timeline event |

Module can be `company`, `lead`, or `project`.

### QCP (Quality Control Plans, cross-module)

| Command | Description |
|---------|-------------|
| `bo qcp list <module> <entity-id>` | List QCPs |
| `bo qcp get <module> <entity-id> <qcp-id>` | Get a QCP |

### Configuration

| Command | Description |
|---------|-------------|
| `bo config set --interactive` | Configure the CLI |
| `bo config show` | Show current configuration |
| `bo config test` | Test server connectivity |
| `bo config enums` | Show valid enum values |
| `bo cache clear` | Clear the CLI cache |

## Common Flags

| Flag | Description | Available on |
|------|-------------|-------------|
| `--json` | Output as JSON | All list/get commands |
| `--csv` | Output as CSV | All list/get commands |
| `--interactive` | Interactive mode with prompts | Create/update commands |
| `--preview` | Dry-run, show what would change | Create/update commands |
| `--debug` | Show request/response details | All commands |
| `--limit <n>` | Records per page | List commands |
| `--offset <n>` | Pagination offset | List commands |
| `--sort <fields>` | Sort (prefix `-` for desc) | List commands |
| `--search <text>` | Search filter | Some list commands |

## Examples

```bash
# List companies as a table
bo companies list

# Search leads and output as JSON
bo leads list --search "Acme" --json

# Create a contact interactively
bo contacts create --interactive

# Preview what a project update would do
bo projects update proj-123 --name "New Name" --preview

# Get a company with debug output
bo companies get comp-456 --debug

# List timeline events for a lead
bo timeline list lead lead-789

# Show valid enum values for leads
bo config enums --category leads

# Paginate through NCRs
bo ncr list --limit 10 --offset 20 --sort -createdDate
```

## Development

```bash
npm run build        # Compile TypeScript + generate oclif manifest
npm test             # Run tests (vitest)
npm run lint         # Type-check (tsc --noEmit)
```

Run a single test:

```bash
npx vitest run test/formatters.test.ts
```

## Architecture

```
src/
  base-command.ts           # BaseCommand with MCP connection, error handling, debug
  commands/                 # oclif commands organized by module
    companies/              # list, get, create, update, types
    contacts/               # list, get, create, update
    leads/                  # list, get, create, update, dashboard, types, meddic
    projects/               # list, get, create, update, dashboard, types, departments
    ncr/                    # list, get, create, update
    timeline/               # list, get, create, update (cross-module)
    qcp/                    # list, get (cross-module)
    config/                 # set, show, test, enums
    cache.ts, status.ts
  mcp/
    client.ts               # McpClient wrapping @modelcontextprotocol/sdk
    connection-manager.ts   # Singleton managing 4 server connections
  config/index.ts           # Config loading/saving (~/.bo-cli/config.json)
  enums/                    # Server-fetched enum values with static fallbacks
  errors.ts                 # Typed errors (Auth, Connection, Server, Validation)
  formatters/               # Table, JSON, CSV output + MCP response unwrapping
  utils/                    # Cache manager, interactive prompts
```

The CLI connects to four MCP servers: **Customer** (companies + contacts), **Leads**, **Projects**, and **NCR**. Each command calls `this.withConnection(serverName, fn)` which handles config loading, connection, enum loading, execution, and disconnect.

## License

Copyright (c) 2026 Business Online AS. All rights reserved. See [LICENSE](LICENSE).

## Contact

[Business Online AS](https://business-online.no)

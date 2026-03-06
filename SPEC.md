# BUSINESS ONLINE CLI - Kravspesifikasjon

## 1. Sammendrag og visjon

### 1.1 Prosjektbeskrivelse
Business Online CLI (bo-cli) er et kommandolinjeverktøy som gir direkte tilgang til Business Online-plattformens fulle funksjonalitet fra terminalen. Verktøyet er rettet mot utviklere, konsulenter og avanserte brukere som ønsker effektiv, skriptbar tilgang til CRM-, salgs-, prosjekt- og kvalitetsstyringsdata uten å gå via webgrensesnittet.

CLI-en kommuniserer med Business Onlines fire MCP-servere (Customer, Leads, Projects, Nonconformance) via Model Context Protocol (MCP) over Streamable HTTP-transport.

### 1.2 Mål
- Gi fullverdig CRUD-tilgang til alle fire Business Online-moduler fra terminalen
- Følge MCP-protokollstandarden for transport, livssyklus og verktøykall
- Støtte både interaktiv bruk og skripting/automatisering
- Levere profesjonell UX med fargekodet output, tabellformatering og progressindikatorer
- Være enkel å installere og konfigurere på tvers av Windows, macOS og Linux
- Gi et visuelt og profesjonelt førsteinntrykk med ASCII-art velkomstbilde ved oppstart

### 1.3 Målgruppe
- Business Online-utviklere og systemintegratører
- Konsulenter som jobber med klientimplementasjoner
- DevOps og CI/CD-pipelines som trenger automatisert tilgang til Business Online-data
- Avanserte sluttbrukere som foretrekker terminalen fremfor webgrensesnitt

---

## 2. Arkitektur

### 2.1 Overordnet arkitektur
CLI-en er designet som en MCP-klient som kommuniserer med fire separate MCP-servere. Hver server eksponerer et sett med verktøy (tools) via MCP-protokollen. CLI-en bruker det offisielle TypeScript SDK-et (@modelcontextprotocol/sdk) for å håndtere JSON-RPC 2.0-meldinger, protokollforhandling og transportlaget.

### 2.2 Teknologistakk

| Komponent | Teknologi | Begrunnelse |
|-----------|-----------|-------------|
| Språk | TypeScript 5.x | Typesikkerhet, SDK-kompatibilitet |
| CLI-rammeverk | oclif v4 | Plugin-system, auto-hjelp, testing |
| MCP-klient | @modelcontextprotocol/sdk | Offisiell SDK med Streamable HTTP |
| Transport | StreamableHTTPClientTransport | MCP 2025-06-18 standard |
| Validering | Zod v4 | Påkrevd av MCP SDK |
| Output | chalk, cli-table3, ora | Farger, tabeller, spinners |
| Interaktiv modus | @inquirer/prompts | Interaktive spørsmål og valg |
| Konfigurasjon | cosmiconfig | Fleksibel config-oppdagelse |
| Pakkering | oclif pack | Distribuerbar uten Node.js |
| Runtime | Node.js >= 18 LTS | Web Crypto API-støtte |

---

## 3. MCP-protokoll og transport

### 3.1 Protokolloversikt
- Protokollversjon: 2025-06-18 (nyeste stabile spesifikasjon)
- Meldingsformat: JSON-RPC 2.0 over UTF-8
- Transport: Streamable HTTP

### 3.2 Streamable HTTP Transport
Brukes for remote MCP-servere. Krever:
- POST for requests
- GET for server-initierte SSE-strømmer
- DELETE for sesjonsavslutning
- Bearer token i Authorization-header
- MCP-Protocol-Version header etter initialisering

### 3.3 Implementasjon
```typescript
const transport = new StreamableHTTPClientTransport(
  new URL(serverUrl),
  {
    requestInit: {
      headers: {
        'Authorization': `Bearer ${token}`,
        'MCP-Protocol-Version': '2025-06-18'
      }
    }
  }
);
```

### 3.4 MCP-livssyklus
1. **Initialisering**: initialize-request → server svarer → initialized-notifikasjon
2. **Operasjon**: tools/list for å oppdage verktøy, tools/call for å utføre
3. **Avslutning**: DELETE-request for å avslutte sesjonen

### 3.5 SSE Fallback
 Ved HTTP 4xx på POST, forsøk GET for SSE-strøm (gammel transport).

---

## 4. Business Online MCP-servere

### 4.1 Serveroversikt

| Modul | Domene | Antall tools | Nøkkelfunksjon |
|-------|--------|--------------|----------------|
| Customer | Kunder og kontakter | 15 | CRM, leverandørstyring, QCP-er |
| Leads | Salgsmuligheter | 13 | Pipeline, MEDDIC, LCM-status |
| Projects | Prosjekter | 13 | Prosjektstyring, fremdrift, QCP-er |
| NCR | Avvikshåndtering | 4 | NCR-kort, årsaksanalyse |

### 4.2 Customer-modul (15 verktøy)

**Company-operasjoner:**
- `retrieve_companies` - LIST
- `retrieve_company_by_id` - GET
- `create_company` - CREATE
- `update_company` - UPDATE
- `get_all_company_types` - LIST (referansedata)

**Contact-operasjoner:**
- `retrieve_contacts` - LIST
- `retrieve_contact_info` - GET
- `create_contact` - CREATE
- `update_contact` - UPDATE

**Timeline og QCP:**
- `retrieve_company_timeline_events` - LIST
- `retrieve_company_timeline_event` - GET
- `create_company_timeline_event` - CREATE
- `update_company_timeline_event` - UPDATE
- `retrieve_all_company_qcps` - LIST
- `retrieve_company_qcp` - GET

### 4.3 Leads-modul (13 verktøy)

- `retrieve_all_leads` - LIST
- `retrieve_leads_dashboard` - DASH
- `retrieve_lead` - GET
- `create_lead` - CREATE
- `update_lead` - UPDATE
- `collect_meddic_data` - MEDDIC
- `get_all_lead_types` - LIST
- `retrieve_lead_timeline_events` - LIST
- `retrieve_lead_timeline_event` - GET
- `create_lead_timeline_event` - CREATE
- `update_lead_timeline_event` - UPDATE
- `retrieve_all_lead_qcps` - LIST
- `retrieve_lead_qcp` - GET

### 4.4 Projects-modul (13 verktøy)

- `retrieve_all_projects` - LIST
- `retrieve_projects_dashboard` - DASH
- `retrieve_project` - GET
- `create_project` - CREATE
- `update_project` - UPDATE
- `get_all_project_types` - REF
- `get_all_departments` - REF
- `retrieve_project_timeline_events` - LIST
- `retrieve_project_timeline_event` - GET
- `create_project_timeline_event` - CREATE
- `update_project_timeline_event` - UPDATE
- `retrieve_all_project_qcps` - LIST
- `retrieve_project_qcp` - GET

### 4.5 Nonconformance-modul (4 verktøy)

- `retrieve_all_ncrs` - LIST
- `retrieve_specific_ncr_card` - GET
- `create_ncr_card` - CREATE
- `update_specific_ncr_card` - UPDATE

---

## 5. Kommandostruktur

### 5.1 Kommandohierarki
`bo <modul> <handling> [opsjoner]`

### 5.2 Globale flagg
- `--json` - Output som JSON
- `--csv` - Output som CSV
- `--no-color` - Deaktiver fargekodet output
- `--env` - Velg miljø (default: standard)
- `--verbose` - Vis detaljert debug-info
- `--quiet` - Minimer output

### 5.3 Company-kommandoer
```
bo companies list [--search <tekst>] [--type <type>] [--sort <felt>]
bo companies get <id>
bo companies create [--name <navn>] [--type-id <id>] [--interactive]
bo companies update <id> [--name <navn>] [--active true|false]
bo companies types
```

### 5.4 Contact-kommandoer
```
bo contacts list [--company-id <id>] [--search <tekst>]
bo contacts get <id>
bo contacts create [--name <navn>] [--email <e-post>] [--interactive]
bo contacts update <id> [--name <navn>] [--email <e-post>]
```

### 5.5 Lead-kommandoer
```
bo leads list [--status Active|Won|Lost|...] [--type <type>]
bo leads dashboard --type <type> [--status <status>]
bo leads get <id>
bo leads create [--name <navn>] [--company-id <id>] [--interactive]
bo leads update <id> [--status <status>] [--lcm-status <status>]
bo leads meddic <id>
bo leads types
```

### 5.6 Project-kommandoer
```
bo projects list [--activity Started|Completed|...] [--type <type>]
bo projects dashboard --type <type> [--activity <aktivitet>]
bo projects get <id>
bo projects create [--name <navn>] [--company-id <id>] [--interactive]
bo projects update <id> [--activity <aktivitet>] [--name <navn>]
bo projects types
bo projects departments
```

### 5.7 NCR-kommandoer
```
bo ncr list [--type 'Customer Feedback'|...] [--search <tekst>]
bo ncr get <id>
bo ncr create [--title <tittel>] [--type <type>] [--interactive]
bo ncr update <id> [--status <status>]
```

### 5.8 Timeline-kommandoer (tversgående)
```
bo timeline list <modul> <entitet-id> [--log-type Meeting|Email|...]
bo timeline get <modul> <entitet-id> <timeline-id>
bo timeline create <modul> <entitet-id> [--interactive]
bo timeline update <modul> <entitet-id> <timeline-id>
```

### 5.9 QCP-kommandoer (tversgående)
```
bo qcp list <modul> <entitet-id>
bo qcp get <modul> <entitet-id> <qcp-id>
```

### 5.10 Systemkommandoer
```
bo config set [--interactive]
bo config show
bo config test
bo status
bo version
```

---

## 6. Konfigurasjon

### 6.1 Konfigurasjonsfil
Lagring: `~/.bo-cli/config.json` (bruker cosmiconfig)

```json
{
  "defaultEnvironment": "production",
  "environments": {
    "production": {
      "servers": {
        "customer": { "url": "https://ca-bo-mcp-customer-....azurecontainerapps.io/mcp" },
        "leads": { "url": "https://..." },
        "projects": { "url": "https://..." },
        "ncr": { "url": "https://..." }
      },
      "token": "<bearer-token>"
    },
    "development": { ... }
  },
  "defaults": {
    "outputFormat": "table",
    "pageSize": 25,
    "color": true
  }
}
```

### 6.2 Token-sikkerhet
- Lagres kryptert lokalt med OS-spesifikk keychain-integrasjon (valgfritt)
- Alternativt: miljøvariabel `BO_CLI_TOKEN`
- Config-filen bør ha 600-rettigheter

### 6.3 Miljøvariabler
- `BO_CLI_TOKEN` - Bearer token
- `BO_CLI_ENV` - Aktivt miljø
- `BO_CLI_CONFIG` - Sti til config-fil
- `NO_COLOR` - Deaktiver farger

---

## 7. Enum-verdier og validering

### 7.1 Lead-enum-verdier
- **leadsStatus**: Pending, Active, Won, Lost, On hold, Abandoned
- **leadsLcmStatus**: Registered, Assigned, Evaluation, Appointment scheduled, Proposal sent, Negotiating proposal
- **leadsProbability**: 0 %, 10 %, 40 %, 60 %, 65%, 80%, 90%, 100 %

### 7.2 Project-enum-verdier
- **projectActivity**: Not started, Started, Pending, Continuous, Completed, Archived

### 7.3 NCR-enum-verdier
- **ncrType**: Customer Feedback, Non-Conformance, Observation, Improvements, Supplier Deviation
- **ncrDirectCause**: Equipment, Enviorment, Process, Staff
- **ncrCategory**: HSE, Quality
- **ncrFeedbackType**: Positive, Neutral, Negative
- **ncrLocation**: Stavanger Office, India Office, Customer Site

### 7.4 Contact- og Company-enum-verdier
- **contactStatus**: Active, Retired
- **contactLegalBasis**: Legitimate interest - for doing business, Freely given consent, Not applicable
- **supplierCategory**: A - Critical Supplier, B - Key suppliers, C - Other

### 7.5 Timeline-enum-verdier
- **logType**: Relations, Email, General, Meeting, Phone Call, Task

---

## 8. Brukeropplevelse og visuelt design

### 8.1 Velkomstbilde (Splash Screen)
Ved første kjøring eller `bo status`:

```
╔═════════════════════════════════════════════════╗
║  ____ _                                           ║
║ | __ ) _ _ ___(_)_ __ ___ ___ ___                ║
║ | _ \| | | / __| | '_ \ / _ \/ __|               ║
║ | |_) | |_| \__ \ | | | | __/\__ \               ║
║ |____/ \__,_|___/_|_| |_|\___||___/             ║
║  ___ _ _                                           ║
║ / _ \ _ __ | (_)_ __ ___                          ║
║| | | | '_ \| | | '_ \ / _ \                       ║
║| |_| | | | | | | | | | __/                       ║
║ \___/|_| |_|_|_|_| |_|\___|                       ║
║                                                      ║
║  v1.0.0 | Production | 4/4 servers ✓              ║
╚═════════════════════════════════════════════════╝
```

### 8.2 Output-formater
- **Tabellformat** (standard): Pretty-printed med cli-table3
- **JSON-format**: `--json` flagg, ingen ekstra tekst
- **CSV-format**: `--csv` flagg for import

### 8.3 Interaktiv modus
- `--interactive` flagg aktiverer @inquirer/prompts
- Enum-felt som valgmenyer
- Referansedata lastes og vises som valg

### 8.4 Progressindikatorer
- Ora-spinners under MCP-kall
- `--quiet` modus undertrykker spinners
- `--verbose` viser JSON-RPC-meldinger

### 8.5 Feilmeldinger
- Handlingsrettede med forslag til løsning
- Ved ugyldig enum-vis de gyldige alternativene
- Ved tilkoblingsfeil vises `bo config test`
- Ved autentiseringsfeil foreslås `bo config set --token`

---

## 9. Tilkoblingshåndtering

### 9.1 MCP Client Manager
`ConnectionManager` håndterer tilkoblinger til alle fire MCP-servere. Tilkoblinger opprettes lazily.

### 9.2 Tilkoblingsflyt
1. Les konfigurert server-URL og token for valgt miljø
2. Opprett StreamableHTTPClientTransport med Bearer token
3. Opprett MCP Client-instans
4. Kjør `client.connect(transport)` for MCP initialize-handshake
5. Ved suksess: klar for tools/list og tools/call
6. Ved feil: prøv SSE-fallback, deretter rapporter feil

### 9.3 Timeout og retry
- HTTP-timeout: 30 sekunder
- MCP initialize-timeout: 10 sekunder
- Retry ved nettverksfeil: 3 forsøk med eksponentiell backoff (1s, 2s, 4s)
- Ingen retry ved 401/403 eller 400

---

## 10. Prosjektstruktur

```
bo-cli/
├── src/
│   ├── commands/           # oclif kommandoer
│   │   ├── companies/      # list, get, create, update, types
│   │   ├── contacts/      # list, get, create, update
│   │   ├── leads/         # list, get, create, update, dashboard, meddic, types
│   │   ├── projects/      # list, get, create, update, dashboard, types, departments
│   │   ├── ncr/           # list, get, create, update
│   │   ├── timeline/      # list, get, create, update
│   │   ├── qcp/           # list, get
│   │   ├── config/        # set, show, test
│   │   └── status.ts     # Systemstatus med splash
│   ├── mcp/               # MCP-klientlag
│   │   ├── connection-manager.ts
│   │   ├── client-factory.ts
│   │   ├── tool-caller.ts
│   │   └── types.ts
│   ├── config/            # Konfigurasjonsmodul
│   │   ├── loader.ts
│   │   ├── schema.ts
│   │   └── defaults.ts
│   ├── enums/             # Hardkodede enum-verdier
│   ├── formatters/        # Output-formatering
│   │   ├── table.ts
│   │   ├── json.ts
│   │   ├── csv.ts
│   │   └── splash.ts
│   ├── utils/             # Verktøy
│   │   ├── errors.ts
│   │   ├── validators.ts
│   │   └── guid.ts
│   └── base-command.ts    # Abstrakt baseklasse
├── test/                  # Tester
├── bin/                   # Inngangspunkt
├── package.json
└── tsconfig.json
```

---

## 11. Leveranseplan

### Fase 1: Fundament (Uke 1–2)
- Prosjektoppsett med oclif, TypeScript, ESM
- MCP-klientlag med ConnectionManager og StreamableHTTPClientTransport
- Konfigurasjon med cosmiconfig
- BaseCommand abstrakt klasse
- `bo config set/show/test` og `bo status` med velkomstbilde

### Fase 2: Les-operasjoner (Uke 3–4)
- Alle list- og get-kommandoer for alle fire moduler
- Dashboard-kommandoer for Leads og Projects
- Timeline list/get og QCP list/get
- Referansedata-kommandoer
- Tabell-, JSON- og CSV-output

### Fase 3: Skrive-operasjoner (Uke 5–6)
- Alle create- og update-kommandoer
- Interaktiv modus
- Enum-validering
- Timeline create/update
- MEDDIC-analyse for leads

### Fase 4: Polish og distribusjon (Uke 7–8)
- Komplett test-suite
- Tab-completion
- Standalone-pakkering
- README med dokumentasjon
- npm-publisering

---

## 12. Versjonsstrategi

- **package.json**: `"version": "1.0.0"` (npm format)
- **package-solution.json** (om relevant): `"version": "1.0.0.0"` (4-part for SharePoint)

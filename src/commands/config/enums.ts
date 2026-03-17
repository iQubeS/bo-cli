import { Flags } from '@oclif/core';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, isAbsolute } from 'path';
import { BaseCommand } from '../../base-command.js';
import { loadConfig, saveConfig, getActiveEnvironment, getEnvironmentMode, isRestConfig } from '../../config/index.js';
import type { RestEnvironmentConfig, EnumCategoryConfig } from '../../config/index.js';
import { printError, printSuccess, printInfo, printWarning } from '../../formatters/index.js';
import * as enumCache from '../../enums/cache.js';

const CATEGORY_FIELDS: Record<string, string[]> = {
  company: ['companySupplierCategory'],
  leads: ['leadsStatus', 'leadsLcmStatus', 'leadsProbabilityForSale'],
  project: ['projectActivity'],
  contact: ['contactLegalBasis', 'contactStatus'],
  ncr: ['ncrTypeRegistration', 'ncrDirectCause', 'ncrCategory', 'ncrFeedbackType', 'ncrLocation', 'ncrRootCause'],
};

const CATEGORY_TO_CONFIG_KEY: Record<string, keyof EnumCategoryConfig> = {
  company: 'Company',
  leads: 'Leads',
  project: 'Project',
  contact: 'Contact',
  ncr: 'NCR',
};

export default class ConfigEnumsCommand extends BaseCommand {
  static description = 'Show or configure valid enum values';

  static examples = [
    '$ bo config enums',
    '$ bo config enums --category leads',
    '$ bo config enums --set --category leads --field leadsStatus --values "Pending,Active,Won,Lost"',
    '$ bo config enums --reset',
    '$ bo config enums --import --file enums.json',
    '$ bo config enums --export --file enums.json',
    '$ bo config enums --export',
  ];

  static flags = {
    category: Flags.string({
      description: 'Filter by category (company, leads, project, contact, ncr)',
    }),
    set: Flags.boolean({
      description: 'Set enum values for a field (REST mode only)',
      default: false,
    }),
    field: Flags.string({
      description: 'Field name to set (used with --set)',
      dependsOn: ['set'],
    }),
    values: Flags.string({
      description: 'Comma-separated values (used with --set)',
      dependsOn: ['set'],
    }),
    reset: Flags.boolean({
      description: 'Remove all custom enum overrides for current tenant (REST mode only)',
      default: false,
    }),
    import: Flags.boolean({
      description: 'Import enums from a JSON file (REST mode only)',
      default: false,
    }),
    export: Flags.boolean({
      description: 'Export current enums to a JSON file or stdout (REST mode only)',
      default: false,
    }),
    file: Flags.string({
      description: 'Path to JSON file (used with --import or --export)',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ConfigEnumsCommand);

    if (flags.set) {
      return this.handleSet(flags);
    }

    if (flags.reset) {
      return this.handleReset();
    }

    if (flags.import) {
      return this.handleImport(flags);
    }

    if (flags.export) {
      return this.handleExport(flags);
    }

    // Default: display enums
    return this.handleDisplay(flags);
  }

  private async handleDisplay(flags: { category?: string }): Promise<void> {
    try {
      // Connect to load enums (works for both MCP and REST modes)
      await this.withConnection('customer', async () => {
        const allEnums: Record<string, Record<string, readonly string[]>> = {
          company: {
            supplierCategory: enumCache.supplierCategory(),
          },
          leads: {
            leadsStatus: enumCache.leadsStatus(),
            leadsLcmStatus: enumCache.leadsLcmStatus(),
            leadsProbabilityForSale: enumCache.leadsProbability(),
          },
          project: {
            projectActivity: enumCache.projectActivity(),
          },
          contact: {
            contactLegalBasis: enumCache.contactLegalBasis(),
            contactStatus: enumCache.contactStatus(),
          },
          ncr: {
            ncrTypeRegistration: enumCache.ncrType(),
            ncrDirectCause: enumCache.ncrDirectCause(),
            ncrCategory: enumCache.ncrCategory(),
            ncrFeedbackType: enumCache.ncrFeedbackType(),
            ncrLocation: enumCache.ncrLocation(),
            ncrRootCause: enumCache.ncrRootCause(),
          },
          timeline: {
            logType: enumCache.logType(),
          },
        };

        const categoryKey = flags.category?.toLowerCase();
        const categories = categoryKey
          ? { [categoryKey]: allEnums[categoryKey] }
          : allEnums;

        if (categoryKey && !allEnums[categoryKey]) {
          printError(`Unknown category: ${flags.category}. Valid: company, leads, project, contact, ncr, timeline`);
          this.exit(1);
        }

        for (const [category, enums] of Object.entries(categories)) {
          console.log(`\n${category.toUpperCase()}`);
          console.log('─'.repeat(40));
          for (const [field, values] of Object.entries(enums)) {
            console.log(`  ${field}:`);
            for (const value of values) {
              console.log(`    - "${value}"`);
            }
          }
        }
        console.log();
      }, { loadEnums: true });
    } catch (error) {
      this.printClassifiedError(error, 'Failed to load enums');
      this.exit(1);
    }
  }

  private async handleSet(flags: { category?: string; field?: string; values?: string }): Promise<void> {
    const config = await loadConfig();
    const env = getActiveEnvironment(config);
    const envConfig = config.environments[env];

    if (!isRestConfig(envConfig)) {
      printError('Enum configuration is only available in REST API mode.');
      printInfo('In MCP mode, enums are loaded automatically from the server.');
      this.exit(1);
      return;
    }

    if (!flags.category || !flags.field || !flags.values) {
      printError('Required: --category, --field, and --values');
      printInfo('Example: bo config enums --set --category leads --field leadsStatus --values "Pending,Active,Won,Lost"');
      this.exit(1);
      return;
    }

    const categoryKey = flags.category.toLowerCase();
    const configKey = CATEGORY_TO_CONFIG_KEY[categoryKey];
    if (!configKey) {
      printError(`Unknown category: ${flags.category}. Valid: ${Object.keys(CATEGORY_TO_CONFIG_KEY).join(', ')}`);
      this.exit(1);
      return;
    }

    const validFields = CATEGORY_FIELDS[categoryKey];
    if (!validFields?.includes(flags.field)) {
      printError(`Unknown field "${flags.field}" for category "${flags.category}".`);
      printInfo(`Valid fields: ${validFields?.join(', ')}`);
      this.exit(1);
      return;
    }

    const values = flags.values.split(',').map((v) => v.trim()).filter(Boolean);
    if (values.length === 0) {
      printError('At least one value is required');
      this.exit(1);
      return;
    }

    const rest = envConfig as RestEnvironmentConfig;
    const tenantName = rest.tenantName;

    if (!config.enums) config.enums = {};
    if (!config.enums[tenantName]) config.enums[tenantName] = {};
    if (!config.enums[tenantName][configKey]) {
      (config.enums[tenantName] as Record<string, unknown>)[configKey] = {};
    }

    const categoryConfig = config.enums[tenantName][configKey] as Record<string, string[]>;
    categoryConfig[flags.field] = values;

    saveConfig(config);
    printSuccess(`Updated ${flags.field} for tenant "${tenantName}": ${values.join(', ')}`);
  }

  private async handleReset(): Promise<void> {
    const config = await loadConfig();
    const env = getActiveEnvironment(config);
    const envConfig = config.environments[env];

    if (!isRestConfig(envConfig)) {
      printError('Enum configuration is only available in REST API mode.');
      this.exit(1);
      return;
    }

    const rest = envConfig as RestEnvironmentConfig;
    if (config.enums?.[rest.tenantName]) {
      delete config.enums[rest.tenantName];
      saveConfig(config);
      printSuccess(`Custom enum overrides removed for tenant "${rest.tenantName}". Static defaults will be used.`);
    } else {
      printInfo(`No custom enums found for tenant "${rest.tenantName}".`);
    }
  }

  private async handleExport(flags: { file?: string }): Promise<void> {
    const config = await loadConfig();
    const env = getActiveEnvironment(config);
    const envConfig = config.environments[env];

    if (!isRestConfig(envConfig)) {
      printError('Enum export is only available in REST API mode.');
      this.exit(1);
      return;
    }

    const rest = envConfig as RestEnvironmentConfig;

    // Load enums so we get current effective values (custom + defaults)
    try {
      await this.withConnection('customer', async () => {
        const exportData: EnumCategoryConfig = {
          Company: {
            companySupplierCategory: [...enumCache.supplierCategory()],
            companyApprovedSupplier: [...enumCache.approvedSupplier()],
          },
          Leads: {
            leadsStatus: [...enumCache.leadsStatus()],
            leadsLcmStatus: [...enumCache.leadsLcmStatus()],
            leadsProbabilityForSale: [...enumCache.leadsProbability()],
          },
          Project: {
            projectActivity: [...enumCache.projectActivity()],
          },
          Contact: {
            contactLegalBasis: [...enumCache.contactLegalBasis()],
            contactStatus: [...enumCache.contactStatus()],
          },
          NCR: {
            ncrTypeRegistration: [...enumCache.ncrType()],
            ncrDirectCause: [...enumCache.ncrDirectCause()],
            ncrCategory: [...enumCache.ncrCategory()],
            ncrFeedbackType: [...enumCache.ncrFeedbackType()],
            ncrLocation: [...enumCache.ncrLocation()],
            ncrRootCause: [...enumCache.ncrRootCause()],
          },
        };

        const json = JSON.stringify(exportData, null, 2);

        if (flags.file) {
          try {
            const filePath = this.resolveFilePath(flags.file);
            writeFileSync(filePath, json, 'utf-8');
            printSuccess(`Enums exported for tenant "${rest.tenantName}" to ${filePath}`);
          } catch (error) {
            printError(`Failed to write file: ${error instanceof Error ? error.message : String(error)}`);
            this.exit(1);
          }
        } else {
          console.log(json);
        }
      }, { loadEnums: true });
    } catch (error) {
      this.printClassifiedError(error, 'Failed to export enums');
      this.exit(1);
    }
  }

  private async handleImport(flags: { file?: string }): Promise<void> {
    const config = await loadConfig();
    const env = getActiveEnvironment(config);
    const envConfig = config.environments[env];

    if (!isRestConfig(envConfig)) {
      printError('Enum import is only available in REST API mode.');
      this.exit(1);
      return;
    }

    if (!flags.file) {
      printError('Required: --file <path>');
      this.exit(1);
      return;
    }

    try {
      const filePath = this.resolveFilePath(flags.file);
      const content = readFileSync(filePath, 'utf-8');
      const enumData = JSON.parse(content) as EnumCategoryConfig;

      const rest = envConfig as RestEnvironmentConfig;
      if (!config.enums) config.enums = {};
      config.enums[rest.tenantName] = enumData;

      saveConfig(config);
      printSuccess(`Enums imported for tenant "${rest.tenantName}" from ${filePath}`);
    } catch (error) {
      printError(`Failed to import enums: ${error instanceof Error ? error.message : String(error)}`);
      this.exit(1);
    }
  }

  /** Resolve a file path relative to the user's original working directory. */
  private resolveFilePath(filePath: string): string {
    if (isAbsolute(filePath)) return filePath;
    const originalCwd = process.env.BO_CLI_ORIGINAL_CWD;
    return originalCwd ? resolve(originalCwd, filePath) : resolve(filePath);
  }
}

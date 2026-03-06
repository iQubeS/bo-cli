import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError } from '../../formatters/index.js';
import * as enumCache from '../../enums/cache.js';

export default class ConfigEnumsCommand extends BaseCommand {
  static description = 'Show valid enum values for the current environment (fetched from server)';

  static examples = [
    '$ bo config enums',
    '$ bo config enums --category leads',
  ];

  static flags = {
    category: Flags.string({
      description: 'Filter by category (company, leads, project, contact, ncr)',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ConfigEnumsCommand);

    try {
      // Connect to any server to load enums from the resource
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
      });
    } catch (error) {
      this.printClassifiedError(error, 'Failed to load enums');
      this.exit(1);
    }
  }
}

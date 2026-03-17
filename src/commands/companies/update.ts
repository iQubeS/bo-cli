import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { printError, formatOutput, checkResponseError } from '../../formatters/index.js';
import { promptText, promptConfirm, promptSelect, createSpinner, printPreview, type PreviewData } from '../../utils/interactive.js';
import { supplierCategory, approvedSupplier } from '../../enums/cache.js';

export default class CompaniesUpdateCommand extends BaseCommand {
  static description = 'Update a company';

  static examples = [
    '$ bo companies update <id> --name "New Name"',
    '$ bo companies update <id> --interactive',
    '$ bo companies update <id> --preview --name "New Name"',
  ];

  static args = {
    id: Args.string({ description: 'Company ID', required: true }),
  };

  static flags = {
    name: Flags.string({ description: 'Company name' }),
    'type-id': Flags.string({ description: 'Company type ID' }),
    phone: Flags.string({ description: 'Phone number' }),
    email: Flags.string({ description: 'Email address' }),
    address: Flags.string({ description: 'Company address' }),
    website: Flags.string({ description: 'Company website' }),
    'org-number': Flags.string({ description: 'Organization number' }),
    'internal-responsible': Flags.string({ description: 'Internal responsible email' }),
    'postal-address': Flags.string({ description: 'Postal address' }),
    'supplier-category': Flags.string({ description: 'Supplier category' }),
    'approved-supplier': Flags.string({ description: 'Approved supplier' }),
    active: Flags.boolean({ description: 'Company is active' }),
    interactive: Flags.boolean({ description: 'Run in interactive mode with prompts', default: false }),
    preview: Flags.boolean({ description: 'Show what would be updated without executing', default: false }),
    json: Flags.boolean({ description: 'Output as JSON' }),
    csv: Flags.boolean({ description: 'Output as CSV' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CompaniesUpdateCommand);

    try {
      await this.withConnection('customer', async (client) => {
        const updateData = await this.collectFields(flags);

        if (flags.preview) {
          const previewData: PreviewData = { action: 'update', entity: `Company ${args.id}`, fields: updateData };
          printPreview(previewData);
          return;
        }

        if (flags.interactive) {
          const confirmed = await promptConfirm(`Update company ${args.id}?`);
          if (!confirmed) {
            console.log('Cancelled.');
            return;
          }
        }

        if (Object.keys(updateData).length === 0) {
          printError('No fields to update. Please provide at least one field to update.');
          this.exit(1);
        }

        const format = this.getFormat(flags);
        const spinner = createSpinner('Updating company...');
        spinner.start();
        const result = await client.callTool('update_company', { companyId: args.id, ...updateData });
        const serverError = checkResponseError(result);
        if (serverError) {
          spinner.fail(serverError);
        } else {
          spinner.succeed('Company updated successfully!');
        }
        console.log(formatOutput(result, { format }));
      }, { loadEnums: true });
    } catch (error) {
      this.printClassifiedError(error, 'Failed to update company');
      this.exit(1);
    }
  }

  private async collectFields(flags: Record<string, unknown>): Promise<Record<string, unknown>> {
    const updateData: Record<string, unknown> = {};

    if (flags.interactive) {
      const name = await promptText('Company name (leave empty to skip):');
      if (name) updateData.companyName = name;
      const typeId = await promptText('Company type ID (leave empty to skip):');
      if (typeId) updateData.companyTypeId = typeId;
      const phone = await promptText('Phone (leave empty to skip):');
      if (phone) updateData.companyPhone = phone;
      const email = await promptText('Email (leave empty to skip):');
      if (email) updateData.email = email;
      const address = await promptText('Address (leave empty to skip):');
      if (address) updateData.address = address;
      const website = await promptText('Website (leave empty to skip):');
      if (website) updateData.website = website;
      const orgNumber = await promptText('Org number (leave empty to skip):');
      if (orgNumber) updateData.orgNumber = orgNumber;
      const responsible = await promptText('Internal responsible email (leave empty to skip):');
      if (responsible) updateData.internalResponsibleEmail = responsible;
      const postalAddress = await promptText('Postal address (leave empty to skip):');
      if (postalAddress) updateData.postalAddress = postalAddress;
      const supCategory = await promptSelect('Supplier category (leave empty to skip):', ['', ...supplierCategory()]);
      if (supCategory) updateData.companySupplierCategory = supCategory;
      const approved = await promptSelect('Approved supplier (leave empty to skip):', ['', ...approvedSupplier()]);
      if (approved) updateData.companyApprovedSupplier = approved;
      const active = await promptConfirm('Is active?', true);
      updateData.active = active;
    } else {
      if (flags.name) updateData.companyName = flags.name;
      if (flags['type-id']) updateData.companyTypeId = flags['type-id'];
      if (flags.phone) updateData.companyPhone = flags.phone;
      if (flags.email) updateData.email = flags.email;
      if (flags.address) updateData.address = flags.address;
      if (flags.website) updateData.website = flags.website;
      if (flags['org-number']) updateData.orgNumber = flags['org-number'];
      if (flags['internal-responsible']) updateData.internalResponsibleEmail = flags['internal-responsible'];
      if (flags['postal-address']) updateData.postalAddress = flags['postal-address'];
      if (flags['supplier-category']) updateData.companySupplierCategory = flags['supplier-category'];
      if (flags['approved-supplier']) updateData.companyApprovedSupplier = flags['approved-supplier'];
      if (flags.active !== undefined) updateData.active = flags.active;
    }

    return updateData;
  }
}

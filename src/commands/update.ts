import { Command, Flags } from '@oclif/core';
import { execSync } from 'child_process';
import { printSuccess, printError, printInfo } from '../formatters/index.js';

export default class UpdateCommand extends Command {
  static description = 'Update bo CLI to the latest version';

  static examples = [
    '$ bo update',
    '$ bo update --from github',
  ];

  static flags = {
    from: Flags.string({
      description: 'Update source',
      options: ['npm', 'github'],
      default: 'npm',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(UpdateCommand);
    const currentVersion = this.config.version;

    printInfo(`Current version: v${currentVersion}`);
    printInfo(`Updating from ${flags.from}...`);

    try {
      const cmd = flags.from === 'github'
        ? 'npm install -g github:iQubeS/bo-cli'
        : 'npm install -g businessonline-cli';

      execSync(cmd, { stdio: 'inherit' });

      printSuccess('Update complete! Run "bo --version" to verify.');
    } catch (error) {
      printError(`Update failed: ${error instanceof Error ? error.message : String(error)}`);
      printInfo('You can update manually:');
      if (flags.from === 'npm') {
        printInfo('  npm install -g businessonline-cli');
      } else {
        printInfo('  npm install -g github:iQubeS/bo-cli');
      }
      this.exit(1);
    }
  }
}

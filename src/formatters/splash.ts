import chalk from 'chalk';

export interface ServerStatus {
  name: string;
  url?: string;
  connected: boolean;
  tools?: number;
}

export function renderSplash(
  version: string,
  environment: string,
  servers: ServerStatus[]
): string {
  const connectedCount = servers.filter((s) => s.connected).length;
  const totalCount = servers.length;
  const statusIcon = connectedCount === totalCount ? chalk.green('OK') : chalk.red('!!');

  const boxWidth = 44;

  const logo = [
    '  ___  _  _  ___  ___  _  _  ___  ___  ___ ',
    ' | _ )| || |/ __||_ _|| \\| || __||_ _|/ __|',
    ' | _ \\| __ |\\__ \\ | | | .` || _|  | | \\__ \\',
    ' |___/|_||_||___/|___||_|\\_||___||___||___/',
    '  ___   _  _  _     ___  _  _  ___        ',
    ' / _ \\ | \\| || |   |_ _|| \\| || __|       ',
    '| (_) || .` || |__  | | | .` || _|        ',
    ' \\___/ |_|\\_||____||___||_|\\_||___|       ',
  ];

  const statusText = ` ${version} | ${environment} | ${connectedCount}/${totalCount} servers`;
  const pad = Math.max(0, boxWidth - statusText.length - 3);

  const lines = [
    '',
    chalk.cyan('+-' + '-'.repeat(boxWidth) + '-+'),
    ...logo.map((l) => chalk.cyan('| ') + chalk.bold.white(l.padEnd(boxWidth)) + chalk.cyan(' |')),
    chalk.cyan('| ' + ' '.repeat(boxWidth) + ' |'),
    chalk.cyan('| ') + chalk.yellow(statusText) + ' ' + statusIcon + ' '.repeat(pad) + chalk.cyan(' |'),
    chalk.cyan('+-' + '-'.repeat(boxWidth) + '-+'),
    '',
  ];

  if (servers.length > 0) {
    lines.push(chalk.bold('Server Status:'));
    for (const server of servers) {
      const icon = server.connected ? chalk.green('*') : chalk.red('o');
      const tools = server.tools !== undefined ? ` (${server.tools} tools)` : '';
      lines.push(`  ${icon} ${server.name}${tools}`);
    }
    lines.push('');
  }

  lines.push(chalk.dim('Run ') + chalk.cyan('bo --help') + chalk.dim(' for usage information'));
  lines.push('');

  return lines.join('\n');
}

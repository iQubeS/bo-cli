import chalk from 'chalk';

export interface ServerStatus {
  name: string;
  url?: string;
  connected: boolean;
  tools?: number;
}

export interface RestStatus {
  connected: boolean;
  baseUrl: string;
  tenantName: string;
  apiVersion: string;
  enumCategories?: number;
  enumSource?: 'custom' | 'defaults';
}

export interface SplashOptions {
  mode: 'mcp' | 'rest';
  servers?: ServerStatus[];
  rest?: RestStatus;
}

export function renderSplash(
  version: string,
  environment: string,
  options: SplashOptions
): string {
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

  let statusText: string;
  let statusIcon: string;

  if (options.mode === 'rest') {
    const rest = options.rest;
    const ok = rest?.connected ?? false;
    statusIcon = ok ? chalk.green('OK') : chalk.red('!!');
    statusText = ` ${version} | ${environment} | REST API`;
  } else {
    const servers = options.servers ?? [];
    const connectedCount = servers.filter((s) => s.connected).length;
    const totalCount = servers.length;
    statusIcon = connectedCount === totalCount ? chalk.green('OK') : chalk.red('!!');
    statusText = ` ${version} | ${environment} | ${connectedCount}/${totalCount} servers`;
  }

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

  if (options.mode === 'rest' && options.rest) {
    const rest = options.rest;
    const connIcon = rest.connected ? chalk.green('*') : chalk.red('o');
    const enumLabel = rest.enumSource === 'custom'
      ? chalk.green(`${rest.enumCategories} custom`)
      : chalk.dim('defaults');

    lines.push(chalk.bold('REST API:'));
    lines.push(`  ${connIcon} Connection   ${rest.connected ? chalk.green('Connected') : chalk.red('Not connected')}`);
    lines.push(`    Tenant       ${chalk.white(rest.tenantName)}`);
    lines.push(`    API version  ${chalk.white(rest.apiVersion)}`);
    lines.push(`    Endpoint     ${chalk.dim(rest.baseUrl)}`);
    lines.push(`    Enums        ${enumLabel}`);
    lines.push('');
  } else if (options.servers && options.servers.length > 0) {
    lines.push(chalk.bold('Server Status:'));
    for (const server of options.servers) {
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

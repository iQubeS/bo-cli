import { input, confirm, editor, select } from '@inquirer/prompts';
import ora, { type Ora } from 'ora';
import chalk from 'chalk';

export interface InteractiveOptions {
  required?: boolean;
  default?: string;
}

export async function promptText(
  message: string,
  options: InteractiveOptions = {}
): Promise<string> {
  return input({
    message,
    default: options.default,
    required: options.required,
  });
}

export async function promptSelect(
  message: string,
  choices: readonly string[],
  options?: { required?: boolean }
): Promise<string | undefined> {
  if (!options?.required) {
    const result = await select({
      message,
      choices: [
        { name: '(skip)', value: '' },
        ...choices.map(c => ({ name: c, value: c })),
      ],
    });
    return result || undefined;
  }

  return await select({
    message,
    choices: choices.map(c => ({ name: c, value: c })),
  });
}

export async function promptConfirm(
  message: string,
  defaultValue: boolean = false
): Promise<boolean> {
  return confirm({
    message,
    default: defaultValue,
  });
}

export async function promptEditor(
  message: string,
  defaultValue: string = ''
): Promise<string> {
  return editor({
    message,
    default: defaultValue,
    postfix: '.txt',
  });
}

export function createSpinner(text?: string): Ora {
  return ora({
    text: text || 'Loading...',
    color: 'cyan',
  });
}

export interface PreviewData {
  action: 'create' | 'update' | 'delete';
  entity: string;
  fields: Record<string, unknown>;
}

export function printPreview(data: PreviewData): void {
  console.log(chalk.yellow.bold(`\n  Preview: ${data.action.toUpperCase()} ${data.entity}\n`));

  console.log(chalk.cyan('Fields:'));
  for (const [key, value] of Object.entries(data.fields)) {
    if (value !== undefined) {
      console.log(`  ${chalk.white(key)}: ${chalk.green(JSON.stringify(value))}`);
    }
  }

  console.log(chalk.yellow('\nNo changes have been made yet.\n'));
}

import chalk from 'chalk';
import cliTable3 from 'cli-table3';

export type OutputFormat = 'table' | 'json' | 'csv';

export interface FormatOptions {
  format?: OutputFormat;
  color?: boolean;
}

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function formatTable(
  headers: string[],
  rows: string[][],
  options: FormatOptions = {}
): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = new (cliTable3 as any)({
    head: headers,
    style: {
      head: ['cyan'],
      border: ['grey'],
    },
  });
  for (const row of rows) {
    table.push(row);
  }

  return table.toString();
}

export function formatCsv(headers: string[], rows: string[][]): string {
  const escapeCsv = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerLine = headers.map(escapeCsv).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsv).join(','));

  return [headerLine, ...dataLines].join('\n');
}

export function unwrapMcpResponse(data: unknown): unknown {
  if (
    typeof data === 'object' &&
    data !== null &&
    'content' in data &&
    Array.isArray((data as Record<string, unknown>).content)
  ) {
    const content = (data as Record<string, unknown>).content as Array<Record<string, unknown>>;
    const textItem = content.find((c) => c.type === 'text' && typeof c.text === 'string');
    if (textItem) {
      try {
        return JSON.parse(textItem.text as string);
      } catch {
        return textItem.text;
      }
    }
  }
  return data;
}

export function formatOutput(
  data: unknown,
  options: FormatOptions = {}
): string {
  const format = options.format || 'table';
  const unwrapped = unwrapMcpResponse(data);

  if (format === 'json') {
    return formatJson(unwrapped);
  }

  // Handle paginated responses: {data: [...], totalCount: N}
  const { items, meta } = extractPaginatedData(unwrapped);

  if (Array.isArray(items) && items.length > 0) {
    const firstItem = items[0];
    if (typeof firstItem === 'object' && firstItem !== null) {
      const headers = Object.keys(firstItem);
      const rows = items.map((item) =>
        headers.map((key) => {
          const value = (item as Record<string, unknown>)[key];
          return formatValue(value);
        })
      );

      const table = format === 'csv'
        ? formatCsv(headers, rows)
        : formatTable(headers, rows, options);

      if (meta) {
        let summary = `Showing ${items.length} of ${meta.totalCount} results`;
        if (meta.hasNext || meta.hasPrev) {
          const hints: string[] = [];
          if (meta.hasPrev) hints.push('--offset to go back');
          if (meta.hasNext) hints.push('--offset/--limit for next page');
          summary += ` (${hints.join(', ')})`;
        }
        return `${table}\n${chalk.grey(summary)}`;
      }
      return table;
    }
  }

  // Single object or non-array
  if (typeof items === 'object' && items !== null && !Array.isArray(items)) {
    const headers = Object.keys(items);
    const rows = [headers.map((key) => formatValue((items as Record<string, unknown>)[key]))];

    if (format === 'csv') {
      return formatCsv(headers, rows);
    }
    return formatTable(headers, rows, options);
  }

  // Empty array
  if (Array.isArray(items) && items.length === 0) {
    return chalk.grey('No results found.');
  }

  // Primitive
  return String(items);
}

export interface PaginationMeta {
  totalCount: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

function extractPaginatedData(data: unknown): { items: unknown; meta?: PaginationMeta } {
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    Array.isArray((data as Record<string, unknown>).data)
  ) {
    const obj = data as Record<string, unknown>;
    const tc = obj.totalCount;
    const meta: PaginationMeta | undefined = tc !== undefined && tc !== null ? { totalCount: Number(tc) } : undefined;

    // Extract pagination link info if present (from REST API Link header)
    const pagination = obj.pagination as Record<string, string> | undefined;
    if (meta && pagination) {
      meta.hasNext = !!pagination.next;
      meta.hasPrev = !!pagination.prev;
    }

    return { items: obj.data, meta };
  }
  return { items: data };
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // For nested objects, try to extract a readable name field
    const nameKey = Object.keys(obj).find((k) => /name$/i.test(k) && typeof obj[k] === 'string');
    if (nameKey && obj[nameKey]) {
      return String(obj[nameKey]);
    }
    // Flatten simple objects to "key: value" pairs
    const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '');
    if (entries.length <= 3) {
      return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
    }
    return JSON.stringify(value);
  }
  return String(value);
}

export function printSuccess(message: string): void {
  console.log(chalk.green('✓ ') + message);
}

export function printError(message: string): void {
  console.error(chalk.red('✗ ') + message);
}

export function printWarning(message: string): void {
  console.log(chalk.yellow('⚠ ') + message);
}

export function printInfo(message: string): void {
  console.log(chalk.blue('ℹ ') + message);
}

/**
 * Check if an MCP response indicates a server-side error.
 * MCP's `isError` is always false, so we check the unwrapped payload for `{success: false}`.
 * Returns the error message if found, or null if the response looks successful.
 */
export function checkResponseError(data: unknown): string | null {
  const unwrapped = unwrapMcpResponse(data);
  if (
    typeof unwrapped === 'object' &&
    unwrapped !== null &&
    'success' in unwrapped &&
    (unwrapped as Record<string, unknown>).success === false
  ) {
    const err = (unwrapped as Record<string, unknown>).error;
    return typeof err === 'string' ? err : 'Server returned an error';
  }
  return null;
}

import { describe, it, expect } from 'vitest';
import { unwrapMcpResponse, formatOutput, formatCsv, checkResponseError } from '../src/formatters/index.js';

describe('unwrapMcpResponse', () => {
  it('extracts and parses JSON text from MCP response', () => {
    const mcpResponse = {
      content: [{ type: 'text', text: '{"id": 1, "name": "Test"}' }],
    };
    expect(unwrapMcpResponse(mcpResponse)).toEqual({ id: 1, name: 'Test' });
  });

  it('extracts array JSON from MCP response', () => {
    const mcpResponse = {
      content: [{ type: 'text', text: '[{"id": 1}, {"id": 2}]' }],
    };
    expect(unwrapMcpResponse(mcpResponse)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('returns plain string if text is not valid JSON', () => {
    const mcpResponse = {
      content: [{ type: 'text', text: 'Not JSON content' }],
    };
    expect(unwrapMcpResponse(mcpResponse)).toBe('Not JSON content');
  });

  it('passes through non-MCP data unchanged', () => {
    const plainData = { id: 1, name: 'Test' };
    expect(unwrapMcpResponse(plainData)).toEqual(plainData);
  });

  it('passes through arrays unchanged', () => {
    const arr = [{ id: 1 }, { id: 2 }];
    expect(unwrapMcpResponse(arr)).toEqual(arr);
  });

  it('handles empty content array', () => {
    const mcpResponse = { content: [] };
    expect(unwrapMcpResponse(mcpResponse)).toEqual({ content: [] });
  });

  it('handles null', () => {
    expect(unwrapMcpResponse(null)).toBeNull();
  });

  it('handles undefined', () => {
    expect(unwrapMcpResponse(undefined)).toBeUndefined();
  });

  it('handles string primitives', () => {
    expect(unwrapMcpResponse('hello')).toBe('hello');
  });

  it('skips non-text content types', () => {
    const mcpResponse = {
      content: [{ type: 'image', data: 'base64...' }],
    };
    // No text item found, returns original
    expect(unwrapMcpResponse(mcpResponse)).toEqual(mcpResponse);
  });
});

describe('formatOutput', () => {
  it('returns JSON string for format=json', () => {
    const data = { id: 1, name: 'Test' };
    const result = formatOutput(data, { format: 'json' });
    expect(JSON.parse(result)).toEqual(data);
  });

  it('unwraps MCP response for JSON output', () => {
    const mcpResponse = {
      content: [{ type: 'text', text: '{"id": 1, "name": "Test"}' }],
    };
    const result = formatOutput(mcpResponse, { format: 'json' });
    expect(JSON.parse(result)).toEqual({ id: 1, name: 'Test' });
  });

  it('renders table for array data', () => {
    const data = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
    const result = formatOutput(data, { format: 'table' });
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
    expect(result).toContain('id');
    expect(result).toContain('name');
  });

  it('renders table for single object', () => {
    const data = { id: 1, name: 'Test' };
    const result = formatOutput(data, { format: 'table' });
    expect(result).toContain('Test');
  });

  it('returns CSV for array data', () => {
    const data = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
    const result = formatOutput(data, { format: 'csv' });
    expect(result).toContain('id,name');
    expect(result).toContain('1,Alice');
    expect(result).toContain('2,Bob');
  });

  it('unwraps MCP response before table formatting', () => {
    const mcpResponse = {
      content: [{ type: 'text', text: '[{"id": 1, "name": "Alice"}]' }],
    };
    const result = formatOutput(mcpResponse, { format: 'table' });
    expect(result).toContain('Alice');
  });

  it('handles paginated response {data: [...], totalCount: N}', () => {
    const paginated = {
      data: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
      totalCount: 100,
    };
    const result = formatOutput(paginated, { format: 'table' });
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
    expect(result).toContain('100');
  });

  it('handles paginated response in CSV format', () => {
    const paginated = {
      data: [{ id: 1, name: 'Alice' }],
      totalCount: 50,
    };
    const result = formatOutput(paginated, { format: 'csv' });
    expect(result).toContain('id,name');
    expect(result).toContain('1,Alice');
  });

  it('handles paginated response in JSON format (returns full object)', () => {
    const paginated = {
      data: [{ id: 1 }],
      totalCount: 10,
    };
    const result = formatOutput(paginated, { format: 'json' });
    expect(JSON.parse(result)).toEqual(paginated);
  });

  it('shows "No results found" for empty arrays', () => {
    const result = formatOutput([]);
    expect(result).toContain('No results');
  });

  it('returns string for primitive data', () => {
    expect(formatOutput('hello')).toBe('hello');
    expect(formatOutput(42)).toBe('42');
  });

  it('defaults to table format', () => {
    const data = { id: 1 };
    const result = formatOutput(data);
    // Table format includes box-drawing characters
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatCsv', () => {
  it('formats headers and rows', () => {
    const result = formatCsv(['name', 'age'], [['Alice', '30'], ['Bob', '25']]);
    expect(result).toBe('name,age\nAlice,30\nBob,25');
  });

  it('escapes values containing commas', () => {
    const result = formatCsv(['name'], [['Doe, John']]);
    expect(result).toBe('name\n"Doe, John"');
  });

  it('escapes values containing quotes', () => {
    const result = formatCsv(['name'], [['He said "hi"']]);
    expect(result).toBe('name\n"He said ""hi"""');
  });

  it('escapes values containing newlines', () => {
    const result = formatCsv(['note'], [['line1\nline2']]);
    expect(result).toBe('note\n"line1\nline2"');
  });

  it('handles empty rows', () => {
    const result = formatCsv(['name', 'age'], []);
    expect(result).toBe('name,age');
  });
});

describe('checkResponseError', () => {
  it('returns error message from {success: false, error: "..."}', () => {
    const mcpResponse = {
      content: [{ type: 'text', text: '{"success": false, "error": "Unexpected end of JSON input"}' }],
    };
    expect(checkResponseError(mcpResponse)).toBe('Unexpected end of JSON input');
  });

  it('returns null for successful response', () => {
    const mcpResponse = {
      content: [{ type: 'text', text: '{"id": 1, "name": "Test"}' }],
    };
    expect(checkResponseError(mcpResponse)).toBeNull();
  });

  it('returns null for response with success: true', () => {
    const mcpResponse = {
      content: [{ type: 'text', text: '{"success": true, "data": {}}' }],
    };
    expect(checkResponseError(mcpResponse)).toBeNull();
  });

  it('returns generic message when error field is missing', () => {
    const mcpResponse = {
      content: [{ type: 'text', text: '{"success": false}' }],
    };
    expect(checkResponseError(mcpResponse)).toBe('Server returned an error');
  });

  it('returns null for non-MCP data', () => {
    expect(checkResponseError({ id: 1 })).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(checkResponseError(null)).toBeNull();
    expect(checkResponseError(undefined)).toBeNull();
  });
});

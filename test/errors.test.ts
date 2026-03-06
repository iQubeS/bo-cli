import { describe, it, expect } from 'vitest';
import {
  BoCliError,
  AuthError,
  ConnectionError,
  ServerError,
  ValidationError,
  classifyError,
} from '../src/errors.js';

describe('classifyError', () => {
  it('returns AuthError for 401 message', () => {
    const result = classifyError(new Error('HTTP 401 Unauthorized'));
    expect(result).toBeInstanceOf(AuthError);
    expect(result.code).toBe('AUTH_ERROR');
  });

  it('returns AuthError for "unauthorized" message', () => {
    const result = classifyError(new Error('Request unauthorized'));
    expect(result).toBeInstanceOf(AuthError);
  });

  it('returns AuthError for 403 message', () => {
    const result = classifyError(new Error('403 Forbidden'));
    expect(result).toBeInstanceOf(AuthError);
  });

  it('returns ConnectionError for ECONNREFUSED', () => {
    const result = classifyError(new Error('connect ECONNREFUSED 127.0.0.1:3000'), 'customer');
    expect(result).toBeInstanceOf(ConnectionError);
    expect(result.message).toContain('customer');
    expect(result.code).toBe('CONNECTION_ERROR');
  });

  it('returns ConnectionError for ENOTFOUND', () => {
    const result = classifyError(new Error('getaddrinfo ENOTFOUND example.com'));
    expect(result).toBeInstanceOf(ConnectionError);
  });

  it('returns ConnectionError for "fetch failed"', () => {
    const result = classifyError(new Error('fetch failed'));
    expect(result).toBeInstanceOf(ConnectionError);
  });

  it('returns ConnectionError for ETIMEDOUT', () => {
    const result = classifyError(new Error('connect ETIMEDOUT'));
    expect(result).toBeInstanceOf(ConnectionError);
  });

  it('returns ServerError for 500 message', () => {
    const result = classifyError(new Error('HTTP 500 Internal Server Error'));
    expect(result).toBeInstanceOf(ServerError);
    expect(result.code).toBe('SERVER_ERROR');
  });

  it('returns ServerError for 502 message', () => {
    const result = classifyError(new Error('502 Bad Gateway'));
    expect(result).toBeInstanceOf(ServerError);
  });

  it('returns BoCliError for unknown errors', () => {
    const result = classifyError(new Error('Something unexpected happened'));
    expect(result).toBeInstanceOf(BoCliError);
    expect(result.code).toBe('UNKNOWN_ERROR');
  });

  it('passes through existing BoCliError instances', () => {
    const original = new ValidationError('Invalid field');
    const result = classifyError(original);
    expect(result).toBe(original);
  });

  it('handles string errors', () => {
    const result = classifyError('some string error');
    expect(result).toBeInstanceOf(BoCliError);
    expect(result.message).toBe('some string error');
  });
});

describe('error classes', () => {
  it('AuthError has correct defaults', () => {
    const err = new AuthError();
    expect(err.name).toBe('AuthError');
    expect(err.code).toBe('AUTH_ERROR');
    expect(err.message).toContain('Authentication failed');
  });

  it('AuthError accepts custom message', () => {
    const err = new AuthError('Token expired');
    expect(err.message).toBe('Token expired');
  });

  it('ConnectionError includes server name', () => {
    const err = new ConnectionError('leads', 'ECONNREFUSED');
    expect(err.message).toContain('leads');
    expect(err.message).toContain('ECONNREFUSED');
  });

  it('ConnectionError without cause', () => {
    const err = new ConnectionError('projects');
    expect(err.message).toContain('projects');
    expect(err.message).toContain('bo config test');
  });

  it('ServerError stores status code', () => {
    const err = new ServerError('Internal error', 500);
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('SERVER_ERROR');
  });

  it('ValidationError has correct code', () => {
    const err = new ValidationError('Bad input');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.name).toBe('ValidationError');
  });
});

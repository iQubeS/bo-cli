export class BoCliError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'BoCliError';
  }
}

export class AuthError extends BoCliError {
  constructor(message: string = 'Authentication failed. Check your token with: bo config show') {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

export class ConnectionError extends BoCliError {
  constructor(serverName: string, cause?: string) {
    const msg = cause
      ? `Cannot connect to ${serverName} server: ${cause}`
      : `Cannot connect to ${serverName} server. Check your config with: bo config test`;
    super(msg, 'CONNECTION_ERROR');
    this.name = 'ConnectionError';
  }
}

export class ServerError extends BoCliError {
  constructor(message: string, public readonly statusCode?: number) {
    super(message, 'SERVER_ERROR');
    this.name = 'ServerError';
  }
}

export class ValidationError extends BoCliError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export function classifyError(error: unknown, serverName?: string): BoCliError {
  if (error instanceof BoCliError) return error;

  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  // Auth errors
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('403')) {
    return new AuthError();
  }

  // Connection errors
  if (
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('etimedout') ||
    lower.includes('econnreset') ||
    lower.includes('fetch failed') ||
    lower.includes('network') ||
    lower.includes('dns')
  ) {
    return new ConnectionError(serverName || 'unknown', msg);
  }

  // Server errors
  if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('internal server error')) {
    return new ServerError(`Server error: ${msg}`);
  }

  // Validation
  if (lower.includes('invalid') && (lower.includes('parameter') || lower.includes('argument'))) {
    return new ValidationError(msg);
  }

  // Fallback — return as generic BoCliError
  return new BoCliError(msg, 'UNKNOWN_ERROR');
}

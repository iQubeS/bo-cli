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

export class RateLimitError extends BoCliError {
  constructor(public readonly retryAfterSeconds: number) {
    super(`Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class QuotaExceededError extends BoCliError {
  constructor(public readonly replenishTime: string) {
    super(`API quota exceeded. Quota will be replenished in ${replenishTime}.`, 'QUOTA_EXCEEDED_ERROR');
    this.name = 'QuotaExceededError';
  }
}

export function classifyError(error: unknown, serverName?: string): BoCliError {
  if (error instanceof BoCliError) return error;

  // Handle RestApiError from http-client (imported dynamically to avoid circular deps)
  if (
    error instanceof Error &&
    error.name === 'RestApiError' &&
    'statusCode' in error
  ) {
    const statusCode = (error as { statusCode: number }).statusCode;
    const msg = error.message;

    switch (statusCode) {
      case 401:
        return new AuthError('Invalid API key. Check your configuration with: bo config show');
      case 403: {
        if (msg.toLowerCase().includes('quota')) {
          const replenish = 'replenishTime' in error ? String((error as { replenishTime: string }).replenishTime) : 'unknown';
          return new QuotaExceededError(replenish);
        }
        return new AuthError('Access forbidden. Check your API key permissions.');
      }
      case 404:
        return new ServerError(`Resource not found: ${msg}`, 404);
      case 429: {
        const retryAfter = 'retryAfterSeconds' in error ? Number((error as { retryAfterSeconds: number }).retryAfterSeconds) : 60;
        return new RateLimitError(retryAfter);
      }
      default:
        return new ServerError(msg, statusCode);
    }
  }

  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  // Auth errors
  if (/\b401\b/.test(lower) || lower.includes('unauthorized') || lower.includes('forbidden') || /\b403\b/.test(lower)) {
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
  if (/\b500\b/.test(lower) || /\b502\b/.test(lower) || /\b503\b/.test(lower) || lower.includes('internal server error')) {
    return new ServerError(`Server error: ${msg}`);
  }

  // Validation
  if (lower.includes('invalid') && (lower.includes('parameter') || lower.includes('argument'))) {
    return new ValidationError(msg);
  }

  // Fallback — return as generic BoCliError
  return new BoCliError(msg, 'UNKNOWN_ERROR');
}

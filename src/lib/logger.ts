/**
 * Simple leveled logger for API routes
 * Respects NODE_ENV and DEBUG environment variables
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDebugEnabled = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';

function shouldLog(level: LogLevel): boolean {
  if (level === 'error') return true; // Always log errors
  if (level === 'warn') return true; // Always log warnings
  if (level === 'info') return true; // Always log info
  if (level === 'debug') return isDebugEnabled; // Only log debug in development
  return false;
}

function formatMessage(prefix: string, level: LogLevel, data?: any): void {
  if (!shouldLog(level)) return;

  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase();
  
  if (data) {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      `[${timestamp}] [${levelUpper}] ${prefix}`,
      data
    );
  } else {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      `[${timestamp}] [${levelUpper}] ${prefix}`
    );
  }
}

export const logger = {
  debug: (prefix: string, data?: any) => formatMessage(prefix, 'debug', data),
  info: (prefix: string, data?: any) => formatMessage(prefix, 'info', data),
  warn: (prefix: string, data?: any) => formatMessage(prefix, 'warn', data),
  error: (prefix: string, data?: any) => formatMessage(prefix, 'error', data),
};

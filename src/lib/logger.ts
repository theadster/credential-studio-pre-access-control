/**
 * Configurable Logger Utility
 * 
 * Provides structured logging with log levels that can be controlled
 * via environment variables to reduce verbosity in production.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LogContext {
  [key: string]: any;
}

class Logger {
  private level: LogLevel;

  constructor() {
    // Default to INFO in production, DEBUG in development
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (envLevel) {
      this.level = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
    } else {
      this.level = isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  /**
   * Check if a log level should be emitted
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  /**
   * Format log message with context
   */
  private formatMessage(prefix: string, message: string, context?: LogContext): string {
    if (context && Object.keys(context).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(context)}`;
    }
    return `${prefix} ${message}`;
  }

  /**
   * Log debug messages (verbose, development only)
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('[DEBUG]', message, context));
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('[INFO]', message, context));
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('[WARN]', message, context));
    }
  }

  /**
   * Log error messages (always logged unless NONE)
   */
  error(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('[ERROR]', message, context));
    }
  }

  /**
   * Set log level dynamically
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export factory for testing
export const createLogger = () => new Logger();

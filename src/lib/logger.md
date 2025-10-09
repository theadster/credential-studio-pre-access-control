# Logger Utility

A configurable logging utility that supports log levels and honors environment settings to reduce verbosity in production.

## Features

- **Log Levels**: DEBUG, INFO, WARN, ERROR, NONE
- **Environment-aware**: Automatically adjusts based on `NODE_ENV` and `LOG_LEVEL`
- **Structured logging**: Supports context objects for rich log data
- **Production-safe**: Reduces verbosity in production environments

## Usage

```typescript
import { logger } from '@/lib/logger';

// Info level (default in production)
logger.info('User logged in', { userId: '123', email: 'user@example.com' });

// Debug level (verbose, development only by default)
logger.debug('Processing request', { requestId: 'abc', params: {...} });

// Warning level
logger.warn('Rate limit approaching', { userId: '123', count: 95 });

// Error level (always logged unless NONE)
logger.error('Database connection failed', { error: err.message, code: err.code });
```

## Configuration

### Environment Variables

**LOG_LEVEL**: Set the minimum log level to emit
- `DEBUG`: All logs (most verbose)
- `INFO`: Info, warn, and error logs (default in production)
- `WARN`: Warn and error logs only
- `ERROR`: Error logs only
- `NONE`: No logs

**NODE_ENV**: Automatically sets defaults
- `development`: Defaults to DEBUG level
- `production`: Defaults to INFO level

### Examples

```bash
# Development - show all logs
NODE_ENV=development npm run dev

# Production - show info and above
NODE_ENV=production npm start

# Production - show only errors
LOG_LEVEL=ERROR NODE_ENV=production npm start

# Debugging in production
LOG_LEVEL=DEBUG NODE_ENV=production npm start
```

## Log Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| DEBUG | Detailed diagnostic info for development | Request parameters, intermediate values |
| INFO | General informational messages | Operation started/completed, state changes |
| WARN | Warning conditions that should be reviewed | Deprecated API usage, approaching limits |
| ERROR | Error conditions that need attention | Failed operations, exceptions |

## Best Practices

1. **Use appropriate levels**:
   - DEBUG for verbose development info
   - INFO for important operational events
   - WARN for concerning but non-critical issues
   - ERROR for failures and exceptions

2. **Include context**:
   ```typescript
   // Good - includes context
   logger.info('User created', { userId: user.$id, email: user.email });
   
   // Less useful - no context
   logger.info('User created');
   ```

3. **Avoid sensitive data**:
   ```typescript
   // Bad - logs password
   logger.debug('Login attempt', { email, password });
   
   // Good - omits sensitive data
   logger.debug('Login attempt', { email });
   ```

4. **Use structured context**:
   ```typescript
   // Good - structured object
   logger.error('Delete failed', { 
     fieldId: id, 
     error: err.message,
     code: err.code 
   });
   
   // Less useful - string concatenation
   logger.error(`Delete failed for ${id}: ${err.message}`);
   ```

## Migration from console.log

Replace console statements with appropriate logger methods:

```typescript
// Before
console.log('[OPERATION] Starting', { id, name });
console.error('Operation failed', error);

// After
logger.info('[OPERATION] Starting', { id, name });
logger.error('Operation failed', { error: error.message, code: error.code });
```

## Testing

```typescript
import { createLogger, LogLevel } from '@/lib/logger';

// Create logger instance for testing
const testLogger = createLogger();
testLogger.setLevel(LogLevel.DEBUG);

// Use in tests
testLogger.debug('Test message', { testData: 'value' });
```

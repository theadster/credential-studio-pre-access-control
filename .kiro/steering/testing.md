# Testing Configuration

## Test Runner
This project uses **Vitest** as the test runner, NOT Jest or npm test.

## Running Tests

### ALWAYS use these commands:
```bash
npx vitest                    # Run tests in watch mode
npx vitest --run              # Run tests once (CI mode)
npx vitest --run [pattern]    # Run specific test files
npx vitest --run --reporter=verbose  # Run with detailed output
```

### NEVER use:
- `npm test` - This will fail, the project doesn't use this command
- `jest` - This project uses Vitest, not Jest

## Test File Patterns
- Test files: `*.test.ts`, `*.test.tsx`
- Located in `__tests__` directories or alongside source files
- Configuration: `vitest.config.ts` at project root
- TypeScript configuration: `tsconfig.test.json` (separate config for test files)

## Common Test Commands
```bash
# Run all tests once
npx vitest --run

# Run specific test file
npx vitest --run src/lib/__tests__/tokenRefresh.test.ts

# Run tests matching pattern
npx vitest --run attendee

# Run with coverage
npx vitest --run --coverage
```

## TypeScript Configuration for Tests
- Test files use a separate TypeScript config: `tsconfig.test.json`
- This config extends the main `tsconfig.json` and includes test directories
- Provides proper type checking and path alias resolution (`@/`) for test files
- Main `tsconfig.json` excludes test files to keep the application config clean

## Important Notes
- When validating implementations, ALWAYS use `npx vitest --run` to avoid blocking watch mode
- Check `vitest.config.ts` for test configuration and setup files
- Tests use Vitest's API (describe, it, expect, vi.mock, etc.)
- If you encounter path alias issues in tests, ensure `tsconfig.test.json` exists and is properly configured

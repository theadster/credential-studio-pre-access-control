# Scripts Directory

This directory contains utility scripts for project maintenance and setup.

## Available Scripts

### Setup & Configuration

#### `setup-appwrite.ts`
Creates Appwrite collections and configures the database schema.

```bash
npm run setup:appwrite
```

#### `verify-appwrite-setup.ts`
Verifies Appwrite configuration and database setup.

```bash
npm run verify:appwrite
```

#### `verify-transactions-config.ts`
Verifies transaction configuration for Appwrite.

```bash
npm run verify:transactions
```

### Version Management

#### `sync-versions-to-docs.ts` 🆕
Automatically syncs package versions to documentation files.

```bash
npm run sync:versions
```

**Features:**
- Reads actual installed package versions
- Updates documentation files automatically
- Reports which files were changed
- Runs automatically via Kiro hook when package.json changes

**See:** [Version Sync Automation Guide](../docs/guides/VERSION_SYNC_AUTOMATION.md)

### Migration Scripts

#### `migrate-to-appwrite.ts`
Migrates data from Supabase to Appwrite.

```bash
npm run migrate:appwrite
```

#### Event Settings Migration Scripts
Various scripts for migrating event settings:

```bash
npm run migrate:appwrite:settings
npm run migrate:appwrite:event-settings
npm run migrate:appwrite:event-settings-v2
npm run migrate:event-settings-complete
npm run migrate:event-settings-normalized
```

#### `clear-event-settings.ts`
Clears event settings data.

```bash
npm run clear:event-settings
```

#### `inspect-event-settings.ts`
Inspects current event settings configuration.

```bash
npm run inspect:event-settings
```

### Testing & Debugging

#### `inject-test-logs.ts`
Injects test log data for development.

```bash
npm run test:inject-logs
```

### Archived Scripts

Legacy migration scripts are located in `scripts/archive/schema-migrations/`.

## Script Organization

```
scripts/
├── README.md                           # This file
├── setup-appwrite.ts                   # Database setup
├── verify-appwrite-setup.ts            # Setup verification
├── verify-transactions-config.ts       # Transaction verification
├── sync-versions-to-docs.ts           # 🆕 Version sync automation
├── inject-test-logs.ts                # Test data injection
└── archive/                           # Archived legacy scripts
    └── schema-migrations/
        └── remove-api-key-attributes.ts
```

## Adding New Scripts

When adding new scripts:

1. **Create the script** in `scripts/` directory
2. **Add npm script** in `package.json`:
   ```json
   "script-name": "tsx scripts/your-script.ts"
   ```
3. **Document it** in this README
4. **Add TypeScript types** for better IDE support
5. **Include error handling** and helpful output messages

## Best Practices

- Use `tsx` for running TypeScript scripts
- Include clear console output with emojis for status
- Handle errors gracefully with helpful messages
- Document required environment variables
- Add comments explaining complex logic
- Use `process.exit(1)` for error conditions

## Environment Variables

Most scripts require these environment variables:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
APPWRITE_API_KEY=your-api-key
```

See `.env.example` for complete list.

## Automation

Some scripts run automatically via Kiro hooks:

- **Version Sync** - Runs when `package.json` or `package-lock.json` changes
  - Hook: `.kiro/hooks/sync-versions-on-package-change.json`
  - Script: `scripts/sync-versions-to-docs.ts`

## Related Documentation

- [Version Sync Automation Guide](../docs/guides/VERSION_SYNC_AUTOMATION.md)
- [Appwrite Setup Guide](../docs/migration/APPWRITE_SETUP.md)
- [Migration Documentation](../docs/migration/)

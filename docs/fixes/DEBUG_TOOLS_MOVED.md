# Debug Tools Reorganization

All debug and diagnostic tools have been moved to the `/debug` directory for better organization.

## New URLs

### Pages (UI Tools)

| Old URL | New URL | Purpose |
|---------|---------|---------|
| `/debug-switchboard` | `/debug/switchboard` | Switchboard configuration validator |
| `/debug-field-mappings` | `/debug/field-mappings` | Field mappings diagnostic |
| `/test-template-processing` | `/debug/template-processing` | Template processing tester |
| `/fix-switchboard-json` | `/debug/fix-json` | JSON template editor/fixer |

### API Endpoints

| Old URL | New URL | Purpose |
|---------|---------|---------|
| `/api/integrations/test-switchboard` | `/api/debug/test-switchboard` | Configuration validation API |
| `/api/integrations/test-template-processing` | `/api/debug/test-template-processing` | Template processing API |
| `/api/integrations/fix-switchboard-json` | `/api/debug/fix-switchboard-json` | JSON template fix API |
| `/api/attendees/debug-custom-fields` | `/api/debug/attendee-custom-fields` | Custom fields debug API |

## Directory Structure

```
src/pages/
├── debug/
│   ├── README.md                    # Documentation for debug tools
│   ├── switchboard.tsx              # Switchboard config validator
│   ├── field-mappings.tsx           # Field mappings diagnostic
│   ├── template-processing.tsx      # Template processing tester
│   └── fix-json.tsx                 # JSON template fixer
│
└── api/
    └── debug/
        ├── test-switchboard.ts              # Config validation endpoint
        ├── test-template-processing.ts      # Template processing endpoint
        ├── fix-switchboard-json.ts          # JSON fix endpoint
        └── attendee-custom-fields.ts        # Custom fields debug endpoint
```

## Benefits

✅ **Cleaner project structure** - Debug tools separated from production code  
✅ **Easier to find** - All debug tools in one place  
✅ **Better organization** - Clear separation of concerns  
✅ **Easier to remove** - Can delete entire `/debug` directory if needed  
✅ **Documented** - README.md explains each tool's purpose  

## Quick Access

For quick access during development, bookmark these URLs:

- **Main Diagnostic:** http://localhost:3000/debug/switchboard
- **Template Tester:** http://localhost:3000/debug/template-processing
- **Field Mappings:** http://localhost:3000/debug/field-mappings
- **JSON Fixer:** http://localhost:3000/debug/fix-json

## Notes

- All functionality remains the same, only URLs changed
- Old URLs will return 404 (Next.js will not find the pages)
- Update any bookmarks or documentation that reference old URLs
- The tools are still accessible without authentication (consider adding auth for production)

## For Production

Consider:
1. Adding authentication to debug pages (admin-only access)
2. Removing debug tools entirely from production builds
3. Using environment variables to conditionally include debug routes
4. Adding a `/debug` index page that lists all available tools

## Documentation Updated

The following documentation files reference the new URLs:
- `src/pages/debug/README.md` - Complete guide to debug tools
- `CREDENTIAL_GENERATION_FIXES_SUMMARY.md` - References debug tools
- `SWITCHBOARD_CONFIGURATION_GUIDE.md` - Links to debug pages

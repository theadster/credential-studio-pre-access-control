# Version Sync Automation

## Overview

This project includes automation to keep documentation files synchronized with actual package versions. This prevents documentation drift and ensures version information is always accurate.

## How It Works

### 1. Sync Script (`scripts/sync-versions-to-docs.ts`)

The script:
- Reads actual installed package versions using `npm list`
- Updates documentation files with current versions
- Reports which files were updated

**Packages tracked:**
- Next.js
- React
- React-DOM
- TypeScript
- Tailwind CSS
- Node.js (from package.json engines)

**Documentation files updated:**
- `.kiro/steering/tech.md` - Technical stack documentation
- `.kiro/steering/product.md` - Product overview
- `README.md` - Main project README

### 2. Kiro Hook (`.kiro/hooks/sync-versions-on-package-change.json`)

Automatically runs the sync script when:
- `package.json` is saved
- `package-lock.json` is saved

This ensures documentation is updated immediately after package changes.

## Manual Usage

Run the sync script manually anytime:

```bash
npm run sync:versions
```

**When to run manually:**
- After running `npm install` or `npm update`
- After changing package versions in package.json
- When you notice version mismatches in documentation
- Before committing documentation changes

## Output Example

```
🔄 Syncing package versions to documentation...

📦 Current versions:
   Next.js: 16.0.3
   React: 19.2.0
   React-DOM: 19.2.0
   TypeScript: 5.9.3
   Tailwind CSS: 3.4.18
   Node.js: >=20.x

✓ Updated .kiro/steering/tech.md
✓ Updated .kiro/steering/product.md
- No changes needed in README.md

✨ Done! Updated 2 file(s).
```

## Adding New Documentation Files

To add more documentation files to the sync process:

1. Open `scripts/sync-versions-to-docs.ts`
2. Add a new entry to the `docFiles` array:

```typescript
{
  path: 'path/to/your/doc.md',
  replacements: [
    {
      search: /Your regex pattern to find version text/,
      replace: (v) => `Your replacement text with ${v.next} or ${v.react}`
    }
  ]
}
```

3. Test with `npm run sync:versions`

## Available Version Variables

In replacement functions, you have access to:

- `v.next` - Next.js version (e.g., "16.0.3")
- `v.react` - React version (e.g., "19.2.0")
- `v.reactDom` - React-DOM version (e.g., "19.2.0")
- `v.typescript` - TypeScript version (e.g., "5.9.3")
- `v.tailwindcss` - Tailwind CSS version (e.g., "3.4.18")
- `v.node` - Node.js requirement (e.g., ">=20.x")

## Troubleshooting

### Script fails to find versions

**Problem:** Script can't parse `npm list` output

**Solution:**
1. Ensure packages are installed: `npm install`
2. Check that npm is working: `npm --version`
3. Run `npm list next react react-dom typescript tailwindcss --depth=0` manually to verify output

### Documentation not updating

**Problem:** Files show "No changes needed" but versions are wrong

**Solution:**
1. Check the regex patterns in `docFiles` array
2. Ensure the documentation format matches the expected pattern
3. Update the regex pattern to match your documentation format

### Hook not triggering

**Problem:** Kiro hook doesn't run automatically

**Solution:**
1. Check that the hook is enabled in `.kiro/hooks/sync-versions-on-package-change.json`
2. Verify the file pattern matches: `{package.json,package-lock.json}`
3. Restart Kiro IDE if needed
4. Check the Kiro hooks panel to see if the hook is registered

## Benefits

✅ **Always accurate** - Documentation matches actual installed versions  
✅ **Automatic** - No manual updates needed  
✅ **Fast** - Runs in seconds  
✅ **Reliable** - Uses actual npm data, not assumptions  
✅ **Maintainable** - Easy to add new files or version checks  

## Integration with CI/CD

You can add this to your CI/CD pipeline to verify documentation is up-to-date:

```yaml
# Example GitHub Actions step
- name: Verify documentation versions
  run: |
    npm run sync:versions
    git diff --exit-code || (echo "Documentation versions out of sync!" && exit 1)
```

This will fail the build if documentation versions don't match package.json.

## Related Files

- `scripts/sync-versions-to-docs.ts` - Main sync script
- `.kiro/hooks/sync-versions-on-package-change.json` - Kiro hook configuration
- `package.json` - Contains the `sync:versions` script command

## Questions?

If you need to track additional packages or update different documentation files, modify the script or ask for help in updating the automation.

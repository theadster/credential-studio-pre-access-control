# Version Sync - Quick Start

## TL;DR

Documentation versions now update automatically when you change packages. No action needed!

## How It Works

```
You update packages → Save package.json → Hook triggers → Docs updated → Done! ✨
```

## Manual Sync

Need to sync manually?

```bash
npm run sync:versions
```

## What Gets Updated

- `.kiro/steering/tech.md` - Technical stack
- `.kiro/steering/product.md` - Product overview  
- `README.md` - Main README

## Versions Tracked

- Next.js
- React & React-DOM
- TypeScript
- Tailwind CSS
- Node.js

## Example Output

```
🔄 Syncing package versions to documentation...

📦 Current versions:
   Next.js: 16.0.3
   React: 19.2.0
   TypeScript: 5.9.3
   Tailwind CSS: 3.4.18

✓ Updated .kiro/steering/tech.md
✨ Done! Updated 1 file(s).
```

## When to Run Manually

- After `npm install` or `npm update`
- Before committing documentation
- When you notice version mismatches
- To verify everything is in sync

## Troubleshooting

**Hook not working?**
- Check `.kiro/hooks/sync-versions-on-package-change.json` exists
- Restart Kiro IDE

**Script fails?**
- Run `npm install` first
- Check `npm --version` works

**Need help?**
- See [Full Guide](./VERSION_SYNC_AUTOMATION.md)
- Check [Setup Summary](./VERSION_SYNC_SETUP_SUMMARY.md)

## That's It!

Your documentation will stay in sync automatically. 🎉

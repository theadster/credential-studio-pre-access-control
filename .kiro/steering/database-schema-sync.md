---
inclusion: fileMatch
fileMatchPattern: "scripts/setup-appwrite.ts"
---

# Database Schema Documentation Sync

Whenever `scripts/setup-appwrite.ts` is modified (tables or columns added, changed, or removed), you MUST also update `docs/reference/DATABASE_SCHEMA.md` in the same change:

- Add new tables to the Table Index and add a full section with all columns and indexes
- Add new columns to the relevant table section
- Remove deleted tables/columns from the document
- Update the `last_verified` date in the frontmatter to today's date

This document is the authoritative schema reference for the project. Keeping it out of sync is a bug.

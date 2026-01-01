# credential.studio Documentation

Welcome to the credential.studio documentation system. This documentation is organized by knowledge domain and maintained using a hybrid approach that combines physical folder organization with metadata-driven lifecycle management.

## Documentation Organization

Our documentation is organized into **active** categories that represent different knowledge domains:

### 📚 Active Documentation Categories

| Category | Purpose | Files | Status |
|----------|---------|-------|--------|
| **guides/** | How-to guides, implementation patterns, best practices | 41 | Active |
| **reference/** | API specs, data models, configuration reference | 3 | Active |
| **migration/** | Appwrite migration runbooks and schema documentation | 16 | Active |
| **testing/** | Test coverage, testing strategies, test guides | 21 | Active |
| **fixes/** | Active bug fix patterns and known issues | 20 | Active |
| **enhancements/** | Implemented features and enhancements | 19 | Active |
| **misc/** | Miscellaneous references and utilities | 9 | Active |

**Total Active Files:** 129

### 📦 Archive

Historical documentation is preserved in `_archive/` for reference and knowledge retention:

- **_archive/fixes/** (275 files) - Resolved bugs and investigations
- **_archive/migrations/** (7 files) - Completed migration runbooks
- **_archive/testing/** (24 files) - Completed test documentation
- **_archive/guides/** (39 files) - Superseded implementation guides
- **_archive/enhancements/** (6 files) - Superseded feature documentation
- **_archive/misc/** (7 files) - Resolved miscellaneous items

**Total Archived Files:** 358

See [Archive README](_archive/README.md) for more information.

---

## Documentation Metadata Schema

All active documentation files should include frontmatter metadata to enable automation and maintain clarity about document status and ownership.

### Frontmatter Template

Add this to the top of every documentation file:

```yaml
---
title: "Document Title"
type: canonical | adr | worklog | runbook
status: active | superseded | archived
owner: "@username"
last_verified: YYYY-MM-DD
review_interval_days: 90
related_code: ["src/lib/auth.ts", "app/api/auth/"]
superseded_by: "../path/to/new-doc.md"  # if applicable
---
```

### Metadata Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Document title |
| `type` | enum | Yes | `canonical` (always current), `adr` (decision record), `worklog` (high-churn), `runbook` (operational) |
| `status` | enum | Yes | `active` (current), `superseded` (replaced), `archived` (historical) |
| `owner` | string | Yes | GitHub username or team handle responsible for maintenance |
| `last_verified` | date | Yes | Last date document was reviewed for accuracy (YYYY-MM-DD) |
| `review_interval_days` | number | Yes | How often doc should be reviewed (90/180/365) |
| `related_code` | array | No | File paths related to this documentation |
| `superseded_by` | string | No | Path to document that replaces this one |

### Review Intervals by Type

- **canonical:** 90 days (frequently changes)
- **adr:** 365 days (rarely changes)
- **worklog:** 30 days (high churn)
- **runbook:** 180 days (operational)

---

## Quick Navigation

### Getting Started
- [Testing Quick Start](testing/TESTING_QUICK_START.md) - Run tests locally
- [Manual Testing Guide](guides/MANUAL_TESTING_GUIDE.md) - Test the application
- [Switchboard Configuration Guide](guides/SWITCHBOARD_CONFIGURATION_GUIDE.md) - Set up credential printing

### Architecture & Design
- [Integration Architecture Guide](guides/INTEGRATION_ARCHITECTURE_GUIDE.md) - System design
- [Integration Data Flow](guides/INTEGRATION_DATA_FLOW.md) - How data flows through integrations
- [Appwrite Configuration](migration/APPWRITE_CONFIGURATION.md) - Database structure

### Development Guides
- [Custom Fields API Guide](guides/CUSTOM_FIELDS_API_GUIDE.md) - Working with custom fields
- [Transactions Developer Guide](guides/TRANSACTIONS_DEVELOPER_GUIDE.md) - Atomic operations
- [Performance Best Practices](guides/PERFORMANCE_BEST_PRACTICES.md) - Optimization patterns

### Mobile Development
- [Mobile API Quick Reference](guides/MOBILE_API_QUICK_REFERENCE.md) - Mobile endpoints
- [Mobile Settings Passcode Implementation](guides/MOBILE_SETTINGS_PASSCODE_IMPLEMENTATION_GUIDE.md) - Passcode feature

### Troubleshooting
- [Error Handling Guide](guides/ERROR_HANDLING_GUIDE.md) - Error patterns
- [Integration Troubleshooting Guide](guides/INTEGRATION_TROUBLESHOOTING_GUIDE.md) - Common issues
- [Memory Optimization Guide](guides/MEMORY_OPTIMIZATION_GUIDE.md) - Performance issues

### Reference
- [API Transactions Reference](reference/API_TRANSACTIONS_REFERENCE.md) - Transaction API
- [Log Settings Mapping](reference/LOG_SETTINGS_MAPPING.md) - Logging configuration
- [Mobile API Reference](reference/MOBILE_API_REFERENCE.md) - Mobile API endpoints

---

## Maintenance & Lifecycle

### For Document Authors

1. **Creating a new document:**
   - Choose the appropriate category folder
   - Add frontmatter metadata (see template above)
   - Set `status: active` and `last_verified` to today's date

2. **Updating a document:**
   - Update `last_verified` to today's date
   - If significant changes, update `related_code` if applicable

3. **Deprecating a document:**
   - Set `status: superseded`
   - Add `superseded_by` field pointing to replacement
   - Leave in active folder for 30 days, then archive

### For Maintainers

**Monthly:**
- Review documents flagged as needing verification
- Archive documents past their review date

**Quarterly:**
- Full documentation audit
- Consolidate duplicate guides
- Update archive indexes

**Annually:**
- Complete documentation review
- Remove outdated references
- Update version information

### Automation

We use GitHub Actions to:
- Check for broken internal links
- Flag documents past their review date
- Validate frontmatter metadata
- Generate documentation indexes

---

## Documentation Standards

### Writing Style
- Use clear, concise language
- Prefer active voice
- Include code examples where applicable
- Link to related documentation

### File Naming
- Use UPPERCASE for documentation files
- Use underscores to separate words
- Be descriptive but concise
- Include the type of document (GUIDE, REFERENCE, etc.)

**Examples:**
- ✅ `CUSTOM_FIELD_API_GUIDE.md`
- ✅ `SWITCHBOARD_CONFIGURATION_GUIDE.md`
- ❌ `guide.md` (too vague)
- ❌ `documentation.md` (not descriptive)

### Code Examples
- Use complete, working examples
- Include language syntax highlighting
- Explain what the code does
- Link to related source files

### Links
- Use relative links for internal documentation
- Use absolute URLs for external resources
- Check links regularly for rot

---

## Archive & Historical Knowledge

Historical documentation is preserved in `_archive/` for:

- **Pattern Recognition:** Identify recurring issues and solutions
- **Audit Trail:** Maintain compliance and change history
- **Learning:** Understand why decisions were made
- **Rollback Knowledge:** Reference for reverting changes

See [Archive README](_archive/README.md) for details on accessing archived documentation.

---

## Contributing

When contributing to documentation:

1. Follow the metadata schema above
2. Use the file naming conventions
3. Add your documentation to the appropriate category
4. Include frontmatter with all required fields
5. Link to related documentation
6. Test all links before submitting

---

## Questions?

- **About a specific document?** Check the `owner` field in the frontmatter
- **About documentation organization?** See [Documentation Audit Summary](DOCUMENTATION_AUDIT_SUMMARY.md)
- **About the implementation plan?** See [Documentation Action Plan](DOCUMENTATION_ACTION_PLAN.md)

---

**Last Updated:** December 31, 2025  
**Active Files:** 129  
**Archived Files:** 358  
**Total Documentation:** 487 files

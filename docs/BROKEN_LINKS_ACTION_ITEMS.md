---
title: Broken Links Action Items
type: worklog
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 30
related_code: ["scripts/check-docs-links.ts"]
---

# Broken Documentation Links - Action Items

**Date:** December 31, 2025  
**Total Broken Links:** 65  
**Status:** Identified, awaiting manual review and fixes

## Overview

This document lists all 65 broken documentation links identified by the `check-docs-links.ts` script. These links need to be reviewed and either fixed or removed.

## Broken Links by Category

### 1. Missing Guide Files (6 links)

These files are referenced but don't exist in the guides directory:

- [ ] `docs/README.md:101` → `guides/MOBILE_API_QUICK_REFERENCE.md`
- [ ] `docs/guides/MOBILE_CUSTOM_FIELDS_ENHANCEMENT.md:140` → `./MOBILE_CUSTOM_FIELD_NAMES.md`
- [ ] `docs/guides/MOBILE_CUSTOM_FIELDS_ENHANCEMENT.md:142` → `./MOBILE_EVENT_INFO_API.md`
- [ ] `docs/guides/MOBILE_CUSTOM_FIELDS_ENHANCEMENT.md:259` → `./MOBILE_CUSTOM_FIELD_NAMES.md`
- [ ] `docs/guides/MOBILE_CUSTOM_FIELDS_ENHANCEMENT.md:263` → `./MOBILE_CUSTOM_FIELD_NAMES.md`
- [ ] `docs/guides/MOBILE_CUSTOM_FIELDS_ENHANCEMENT.md:265` → `./MOBILE_EVENT_INFO_API.md`
- [ ] `docs/guides/MOBILE_CUSTOM_FIELDS_ENHANCEMENT.md:266` → `./MOBILE_APP_EVENT_DISPLAY.md`
- [ ] `docs/guides/BULK_OPERATIONS_PERFORMANCE.md:275` → `./DATABASE_OPERATORS_GUIDE.md`
- [ ] `docs/guides/BULK_OPERATIONS_PERFORMANCE.md:276` → `./ARRAY_OPERATORS_IMPLEMENTATION.md`
- [ ] `docs/guides/PASSWORD_RESET_ADMIN_GUIDE.md:301` → `./EMAIL_VERIFICATION_TESTING_GUIDE.md`

**Action:** Either create these files or update links to existing files

### 2. References to Archived Files (35 links)

These files reference other files that have been moved to the archive:

#### Enhancements referencing archived fixes:
- [ ] `docs/enhancements/ATTENDEES_PAGINATION_IMPROVEMENT.md:253` → `../fixes/BULK_OPERATIONS_PAGINATION_RESET_FIX.md`
- [ ] `docs/enhancements/DELETE_LOGS_PROGRESS_INDICATOR.md:308` → `../fixes/BULK_LOG_DELETE_RATE_LIMIT_FIX.md`
- [ ] `docs/enhancements/DELETE_LOGS_PROGRESS_INDICATOR.md:309` → `../fixes/IMPROVED_BULK_OPERATION_LOGGING.md`

#### Fixes referencing other archived fixes:
- [ ] `docs/fixes/CRITICAL_BULK_EDIT_DATA_LOSS_FIX.md:175` → `./CUSTOM_FIELD_VALUES_FIX.md`
- [ ] `docs/fixes/CRITICAL_BULK_EDIT_DATA_LOSS_FIX.md:176` → `./CUSTOM_FIELD_VALIDATION_FIX.md`
- [ ] `docs/fixes/CRITICAL_BULK_EDIT_DATA_LOSS_FIX.md:234` → `./CUSTOM_FIELD_VALUES_FIX.md`
- [ ] `docs/fixes/CRITICAL_BULK_EDIT_DATA_LOSS_FIX.md:235` → `./CUSTOM_FIELD_VALIDATION_FIX.md`
- [ ] `docs/fixes/CRITICAL_BULK_EDIT_DATA_LOSS_FIX.md:236` → `./CREDENTIAL_GENERATION_FIXES_SUMMARY.md`
- [ ] `docs/fixes/CUSTOM_FIELDS_ENHANCEMENTS_SUMMARY.md:30` → `./CUSTOM_FIELDS_OPTIMISTIC_LOCKING.md`
- [ ] `docs/fixes/CUSTOM_FIELDS_ENHANCEMENTS_SUMMARY.md:45` → `./CUSTOM_FIELDS_SOFT_DELETE.md`
- [ ] `docs/fixes/CUSTOM_FIELDS_ENHANCEMENTS_SUMMARY.md:424` → `./CUSTOM_FIELDS_OPTIMISTIC_LOCKING.md`
- [ ] `docs/fixes/CUSTOM_FIELDS_ENHANCEMENTS_SUMMARY.md:425` → `./CUSTOM_FIELDS_SOFT_DELETE.md`
- [ ] `docs/fixes/CUSTOM_FIELDS_TYPE_SAFETY_IMPLEMENTATION.md:367` → `./CUSTOM_FIELD_VALUES_FIX.md`
- [ ] `docs/fixes/DASHBOARD_AGGREGATE_METRICS_FIX.md:247` → `./DASHBOARD_PERFORMANCE_FIX.md`
- [ ] `docs/fixes/IMPORT_COMPLETE_FIX_SESSION_SUMMARY.md:36` → `./IMPORT_API_RESPONSE_AND_BOOLEAN_DEBUG.md`
- [ ] `docs/fixes/IMPORT_COMPLETE_FIX_SESSION_SUMMARY.md:47` → `./IMPORT_API_RESPONSE_AND_BOOLEAN_DEBUG.md`
- [ ] `docs/fixes/IMPORT_COMPLETE_FIX_SESSION_SUMMARY.md:60` → `./IMPORT_BOOLEAN_FORMAT_FIX.md`
- [ ] `docs/fixes/IMPORT_COMPLETE_FIX_SESSION_SUMMARY.md:93` → `./IMPORT_NOTES_AND_UPPERCASE_FIX.md`
- [ ] `docs/fixes/IMPORT_COMPLETE_FIX_SESSION_SUMMARY.md:104` → `./IMPORT_NOTES_AND_UPPERCASE_FIX.md`
- [ ] `docs/fixes/IMPORT_COMPLETE_FIX_SESSION_SUMMARY.md:234` → `./IMPORT_API_RESPONSE_AND_BOOLEAN_DEBUG.md`
- [ ] `docs/fixes/IMPORT_COMPLETE_FIX_SESSION_SUMMARY.md:235` → `./IMPORT_BOOLEAN_FORMAT_FIX.md`
- [ ] `docs/fixes/IMPORT_COMPLETE_FIX_SESSION_SUMMARY.md:237` → `./IMPORT_NOTES_AND_UPPERCASE_FIX.md`
- [ ] `docs/fixes/IMPORT_COMPLETE_FIX_SESSION_SUMMARY.md:238` → `./IMPORT_FIXES_COMPLETE_SUMMARY.md`

#### Guides referencing archived fixes:
- [ ] `docs/guides/BULK_CREDENTIAL_GENERATION_LOGIC.md:232` → `../fixes/CREDENTIAL_GENERATION_FIXES_SUMMARY.md`
- [ ] `docs/guides/BULK_CREDENTIAL_GENERATION_LOGIC.md:233` → `../fixes/CREDENTIAL_STATUS_FIX.md`
- [ ] `docs/guides/BULK_OPERATIONS_PERFORMANCE.md:277` → `../fixes/BULK_OPERATIONS_CANONICAL.md`
- [ ] `docs/guides/CUSTOM_FIELDS_API_GUIDE.md:604` → `../fixes/CUSTOM_FIELDS_OPTIMISTIC_LOCKING.md`
- [ ] `docs/guides/CUSTOM_FIELDS_API_GUIDE.md:605` → `../fixes/CUSTOM_FIELDS_SOFT_DELETE.md`
- [ ] `docs/guides/PREVENTING_PERFORMANCE_REGRESSIONS.md:401` → `../fixes/DASHBOARD_PERFORMANCE_FIX.md`

#### Testing referencing archived fixes:
- [ ] `docs/testing/LOG_DELETION_TESTING_GUIDE.md:158` → `../fixes/DELETE_LOGS_RATE_LIMIT_FIX.md`

#### Migration referencing archived fixes:
- [ ] `docs/migration/LOG_SETTINGS_SCHEMA_MIGRATION.md:164` → `../fixes/CUSTOM_FIELD_AND_LOG_SETTINGS_FIX.md`

#### Reference referencing archived guides:
- [ ] `docs/reference/API_TRANSACTIONS_REFERENCE.md:1002` → `../guides/TRANSACTION_MONITORING_GUIDE.md`
- [ ] `docs/reference/MOBILE_API_REFERENCE.md:389` → `../guides/MOBILE_EVENT_INFO_API.md`
- [ ] `docs/reference/MOBILE_API_REFERENCE.md:390` → `../guides/MOBILE_APP_EVENT_DISPLAY.md`

**Action:** Update links to point to `docs/_archive/` or remove if no longer relevant

### 3. Missing Image Files (2 links)

These image files are referenced but don't exist:

- [ ] `docs/guides/PRINTABLE_FIELDS_USER_GUIDE.md:120` → `../images/printable-field-toggle.png`
- [ ] `docs/guides/PRINTABLE_FIELDS_USER_GUIDE.md:123` → `../images/printable-badge.png`

**Action:** Either create/add images or remove image references

### 4. Missing SweetAlert Migration Guide (3 links)

These files reference a migration guide that doesn't exist:

- [ ] `docs/guides/SWEETALERT_BEST_PRACTICES_GUIDE.md:733` → `./SWEETALERT_MIGRATION_GUIDE.md`
- [ ] `docs/guides/SWEETALERT_CUSTOMIZATION_GUIDE.md:719` → `./SWEETALERT_MIGRATION_GUIDE.md`
- [ ] `docs/guides/SWEETALERT_USAGE_GUIDE.md:561` → `./SWEETALERT_MIGRATION_GUIDE.md`

**Action:** Either create the migration guide or remove references

### 5. Missing Transaction Monitoring Guide (3 links)

These files reference a monitoring guide that doesn't exist:

- [ ] `docs/guides/TRANSACTIONS_BEST_PRACTICES.md:712` → `./TRANSACTION_MONITORING_GUIDE.md`
- [ ] `docs/guides/TRANSACTIONS_DEVELOPER_GUIDE.md:1084` → `./TRANSACTION_MONITORING_GUIDE.md`
- [ ] `docs/guides/TRANSACTIONS_QUICK_REFERENCE.md:218` → `./TRANSACTION_MONITORING_GUIDE.md`

**Action:** Either create the monitoring guide or remove references

### 6. Spec File References (4 links)

These files reference spec files that may not exist or are in different locations:

- [ ] `docs/reference/MOBILE_API_REFERENCE.md:391` → `.kiro/specs/mobile-access-control/design.md`
- [ ] `docs/testing/MOBILE_SETTINGS_PASSCODE_TESTS_SUMMARY.md:287` → `.kiro/specs/mobile-settings-passcode/requirements.md`
- [ ] `docs/testing/MOBILE_SETTINGS_PASSCODE_TESTS_SUMMARY.md:288` → `.kiro/specs/mobile-settings-passcode/design.md`
- [ ] `docs/testing/MOBILE_SETTINGS_PASSCODE_TESTS_SUMMARY.md:289` → `.kiro/specs/mobile-settings-passcode/tasks.md`
- [ ] `docs/testing/MOBILE_SETTINGS_PASSCODE_TESTS_SUMMARY.md:290` → `.kiro/specs/mobile-settings-passcode/TASK_4_BACKEND_VALIDATION_SUMMARY.md`

**Action:** Verify spec files exist or update links

### 7. Miscellaneous Broken Links (5 links)

- [ ] `docs/guides/APPWRITE_ATTRIBUTE_POLLING_CONFIGURATION.md:165` → `../testing.md` (should be `../testing/README.md`?)
- [ ] `docs/testing/README.md:7` → `TESTING_SUMMARY.md` (file doesn't exist)
- [ ] `docs/testing/README.md:148` → `TESTING_SUMMARY.md#troubleshooting` (file doesn't exist)
- [ ] `docs/testing/README.md:192` → `TESTING_SUMMARY.md#performance-benchmarks` (file doesn't exist)
- [ ] `docs/testing/RUNNING_INTEGRATION_TESTS.md:388` → `./LOGS_TIMESTAMP_FIX_TESTING_GUIDE.md`
- [ ] `docs/testing/RUNNING_INTEGRATION_TESTS.md:389` → `./LOGS_TIMESTAMP_FIX_TEST_RESULTS.md`
- [ ] `docs/testing/TESTING_QUICK_START.md:44` → `docs/testing/LOG_DELETION_TESTING_GUIDE.md` (incorrect path)
- [ ] `docs/migration/MIGRATION_VALIDATION_TESTS_SUMMARY.md:369` → `src/scripts/migrate-to-appwrite.ts` (source code reference)

**Action:** Review and fix or remove as appropriate

## How to Fix Broken Links

### Option 1: Update Link to Archive
If the referenced file is in the archive:
```markdown
# Before
[Link](../fixes/ARCHIVED_FILE.md)

# After
[Link](../_archive/fixes/ARCHIVED_FILE.md)
```

### Option 2: Remove Link
If the reference is no longer relevant:
```markdown
# Before
See [this guide](./MISSING_GUIDE.md) for details.

# After
For more details, see the documentation.
```

### Option 3: Create Missing File
If the file should exist but doesn't, create it with appropriate content.

### Option 4: Fix Path
If the path is incorrect, update it to the correct location:
```markdown
# Before
[Link](../testing.md)

# After
[Link](../testing/README.md)
```

## Recommended Priority

### High Priority (Fix First)
1. Missing guide files (10 links) - Create or update references
2. SweetAlert migration guide (3 links) - Create or remove
3. Transaction monitoring guide (3 links) - Create or remove

### Medium Priority (Fix Next)
1. Spec file references (5 links) - Verify and update
2. Miscellaneous broken links (8 links) - Review and fix

### Low Priority (Fix Last)
1. References to archived files (35 links) - Update to archive paths
2. Missing image files (2 links) - Create or remove

## Automation

To check for broken links in the future, run:
```bash
npx ts-node scripts/check-docs-links.ts
```

This will identify any new broken links as they're introduced.

## Tracking Progress

- [ ] High priority links fixed
- [ ] Medium priority links fixed
- [ ] Low priority links fixed
- [ ] All broken links resolved
- [ ] Re-run link checker to verify

---

**Last Updated:** December 31, 2025  
**Total Links to Fix:** 65  
**Status:** Awaiting manual review and fixes

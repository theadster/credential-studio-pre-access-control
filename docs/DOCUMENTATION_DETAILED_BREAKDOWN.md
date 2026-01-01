---
title: Documentation Detailed Breakdown
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: []
---

# Documentation Detailed Breakdown

## docs/migration/ - Detailed File Status

### ✅ ACTIVE (Keep)
1. **MIGRATION_COMPLETE_SUMMARY.md** - Current state reference, shows all 4 documents migrated
2. **MIGRATION_STATUS.md** - Status tracking, lists completed and pending items
3. **APPWRITE_CONFIGURATION.md** - Database structure reference
4. **INTEGRATION_COLLECTIONS_MIGRATION.md** - Architecture reference for normalized design
5. **CUSTOM_FIELDS_VISIBILITY_MIGRATION.md** - Feature-specific migration
6. **EVENT_SETTINGS_MIGRATION_SCHEMA.md** - Schema reference
7. **INTEGRATION_SECRETS_MIGRATION.md** - Security reference
8. **LOG_SETTINGS_SCHEMA_MIGRATION.md** - Schema reference
9. **LOGS_TIMESTAMP_MIGRATION_SUMMARY.md** - Feature-specific
10. **INTEGRATION_VERSION_MIGRATION.md** - Feature-specific
11. **MIGRATION_LESSONS_LEARNED.md** - Knowledge base
12. **MIGRATION_VALIDATION_TESTS_SUMMARY.md** - Validation reference
13. **MIGRATION_SCRIPTS_ALIGNMENT_SUMMARY.md** - Script reference
14. **API_KEYS_REMOVAL_MIGRATION.md** - Security reference
15. **INTEGRATION_VERSION_ATTRIBUTE_SUMMARY.md** - Feature reference
16. **COMPLETE_MIGRATION_GUIDE.md** - Comprehensive guide

### 🗑️ ARCHIVE (Move to docs/archive/migration/)
1. **MIGRATION_QUICK_START.md** - Superseded by MIGRATION_COMPLETE_SUMMARY.md
2. **MIGRATION_QUICK_REFERENCE.md** - Superseded by MIGRATION_STATUS.md
3. **APPWRITE_NOTES.md** - Informal notes, superseded by APPWRITE_CONFIGURATION.md
4. **APPWRITE_SETUP.md** - Superseded by APPWRITE_CONFIGURATION.md
5. **APPWRITE_TRANSACTIONS_MIGRATION_SUMMARY.md** - Transactions now in guides/
6. **OPERATOR_MIGRATION_GUIDE.md** - Operator-specific, may be outdated
7. **USERFORM_MODULAR_MIGRATION.md** - UserForm refactoring complete

---

## docs/testing/ - Detailed File Status

### ✅ ACTIVE (Keep)
1. **ATTENDEE_API_TESTS_SUMMARY.md** - Current test reference
2. **CUSTOM_FIELD_API_TESTS_SUMMARY.md** - Current test reference
3. **INVITATION_API_TESTS_SUMMARY.md** - Current test reference
4. **LOGS_API_TESTS_SUMMARY.md** - Current test reference
5. **REALTIME_TESTS_SUMMARY.md** - Current test reference
6. **ROLE_API_TESTS_SUMMARY.md** - Current test reference
7. **USER_MANAGEMENT_API_TESTS_SUMMARY.md** - Current test reference
8. **AUTH_USER_LINKING_INTEGRATION_TESTS_SUMMARY.md** - Current test reference
9. **E2E_TESTS_SUMMARY.md** - Current test reference
10. **MOBILE_SETTINGS_PASSCODE_TESTS_SUMMARY.md** - Current test reference
11. **NOTES_SEARCH_TESTS_SUMMARY.md** - Current test reference
12. **ONESIMPLEAPI_SANITIZATION_TESTS_SUMMARY.md** - Current test reference
13. **CUSTOM_FIELD_COLUMNS_TESTING_CHECKLIST.md** - Feature testing
14. **LOG_DELETION_TESTING_GUIDE.md** - Feature testing
15. **RUNNING_INTEGRATION_TESTS.md** - How-to guide
16. **TESTING_QUICK_START.md** - Quick reference
17. **QUICK_TEST_GUIDE.md** - Quick reference
18. **README.md** - Index file
19. **NOTES_SEARCH_VISUAL_ACCESSIBILITY_VERIFICATION.md** - Accessibility testing
20. **TRANSACTIONS_TEST_PLAN.md** - Feature testing
21. **USERFORM_TESTING_SUMMARY.md** - Feature testing

### 🗑️ ARCHIVE (Move to docs/archive/testing/)
1. **TEST_SUMMARY.md** - Superseded by individual summaries
2. **TESTING_SUMMARY.md** - Superseded by individual summaries
3. **TEST_FIX_CUSTOM_FIELDS.md** - Fix applied, historical
4. **TEST_INVESTIGATION_COMPLETE.md** - Investigation complete
5. **TEST_ORGANIZATION_STANDARDS.md** - Standards documented
6. **TEST_ORGANIZATION_UPDATE_SUMMARY.md** - Update complete
7. **TESTS_CREATED.md** - Historical record
8. **TASK_7_VERIFICATION_COMPLETE.md** - Task complete
9. **TASK_11_INTEGRATION_TESTS_SUMMARY.md** - Task complete
10. **TYPESCRIPT_FIXES_TESTING_SUMMARY.md** - Fixes applied
11. **PRINTABLE_FIELD_TEST_ISSUE.md** - Issue resolved
12. **MEMORY_LEAK_TESTING_CHECKLIST.md** - Leak fixed
13. **LOGGING_OPERATORS_TEST_BEFORE_AFTER.md** - Refactor complete
14. **LOGGING_OPERATORS_TEST_REFACTOR_SUMMARY.md** - Refactor complete
15. **LOGS_TIMESTAMP_FIX_TESTING_GUIDE.md** - Fix applied
16. **LOGS_TIMESTAMP_FIX_TESTING_SUMMARY.md** - Fix applied
17. **LOGS_TIMESTAMP_FIX_TEST_RESULTS.md** - Fix applied
18. **BACKWARD_COMPATIBILITY_TESTS_SUMMARY.md** - Tests passing
19. **CONCURRENT_OPERATORS_INTEGRATION_TESTS_SUMMARY.md** - Tests passing
20. **OPERATOR_TESTING_COMPLETE_SUMMARY.md** - Testing complete
21. **TEST_LOG_INJECTION_SUMMARY.md** - Injection complete
22. **TEST_LOG_INJECTION_UPDATED.md** - Update complete
23. **ATTENDEE_API_DEAD_CODE_REMOVAL_AND_TEST_FIXES.md** - Cleanup complete

---

## docs/guides/ - Detailed File Status

### ✅ ACTIVE (Keep) - 36 files

**Integration System (10 files):**
1. ADDING_NEW_INTEGRATION_GUIDE.md
2. INTEGRATION_ARCHITECTURE_GUIDE.md
3. INTEGRATION_DATA_FLOW.md
4. INTEGRATION_MIGRATION_PATTERNS.md
5. INTEGRATION_PATTERNS_REFERENCE.md
6. INTEGRATION_SECURITY_GUIDE.md
7. INTEGRATION_TROUBLESHOOTING_GUIDE.md
8. INTEGRATION_TYPE_EXAMPLES.md
9. INTEGRATION_UI_PATTERNS.md
10. PHOTO_SERVICE_INTEGRATION_GUIDE.md

**Transactions & Performance (8 files):**
11. TRANSACTIONS_BEST_PRACTICES.md
12. TRANSACTIONS_CODE_EXAMPLES.md
13. TRANSACTIONS_COMPREHENSIVE_ANALYSIS.md
14. TRANSACTIONS_DEVELOPER_GUIDE.md
15. TRANSACTIONS_QUICK_REFERENCE.md
16. PERFORMANCE_BEST_PRACTICES.md
17. PREVENTING_PERFORMANCE_REGRESSIONS.md
18. MEMORY_OPTIMIZATION_GUIDE.md

**SweetAlert & UI (4 files):**
19. SWEETALERT_BEST_PRACTICES_GUIDE.md
20. SWEETALERT_CUSTOMIZATION_GUIDE.md
21. SWEETALERT_USAGE_GUIDE.md
22. Z_INDEX_LAYERING_SYSTEM.md

**Mobile & Features (8 files):**
23. MOBILE_API_IMPLEMENTATION_SUMMARY.md
24. MOBILE_API_QUICK_REFERENCE.md
25. MOBILE_CUSTOM_FIELDS_ENHANCEMENT.md
26. MOBILE_SETTINGS_PASSCODE_IMPLEMENTATION_GUIDE.md
27. CUSTOM_FIELD_COLUMNS_CONFIGURATION.md
28. CUSTOM_FIELD_COLUMNS_QUICK_REFERENCE.md
29. CUSTOM_FIELD_COLUMNS_VISUAL_GUIDE.md
30. PRINTABLE_FIELDS_USER_GUIDE.md

**Admin & Setup (6 files):**
31. AUTH_USER_LINKING_ADMIN_GUIDE.md
32. AUTH_USER_LINKING_API_GUIDE.md
33. PASSWORD_RESET_ADMIN_GUIDE.md
34. MULTI_TENANCY_SETUP_GUIDE.md
35. MULTI_TENANCY_QUICK_START.md
36. SWITCHBOARD_CONFIGURATION_GUIDE.md

**Other (4 files):**
37. BULK_CREDENTIAL_GENERATION_LOGIC.md
38. BULK_OPERATIONS_PERFORMANCE.md
39. CACHE_USAGE_GUIDE.md
40. CACHE_USAGE_EXAMPLE.md
41. APPWRITE_ATTRIBUTE_POLLING_CONFIGURATION.md
42. ERROR_HANDLING_GUIDE.md
43. MANUAL_TESTING_GUIDE.md
44. CUSTOM_FIELDS_API_GUIDE.md

### 🗑️ ARCHIVE (Move to docs/archive/guides/) - 37 files

**Mobile (8 files):**
1. MOBILE_API_COMPLETION_REPORT.md
2. MOBILE_API_ENHANCEMENTS_SUMMARY.md
3. MOBILE_APP_BUILDER_CHECKLIST.md
4. MOBILE_CUSTOM_FIELD_NAMES.md
5. MOBILE_EVENT_NAME_IMPLEMENTATION.md
6. MOBILE_SCANNING_COMPLETE_GUIDE.md
7. MOBILE_APP_EVENT_DISPLAY.md
8. MOBILE_EVENT_INFO_API.md

**Operators (2 files):**
9. OPERATOR_MONITORING_DASHBOARD_INTEGRATION.md
10. OPERATOR_DEPLOYMENT_GUIDE.md

**Package & Version (4 files):**
11. PACKAGE_UPDATE_ANALYSIS.md
12. PACKAGE_UPDATE_SUMMARY.md
13. VERSION_SYNC_AUTOMATION.md
14. VERSION_SYNC_SETUP_SUMMARY.md

**Transactions & Operators (4 files):**
15. APPWRITE_TRANSACTIONS_EVALUATION.md
16. ARRAY_OPERATORS_IMPLEMENTATION.md
17. LOGGING_OPERATORS_IMPLEMENTATION.md
18. API_OPERATORS_REFERENCE.md

**Custom Fields & Features (8 files):**
19. APPWRITE_ATTRIBUTE_POLLING_ENV_EXAMPLE.md
20. BULK_IMPORT_TRANSACTIONS_SUMMARY.md
21. CREDENTIAL_CACHE_BUSTING_GUIDE.md
22. CUSTOM_FIELDS_VISIBILITY_GUIDE.md
23. DASHBOARD_CODE_REVIEW_IMPLEMENTATION_GUIDE.md
24. EMAIL_VERIFICATION_TESTING_GUIDE.md
25. INTEGRATION_API_KEYS_GUIDE.md
26. INTEGRATION_INTERFACES_VERIFICATION.md

**Other (11 files):**
27. DATABASE_OPERATORS_GUIDE.md
28. MOBILE_API_INDEX.md
29. MOBILE_API_TESTING_GUIDE.md
30. TRANSACTION_MONITORING_GUIDE.md
31. TRANSACTION_MONITORING_INTEGRATION_EXAMPLE.md
32. SWEETALERT_MIGRATION_GUIDE.md
33. VERSION_SYNC_QUICK_START.md
34. PASSWORD_RESET_UI_REFERENCE.md
35. ZEN_MCP_REAL_WORLD_EXAMPLES.md
36. BULK_OPERATIONS_PERFORMANCE.md
37. CUSTOM_FIELD_COLUMNS_QUICK_REFERENCE.md

---

## docs/fixes/ - Detailed File Status

### ✅ ACTIVE (Keep) - 20 files

**Core Patterns:**
1. COMPLETE_REACT_OPTIMIZATION_SUMMARY.md
2. CUSTOM_FIELDS_TYPE_SAFETY_IMPLEMENTATION.md
3. DASHBOARD_AGGREGATE_METRICS_FIX.md
4. ADVANCED_FILTER_DROPDOWN_SCROLLING_FIX.md
5. MULTI_SELECT_IMPLEMENTATION_SUMMARY.md
6. CUSTOM_FIELD_SEARCHABILITY_REAPPLIED.md
7. CUSTOM_FIELD_INTERNAL_NAMES_IMPLEMENTATION.md
8. CUSTOM_FIELD_FORMAT_PERMANENT_FIX.md
9. MEMORY_LEAK_FIXES_IMPLEMENTED.md
10. BULK_DELETE_TIMESTAMP_FIX.md
11. EMAIL_VERIFICATION_SECURITY_FIX.md
12. PASSWORD_RESET_FEATURE_SUMMARY.md
13. ROLES_PAGE_REDESIGN_RESTORATION.md
14. IMPORT_COMPLETE_FIX_SESSION_SUMMARY.md
15. BOOLEAN_FIELD_DATA_CORRUPTION_FIX.md
16. CUSTOM_FIELD_STORAGE_FORMAT_CONSISTENCY_FIX.md
17. INTEGRATION_ARCHITECTURE_FIX.md
18. CRITICAL_BULK_EDIT_DATA_LOSS_FIX.md
19. CUSTOM_FIELDS_ENHANCEMENTS_SUMMARY.md
20. APPWRITE_ATTRIBUTE_POLLING_FIX.md

### 🗑️ ARCHIVE (Move to docs/archive/fixes/) - 380+ files

All other files in docs/fixes/ are historical records of completed fixes and should be archived. Examples include:
- PHASE_1_SECURITY_IMPLEMENTATION_SUMMARY.md
- SESSION_SUMMARY.md
- REFACTORING_COMPLETE.md
- All individual phase completion files
- All individual task completion files
- All individual feature fix files

---

## docs/enhancements/ - Detailed File Status

### ✅ ACTIVE (Keep) - 19 files
1. ACCESS_CONTROL_EXPORT_ENHANCEMENT.md
2. ATTENDEES_PAGINATION_IMPROVEMENT.md
3. ATTENDEES_UI_IMPROVEMENTS.md
4. BULK_IMPORT_API_KEY_ENHANCEMENT.md
5. BULK_OPERATIONS_PRINTABLE_FIELD_TRACKING.md
6. CHECKBOX_FIELD_YES_NO_FORMAT.md
7. CHECKBOX_INLINE_EDIT_FEATURE.md
8. CREDENTIAL_GENERATION_ERROR_MESSAGES_IMPLEMENTATION.md
9. CREDENTIAL_GENERATION_ERROR_ACKNOWLEDGMENT.md
10. CUSTOM_FIELD_COLUMNS_IMPLEMENTATION_COMPLETE.md
11. DELETE_LOGS_PROGRESS_INDICATOR.md
12. DIALOG_STYLING_CONSISTENCY_UPDATE.md
13. NOTES_EXPORT_SANITIZATION.md
14. NOTES_FIELD_CREDENTIAL_STATUS_ENHANCEMENT.md
15. PRINTABLE_FIELD_CONFIGURATION_MESSAGING.md
16. PRINTABLE_FIELD_TRACKING_IMPLEMENTATION.md
17. SWEETALERT_PROGRESS_IMPLEMENTATION_SUMMARY.md
18. SWEETALERT_PROGRESS_QUICK_REFERENCE.md
19. UNIVERSAL_PLACEHOLDER_SUPPORT.md

### 🗑️ ARCHIVE (Move to docs/archive/enhancements/) - 6 files
1. CREDENTIAL_GENERATION_ERROR_MESSAGES.md - Superseded by CREDENTIAL_GENERATION_ERROR_MESSAGES_IMPLEMENTATION.md
2. CREDENTIAL_ERROR_MODAL_EXAMPLES.md - Examples file
3. CUSTOM_FIELD_COLUMNS_IMPLEMENTATION_SUMMARY.md - Superseded by CUSTOM_FIELD_COLUMNS_IMPLEMENTATION_COMPLETE.md
4. CUSTOM_FIELD_COLUMNS_SETTING.md - Superseded by CUSTOM_FIELD_COLUMNS_IMPLEMENTATION_COMPLETE.md
5. SWEETALERT_PROGRESS_MODALS.md - Superseded by SWEETALERT_PROGRESS_IMPLEMENTATION_SUMMARY.md
6. SWEETALERT_PROGRESS_COLOR_GUIDE.md - Superseded by SWEETALERT_PROGRESS_QUICK_REFERENCE.md

---

## docs/reference/ - Detailed File Status

### ✅ ACTIVE (Keep) - 3 files
1. API_TRANSACTIONS_REFERENCE.md
2. LOG_SETTINGS_MAPPING.md
3. MOBILE_API_REFERENCE.md

---

## docs/misc/ - Detailed File Status

### ✅ ACTIVE (Keep) - 9 files
1. BULK_OPERATIONS_CANONICAL.md
2. CACHE_MEMORY_MANAGEMENT_ENHANCEMENT.md
3. EVENT_SETTINGS_SCRIPT_SAFEGUARDS.md
4. LINK_USER_INTEGRATION.md
5. LOG_TRUNCATION_REFACTOR.md
6. ROLE_USER_COUNT_CACHE.md
7. TABLESDB_ATOMIC_OPERATIONS.md
8. TABLESDB_UPDATE_VS_UPSERT.md
9. USER_MANAGEMENT_ENHANCEMENT.md

### 🗑️ ARCHIVE (Move to docs/archive/misc/) - 7 files
1. BULK_OPERATIONS_CORRECTED.md - Superseded by BULK_OPERATIONS_CANONICAL.md
2. LINTING_ISSUES_SUMMARY.md - Issues resolved
3. PACKAGE_UPDATE_SUMMARY.md - Updates change frequently
4. PACKAGE_UPDATES_PHASE_1_SUMMARY.md - Phase complete
5. REFACTORING_CHECKLIST.md - Refactoring complete
6. TRANSACTIONS_API_STATUS.md - Status outdated
7. VALIDATION_UTILITY_REFACTOR.md - Refactor complete

---

## Implementation Plan

### Step 1: Create Archive Structure
```bash
mkdir -p docs/archive/{migration,testing,guides,fixes,enhancements,misc}
```

### Step 2: Move Files to Archive
```bash
# Migration
mv docs/migration/MIGRATION_QUICK_START.md docs/archive/migration/
mv docs/migration/MIGRATION_QUICK_REFERENCE.md docs/archive/migration/
# ... (repeat for all files listed above)

# Testing
mv docs/testing/TEST_SUMMARY.md docs/archive/testing/
# ... (repeat for all files listed above)

# Guides
mv docs/guides/MOBILE_API_COMPLETION_REPORT.md docs/archive/guides/
# ... (repeat for all files listed above)

# Fixes
mv docs/fixes/PHASE_*.md docs/archive/fixes/
# ... (move all 380+ files)

# Enhancements
mv docs/enhancements/CREDENTIAL_GENERATION_ERROR_MESSAGES.md docs/archive/enhancements/
# ... (repeat for all files listed above)

# Misc
mv docs/misc/BULK_OPERATIONS_CORRECTED.md docs/archive/misc/
# ... (repeat for all files listed above)
```

### Step 3: Create Archive README
Create `docs/archive/README.md` with:
- Explanation of archived files
- How to restore files if needed
- Archive date and reason for each file

### Step 4: Update Main README
- Remove links to archived files
- Update file counts
- Add note about archive directory

### Step 5: Create Category Indexes
Create README files for each category:
- docs/migration/README.md
- docs/testing/README.md
- docs/guides/README.md
- docs/fixes/README.md
- docs/enhancements/README.md
- docs/misc/README.md

---

## Maintenance Schedule

**Monthly:**
- Archive completed fixes
- Update test summaries

**Quarterly:**
- Consolidate similar guides
- Review and update migration docs

**Annually:**
- Full documentation audit
- Remove outdated references
- Update version information


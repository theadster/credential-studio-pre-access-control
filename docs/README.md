# Documentation

This directory contains all project documentation organized by category.

## Directory Structure

```
docs/
├── fixes/          # Bug fixes and issue resolutions
├── migration/      # Supabase to Appwrite migration documentation
├── testing/        # Test summaries and testing guides
├── guides/         # User guides and how-to documentation
└── misc/           # Miscellaneous documentation
```

## Quick Links

### Canonical Implementations
- [**Bulk Operations (TablesDB)**](./misc/BULK_OPERATIONS_CANONICAL.md) - ✅ **CANONICAL:** TablesDB atomic operations for bulk edit/delete/import

### Recent Enhancements
- [**Custom Field Columns Configuration**](./enhancements/CUSTOM_FIELD_COLUMNS_SETTING.md) - ✅ Configure custom field column layout (3-10 columns) for different screen resolutions
- [**Attendees Pagination Improvement**](./enhancements/ATTENDEES_PAGINATION_IMPROVEMENT.md) - ✅ Show first/last page with ellipsis for better navigation
- [**Bulk Import API Key Enhancement**](./enhancements/BULK_IMPORT_API_KEY_ENHANCEMENT.md) - Use API key for bulk imports to prevent rate limiting
- [**Bulk Delete Log Size Fix**](./fixes/BULK_DELETE_LOG_SIZE_FIX.md) - Use API key for bulk deletes and handle large log entries

### Recent Fixes
- [**🧠 Memory Leak Fixes**](./fixes/MEMORY_LEAK_FIXES_IMPLEMENTED.md) - ✅ **FIXED:** Dashboard memory leak with conditional subscriptions and debouncing
- [**📊 Memory Leak Analysis**](./fixes/MEMORY_LEAK_ANALYSIS.md) - 🔍 **ANALYSIS:** Root cause analysis of dashboard memory accumulation
- [**🔧 Bulk Delete Timestamp Fix**](./fixes/BULK_DELETE_TIMESTAMP_FIX.md) - ✅ **FIXED:** Removed invalid timestamp attribute from audit logs
- [**🔒 Email Verification Security Fix**](./fixes/EMAIL_VERIFICATION_SECURITY_FIX.md) - ✅ **CRITICAL:** Fixed automatic verification bypass
- [**📧 Email Verification Appwrite Limitation**](./fixes/EMAIL_VERIFICATION_APPWRITE_LIMITATION.md) - ⚠️ **IMPORTANT:** Appwrite doesn't support admin-initiated email verification
- [**Email Verification Fix Summary**](./fixes/EMAIL_VERIFICATION_FIX_SUMMARY.md) - Quick reference for the email verification security fix
- [**🔑 Password Reset Feature**](./fixes/PASSWORD_RESET_FEATURE_SUMMARY.md) - ✅ **NEW:** Administrators can now send password reset emails to users
- [**🔑 Password Reset in Edit Dialog**](./fixes/PASSWORD_RESET_EDIT_USER_DIALOG.md) - ✅ **ENHANCED:** Password reset now available directly in Edit User dialog
- [**🔧 Password Reset User ID Fix**](./fixes/PASSWORD_RESET_USER_ID_FIX.md) - ✅ **FIXED:** Resolved userId fetching issue
- [**🔧 Password Reset API Method Fix**](./fixes/PASSWORD_RESET_API_METHOD_FIX.md) - ✅ **FIXED:** Corrected API method from Users to Account API
- [**Roles Page Redesign Restoration**](./fixes/ROLES_PAGE_REDESIGN_RESTORATION.md) - ✅ Restored modern role card design by importing and using RoleCard component
- [**Role User Assignment Display Fix**](./fixes/ROLE_USER_ASSIGNMENT_FIX.md) - ✅ Fixed role cards showing "no users assigned" by normalizing API field names
- [**Bulk Operations Pagination Reset Fix**](./fixes/BULK_OPERATIONS_PAGINATION_RESET_FIX.md) - ✅ Reset to page 1 after bulk delete/edit to prevent empty pages
- [**🎉 Import Complete Fix Session Summary**](./fixes/IMPORT_COMPLETE_FIX_SESSION_SUMMARY.md) - ✅ **COMPREHENSIVE: All 8 import issues fixed and verified**
- [**Boolean Field Data Corruption Fix**](./fixes/BOOLEAN_FIELD_DATA_CORRUPTION_FIX.md) - 🔴 CRITICAL: Fixed Switch component storing 'true'/'false' instead of 'yes'/'no', includes migration script
- [**Boolean Field Documentation Added**](./fixes/BOOLEAN_FIELD_DOCUMENTATION_ADDED.md) - 📝 Added comprehensive comments throughout codebase to prevent future boolean format issues
- [**Boolean Scripts Data Structure Fix**](./fixes/BOOLEAN_SCRIPTS_DATA_STRUCTURE_FIX.md) - 🔴 CRITICAL: Fixed migration scripts to handle JSON string format correctly
- [**Boolean Display Graceful Handling**](./fixes/BOOLEAN_DISPLAY_GRACEFUL_HANDLING.md) - ✨ Enhanced display logic to gracefully handle both 'yes'/'no' and legacy 'true'/'false' values
- [**Import Notes and Uppercase Fix**](./fixes/IMPORT_NOTES_AND_UPPERCASE_FIX.md) - ✅ Fixed notes field null issue and custom field uppercase transformation
- [**Custom Field Storage Format Consistency Fix**](./fixes/CUSTOM_FIELD_STORAGE_FORMAT_CONSISTENCY_FIX.md) - ✅ Fixed update endpoint to use object format, preventing false change detection
- [**Import Boolean Format Fix**](./fixes/IMPORT_BOOLEAN_FORMAT_FIX.md) - ✅ Fixed boolean values to use 'yes'/'no' instead of 'true'/'false'
- [**Import API Response and Boolean Debug**](./fixes/IMPORT_API_RESPONSE_AND_BOOLEAN_DEBUG.md) - Fixed async response handling and logs API noise
- [**Legacy Scripts Cleanup**](./fixes/LEGACY_SCRIPTS_CLEANUP_SUMMARY.md) - Archived legacy migration scripts and removed deprecated dependencies
- [**TypeScript and Lint Fixes**](./fixes/TYPESCRIPT_LINT_FIXES_SUMMARY.md) - Fixed critical syntax errors and configured ESLint properly
- [**Custom Fields Enhancements Summary**](./fixes/CUSTOM_FIELDS_ENHANCEMENTS_SUMMARY.md) - Complete overview of optimistic locking and soft delete features
- [**Custom Fields Soft Delete**](./fixes/CUSTOM_FIELDS_SOFT_DELETE.md) - Implemented soft delete with deletedAt timestamp to handle orphaned data safely
- [**Custom Fields Optimistic Locking**](./fixes/CUSTOM_FIELDS_OPTIMISTIC_LOCKING.md) - Implemented version-based concurrency control for custom field updates
- [**Appwrite Attribute Polling Fix**](./fixes/APPWRITE_ATTRIBUTE_POLLING_FIX.md) - Replaced hardcoded sleep with intelligent retry logic
- [**CRITICAL: Bulk Edit Data Loss Fix**](./fixes/CRITICAL_BULK_EDIT_DATA_LOSS_FIX.md) - 🚨 Fixed data loss bug in bulk edit
- [Credential Generation Empty Placeholder Fix](./fixes/CREDENTIAL_GENERATION_EMPTY_PLACEHOLDER_FIX.md) - Fixed invalid JSON from empty placeholders
- [Bulk Credential Generation Timestamp Fix](./fixes/BULK_CREDENTIAL_GENERATION_TIMESTAMP_FIX.md) - Fixed timestamp mismatch between UI and bulk generation
- [Custom Field Validation Fix](./fixes/CUSTOM_FIELD_VALIDATION_FIX.md) - Handle deleted custom fields gracefully
- [Token Refresh Session Expiration Fix](./fixes/TOKEN_REFRESH_SESSION_EXPIRATION_FIX.md) - Session validation and error handling
- [Session Timeout Improvements](./fixes/SESSION_TIMEOUT_IMPROVEMENTS.md) - Enhanced session management
- [Credential Generation Fixes](./fixes/CREDENTIAL_GENERATION_FIXES_SUMMARY.md) - Complete fix summary
- [Credential Status Fix](./fixes/CREDENTIAL_STATUS_FIX.md) - CURRENT vs OUTDATED status
- [Custom Field Values Fix](./fixes/CUSTOM_FIELD_VALUES_FIX.md) - Array/object format mismatch
- [Integration Architecture Fix](./fixes/INTEGRATION_ARCHITECTURE_FIX.md) - Separate collections
- [Template ID Fix](./fixes/TEMPLATE_ID_FIX.md) - Missing UI field
- [Regex Escape Bug Fix](./fixes/REGEX_ESCAPE_BUG_FIX.md) - Corrupted regex patterns
- [Debug Tools Moved](./fixes/DEBUG_TOOLS_MOVED.md) - Debug tools reorganization

### Migration Documentation
- [**Event Settings Migration Schema**](./migration/EVENT_SETTINGS_MIGRATION_SCHEMA.md) - 📋 Canonical schema for Event Settings migration
- [**Migration Scripts Alignment**](./migration/MIGRATION_SCRIPTS_ALIGNMENT_SUMMARY.md) - ✅ Verification that both migration scripts use identical schemas
- [Migration Status](./migration/MIGRATION_STATUS.md) - Overall migration progress
- [Migration Complete Summary](./migration/MIGRATION_COMPLETE_SUMMARY.md) - Final summary
- [Appwrite Configuration](./migration/APPWRITE_CONFIGURATION.md) - Database structure
- [Appwrite Setup](./migration/APPWRITE_SETUP.md) - Setup instructions
- [Integration Collections Migration](./migration/INTEGRATION_COLLECTIONS_MIGRATION.md) - Normalized design

### Testing Documentation
- [Test Summary](./testing/TEST_SUMMARY.md) - Overall test coverage
- [E2E Tests Summary](./testing/E2E_TESTS_SUMMARY.md) - End-to-end tests
- [Auth User Linking Integration Tests](./testing/AUTH_USER_LINKING_INTEGRATION_TESTS_SUMMARY.md) - Auth user linking tests
- [Attendee API Tests](./testing/ATTENDEE_API_TESTS_SUMMARY.md)
- [Custom Field API Tests](./testing/CUSTOM_FIELD_API_TESTS_SUMMARY.md)
- [Invitation API Tests](./testing/INVITATION_API_TESTS_SUMMARY.md)
- [Logs API Tests](./testing/LOGS_API_TESTS_SUMMARY.md)
- [Realtime Tests](./testing/REALTIME_TESTS_SUMMARY.md)
- [User Management API Tests](./testing/USER_MANAGEMENT_API_TESTS_SUMMARY.md)

### API Reference
- [**📖 API Transactions Reference**](./reference/API_TRANSACTIONS_REFERENCE.md) - 🔥 **NEW:** Complete API reference for transaction-enabled endpoints
  - Transaction behavior and atomicity guarantees
  - Error responses with HTTP status codes
  - Retry behavior and exponential backoff
  - Fallback scenarios and performance metrics
  - All bulk operations, single operations, and multi-step workflows

### Guides

#### Appwrite Transactions API
- [**🚀 Transactions Quick Reference**](./guides/TRANSACTIONS_QUICK_REFERENCE.md) - ⚡ Quick reference card for common operations
- [**Transactions Developer Guide**](./guides/TRANSACTIONS_DEVELOPER_GUIDE.md) - 📚 Comprehensive guide to using transactions (500+ lines)
- [**Transactions Best Practices**](./guides/TRANSACTIONS_BEST_PRACTICES.md) - ✅ Production-ready best practices (600+ lines)
- [**Transactions Code Examples**](./guides/TRANSACTIONS_CODE_EXAMPLES.md) - 💻 15 real-world code examples (400+ lines)
- [**Transaction Monitoring Guide**](./guides/TRANSACTION_MONITORING_GUIDE.md) - 📊 Metrics, alerts, and monitoring
- [**Transaction Monitoring Integration**](./guides/TRANSACTION_MONITORING_INTEGRATION_EXAMPLE.md) - 🔧 Integration examples

#### SweetAlert2 Notification System
- [**SweetAlert Usage Guide**](./guides/SWEETALERT_USAGE_GUIDE.md) - Complete guide to using notifications, confirmations, and loading states
- [**SweetAlert Customization Guide**](./guides/SWEETALERT_CUSTOMIZATION_GUIDE.md) - Theme, duration, position, and animation customization
- [**SweetAlert Migration Guide**](./guides/SWEETALERT_MIGRATION_GUIDE.md) - Migrating from old toast system to SweetAlert2
- [**SweetAlert Best Practices Guide**](./guides/SWEETALERT_BEST_PRACTICES_GUIDE.md) - Best practices for notifications and user experience

#### Performance & Optimization
- [**Memory Optimization Guide**](./guides/MEMORY_OPTIMIZATION_GUIDE.md) - 🚀 Best practices for preventing memory leaks and optimizing performance

#### Automation & Maintenance
- [**Version Sync Quick Start**](./guides/VERSION_SYNC_QUICK_START.md) - ⚡ Quick reference for automatic version sync
- [**Version Sync Automation**](./guides/VERSION_SYNC_AUTOMATION.md) - 🤖 Complete guide to automatic documentation version updates
- [**Version Sync Setup Summary**](./guides/VERSION_SYNC_SETUP_SUMMARY.md) - 📋 What was created and how it works
- [**Package Update Summary**](./guides/PACKAGE_UPDATE_SUMMARY.md) - 📦 Recent package updates and what was skipped
- [**Package Update Analysis**](./guides/PACKAGE_UPDATE_ANALYSIS.md) - 🔍 Detailed analysis of available package updates

#### Other Guides
- [**Printable Fields User Guide**](./guides/PRINTABLE_FIELDS_USER_GUIDE.md) - 🎯 Complete guide to configuring printable fields and managing credential status
- [**Custom Field Columns Quick Reference**](./guides/CUSTOM_FIELD_COLUMNS_QUICK_REFERENCE.md) - ⚡ Quick reference for custom field column configuration
- [**Custom Field Columns Visual Guide**](./guides/CUSTOM_FIELD_COLUMNS_VISUAL_GUIDE.md) - 📊 Visual examples and decision tree for choosing column count
- [**Custom Field Columns Configuration**](./guides/CUSTOM_FIELD_COLUMNS_CONFIGURATION.md) - Configure custom field column layout for different screen resolutions
- [**Password Reset Admin Guide**](./guides/PASSWORD_RESET_ADMIN_GUIDE.md) - Complete guide for administrators to help users reset passwords
- [**Email Verification Testing Guide**](./guides/EMAIL_VERIFICATION_TESTING_GUIDE.md) - Complete testing guide for email verification flow
- [**Custom Fields API Guide**](./guides/CUSTOM_FIELDS_API_GUIDE.md) - Complete API reference with examples for optimistic locking and soft delete
- [**Auth User Linking API Guide**](./guides/AUTH_USER_LINKING_API_GUIDE.md) - Complete API documentation for auth user linking
- [**Auth User Linking Admin Guide**](./guides/AUTH_USER_LINKING_ADMIN_GUIDE.md) - Administrator guide for linking users
- [**Cache Usage Guide**](./guides/CACHE_USAGE_GUIDE.md) - In-memory cache with size limits, LRU eviction, and monitoring
- [**Appwrite Attribute Polling Configuration**](./guides/APPWRITE_ATTRIBUTE_POLLING_CONFIGURATION.md) - Configure retry logic for attribute creation
- [Bulk Credential Generation Logic](./guides/BULK_CREDENTIAL_GENERATION_LOGIC.md) - How bulk generation determines credential status
- [Switchboard Configuration Guide](./guides/SWITCHBOARD_CONFIGURATION_GUIDE.md) - Setup Switchboard
- [Manual Testing Guide](./guides/MANUAL_TESTING_GUIDE.md) - Manual testing procedures
- [Cache Usage Example](./guides/CACHE_USAGE_EXAMPLE.md) - Caching patterns
- [Integration Interfaces Verification](./guides/INTEGRATION_INTERFACES_VERIFICATION.md)
- [Error Handling Guide](./guides/ERROR_HANDLING_GUIDE.md) - Centralized error handling patterns

## Spec-Related Documentation

Documentation related to specific specs is located in `.kiro/specs/[spec-name]/`:

### Auth User Linking System
`.kiro/specs/auth-user-linking-system/`
- requirements.md - Feature requirements
- design.md - System design
- tasks.md - Implementation tasks
- TASK_1 through TASK_16 summaries (complete implementation)

### Integration Fields Mapping Fix
`.kiro/specs/integration-fields-mapping-fix/`
- TASK_6_COMPLETE_FIELD_MAPPING_TESTS_SUMMARY.md
- TASK_6.1 through TASK_6.10 summaries

### Integration Optimistic Locking
`.kiro/specs/integration-optimistic-locking/`
- INTEGRATION_OPTIMISTIC_LOCKING_API_USAGE.md

### API Performance Optimization
`.kiro/specs/api-performance-optimization/`
- TASK_7_ERROR_HANDLING_SUMMARY.md
- TASK_8_INTEGRATION_TESTS_SUMMARY.md
- TASK_9_PERFORMANCE_BENCHMARKING_SUMMARY.md

### Supabase to Appwrite Migration
`.kiro/specs/supabase-to-appwrite-migration/`
- TASK_9_MIGRATION_SCRIPT_SUMMARY.md

### Multi-Session Authentication
`.kiro/specs/multi-session-authentication/`
- LOGIN_FIX_SUMMARY.md
- USER_LOGS_FIX_SUMMARY.md

### Toast to SweetAlert Migration
`.kiro/specs/toast-to-sweetalert-migration/`
- requirements.md - Feature requirements
- design.md - System design
- tasks.md - Implementation tasks
- TASK_1 through TASK_8 summaries (complete implementation)
- See [SweetAlert Guides](./guides/) for usage documentation

## Finding Documentation

### By Topic

**Authentication & Users:**
- Multi-session authentication spec folder
- User Management Enhancement (misc/)

**Credentials & Printing:**
- Credential Generation Fixes (fixes/)
- Switchboard Configuration Guide (guides/)

**Custom Fields:**
- Custom Field Values Fix (fixes/)
- Custom Field API Tests (testing/)

**Database & Migration:**
- Migration documentation folder
- Appwrite Configuration (migration/)

**Testing:**
- Testing documentation folder
- Manual Testing Guide (guides/)

### By Date

Most recent documentation is in `fixes/` folder, created during the credential generation debugging session.

## Contributing

When adding new documentation:

1. **Fixes** - Bug fixes and issue resolutions → `docs/fixes/`
2. **Migration** - Migration-related docs → `docs/migration/`
3. **Testing** - Test summaries → `docs/testing/`
4. **Guides** - How-to and user guides → `docs/guides/`
5. **Spec-related** - Spec task summaries → `.kiro/specs/[spec-name]/`
6. **Other** - Everything else → `docs/misc/`

## Maintenance

### Archiving Old Documentation

Consider archiving documentation that is:
- No longer relevant
- Superseded by newer docs
- Related to completed migrations

Create an `archive/` folder when needed.

### Updating Documentation

When fixing bugs or making changes:
1. Update relevant documentation
2. Add new summary to appropriate folder
3. Update this README if adding new categories

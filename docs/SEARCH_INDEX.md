---
title: Documentation Search Index
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-12
review_interval_days: 90
related_code: []
---

# Documentation Search Index

> Searchable index of all active documentation

**Last Updated:** 2026-02-12

## Access Control Environment Variable Migration

- **File:** `migration/ACCESS_CONTROL_ENVIRONMENT_VARIABLE_MIGRATION.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `src/lib/accessControlFeature.ts`
  - `.env.example`
- **Keywords:** 'true', (disabled), ..., `.env.local`, access, affects, after, all, and, appearing, before, can, change, changed, changes, code, configuration, control, data, default:, deployment, dev, development, different, disable, disabled,, documentation, effect, enable, enabled?, environment, event, events?, example, existing, false, faq, feature, feature?, fields, flag, for, functionality, globally, happens, have, hidden, how, know, migration, need, not, other, overview, persistence, references, related, restart, rollback, runtime?, server, set, settings, settings?, shouldn't, site, steps, tab, taking, the, they, this, timeline, troubleshooting, update, variable, visible, what, when, will

[View Document](./migration/ACCESS_CONTROL_ENVIRONMENT_VARIABLE_MIGRATION.md)

## Access Control Export Enhancement

- **File:** `enhancements/ACCESS_CONTROL_EXPORT_ENHANCEMENT.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/pages/api/attendees/export.ts`
  - `src/components/ExportDialog.tsx`
- **Keywords:** 'date, (`src/components/exportdialog.tsx`), (`src/pages/api/attendees/export.ts`), (accesscontroltimemode:, (january, 17,, 2026), access, api, awareness, benefits, changes, component, conditional, control, data, date, dependencies, details, enhancement, enhancements, examples, export, exportdialog, features, fetching, field, files, for, format, formatting, functions, future, handling, hour, implementation, improvements, iso, logic, made, management, mappings, migration, mode, modified, new, note, only, only'), overview, parameters, recommendations, rendering, request, sanitization, state, technical, testing, text, time, time'), usage, users, with

[View Document](./enhancements/ACCESS_CONTROL_EXPORT_ENHANCEMENT.md)

## Adding New Integration Guide

- **File:** `guides/ADDING_NEW_INTEGRATION_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/integrations/`
- **Keywords:** (optional), (required, .env.example, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 100ms, 10:, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, add, adding, any, api, appwrite, are, attributes, audit, backend, call, cases, check, checklist, collection, common, component, conclusion, configuration, configure, console, constant, create, creating, credentials, database, define, development, disabled, disabling, document, documentation, enable, environment, error, event, eventsettingsid, example, execution, extractintegrationfields, field, fields, flatteneventsettings, for, forgetting, form, frontend, function, getter, getting, guide, handling, help, helper, implement, implementation, inconsistent, index, indexes, integration, integration), integrations, integrationstab, interface, key, loaded, locking, management, manual, missing, naming, new, next, not, null, obtain, optimistic, overview, performance, permissions, phase, pitfall, pitfalls, prerequisites, queries, query, quick, reference, run, schema, script, secret, security, service, set, settings, setup, should, single, solutions, state, status, steps, storing, tab, test, testing, tests, that, time, troubleshooting, types, typescript, unit, update, updating, use, used, using, validation, variables, verification, warnings, when, with, your

[View Document](./guides/ADDING_NEW_INTEGRATION_GUIDE.md)

## Advanced Filter Dropdown Scrolling Fix

- **File:** `fixes/ADVANCED_FILTER_DROPDOWN_SCROLLING_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/components/AdvancedFiltersDialog/sections/CustomFieldsSection.tsx`
  - `src/components/AdvancedFiltersDialog/IntegratedFilterInput.tsx`
- **Keywords:** (january, 17,, 2026), `modal={true}`, `src/components/advancedfiltersdialog/integratedfilterinput.tsx`, added, advanced, cause, changes, commandlist, components, date, details, divs, dropdown, file:, filter, fix, implementation, issue, learned, lessons, location, made, plain, popover, previous, problem, radix, references, related, replaced, root, scrollarea, scrolling, solution, technical, testing, the, update, why, with, works

[View Document](./fixes/ADVANCED_FILTER_DROPDOWN_SCROLLING_FIX.md)

## Advanced Filters - Credential Status and Match Mode

- **File:** `enhancements/ADVANCED_FILTERS_CREDENTIAL_AND_MATCH_MODE.md`
- **Type:** canonical
- **Category:** enhancements
- **Keywords:** advanced, and, credential, enhancement:, examples, filter, filters, match, mode, status, usage

[View Document](./enhancements/ADVANCED_FILTERS_CREDENTIAL_AND_MATCH_MODE.md)

## Advanced Filters Component Extraction and Redesign

- **File:** `misc/ADVANCED_FILTERS_COMPONENT_EXTRACTION_REFACTOR.md`
- **Type:** canonical
- **Category:** misc
- **Related Code:**
  - `src/components/AdvancedFiltersDialog/`
  - `src/lib/filterUtils.ts`
  - `src/pages/dashboard.tsx`
- **Keywords:** (`src/lib/filterutils.ts`), accordion, active, advanced, after:, all, and, appearing, applying, architecture, backward, bar, before:, behaviors, benefits, breaking, changed, changes, code, collapsible, compatibility, component, comprehensive, coverage, created, custom, details, developer, developers, documentation, enhancements, expanding, experience, extraction, features, fields, file, files, filter, filters, for, future, guide, hierarchy, implementation, importing, improvements, inputs, integrated, issue:, key, known, management, migration, modified, modular, monolithic, new, non, not, overview, performance, qa/testing, quality, redesign, references, regressions, related, run, running, sections, showing, specific, state, structure, summary, technical, test, testing, tests, the, troubleshooting, updated, user, using, utilities, what, with

[View Document](./misc/ADVANCED_FILTERS_COMPONENT_EXTRACTION_REFACTOR.md)

## API Keys Removal Migration

- **File:** `migration/API_KEYS_REMOVAL_MIGRATION.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `scripts/setup-appwrite.ts`
- **Keywords:** (if, add, api, application, are, backup, benefits, canvas, changes, cloudinary, code, collection, configuration, configure, credentials, current, dashboard, database, each, environment, files, for, from, get, https://cloudinary.com/console, integration, interface, key, keys, made, migration, needed), not, notes, overview, plan, related, removal, restart, rollback, routes, run, schema, script, securely, security, step, steps, stored, switchboard, testing, the, these, typescript, update, updates, use, variables, variables,, want, you, your

[View Document](./migration/API_KEYS_REMOVAL_MIGRATION.md)

## API Transactions Reference

- **File:** `reference/API_TRANSACTIONS_REFERENCE.md`
- **Type:** canonical
- **Category:** reference
- **Related Code:**
  - `src/pages/api/attendees/`
  - `src/pages/api/users/`
  - `src/pages/api/event-settings/`
- **Keywords:** (400), (403), (404), (409), (500), (affects, (use, /api/attendees, /api/attendees/[id], /api/attendees/bulk, /api/attendees/import, /api/event, /api/users/link, additional, all, api, api), atomic, audit, automatic, behavior, best, bulk, characteristics, client, comma, configuration, conflict, consumers, contents, critical, delete, detection, developers, disable, edit, enable, enable/disable, enabled, endpoints, environment, error, fallback, feature, flags, for, format, found, globally, guarantee, headers, legacy, limit, limits, limits), list, monitoring, multi, network, not, only, operations, overview, performance, permission, plan, post, practices, put, reference, resources, responses, retry, rollback, scenarios, separated, settings, side, single, specific, standard, step, support, table, trail, transaction, transactions, types, unknown, usage, used, validation, variables, when, with, workflows

[View Document](./reference/API_TRANSACTIONS_REFERENCE.md)

## Appwrite Attribute Polling Configuration

- **File:** `guides/APPWRITE_ATTRIBUTE_POLLING_CONFIGURATION.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/lib/appwrite.ts`
- **Keywords:** (balanced), (fail, (faster,, (more, `appwrite, aggressive), allow, also, appwrite, are, attempts, attempts`, attribute, attributes, best, but, configuration, configurations, default, defaults, delay, delay`, development, environment, errors, example, exceeded, fail, fast, faster), fewer, found, how, initial, local, logging, max, may, minutes, more, network, networks), not, overview, polling, practices, production, ready, related, scripts, second, seconds, see, slow, specified, start, the, these, timeout, timeout`, troubleshooting, variables, wait, with, works

[View Document](./guides/APPWRITE_ATTRIBUTE_POLLING_CONFIGURATION.md)

## Appwrite Attribute Polling Fix

- **File:** `fixes/APPWRITE_ATTRIBUTE_POLLING_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/lib/appwrite.ts`
- **Keywords:** (balanced), `addconsolidatedattributes()`, `appwrite, `waitforattributesready()`, appwrite, attempts, attempts`, attribute, benefits, changes, code, configuration, constants, corrupted, default, defaults, delay`, development, documentation, env, environment, error, example, fast, files, fix, fixed, function, future, handling, improvements, initial, issue, local, logging, made, max, needed, network, new, output, polling, production, ready, related, slow, solution, testing, timeout, timeout`, updated, usage, uses, validation, variables, vars

[View Document](./fixes/APPWRITE_ATTRIBUTE_POLLING_FIX.md)

## Appwrite Configuration Reference

- **File:** `migration/APPWRITE_CONFIGURATION.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `scripts/setup-appwrite.ts`
- **Keywords:** (`attendees`), (`custom, (`event, (`invitations`), (`log, (`logs`), (`roles`), (`users`), appwrite, attendees, backup, collection, collections, configuration, custom, database, details, environment, event, fields, fields`), ids, important, indexes, invitations, json, keywords, log, logs, maintenance, monitoring, notes, overview, permissions, reference, relationships, reserved, roles, settings, settings`), strategy, structure, updates, users, variables

[View Document](./migration/APPWRITE_CONFIGURATION.md)

## Appwrite Transactions Best Practices

- **File:** `guides/TRANSACTIONS_BEST_PRACTICES.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/lib/bulkOperations.ts`
- **Keywords:** actionable, additional, alert, always, and, appropriate, appwrite, atomicity, audit, avoid, batch, before, behavior, best, bulk, checklist, common, compliance, configuration, conflict, contents, context, count, creating, critically, data, descriptive, design, don't, error, errors, events, exceeding, executing, failure, failures, fallback, focused, for, forgetting, general, handle, handling, high, ignoring, important, include, input, keep, large, limits, log, logic, logically, logs, long, many, messages, metrics, minimize, monitoring, multiple, not, operation, operations, optimization, order, performance, permissions, pitfalls, plan, practices, principles, production, provide, quick, rates, records, reference, resources, retry, rollback, running, sanitize, security, sensitive, small, standardized, table, test, testing, too, track, transaction, transactions, types, usage, use, using, validate, validating, with

[View Document](./guides/TRANSACTIONS_BEST_PRACTICES.md)

## Appwrite Transactions Code Examples

- **File:** `guides/TRANSACTIONS_CODE_EXAMPLES.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/lib/bulkOperations.ts`
- **Keywords:** (multiple, (profile, 10:, 11:, 12:, 13:, 14:, 15:, additional, advanced, api, appwrite, audit, basic, batching, before, bulk, code, complete, comprehensive, conditional, configuration, contents, control, create, custom, delete, edit, error, event, example, examples, for, handling, import, linking, log, manual, membership), multi, operations, patterns, related, resources, retry, route, settings, simple, single, step, table, team, transaction, transactions, update, updates), user, validation, with, workflows

[View Document](./guides/TRANSACTIONS_CODE_EXAMPLES.md)

## Appwrite Transactions Developer Guide

- **File:** `guides/TRANSACTIONS_DEVELOPER_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/lib/bulkOperations.ts`
- **Keywords:** additional, always, appropriate, appwrite, are, audit, basic, batching, before, benefits, best, bulk, bulkdeletewithfallback(), bulkeditwithfallback(), bulkimportwithfallback(), common, concepts, conditional, conflicts, contents, core, custom, developer, disabling, error, errors, events, example, exceeded, executebatchedtransaction(), executebulkoperationwithfallback(), executetransaction(), executetransactionwithretry(), failed, fallback, gracefully, guide, handle, handletransactionerror(), handling, how, important, include, introduction, issue:, key, limit, limits, log, logic, logs, missing, monitoring, multi, operation, operations, pattern, patterns, performance, plan, practices, production, quick, record, resources, retry, rollback, single, slow, start, step, strategy, support, table, transaction, transactions, transactions?, triggered, troubleshooting, types, usage, use, used, utilities, validate, validation, what, when, with, workflow, works, wrappers

[View Document](./guides/TRANSACTIONS_DEVELOPER_GUIDE.md)

## Appwrite Transactions Quick Reference

- **File:** `guides/TRANSACTIONS_QUICK_REFERENCE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/lib/bulkOperations.ts`
- **Keywords:** (409), (critical), .env.local, additional, always, appwrite, audit, best, bulk, checklist, common, configuration, conflicts, core, environment, error, exceeded, failed, fallback, functions, handling, import, limit, limits, log, metrics, monitoring, multi, patterns, performance, plan, practices, quick, record, reference, resources, retry, rollback, single, start, step, transaction, transactions, troubleshooting, types, used, with, workflow

[View Document](./guides/TRANSACTIONS_QUICK_REFERENCE.md)

## Archival System Comprehensive Answer

- **File:** `ARCHIVAL_SYSTEM_COMPREHENSIVE_ANSWER.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** (180, (30, (90, (keep, (keeping, (superseded), (team, actions, active, active), add, alert, all, and, answer, architecture, archival, archive, archive?, archived, automated, automatic, available, been, broken, canonical, change:, check, checked, commit, complete, comprehensive, created, current, cycle, daily, date, days), decision, detection, docs, document, documentation, documents, driven), edit, example, file, for, frontmatter, generate/update, generation, gets, github, how, index, indexes, intervals, issues, keeps, key, last, link, links, maintenance, manual, mark, metrics, modern, modern), move, note, option, options, organization, outdated, overview, part, process, push, question, records, related, report, responsibilities, result, review, runbooks, scenario, scenarios, scripts, set, stale, staleness, state, status, status:, stays, structure, summary, superseded, system, team, the, this, three, to:, today, update, validate, validation, verified, what, what's, why, workflow, worklog, works, your

[View Document](./ARCHIVAL_SYSTEM_COMPREHENSIVE_ANSWER.md)

## Attendee API Sensitive Error Exposure Fix

- **File:** `fixes/ATTENDEE_API_SENSITIVE_ERROR_EXPOSURE_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/api/attendees/[id].ts`
- **Keywords:** api, attendee, benefits, client, codes, default, defaults, details, documentation, error, example, exposure, fix, flow, handling, implementation, improvements, logging, problem, recommendations, related, response, risk, safe, sanitized, security, sensitive, server, side, solution, structured, testing, values, vulnerable

[View Document](./fixes/ATTENDEE_API_SENSITIVE_ERROR_EXPOSURE_FIX.md)

## Attendee Form Data Loss on Tab Switch Fix

- **File:** `fixes/ATTENDEE_FORM_DATA_LOSS_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** actually, affected, alternative, attendee, cause, changes, cloudinary, code, conclusion, considered, data, description, features, fix, form, impact, issues, loss, modal={false}?, not, notes, offs, other, photo, problem, related, root, solution, solutions, src/hooks/useattendeeform.ts, switch, tab, technical, testing, the, trade, upload, what, why, widget

[View Document](./fixes/ATTENDEE_FORM_DATA_LOSS_FIX.md)

## Attendee Management API Tests Summary

- **File:** `testing/ATTENDEE_API_TESTS_SUMMARY.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/api/attendees/`
- **Keywords:** 109, 65/81, `/api/attendees/[id]/clear, `/api/attendees/[id]/generate, `/api/attendees/[id]`, `/api/attendees/bulk, `/api/attendees`, across, and, api, areas:, attendee, bulk, clearing, coverage, created, creation, credential, credential`, delete, delete`, edit, edit`, execution, files, generation, individual, issues, known, list, main, management, next, notes, operation, operations, overview, passing, requirements, status, steps, summary, test, tests, tests:, total, update:, with

[View Document](./testing/ATTENDEE_API_TESTS_SUMMARY.md)

## Attendees Pagination Improvement

- **File:** `enhancements/ATTENDEES_PAGINATION_IMPROVEMENT.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/pages/api/attendees/index.ts`
  - `src/components/AttendeeList.tsx`
- **Keywords:** (10, (50+, (e.g.,, (pages, 50), actions:, after, after:, attendees, awareness:, before, before:, beginning, benefits, cases, consistency, dataset, details, edge, efficiency:, end, enhancement, enhancement:, experience, features, few, file, implementation, improvement, improvements, large, last, medium, middle, modified, navigation, near, notes, page, pages, pages), pagination, pattern, patterns, problem, quick, related, scenarios, small, solution, spatial, test, testing, user

[View Document](./enhancements/ATTENDEES_PAGINATION_IMPROVEMENT.md)

## Attendees UI Improvements

- **File:** `enhancements/ATTENDEES_UI_IMPROVEMENTS.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/components/AttendeeList.tsx`
  - `src/components/AttendeeForm.tsx`
- **Keywords:** advanced, all, attendees, changes, components, consistency, count, design, details, dialog, examples, experience, feature, files, implemented, improvements, jump, modified, new, overview, page, recommendations, record, search, select, state, technical, testing, usage, user, variables

[View Document](./enhancements/ATTENDEES_UI_IMPROVEMENTS.md)

## Auth User Linking - Administrator Guide

- **File:** `guides/AUTH_USER_LINKING_ADMIN_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/users/`
- **Keywords:** "permission, "user, (current), (deprecated), (if, (optional), access, administrator, after, already, and, anything, application?, appropriate, are, asked, assign, assignments, audit, audits, auth, auth?, being, best, between, bulk, can, cannot, changed?, confirm, considerations, control, create, created, deleting, denied", difference, document, email, emails, enabled?, error, existing, failed, first, for, found, frequently, from, getting, guide, happens, help, how, in?, know, legacy, limiting, link, linked, linked", linked?, linking, log, management, managing, membership, mistake?, multiple, need, needed), new, not, old, once?, open, overview, password, permissions, practices, prerequisites, problem:, process, questions, rate, received, regular, results, review, role, role?, roles, same, search, security, select, slow, start, status, step, still, summary, system, system?, team, the, times?, trail, troubleshooting, understanding, unlink, unlinking, unverified, update, use, user, users, verification, verify, view, what, what's, with, wrong

[View Document](./guides/AUTH_USER_LINKING_ADMIN_GUIDE.md)

## Auth User Linking API Guide

- **File:** `guides/AUTH_USER_LINKING_API_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/users/`
- **Keywords:** (optional), already, and, api, application, auth, authentication, best, codes, common, considerations, denied, email, endpoints, environment, error, example, examples, exceeded, fails, format, from, guide, limit, limiting, limits, link, linked, linking, list, membership, migration, old, overview, permission, permissions, practices, rate, response, role, search, security, send, support, system, team, troubleshooting, unlink, update, usage, user, users, variables, verification

[View Document](./guides/AUTH_USER_LINKING_API_GUIDE.md)

## Auth User Linking Integration Tests Summary

- **File:** `testing/AUTH_USER_LINKING_INTEGRATION_TESTS_SUMMARY.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/api/users/`
- **Keywords:** (recommended, and, api, approach, audit, auth, check, checks, complete, conclusion, coverage, creation, current, email, end, error, execution, file, files, flow, for, functionality, identified, immediate, implemented, integration, issues, limiting, linking, logging, membership, metrics, middleware, mock, modified, next, option, output, overview, pattern, patterns, permission, rate, recommendation, refine, remaining, requirements, requirements:, run, scenarios, search, setup, solutions, steps, success, summary, task, team, test, test), tests, tests), trail, unit, used, user, value), verbose, verification, with, work

[View Document](./testing/AUTH_USER_LINKING_INTEGRATION_TESTS_SUMMARY.md)

## Auto-Generated Index Frontmatter Fix

- **File:** `fixes/AUTO_GENERATED_INDEX_FRONTMATTER_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** (defense, actions, and, auto, cause, commits, depth), documentation, files, fix, frontmatter, generated, generation, github, impact, index, modified, permanent, present, preventing, problem, regenerate, related, remove, root, run, script, solution, testing, this, unnecessary, updated, validation, verify, why, workflow

[View Document](./fixes/AUTO_GENERATED_INDEX_FRONTMATTER_FIX.md)

## Automated Documentation Sync Guide

- **File:** `AUTOMATED_DOCS_SYNC_GUIDE.md`
- **Type:** runbook
- **Category:** docs
- **Related Code:**
  - `.github/workflows/sync-docs-between-branches.yml`
- **Keywords:** (main, access, actions, and, any, appearing, automated, automatically, automation, best, both, branch, branches, check, chore(docs):, commit, commits, configuration, conflicting, conflicts, control), dashboard, details, diagram, documentation, don't, during, edit, editor, enhancements, environment, exists, fails, feature, feature/mobile, file, files, format, from, future, git, github, guide, handling, history, how, improvements, issues?, latest, like:, main, manually, merge, monitoring, normal, not, other, overview, permissions, possible, practices, preventing, process, pull, push, questions?, recent, required, resolve, result, retry, scripts, see, should, stage, status, steering, support, switch, sync, synced, the, trigger, troubleshooting, unexpectedly, usage, verify, view, will, workflow, working, works, your

[View Document](./AUTOMATED_DOCS_SYNC_GUIDE.md)

## Bidirectional Sync Final Verification

- **File:** `BIDIRECTIONAL_SYNC_FINAL_VERIFICATION.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** analysis, bidirectional, complete, conclusion, consulted, deletion, documentation, expert, feature, files, final, finding, fully, implementation, key, main, models, modified, next, now, operational, related, results, status:, steps, summary, sync, test, trigger, verification, why, workflow, works

[View Document](./BIDIRECTIONAL_SYNC_FINAL_VERIFICATION.md)

## Bidirectional Sync Triple Verified

- **File:** `BIDIRECTIONAL_SYNC_TRIPLE_VERIFIED.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** (recreates, all, and, applied, bidirectional, branch, changes, comprehensive, conclusion, create, critical, delete, deletion, deletions, details, detect, detection, directories, docs, documentation, existing, feature, file, files, files), fix, from, fully, get, how, implementation, including, key, latest, location, logic, main, modified, only, operational, problem, related, remove, results, solution, source, stage, status:, summary, sync, test, the, triple, verification, verified, workflow, works

[View Document](./BIDIRECTIONAL_SYNC_TRIPLE_VERIFIED.md)

## Boolean Custom Field Data Corruption Fix

- **File:** `fixes/BOOLEAN_FIELD_DATA_CORRUPTION_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/components/CustomFieldInput.tsx`
- **Keywords:** 'yes'/'no', affected, analysis, behavior, boolean, bug, bulk, cause, changes, check, checklist, code, components, consistent, corruption, custom, customfieldinput.tsx, dashboard.tsx, data, description, display, documentation, edit, enforcement, expects, field, files, fix, form, format, impact, import, integration, issue, learned, lessons, logic, measures, migration, modified, new, prevention, problem, related, root, run, safety, script, status, steps, summary, switchboard, test, testing, the, this, timeline, type, uses, validation, verification, verify, was, why, wrong

[View Document](./fixes/BOOLEAN_FIELD_DATA_CORRUPTION_FIX.md)

## Broken Links Action Items

- **File:** `BROKEN_LINKS_ACTION_ITEMS.md`
- **Type:** worklog
- **Category:** docs
- **Related Code:**
  - `scripts/check-docs-links.ts`
- **Keywords:** (35, (fix, action, after, archive, archived, automation, before, broken, category, create, documentation, enhancements, file, files, first), fix, fixes, fixes:, guide, guides, guides:, high, how, image, items, last), link, links, links), low, medium, migration, miscellaneous, missing, monitoring, next), option, other, overview, path, priority, progress, recommended, reference, references, referencing, remove, spec, sweetalert, testing, tracking, transaction, update

[View Document](./BROKEN_LINKS_ACTION_ITEMS.md)

## Bulk Clear Credentials Code Review Fixes

- **File:** `fixes/BULK_CLEAR_CREDENTIALS_CODE_REVIEW_FIXES.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** #1:, #2:, #3:, and, api, applied, bulk, cause, clear, code, credentials, critical, dedicated, documentation, endpoint, enhancements, files, fix, fixed, fixes, found, frontend, future, high, issue, issues, learned, lessons, medium, mismatch, missing, modified, not, performed, permission, problem, recommendation, related, review, root, severity, summary, testing, using, why

[View Document](./fixes/BULK_CLEAR_CREDENTIALS_CODE_REVIEW_FIXES.md)

## Bulk Clear Credentials Implementation Guide

- **File:** `guides/BULK_CLEAR_CREDENTIALS_IMPLEMENTATION.md`
- **Type:** canonical
- **Category:** guides
- **Keywords:** "insufficient, (after, (in, (january, (line, 2025), `bulk, `handlebulkclearcredentials()`, `handlebulkgeneratecredentials`), actions, add, api, appear, bulk, checklist, clear, clearing, code, component, create, credentials, credentials.ts`, critical:, dashboard, dedicated, description, details, doesn't, dropdown, dropdown), endpoint, endpoint:, fails, feature, features, files, fixes, frontend, function, guide, handler, handler:, high:, implementation, integration, item, logging, menu, mismatch, modified/created, new, not, notes, operation, overview, permission, permissions", recommended:, related, requirements, review, state, step, testing, troubleshooting, using, variable, with, working, ~291)

[View Document](./guides/BULK_CLEAR_CREDENTIALS_IMPLEMENTATION.md)

## Bulk Credential Generation Logic

- **File:** `guides/BULK_CREDENTIAL_GENERATION_LOGIC.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/attendees/`
- **Keywords:** (no, all, attendee, bulk, case, cases, code, concurrent, considerations, considered, credential, credential), current, data, database, determination, differences, documentation, during, edge, experience, export, features, field, fields, filtering, flow, for, future, generation, handled, implementation, improvements, legacy, location, logic, manual, messages, new, notification, outdated, overview, pdf, performance, process, related, required, scenarios, second, single, status, test, testing, the, time, timestamp), tolerance?, updates, url, user, when, why, zone

[View Document](./guides/BULK_CREDENTIAL_GENERATION_LOGIC.md)

## Bulk Credential Photo Concurrency Fix

- **File:** `fixes/BULK_CREDENTIAL_PHOTO_CONCURRENCY_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** api, backward, bulk, cause, changes, compatibility, concurrency, conflict, core, credential, documentation, edit, error, field, fix, generation, groups, handling, locking, monitoring, optimistic, photo, problem, related, resolution, root, services, solution, strategies, testing, upload

[View Document](./fixes/BULK_CREDENTIAL_PHOTO_CONCURRENCY_FIX.md)

## Bulk Credential Photo Concurrency Fix Verification

- **File:** `misc/BULK_CREDENTIAL_PHOTO_CONCURRENCY_VERIFICATION.md`
- **Type:** canonical
- **Category:** misc
- **Related Code:**
  - `src/lib/optimisticLock.ts`
  - `src/lib/fieldUpdate.ts`
  - `src/lib/conflictResolver.ts`
  - `src/pages/api/attendees/[id]/generate-credential.ts`
- **Keywords:** (but, alone, analysis, appwrite, aren't, bulk, case, comparison:, complementary, components, conclusion, concurrency, core, correct, could, credential, docs, documentation, executive, findings, fix, for, from, help, implementation, issue, key, limitations, locking, necessary), operators, optimistic, original, photo, problem, provide, quotes, recommendation, references, solution, sufficient, summary, this, use, verification, verified, vs., what, where, why

[View Document](./misc/BULK_CREDENTIAL_PHOTO_CONCURRENCY_VERIFICATION.md)

## Bulk Delete Timestamp Attribute Fix

- **File:** `fixes/BULK_DELETE_TIMESTAMP_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/api/attendees/bulk-delete.ts`
- **Keywords:** `src/lib/bulkoperations.ts`:, `src/lib/transactions.ts`:, after, api, attempts, attribute, behavior, bulk, cause, changes, delete, details, duplicate, endpoints, expected, field, files, fix, from, helpers, into, issue, json, made, move, notes, problem, recommendations, reference, related, remove, root, schema, solution, summary, testing, timestamp, transaction

[View Document](./fixes/BULK_DELETE_TIMESTAMP_FIX.md)

## Bulk Import API Key Enhancement

- **File:** `enhancements/BULK_IMPORT_API_KEY_ENHANCEMENT.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/pages/api/attendees/import.ts`
- **Keywords:** api, benefits, bulk, changes, enhancement, file, files, import, key, made, modified, notes, overview, problem, recommendations, related, solution, testing, updates

[View Document](./enhancements/BULK_IMPORT_API_KEY_ENHANCEMENT.md)

## Bulk Operation Broadcast localStorage Race Condition Fix

- **File:** `fixes/BULK_OPERATION_BROADCAST_LOCALSTORAGE_RACE_CONDITION_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/lib/bulkOperationBroadcast.ts`
- **Keywords:** (no, (race, after, based, before, benefits, broadcast, bulk, cleanup, condition, condition), documentation, example, fix, how, impact, keys, listener, localstorage, message, operation, per, performance, prefix, problem, race, recommendations, related, solution, storage, testing, unique, works

[View Document](./fixes/BULK_OPERATION_BROADCAST_LOCALSTORAGE_RACE_CONDITION_FIX.md)

## Bulk Operation Broadcast Singleton Configuration Fix

- **File:** `fixes/BULK_OPERATION_BROADCAST_SINGLETON_CONFIG_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/lib/bulkOperationBroadcast.ts`
- **Keywords:** broadcast, bulk, call, comparison, config, configuration, details, different, documentation, examples, explicit, files, fix, function, implementation, isolation, method, modified, operation, per, place, problem, public, recommendations, recreation, related, reset, scenario, singleton, solution, test, testing, update, updateconfig, usage

[View Document](./fixes/BULK_OPERATION_BROADCAST_SINGLETON_CONFIG_FIX.md)

## Bulk Operations - Canonical Implementation

- **File:** `misc/BULK_OPERATIONS_CANONICAL.md`
- **Type:** canonical
- **Category:** misc
- **Related Code:**
  - `src/lib/bulkOperations.ts`
  - `src/pages/api/attendees/bulk-delete.ts`
  - `src/pages/api/attendees/bulk-edit.ts`
- **Keywords:** (removed), api, bulk, canonical, context, details, documentation, endpoints, exported, features, functions, historical, implementation, implementations, key, module, operations, overview, previous, support, technology, testing, this, usage, using

[View Document](./misc/BULK_OPERATIONS_CANONICAL.md)

## Bulk Operations Error Retryability Detection Fix

- **File:** `fixes/BULK_OPERATIONS_ERROR_RETRYABILITY_DETECTION_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/lib/bulkOperations.ts`
- **Keywords:** (retryable:, benefits, bulk, categories, details, detection, documentation, error, errors, example, false), fix, implementation, operations, permanent, problem, recommendations, related, retryability, scenario, solution, testing, transient, true), usage

[View Document](./fixes/BULK_OPERATIONS_ERROR_RETRYABILITY_DETECTION_FIX.md)

## Bulk Operations Performance

- **File:** `guides/BULK_OPERATIONS_PERFORMANCE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/lib/bulkOperations.ts`
- **Keywords:** adoption, all, api, benefits, best, bulk, conclusion, database, degradation, details, documentation, edit, error, example, expected, format, future, gains, high, implementation, improvements, key, log, low, metrics, monitoring, operations, operator, operators, optimization, output, overview, performance, practices, rates, related, response, run, running, specific, suite, test, testing, tests, tips, tracked, troubleshooting, usage, use, utilities, verbose, when, with

[View Document](./guides/BULK_OPERATIONS_PERFORMANCE.md)

## Bulk Operations Printable Field Tracking

- **File:** `enhancements/BULK_OPERATIONS_PRINTABLE_FIELD_TRACKING.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/pages/api/attendees/bulk-edit.ts`
- **Keywords:** (`src/pages/api/attendees/bulk, (`src/pages/api/attendees/import.ts`), attendees, backward, behavior, bulk, changes, compatibility, conclusion, considerations, coverage, credential, custom, details, edit, edit.ts`), endpoint, enhancements, existing, features, field, fields, files, future, implementation, import, integration, made, modified, operations, overview, performance, printable, rationale, related, requirements, results, satisfied, spec, status, support, test, testing, tracking, transaction, with

[View Document](./enhancements/BULK_OPERATIONS_PRINTABLE_FIELD_TRACKING.md)

## Cache Memory Management Enhancement

- **File:** `misc/CACHE_MEMORY_MANAGEMENT_ENHANCEMENT.md`
- **Type:** canonical
- **Category:** misc
- **Related Code:**
  - `src/lib/cache.ts`
- **Keywords:** advanced, automatic, basic, benefits, breaking, cache, capabilities, changes, class, cleanup, configuration, date, details, documentation, enhancement, eviction, files, flow, impact, integration, interface, lifecycle, limits, lru, made, management, memory, modified, monitoring, new, next, overview, performance, production, properties, recommendations, related, size, steps, technical, testing, tests, unit, updated, usage

[View Document](./misc/CACHE_MEMORY_MANAGEMENT_ENHANCEMENT.md)

## Cache Usage Guide

- **File:** `guides/CACHE_USAGE_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/lib/cache.ts`
- **Keywords:** appropriate, automatic, basic, best, cache, characteristics, check, choose, cleaning, cleanup, configuration, considerations, consistent, detailed, disappearing, entries, entry, eviction, example, features, files, flow, function, growing, guide, handling, how, invalidate, key, lifecycle, limits, lru, management, manual, memory, monitor, monitoring, not, overview, patterns, performance, practices, process, production, quick, related, shutdown, size, statistics, testing, troubleshooting, ttls, updates, usage, use, works

[View Document](./guides/CACHE_USAGE_GUIDE.md)

## Checkbox Field - Inline Edit Feature

- **File:** `enhancements/CHECKBOX_INLINE_EDIT_FEATURE.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/components/AttendeeList.tsx`
- **Keywords:** (with, (without, accessibility, after, api, automated, before, benefits, cases, checkbox, conclusion, configuration, considerations, current, custom, dashboard, data, definition, description, details, display, does, edit, edit), enabling, endpoint, enhancements, experience, feature, field, files, flow, for, form, future, implementation, inline, interactive, limitations, logic, management, manual, overview, performance, permissions, potential, recommendations, related, rendering, requirements, state, technical, testing, type, use, user, what

[View Document](./enhancements/CHECKBOX_INLINE_EDIT_FEATURE.md)

## Checkbox Field Yes/No Format

- **File:** `enhancements/CHECKBOX_FIELD_YES_NO_FORMAT.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/components/CustomFieldInput.tsx`
- **Keywords:** (`src/components/attendeeform/customfieldinput.tsx`), (`src/pages/dashboard.tsx`), after, backward, before, bulk, changes, checkbox, compatibility, component, customfieldinput, dashboard, data, display, edit, enhancement, field, files, format, made, modified, notes, options, overview, storage, support, test, testing, updates, visual, yes/no

[View Document](./enhancements/CHECKBOX_FIELD_YES_NO_FORMAT.md)

## Code Review Fixes Session Complete

- **File:** `fixes/CODE_REVIEW_FIXES_SESSION_COMPLETE.md`
- **Type:** worklog
- **Category:** fixes
- **Keywords:** 10., and, applied, assertion, attempt, browser, cleanup, code, complete, completed, connection, created, cumulative, diagnostics, documentation, fallback, fixes, frontmatter, gap, health, import, issues, key, linting, logic, mismatch, overview, patterns, polling, property, realtime, related, results, review, safety, session, stale, state, subscription, systems, test, timer, title, type, update

[View Document](./fixes/CODE_REVIEW_FIXES_SESSION_COMPLETE.md)

## Complete Backend Migration Guide: Supabase to Appwrite

- **File:** `migration/COMPLETE_MIGRATION_GUIDE.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `scripts/setup-appwrite.ts`
- **Keywords:** (days, (for, (week, 1.1, 1.2, 1.3, 1.4, 10), 14), 2.1, 2.2, 2.3, 2.4, 21), 24), 28), 3.1, 3.2, 3.3, 30), 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 7.1, 7.2, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, additional, after, analysis, api, appwrite, assessment, attribute, auth, authentication, back, backend, backup, balancer, batch, before, best, challenging, checklist, clear, collections, common, complete, complex, comprehensive, conclusion, configure, contents, context, corrupted,, cost, costs, create, current, data, database, deployment, design, differences, discovered, dns/load, during, end, endpoints, environment, executive, export, features, final, for, from, functions, guide:, handle, helper, hidden, hook, import, infrastructure, integration, inventory, investigation), issues, learned, lessons, limit, makes, migrating, migration, mitigation, old, pattern, patterns, performance, permissions, phase, plan, planning, platform, practices, pre, previous, production, project, queries, real, recommendations, redeploy, replace, resources, restore, revert, risk, rollback, route, routes, schema, script, scripts, sense, setup, sql, start, strategy, subscriptions, summary, supabase, switch, system, table, testing, tests, the, time, timeline, transformation, understand, understanding, unexpected, unit, updating, user, validation, variables, verify, version, was, well, went, what, when, with, working, you, your

[View Document](./migration/COMPLETE_MIGRATION_GUIDE.md)

## Complete React Optimization Summary

- **File:** `fixes/COMPLETE_REACT_OPTIMIZATION_SUMMARY.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/components/`
  - `src/pages/`
- **Keywords:** (14, added, all, automated, best, build, category, check, code, complete, conclusion, corrections, could, created, dashboard, deep, details, developers, dive, documentation, established, executive, file, files, fixed, for, functions, future, helper, hook, impact, improved, improvements, initial, issues, learned, lessons, manual, memoized, metrics, modified, optimization, optimizations, organization, overview, performance, performed, practices, primary, process, quality, quick, react, recommendations, reference, remaining, review, round, rounds, rules, searches, summary, technical, total, total), triple, type, values, verification, violations, well, what, worked

[View Document](./fixes/COMPLETE_REACT_OPTIMIZATION_SUMMARY.md)

## Comprehensive Transactions Analysis for CredentialStudio

- **File:** `guides/TRANSACTIONS_COMPREHENSIVE_ANALYSIS.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/lib/bulkOperations.ts`
- **Keywords:** (complex), (highest, (week, 10., 11., 12., 13., 14., 15., add, affect, already, analysis, answer, are, atomic, attendee, attendees, audit, benefit, bulk, case, compliance, comprehensive, conclusion, considerations, create, credentialstudio, custom, data, delete, deletion, document, does, don't, edit, event, executive, exporting, faster, field, final, for, for:, from, help, high, impact, implement, implementation, import, insights, key, linking, list, log, logs, main, make, matrix, membership, minimal, multi, need, not, operations, optional, order, overhead, performance, phase, priority, priority), question, read, reads, recommendation, recommended, reordering, role, roles, search, searching, settings, single, step, summary, team, that, the, things, transactions, update, use, user, users, viewing, what, with, workflows, writes, your

[View Document](./guides/TRANSACTIONS_COMPREHENSIVE_ANALYSIS.md)

## Connection Health Invalid Attempt Validation Fix

- **File:** `fixes/CONNECTION_HEALTH_INVALID_ATTEMPT_VALIDATION_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** attempt, cause, changes, connection, fix, health, invalid, issue, made, related, requirements, results, root, solution, test, validation, verification

[View Document](./fixes/CONNECTION_HEALTH_INVALID_ATTEMPT_VALIDATION_FIX.md)

## Connection Health Stale Attempt Fix

- **File:** `fixes/CONNECTION_HEALTH_STALE_ATTEMPT_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/hooks/useConnectionHealth.ts`
  - `src/__tests__/hooks/useConnectionHealth.test.ts`
- **Keywords:** (line, (lines, 137, 177), 197, 205), 207, 216), 68), 99), `handlereconnectfailure`, `markconnected`, `reconnectattemptref`, `resetbackoff`, `schedulereconnect`, added, attempt, cause, changes, connection, documentation, files, fix, health, impact, made, modified, problem, related, root, solution, stale, testing, updated

[View Document](./fixes/CONNECTION_HEALTH_STALE_ATTEMPT_FIX.md)

## Connection Health Status Notification Consistency Fix

- **File:** `fixes/CONNECTION_HEALTH_STATUS_NOTIFICATION_CONSISTENCY_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** cause, changes, connection, consistency, fix, health, issue, made, notification, related, requirements, results, root, solution, status, test, verification

[View Document](./fixes/CONNECTION_HEALTH_STATUS_NOTIFICATION_CONSISTENCY_FIX.md)

## Connection Health Zero Max Attempts Fix

- **File:** `fixes/CONNECTION_HEALTH_ZERO_MAX_ATTEMPTS_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** attempts, cause, changes, connection, fix, health, issue, made, max, related, requirements, results, root, solution, test, verification, zero

[View Document](./fixes/CONNECTION_HEALTH_ZERO_MAX_ATTEMPTS_FIX.md)

## Connection Indicator Green State Fix

- **File:** `fixes/CONNECTION_INDICATOR_GREEN_STATE_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** `onconnected`, `ondisconnected`, add, and, callbacks, cause, changes, connection, dashboard, definitions, documentation, fix, follow, green, indicator, made, problem, related, root, solution, state, step, steps, testing, this, type, update, use, verification, why, works

[View Document](./fixes/CONNECTION_INDICATOR_GREEN_STATE_FIX.md)

## Credential Generation Error Acknowledgment

- **File:** `enhancements/CREDENTIAL_GENERATION_ERROR_ACKNOWLEDGMENT.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/pages/api/attendees/[id]/generate-credential.ts`
- **Keywords:** (all, (some, acknowledgment, alert, api, benefits, bulk, complete, configuration, credential, design, detailed, details, developers, display, documentation, enhancement, enhancements, error, examples, failed), failure, features, files, for, future, generation, guidelines, handling, hook, html, info, interaction, message, method, modified, network, new, overview, partial, problem, recommendations, related, signature, simple, single, solution, statement, styling, success, support, sweetalert, switchboard, technical, template, testing, usage, user, users, visual, with

[View Document](./enhancements/CREDENTIAL_GENERATION_ERROR_ACKNOWLEDGMENT.md)

## Credential Generation Type Safety Fix

- **File:** `fixes/CREDENTIAL_GENERATION_TYPE_SAFETY_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/api/attendees/[id]/generate-credential.ts`
- **Keywords:** cause, changes, credential, files, fix, generation, made, modified, notes, overview, problem, root, safety, solution, testing, type

[View Document](./fixes/CREDENTIAL_GENERATION_TYPE_SAFETY_FIX.md)

## CredentialStudio Manual Testing Guide

- **File:** `guides/MANUAL_TESTING_GUIDE.md`
- **Type:** runbook
- **Category:** guides
- **Related Code:**
  - `src/`
- **Keywords:** (google), (macos/ios), 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 10., 10.1, 10.2, 10.3, 10.4, 10.5, 11., 11.1, 11.2, 11.3, 11.4, 12., 12.1, 12.2, 12.3, 12.4, 13., 13.1, 13.2, 13.3, 13.4, 14., 14.1, 14.2, 14.3, 15., 15.1, 15.2, 15.3, 16., 16.1, 16.2, 16.3, 16.4, 16.5, 17., 17.1, 17.2, 17.3, 18., 18.1, 18.2, 19., 19.1, 19.2, 19.3, 19.4, 19.5, 2.1, 2.2, 2.3, 2.4, 20., 20.1, 20.2, 20.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, acceptance, accessibility, accuracy, activity, admin, and, api, appwrite, attendee, attendees, authentication, authorization, backup, barcode, browser, bulk, cases, checklist, chrome/edge, color, compatibility, concurrent, configuration, connection, consistency, contrast, create, credential, credentialstudio, critical, custom, data, dataset, delete, deletion, design, documentation, duplicate, edge, edits, email/password, enforcement, environment, error, event, expired, export, feedback, field, fields, file, filter, final, firefox, form, found, general, generate, generation, guide, handling, hardening, import, info, input, integrity, interruption, invitation, issues, keyboard, large, limiting, link, list, load, loading, log, logging, login, logs, magic, management, manual, medium, messages, metrics, migration, minor, missing, monitoring, navigation, network, notes, oauth, observations, off, optimization, overall, page, password, performance, permission, permissions, photo, preparation, prerequisites, production, protected, rate, reader, readiness, readme, real, recovery, regenerate, regression, relationship, reorder, required, reset, response, responsive, results, role, routes, safari, sanitization, scenarios, screen, security, session, settings, setup, sign, single, smoke, staff, states, statistics, success, summary, switchboard, test, testing, time, times, ui/ux, update, updates, upload, user, validation, verification, via, view, viewer

[View Document](./guides/MANUAL_TESTING_GUIDE.md)

## CRITICAL: Bulk Edit Data Loss Fix

- **File:** `fixes/CRITICAL_BULK_EDIT_DATA_LOSS_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/api/attendees/bulk-edit.ts`
- **Keywords:** actions, affected, after, analysis, before, bulk, case, cause, caused, changes, communication, critical, critical:, data, documentation, edit, example, field, files, fix, fixed, for, forward, going, immediate, impact, implementation, improvements, issue, issues, learned, lessons, long, loss, measures, modified, multiple, prevention, problem, recommendations, recovery, related, root, severity:, single, solution, template, term, test, testing, the, this, update, users, why

[View Document](./fixes/CRITICAL_BULK_EDIT_DATA_LOSS_FIX.md)

## Custom Field Advanced Filter Searchability Fix - Reapplied

- **File:** `fixes/CUSTOM_FIELD_SEARCHABILITY_REAPPLIED.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/api/attendees/index.ts`
  - `src/components/AdvancedFiltersDialog/sections/CustomFieldsSection.tsx`
- **Keywords:** (`src/pages/api/attendees/index.ts`), (january, 17,, 2026), advanced, api, applied, behavior, cause, changes, custom, date, description, documentation, endpoint, expected, field, files, filter, fix, how, impact, issue, made, manual, notes, now, performance, reapplied, related, root, running, searchability, solution, status, test, testing, tests, update, visibility, works

[View Document](./fixes/CUSTOM_FIELD_SEARCHABILITY_REAPPLIED.md)

## Custom Field API Tests Summary

- **File:** `testing/CUSTOM_FIELD_API_TESTS_SUMMARY.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/api/custom-fields/`
- **Keywords:** `/api/custom, api, behavior, coverage, created, custom, detail, endpoint, enhancements, error, execution, features, field, fieldoptions, fields/[id]`, fields/reorder`, fields`, files, future, generation, handling, index, internal, json, key, logging, management, mock, name, notes, order, overview, partial, permission, reorder, requirements, strategy, success, summary, test, tested, tests, validation

[View Document](./testing/CUSTOM_FIELD_API_TESTS_SUMMARY.md)

## Custom Field Columns - Quick Reference

- **File:** `guides/CUSTOM_FIELD_COLUMNS_QUICK_REFERENCE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/components/AttendeeList.tsx`
- **Keywords:** api, behavior, columns, common, configure, cramped, custom, documentation, each, existing, field, fields, files, for, installations, issues, look, modified, much, not, out, quick, reference, responsive, scrolling, setting, setup, spread, support, tl;dr, too, use, when, working

[View Document](./guides/CUSTOM_FIELD_COLUMNS_QUICK_REFERENCE.md)

## Custom Field Columns - Visual Guide

- **File:** `guides/CUSTOM_FIELD_COLUMNS_VISUAL_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/components/AttendeeList.tsx`
- **Keywords:** (768px, (balanced), (compact, (configurable), (default), (hardcoded, (maximum, 1024px), 768px), after, and, before, behavior, case, choosing, column, columns, columns), comparison, configuration, consider, considerations, count, custom, decision, density), desktop, different, dropdown, event, example, examples, field, fields, fixed, for, form, guide, impact, location, mobile, options, overview, responsive, screens), setting, settings, single, summary, tablet, team, test, tips, tree, use, uses, visible, visual, visualization, with, your

[View Document](./guides/CUSTOM_FIELD_COLUMNS_VISUAL_GUIDE.md)

## Custom Field Columns Configuration

- **File:** `guides/CUSTOM_FIELD_COLUMNS_CONFIGURATION.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/components/EventSettingsForm.tsx`
- **Keywords:** (1366x768), (1440x900), (1920x1080), (3440x1440), (768px, (current), /api/event, 1.0, 1024px), 768px), accessing, and, api, attendee, available, behavior, best, choosing, columns, common, configuration, cramped, custom, database, description, desktop, details, does, effect, enhancements, event, example, failed, feature, features, field, fields, future, get, guide, history, horizontal, how, implementation, issues, laptop, layout, look, looks, migration, mobile, monitor, much, not, object, options, out, overview, practices, put, reference, related, responsive, right, scenario, scenarios, schema, scrolling, setting, settings, small, solutions, sorting, space, spread, standard, support, tablet, taking, technical, testing, the, too, troubleshooting, ultra, used, value, version, vertical, visibility, what, wide, works, wrong, your

[View Document](./guides/CUSTOM_FIELD_COLUMNS_CONFIGURATION.md)

## Custom Field Columns Configuration - Implementation Complete

- **File:** `enhancements/CUSTOM_FIELD_COLUMNS_IMPLEMENTATION_COMPLETE.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/components/AttendeeList.tsx`
  - `src/pages/api/custom-fields/`
- **Keywords:** (administrators), (developer), (recommended), assurance, automated, calculation, code, columns, complete, completed, conclusion, configuration, created, criteria, custom, database, details, documentation, example, facing, feature, field, files, for, grid, highlights, impact, implementation, links, manual, met, minimal, modified, next, positive, quality, schema, status, steps, success, summary, tasks, technical, testing, usage, user, users, you

[View Document](./enhancements/CUSTOM_FIELD_COLUMNS_IMPLEMENTATION_COMPLETE.md)

## Custom Field Columns Configuration - Testing Checklist

- **File:** `testing/CUSTOM_FIELD_COLUMNS_TESTING_CHECKLIST.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/`
- **Keywords:** (10, (15+), (768px, (backward, 1.1:, 1.2:, 10., 10.1:, 10.2:, 10.3:, 10.4:, 1024px), 11., 11.1:, 11.2:, 11.3:, 11.4:, 12., 12.1:, 12.2:, 12.3:, 2.1:, 2.2:, 2.3:, 3.1:, 3.2:, 3.3:, 3.4:, 4.1:, 4.2:, 4.3:, 4.4:, 5.1:, 5.2:, 5.3:, 5.4:, 5.5:, 5.6:, 6.1:, 6.2:, 6.3:, 7.1:, 7.2:, 7.3:, 768px), 8.1:, 8.2:, 8.3:, 9.1:, 9.2:, 9.3:, 9.4:, access, accessibility, after, attendee, behavior, browser, bulk, cases, change, checklist, checks, chrome, color, columns, columns), compatibility, compatibility), configuration, contrast, custom, data, database, dataset, default, desktop, discoverability, documentation, dropdown, edge, error, errors, event, existing, experience, failed, feedback, field, fields, final, firefox, found, fresh, handling, higher, installation, integration, invalid, issues, keyboard, large, load, locate, logout/login, long, lower, many, maximum, migration, minimum, mixed, mobile, multiple, names, navigation, network, notes, off, one, operations, options, overview, page, passed, performance, persistence, post, pre, prerequisites, reader, recommendations, regression, resize, responsive, results, safari, screen, search/filter, sessions, setting, settings, setup, sign, sorting, speed, summary, tablet, test, testing, tests, time, types, usability, user, value, values, various, verification, view, visibility, visual, with

[View Document](./testing/CUSTOM_FIELD_COLUMNS_TESTING_CHECKLIST.md)

## Custom Field Default Values

- **File:** `enhancements/CUSTOM_FIELD_DEFAULT_VALUES.md`
- **Type:** canonical
- **Category:** enhancements
- **Keywords:** application, attendee, behavior, cases, configuration, creation, csv, custom, data, default, definitions, details, example, field, files, import, migration, modified, new, overview, priority, scenarios, setting, storage, technical, type, use, values

[View Document](./enhancements/CUSTOM_FIELD_DEFAULT_VALUES.md)

## Custom Field Format Permanent Fix

- **File:** `fixes/CUSTOM_FIELD_FORMAT_PERMANENT_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/api/custom-fields/`
- **Keywords:** (completed), (correct), (if, (incorrect), (new), (preview, api, apply, automated, benefits, cause, changes, checks, ci/cd, conclusion, core, current, custom, data, detailed, diagnostic, documentation, dry, field, files, fix, format, future, immediate, implemented, issue, layer, legacy, long, maintenance, manual, metrics, migration, migrations, monitoring, needed), only), permanent, pipeline, plan, prevention, quick, regular, related, rollback, root, routes, run, running, solution, success, summary, term, testing, tools, updated, usage, verification, verifying

[View Document](./fixes/CUSTOM_FIELD_FORMAT_PERMANENT_FIX.md)

## Custom Field Internal Names Implementation

- **File:** `fixes/CUSTOM_FIELD_INTERNAL_NAMES_IMPLEMENTATION.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/api/custom-fields/`
- **Keywords:** (complete, (dynamic, (pending), (query, after, api, app, approval, attendee, attendees, backend, backward, before, benefits, cache, checklist, compatibility, conclusion, considerations, custom, debug, deployment, display, documentation, evaluation, field, files, for, format, guide, impact, implementation, integration, internal, keep, mobile, modified, names, next, notes, parameter), performance, plan, problem, profile, related, response, rollback, route), rule, security, solved, step, steps, structure, suite, summary, sync, test, testing, tests, unit, update, verify

[View Document](./fixes/CUSTOM_FIELD_INTERNAL_NAMES_IMPLEMENTATION.md)

## Custom Field Storage Format Consistency Fix

- **File:** `fixes/CUSTOM_FIELD_STORAGE_FORMAT_CONSISTENCY_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/api/custom-fields/`
- **Keywords:** (correct):, (corrected), (get, (post, (put, /api/attendees, /api/attendees), /api/attendees/[id]), /api/attendees/import), additional, after, array, attendee, attendees, before, benefits, cause, changes, comparison, consistency, create, created/imported, creating, custom, data, edit, edited, existing, field, file, files, fix, fix:, flow, format, forward:, get, going, happening:, impact, import, importing, issue, log, modified, notes, reading, records, related, root, scenario, solution, standard, storage, test, testing, then, updating, was, what

[View Document](./fixes/CUSTOM_FIELD_STORAGE_FORMAT_CONSISTENCY_FIX.md)

## Custom Fields API Enhancements Summary

- **File:** `fixes/CUSTOM_FIELDS_ENHANCEMENTS_SUMMARY.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/api/custom-fields/`
- **Keywords:** '2025, (>30, (datetime), (if, (integer), (preview), (version, /api/custom, 08t00:00:00.000z'), 409, 410, activity, add, additions, and, api, api:, appwrite, attributes, benefits, changes, checklist, cleanup, code, codes, conflict, console, control), count, crontab, custom, data, database, days, delete, deleted, deletedat, deploy, documentation, dry, endpoints, enhancements, existing, experience, fields, fields/[id], files, find, for, frontend, future, get, gone, handling, http, implemented, integration, integrity, isnotnull('deletedat'), job, lessthan('deletedat',, locking, logging, logs, maintainability, migration, modified, monitoring, needed), new, old), older, operations, optimistic, optional, orphaned, overview, performance, plan, post, potential, previous, production, provided, put, queries, query:, ready, records, related, required, revert, rollback, run, schema, script, scripts, soft, status, step, steps, structured, summary, support, testing, tests, than, update, used, user, version, via, watch, with

[View Document](./fixes/CUSTOM_FIELDS_ENHANCEMENTS_SUMMARY.md)

## Custom Fields API Guide

- **File:** `guides/CUSTOM_FIELDS_API_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/custom-fields/`
- **Keywords:** (soft, (with, after, always, api, best, check, codes, comprehensive, conflicts, contents, create, custom, delete, delete), deleted, documentation, endpoints, error, example, example:, field, fields, for, get, gracefully, guide, handle, handler, handling, hook, how, http, include, list, locking, locking), logging, notification, optimistic, overview, practices, react, refresh, related, retry, single, soft, status, structured, table, update, updates, use, user, version, with, works

[View Document](./guides/CUSTOM_FIELDS_API_GUIDE.md)

## Custom Fields Type Safety Implementation

- **File:** `fixes/CUSTOM_FIELDS_TYPE_SAFETY_IMPLEMENTATION.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/types/`
  - `src/pages/api/custom-fields/`
- **Keywords:** (type, (unsafe), `any`, after, backward, before, benefits, changed, checklist, code, compatibility, comprehensive, conclusion, created/modified, custom, customfield, dashboard, definitions, developer, discriminated, documentation, error, existing, experience, features, fields, files, for, functions, future, guards, handling, helper, impact, implementation, interface, issues, lines, maintainability, migration, modified, new, path, performance, problem, proofing, proper, related, result, runtime, safe), safety, solution:, statement, system, testing, type, types, union, updated, values, with

[View Document](./fixes/CUSTOM_FIELDS_TYPE_SAFETY_IMPLEMENTATION.md)

## Custom Fields Visibility Control Migration

- **File:** `migration/CUSTOM_FIELDS_VISIBILITY_MIGRATION.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `scripts/setup-appwrite.ts`
- **Keywords:** addressed, backward, behavior, changes, compatibility, control, custom, database, default, existing, fields, files, for, installations, migration, new, overview, related, requirements, rollback, schema, scripts, testing, updates, visibility

[View Document](./migration/CUSTOM_FIELDS_VISIBILITY_MIGRATION.md)

## Dashboard Aggregate Metrics Fix

- **File:** `fixes/DASHBOARD_AGGREGATE_METRICS_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/dashboard.tsx`
- **Keywords:** (`src/pages/api/logs/index.ts`), (`src/pages/dashboard.tsx`), accuracy, aggregate, api, backend, benefits, build, calculations, cards, changed, changes, checklist, code, computation, conclusion, considerations, dashboard, deployments, details, development, documentation, enhancement, example, existing, experience, fetching, files, filtering, fix, for, future, lines, logs, made, management, metrics, migration, modified, notes, option, page, performance, problem, related, removed, scalability, scenario, scoped, solution:, state, statement, status, summary, support, technical, testing, update, updated, user

[View Document](./fixes/DASHBOARD_AGGREGATE_METRICS_FIX.md)

## Data Freshness Realtime Callback Fix

- **File:** `fixes/DATA_FRESHNESS_REALTIME_CALLBACK_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/dashboard.tsx`
  - `src/hooks/useDataFreshness.ts`
- **Keywords:** callback, callbacks, cause, changes, data, documentation, files, fix, freshness, functions, impact, made, modified, problem, realtime, refresh, related, root, solution, testing, updated

[View Document](./fixes/DATA_FRESHNESS_REALTIME_CALLBACK_FIX.md)

## Data Refresh Monitoring Enhancement

- **File:** `enhancements/DATA_REFRESH_MONITORING.md`
- **Type:** canonical
- **Category:** enhancements
- **Keywords:** components, configuration, connection, connectionstatusindicator, data, datarefreshindicator, enhancement, fallback, features, freshness, health, monitoring, notifications, overview, polling, recovery, refresh, related, specifications, tracking, usage, user, visibility

[View Document](./enhancements/DATA_REFRESH_MONITORING.md)

## Data Refresh Monitoring Infinite Loop Fix

- **File:** `fixes/DATA_REFRESH_MONITORING_INFINITE_LOOP_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** cause, changes, data, fix, follow, infinite, key, loop, monitoring, prevention, problem, refresh, root, solution, testing

[View Document](./fixes/DATA_REFRESH_MONITORING_INFINITE_LOOP_FIX.md)

## Debug Mode Button Not Appearing on Keyboard Shortcut

- **File:** `fixes/DEBUG_MODE_BUTTON_VISIBILITY_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** add, appearing, button, cause, causes, changes, code, connection, convert, debug, event, fix, for, impact, issue, issues, keyboard, listener, missing, mode, not, provider, quickly, repairs, root, shortcut, solution, switch, testing, toggle, too, tooltip, tooltipprovider, wrap

[View Document](./fixes/DEBUG_MODE_BUTTON_VISIBILITY_FIX.md)

## Delete Logs Progress Indicator

- **File:** `enhancements/DELETE_LOGS_PROGRESS_INDICATOR.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/pages/api/logs/delete.ts`
- **Keywords:** (advanced), accuracy, after, algorithm, bar, batch, before, behavior, benefits, cancellation, colors, completion, counter, data, date, delete, deletion, design, details, display, documentation, during, enhancement, enhancements, estimate, estimation, expected, experience, features, feedback, files, flow, future, hierarchy, historical, implementation, indicator, information, limitations, logs, management, messages, modified, notes, pause/resume, percentage, problem, progress, real, related, scenarios, solution, state, status, structure, support, technical, test, testing, text, time, user, visual

[View Document](./enhancements/DELETE_LOGS_PROGRESS_INDICATOR.md)

## Dialog Styling Consistency Update

- **File:** `enhancements/DIALOG_STYLING_CONSISTENCY_UPDATE.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/components/ui/dialog.tsx`
- **Keywords:** (add/edit, after, all, before, benefits, bulk, changes, checklist, consistency, custom, design, dialog, dialogs, edit, field, field), files, form, improvements, key, made, mapping, mapping), modified, notes, overview, styling, system, testing, update, updated

[View Document](./enhancements/DIALOG_STYLING_CONSISTENCY_UPDATE.md)

## Documentation Action Plan

- **File:** `DOCUMENTATION_ACTION_PLAN.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** (ongoing), (optional), (week, 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, [category, action, actions, add, after, announcement, annual, archive, archived, are, atomicity, audit, authentication, automatic, automation, broken, burden, category, communication, conclusion, consolidate, contributing, create, credentials, cross, current, custom, database, directories, documentation, duplicate, enhancement, fields, file, files, generation, guide, guides, historical, immediate, index, integration, knowledge, links, linting, losing, main, maintenance, metadata, metrics, migration, mitigation, monthly, move, moving, name], notifications, optimization, organization, overview, performance, phase, plan, printing, quarterly, quick, readme, reference, related, requirements, resistance, resolved, resource, restoring, review, risk, risk:, search, start, state, statistics, structure, success, system, team, testing, timeline, topic, transactions, update, updates, users, weekly, why

[View Document](./DOCUMENTATION_ACTION_PLAN.md)

## Documentation Archival Summary

- **File:** `DOCUMENTATION_ARCHIVAL_SUMMARY.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** (keep, 181:, 365:, 400:, 90:, 91:, active), again, alert, alerts, all, and, answer, archival, archive, are, automated, automatic, automation, best, broken, check, checks, clear, created, current, daily, day, detected, detection, docs, document, documentation, don't, due, example:, features, for, frontmatter, generate/update, generation, get, guide, historical, how, index, indexes, intervals, key, lifecycle, link, links, maintenance, management, manual, mark, modern, old, option, options, practices, preservation, process, quarterly, quick, related, respond, response, review, reviews, stale, staleness, status, stays, structure, summary, superseded, system, team, three, update, validate, validation, what's, when, workflow, you

[View Document](./DOCUMENTATION_ARCHIVAL_SUMMARY.md)

## Documentation Audit Summary

- **File:** `DOCUMENTATION_AUDIT_SUMMARY.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** (16, (23, (25, (400+, (45+, (70+, actions, assessment, audit, breakdown, category, conclusion, docs/enhancements/, docs/fixes/, docs/guides/, docs/migration/, docs/misc/, docs/reference/, docs/testing/, documentation, executive, file, files), immediate, legend, long, maintenance, medium, overall, recommendations, statistics, status, summary, term

[View Document](./DOCUMENTATION_AUDIT_SUMMARY.md)

## Documentation Detailed Breakdown

- **File:** `DOCUMENTATION_DETAILED_BREAKDOWN.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** (keep), (move, (repeat, ..., 380+, above), active, all, archive, breakdown, category, create, detailed, docs/archive/enhancements/), docs/archive/fixes/), docs/archive/guides/), docs/archive/migration/), docs/archive/misc/), docs/archive/testing/), docs/enhancements/, docs/fixes/, docs/guides/, docs/migration/, docs/misc/, docs/reference/, docs/testing/, documentation, enhancements, file, files, files), fixes, for, guides, implementation, indexes, listed, main, maintenance, migration, misc, move, plan, readme, schedule, status, step, structure, testing, update, 🗑️

[View Document](./DOCUMENTATION_DETAILED_BREAKDOWN.md)

## Documentation Index by Topic

- **File:** `INDEX_BY_TOPIC.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** (1), (171), (18), (19), (22), (25), (26), (27), (28), (3), (46), (62), adr, canonical, category, docs, document, documentation, enhancements, fixes, guides, index, migration, misc, reference, runbook, testing, topic, type, worklog

[View Document](./INDEX_BY_TOPIC.md)

## Documentation Lifecycle and Archival System

- **File:** `DOCUMENTATION_LIFECYCLE_AND_ARCHIVAL.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** (fixes,, (high, (superseded), **note:**, 2025, 2026, [new, accuracy, active, add, add:, alerts, and, archival, archive, archived, are, automated, batch, been, best, broken, category, change:, check, checks, churn), cleanup, clear, commit, create, current, daily, date, detection, determine, directory, docs, document, documentation, edit, etc.), example, file, for, frontmatter, generate/update, generation, github, good, guide, guide](link)., guides,, has, how, index, indexes, intervals, issues, keeping, key, last, lifecycle, link, links, locally, maintenance, manual, manually, mark, messages, metrics, modern, monitoring, move, needed, not, note, old, organization, outdated, overview, practices, preservation, process, quarterly, regular, result, review, reviews, run, scenario, scenarios, see, stale, staleness, states, status, status:, structure, summary, superseded, system, testing,, the, this, to:, top, update, updates, validate, validation, verified, verified:, what, what's, when, which, workflow, worklog, works, you

[View Document](./DOCUMENTATION_LIFECYCLE_AND_ARCHIVAL.md)

## Documentation Reorganization Complete

- **File:** `REORGANIZATION_COMPLETE.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** (completed), (ongoing), (recommended), (this, about, active, add, all, archive, archived, automation, clear, code, cognitive, complete, conventions, created, docs, docs/readme.md, documentation, documents, done, established, file, files, for, frontmatter, historical, immediate, implementation, improvements, key, knowledge, lifecycle, linking, load, long, main, maintenance, medium, metadata, metrics, migration, model, modified/created, month), moved, naming, new, next, overall, ownership, phase, preserved, quarter), questions, readme, recommendations, reduced, reorganization, reorganized, schema, script, see, setup, short, specific, standardized, standards, statistics, steps, structure, success, summary, support, template, term, the, was, week), what, workflow

[View Document](./REORGANIZATION_COMPLETE.md)

## Documentation Reorganization Project Complete

- **File:** `DOCUMENTATION_REORGANIZATION_PROJECT_COMPLETE.md`
- **Type:** canonical
- **Category:** docs
- **Related Code:**
  - `.github/workflows/docs-maintenance.yml`
  - `scripts/check-docs-staleness.ts`
  - `scripts/validate-docs-frontmatter.ts`
  - `scripts/check-docs-links.ts`
  - `scripts/generate-docs-index.ts`
- **Keywords:** (11, (137, (65, (complete), (ongoing), (this, achievements, action, actions, active, all, archive, assignment, automation, breakdown, broken, browsing, check, complete, completion, conclusion, contact, coverage, deliverables, deployment, discoverability, docs, document, documentation, file), files, files), for, frontmatter, generate, github, how, immediate, indexes, issues, items, key, known, links, locally, long, maintainability, metadata, migration, modified, month), next, organization, overview, owner, passed, phase, project, recommendations, reorganization, results, running, scripts, setup, short, stale, statistics, steps, structure, subdirectories), summary, support, system, term, test, tests, the, timeline, total), types, use, validate, week), workflow

[View Document](./DOCUMENTATION_REORGANIZATION_PROJECT_COMPLETE.md)

## Documentation Reorganization Summary

- **File:** `DOCUMENTATION_REORGANIZED.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** (migration, (miscellaneous), (recent, (test, (user, `.kiro/specs/api, `.kiro/specs/integration, `.kiro/specs/multi, `.kiro/specs/supabase, `docs/fixes/`, `docs/guides/`, `docs/migration/`, `docs/misc/`, `docs/testing/`, access, appwrite, authentication/`, benefits, bug, category, documentation, documentation), fields, files, finding, fix/`, fixes), guides), links, locking/`, mapping, migration/`, moved, new, next, optimistic, optimization/`, performance, quick, remaining, reorganization, root, session, statistics, steps, structure, summaries), summary, topic, updating

[View Document](./DOCUMENTATION_REORGANIZED.md)

## Documentation Search Index

- **File:** `SEARCH_INDEX.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** 12.29.2, 21.1.0, 4.0.18, access, accessibility, accuracy, acknowledgment, action, actions, adding, admin, administrator, advanced, aggregate, alert, alignment, analysis, and, answer, api, appearing, appwrite, architecture, archival, atomic, attempt, attempts, attendee, attendees, attribute, audit, auth, auto, automated, automatic, automation, backend, best, bidirectional, boolean, breakdown, broadcast, broken, bulk, button, cache, caching, callback, canonical, canvas, change, checkbox, checklist, clear, code, collection, collections, columns, comparison, complete, completion, component, comprehensive, concurrency, condition, configuration, connection, consistency, constructor, control, correct, correction, corruption, count, credential, credentials, credentialstudio, critical, critical:, cumulative, custom, customization, dashboard, data, debug, default, delete, deletion, dependency, descriptions, design, detailed, detection, developer, dialog, difference, display, division, documentation, dropdown, duplicate, dynamic, edit, email, empty, end, enhanced, enhancement, enhancements, enter, environment, error, event, example, examples, expectations, export, exposure, extraction, failure, fallback, feature, field, fields, filter, filterconfiguration, filters, final, findings, fix, fixes, flow, for, form, format, forms, framer, freshness, frontmatter, functionality, gap, generated, generation, github, green, guide, guide:, handling, health, helper, html, implementation, import, improvement, improvements, index, indicator, infinite, inline, integration, internal, invalid, invitation, items, json, key, keyboard, keys, layering, leak, learned, lessons, lifecycle, link, linking, links, load, localstorage, lock, log, logging, logic, logs, loop, loss, major, malformed, management, manual, mapping, match, max, memory, messages, messaging, metrics, migration, mobile, mocking, modal, modals, mode, monitoring, motion, multi, name, names, new, node, not, notes, notification, onesimpleapi, operation, operations, operator, optimistic, optimization, option, options, override, package, page, pagination, parse, passcode, password, patterns, performance, permanent, permission, permissions, phase, photo, placeholder, plan, polling, practices, preventing, printable, progress, project, property, quick, race, react, ready, real, realtime, reapplied, recommendations, recreation, redesign, ref, refactor, reference, refresh, regressions, removal, reorganization, replacement, report, reports, reset, resizable, restoration, results, retries, retriesused, retryability, review, role, roles, running, safeguards, safety, sanitization, save, saved, schema, script, scripts, scrolling, search, searchability, secrets, security, select, sensitive, service, session, settings, setup, shortcut, silent, singleton, stale, start, start:, state, status, steering, storage, styling, submission, subscription, summary, supabase, support, sweetalert2, switch, switchboard, sync, system, tab, tablesdb, tablesdb:, tenancy, test, testing, tests, text, time, timestamp, topic, tracking, transaction, transactions, triple, troubleshooting, truncation, type, universal, until, update, updaterows, updates, upgrade, upsertrows, usage, user, userform, useuserformstate, utility, validation, values, variable, verification, verified, version, visibility, visual, vitest, workflow, yes/no, zero

[View Document](./SEARCH_INDEX.md)

## Documentation Status Report

- **File:** `DOCUMENTATION_STATUS_REPORT.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** archive, automation, current, documentation, frontmatter, metadata, migration, next, phase, report, setup, status, steps

[View Document](./DOCUMENTATION_STATUS_REPORT.md)

## Documentation Sync Implementation Setup Guide

- **File:** `IMPLEMENTATION_SETUP_GUIDE.md`
- **Type:** runbook
- **Category:** docs
- **Related Code:**
  - `.github/workflows/sync-docs-between-branches.yml`
  - `.gitignore`
- **Keywords:** (10, (local, (replace, .gitignore, .kiro/, accomplish, actions, actual, add, after, all, and, any, automatic, automation, both, branch, branches, cached, changes, check, checklist, cherry, code, collaboration, commit, commits, complete, conflicting, conflicts, continue, creates, current, daily, development, docs/, documentation, doesn't, don't, edit, editor, effect, exists, fails, feature, file, files, findings, for, from, frontmatter, get, git, github, guide, hash, hash), how, implementation, important, issue:, key, main, maintenance, make, making, many, minutes), monitoring, next, not, notes, now, ongoing, only), open, output:, overview, phase, pick, prerequisites, push, remove, resolve, resolved, resolving,, resources, results, scripts, scripts/, seconds, setup, should, stage, steering, step, steps, summary, support, sync, synchronization, syncing, system, taking, team, test, tested, the, too, tracked, trigger, troubleshooting, update, use, using, valid!, validation, verification, verify, view, vim, wait, was, what, with, workflow, workflows, works, you'll, your

[View Document](./IMPLEMENTATION_SETUP_GUIDE.md)

## Documentation Sync Options Comparison

- **File:** `DOCS_SYNC_OPTIONS_COMPARISON.md`
- **Type:** canonical
- **Category:** docs
- **Related Code:**
  - `.github/workflows/sync-docs-between-branches.yml`
- **Keywords:** (local), (recommended), .git/hooks/post, .github/workflows/sync, .kiro/steering/, access, actions, add, best, between, branch, branches.yml, changed, changes, cherry, commit, comparison, complexity, conclusion, cons, control, create, decision, detect, docs, docs/,, documentation, feature/mobile, file:, for, git, github, hooks, how, implementation, main, matrix, next, on:, option, options, other, overview, pick, pros, pull, push, recommendation, script, scripts/,, setup, status, steps, submodule, subtree, sync, syncs:, table, time, triggers, update, use, workflow, works

[View Document](./DOCS_SYNC_OPTIONS_COMPARISON.md)

## Documentation System Quick Start Guide

- **File:** `QUICK_START_GUIDE.md`
- **Type:** canonical
- **Category:** docs
- **Related Code:**
  - `.github/workflows/docs-maintenance.yml`
  - `scripts/check-docs-staleness.ts`
  - `scripts/validate-docs-frontmatter.ts`
  - `scripts/check-docs-links.ts`
  - `scripts/generate-docs-index.ts`
- **Keywords:** action, actions, active, alert, archive, archiving, automation, broken, browse, categories, check, common, creating, docs, document, documentation, documents, fails, finding, for, found, frontmatter, generate, github, guide, guides, indexes, items, key, keywords, links, metadata, new, new?, next, overview, phase, project, quick, running, scripts, search, specific, stale, start, steps, structure, summaries, support, system, tasks, topic, troubleshooting, updating, validate, validation, what's, workflow

[View Document](./QUICK_START_GUIDE.md)

## Email Verification Security Fix

- **File:** `fixes/EMAIL_VERIFICATION_SECURITY_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/api/auth/`
- **Keywords:** (`.env.local`), (`src/components/authuserlist.tsx`), (`src/pages/api/users/, (`src/pages/api/users/verify, (`src/pages/verify, (`src/test/mocks/appwrite.ts`), (alternative), (broken), (immediate), (optional), (recommended), /verify, add, added, api, approach, behavior, breaking, cause, changes, complete, conclusion, configuration, created, current, custom, deployment, description, development:, documentation, email, email.test.ts`), email.ts`), email.tsx`), endpoint, enhancements, environment, expected, files, fix, fixed, for, future, how, impact, implementation, improvements, issue, issues, made, messaging, mock, modify, needed, notes, now, page, performed, phase, plan, polling, procedure, related, requirements, rollback, root, security, service, solution, status, testing, tests, the, timeline, token, update, updated, updates, variables, verification, works

[View Document](./fixes/EMAIL_VERIFICATION_SECURITY_FIX.md)

## End-to-End Tests Summary

- **File:** `testing/E2E_TESTS_SUMMARY.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/`
- **Keywords:** (`src/, /e2e/attendee, /e2e/auth, /e2e/bulk, /e2e/credential, /e2e/invitation, all, attendee, authentication, bulk, conclusion, coverage, created, creation, credential, data, e2e, end, execution, export, failing, failures, files, flow, flow.test.ts`), generation, import, import/export, individual, integration, invitation, issues, key, management, mock, next, note, onboarding, operations, overview, passing!, points, requirements, results, running, status, steps, suite, suites, summary, test, tested, tests, user, validated, workflows

[View Document](./testing/E2E_TESTS_SUMMARY.md)

## Enhanced Credential Generation Error Messages - Implementation Summary

- **File:** `enhancements/CREDENTIAL_GENERATION_ERROR_MESSAGES_IMPLEMENTATION.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/pages/api/attendees/[id]/generate-credential.ts`
- **Keywords:** (`src/pages/api/attendees/[id]/generate, (`src/pages/api/attendees/[id]/print.ts`), (`src/pages/dashboard.tsx`), after, api, before, benefits, bulk, changes, credential, credential.ts`), enhanced, enhancements, error, example, files, frontend, future, generate, generation, implementation, included, information, layer, made, messages, modified, notes, now, overview, print, single, summary, testing, usage

[View Document](./enhancements/CREDENTIAL_GENERATION_ERROR_MESSAGES_IMPLEMENTATION.md)

## Enter Key Save Implementation for Attendee Forms

- **File:** `enhancements/ENTER_KEY_SAVE_IMPLEMENTATION.md`
- **Type:** canonical
- **Category:** enhancements
- **Keywords:** "enter, (multi, `src/components/attendeeform/formactions.tsx`, `src/components/attendeeform/index.tsx`, add, adding, after, and, attendee, attribute, business, button, changes, checklist, cloudinary, configuration, considerations, create, data, details, dialogcontent, document, documentation, editing, element, enhancements, enter, event, experience, fields, files, flow, focus, for, form, forms, future, global, handler, handler?, hint, history, hook, implementation, instead, key, level, line), listener?, logic?, modified, not, notes, overview, photo, related, requestsubmit(), requirements, save, save", saves, saving, scenario, settimeout, submit()?, success, tabindex, taking, technical, testing, troubleshooting, typing, update, upload, usecallback, user, version, visual, when, why, working

[View Document](./enhancements/ENTER_KEY_SAVE_IMPLEMENTATION.md)

## Error Handling Guide

- **File:** `guides/ERROR_HANDLING_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/lib/errorMessages.ts`
- **Keywords:** all, api, architecture, available, backend, best, centralized, codes, common, component, configuration, coverage, creating, custom, default, email, endpoint, error, errors, examples, files, form, format, frontend, guide, handling, hook, input, issues, limit, limiting, logic, manual, messages, options, overview, parsing, patterns, practices, rate, related, response, retry, rules, run, running, search, standard, summary, test, testing, tests, the, troubleshooting, usage, useapierror, using, validation, verify, with

[View Document](./guides/ERROR_HANDLING_GUIDE.md)

## Event Settings Cache Usage Example

- **File:** `guides/CACHE_USAGE_EXAMPLE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/lib/cache.ts`
- **Keywords:** (cache, (cold, (invalidates, (warm, <seconds>, after, age:, behavior, best, browser, cache, cache), cache:, comparison, configuration, curl:, customizing, data, default, devtools:, event, example, expiration, first, for:, headers, hit, hit), how, invalidate, invalidation), issues:, look, manual, miss, miss), monitoring, monitoring:, next, not, operations:, performance, practices, request, requests, response, response:, scenario, second, settings, settings:, stale, statistics, subsequent, test, testing, the, troubleshooting, ttl:, update, usage, usage:, use, using, when, with, without, working:, works

[View Document](./guides/CACHE_USAGE_EXAMPLE.md)

## Event Settings Migration - Complete Summary

- **File:** `migration/MIGRATION_COMPLETE_SUMMARY.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `scripts/setup-appwrite.ts`
- **Keywords:** achieved, added, benefits, checklist, code, complete, completed!, conclusion, created, data, database, documentation, done, environment, event, fetching, files, future, helper, how, integration, integrations, library, may, metrics, migrated, migration, need, new, next, plan, rollback, scripts, settings, steps, structure, success, successfully, summary, support, testing, that, the, updated, updates, updating, use, variables, was, what, with

[View Document](./migration/MIGRATION_COMPLETE_SUMMARY.md)

## Event Settings Migration Schema

- **File:** `migration/EVENT_SETTINGS_MIGRATION_SCHEMA.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `scripts/setup-appwrite.ts`
- **Keywords:** (16, (assumes, (data, (full, (includes, (json, `additionalsettings`, `cloudinaryconfig`, `complete, `migrate, `onesimpleapiconfig`, and, application, attribute, attributes, attributes), barcode, canonical, changes, code, complete, consistency, consolidated, core, creation), data, default, direct, event, exist), field, fields, from, important, information, integration, json, log, mapping, mappings, migration, migration.ts`, name, notes, only, only), overview, prisma, run, schema, scripts, settings, settings.ts`, setup, setup), string), stringification, switchboard, updates, values, verification, verify

[View Document](./migration/EVENT_SETTINGS_MIGRATION_SCHEMA.md)

## Event Settings Migration Status

- **File:** `migration/MIGRATION_STATUS.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `scripts/setup-appwrite.ts`
- **Keywords:** api, completed, components, current, event, files, focus, for, high, infrastructure, integration, management, medium, migration, next, pages, priority, requiring, routes, script, settings, specific, status, steps, strategy, update, updates

[View Document](./migration/MIGRATION_STATUS.md)

## Event Settings Recreation Script - Safeguards Implementation

- **File:** `misc/EVENT_SETTINGS_SCRIPT_SAFEGUARDS.md`
- **Type:** canonical
- **Category:** misc
- **Related Code:**
  - `src/scripts/recreate-event-settings-fresh.ts`
- **Keywords:** "delete", (recommended, automatic, backup, changes, cli, code, confirm, confirmation, date, details, dry, environment, error, event, example, examples, execute, features, first, flag, flags, functions, handling, implementation, improvements, interactive, made, mode, modified, new, overview, preview, prompt, prompt:, quality, recovery, recreation, run, safe, safeguards, safety, script, settings, step), structure, testing, type, usage, validation, variable, will, with

[View Document](./misc/EVENT_SETTINGS_SCRIPT_SAFEGUARDS.md)

## Field Update Service Guide

- **File:** `guides/FIELD_UPDATE_SERVICE_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Keywords:** credential, documentation, field, fields, functions, generic, groups, guide, helper, locking, optimistic, overview, photo, problem, related, service, solved, update, updates, updating, usage

[View Document](./guides/FIELD_UPDATE_SERVICE_GUIDE.md)

## Framer Motion 12.29.2 Update Test Results

- **File:** `testing/FRAMER_MOTION_UPDATE_TEST_RESULTS.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `package.json`
  - `src/components/`
  - `src/pages/`
- **Keywords:** (if, 12.29.2, animation, assessment, breaking, build, changes, checking, compatibility, components, conclusion, deployment, details, found, framer, impact, installation, issues, motion, needed), next, performance, phase, plan, readiness, results, rollback, steps, suite, summary, test, tested, type, update, verification, verified

[View Document](./testing/FRAMER_MOTION_UPDATE_TEST_RESULTS.md)

## GitHub Actions Sync Workflow Complete

- **File:** `GITHUB_ACTIONS_SYNC_WORKFLOW_COMPLETE.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** (feature, (main, actions, analysis, and, bidirectional, branch, cause, changes, cleanup, complete, diff, documentation, feature), files, final, forward, git, github, how, implementation, issue, key, logic, made, main), modified, next, operational, performed, problem, related, remote, results, reverse, root, setup, status:, step:, steps, summary, sync, target, testing, tracking, verification, workflow, works

[View Document](./GITHUB_ACTIONS_SYNC_WORKFLOW_COMPLETE.md)

## Implementation Complete Summary

- **File:** `IMPLEMENTATION_COMPLETE_SUMMARY.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** (optional), (this, .gitignore, actions, and, architecture, automated, automatic, automation, benefits, bidirectional, both, branches, broken, changes, check, checks, commit, commits, complete, comprehensive, conclusion, coverage, daily, deletion, deliverables, developers, docs, documentation, don't, executive, for, frontmatter, generate, github, guidelines, handling, how, immediate, implementation, implemented, important, indexes, key, links, maintenance, make, making, manual, means, metrics, monitoring, month), next, notes, now, ongoing, performance, projects, push, reliability, resources, results, scope, scripts, seconds, short, stage, stale, status, steering, steps, summary, support, sync, synchronization, system, teams, term, test, testing, this, timeline, updated, use, validate, view, wait, was, week), what, workflow

[View Document](./IMPLEMENTATION_COMPLETE_SUMMARY.md)

## Implementation Quick Reference

- **File:** `IMPLEMENTATION_QUICK_REFERENCE.md`
- **Type:** canonical
- **Category:** docs
- **Related Code:**
  - `.gitignore`
  - `.github/workflows/sync-docs-between-branches.yml`
- **Keywords:** (replace, (triggers, .gitignore, .kiro/, 387, actions, actual, all, and, automatic, automation, both, branch, branches, changes, check, checklist, cherry, clean, comment, commit, commit), conflicts, continue, create, current, daily, docs/, documentation, edit, feature, file, files, find, for, from, get, github, hash, https://github.com/[user]/[repo]/actions, implementation, key, latest, lines:, main, make, monitor, not, now, out, phase, pick, pull, push, quick, reference, save, scripts/, seconds, stage, switch, sync, sync), test, these, to:, triggering, troubleshooting, update, usage, verification, verify, view, wait, with, workflow, working

[View Document](./IMPLEMENTATION_QUICK_REFERENCE.md)

## Implementation Ready - Option A + GitHub Actions

- **File:** `IMPLEMENTATION_READY.md`
- **Type:** canonical
- **Category:** docs
- **Related Code:**
  - `.gitignore`
  - `.github/workflows/sync-docs-between-branches.yml`
- **Keywords:** (40, (now), (this, .gitignore, actions, actions:, after, already, automatic, automation, before, begin?, benefits, branch, changes, checklist, combined, commit, common, conflicting, detailed, documentation, done, during, edit, expected, feature, files, follow, github, guide, here:, how, immediate, implementation, implementing, issues, key, main, minutes, need, next, ongoing, option, phase, phases, push, quick, ready, reference, results, setup, shared, short, simple, start, steps, summary, support, sync, term, test, total), troubleshooting, update, use, verify, week), what, what's, you, you're

[View Document](./IMPLEMENTATION_READY.md)

## Import Complete Fix Session Summary

- **File:** `fixes/IMPORT_COMPLETE_FIX_SESSION_SUMMARY.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/api/attendees/import.ts`
- **Keywords:** "api, (converted, (final), after, all, api, applied, attendees, before, best, boolean, boolean), case:, changes, columns:, comparison, complete, conclusion, console, created, csv, custom, data, documentation, edit, field, fields, files, fix, fixed, fixes:, flow, flow:, format, formats, handling, import, imported, imports, inconsistency, issues, large, limiting, log, logs, metrics, mismatch, modified, noise, not, notes, null, object, overview, performance, practices, rate, record, resolved, response", results, sending, session, set, statistics, storage, summary, supported, test, testing, text, transformations:, uppercase, values, warning, with, without, yes/no):

[View Document](./fixes/IMPORT_COMPLETE_FIX_SESSION_SUMMARY.md)

## Integration Architecture Fix

- **File:** `fixes/INTEGRATION_ARCHITECTURE_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/api/integrations/`
- **Keywords:** architecture, available, benefits, cause, changes, collection, collections, concerns, database, environment, event, files, fix, flexibility, functions, helper, ids, implemented, integration, issue, issues, key, locking, modified, next, optimistic, performance, required, root, separation, settings, similar, solution, steps, this, variables

[View Document](./fixes/INTEGRATION_ARCHITECTURE_FIX.md)

## Integration Architecture Guide

- **File:** `guides/INTEGRATION_ARCHITECTURE_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/integrations/`
- **Keywords:** (credential, (photo, (webhook, and, api, architectural, architecture, backend, backward, best, caching, canvas, cloudinary, collection, collections?, common, compatibility, complete, conclusion, concurrent, configuration, conflict, conflicts, considerations, convention, core, create, creating, credentials, credentials?, data, database, decisions, definitions, design, diagram, documentation, enhancements, environment, error, errors, example, examples, failures, fetching, file, files, first, flatteneventsettings(), flow, for, found, from, frontend, future, guide, handling, helper, how, improvements, indexes, integration, issue:, key, locking, locking?, mechanism, migration, naming, new, normalized, not, notifications), onesimpleapi, optimistic, organization, overview, parallel, partial, pattern, patterns, performance, potential, practices, principles, printing), public, rationale, related, required, response, schema, script, security, separation, separation?, service), setup, single, step, strategy, structure, switchboard, table, test, testing, tests, the, this, troubleshooting, type, unit, updating, upload, use, uses, utility, validation, variables, webhooks, when, why, working, works

[View Document](./guides/INTEGRATION_ARCHITECTURE_GUIDE.md)

## Integration Collections Migration

- **File:** `migration/INTEGRATION_COLLECTIONS_MIGRATION.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `scripts/setup-appwrite.ts`
- **Keywords:** (appwrite), (supabase/prisma), (temporary), after, before, benefits, checking, checklist, cloudinary, code, collections, compatibility, data, database, enabled, environment, event, example, examples, fetching, files, guide, helper, integration, integrations, legacy, library, migration, need, new, next, overview, plan, reading, rollback, settings, steps, structure, support, testing, that, updated, updating, using, variables

[View Document](./migration/INTEGRATION_COLLECTIONS_MIGRATION.md)

## Integration Data Flow

- **File:** `guides/INTEGRATION_DATA_FLOW.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/integrations/`
- **Keywords:** (optimistic, (transactional), 10., and, api, benefits, best, cache, categories, check, checklist, client, cloudinary, collection, common, complete, component, conflict, conflicts, considerations, contents, core, data, database, debugging, diagram, effectiveness, error, errors, event, eventsettingscache, eventsettingsform, example, extractintegrationfields, extraction, features, fetch, fetching, field, flatteneventsettings, flow, for, form, function, get, guide, handler, handling, headers, headers:, helper, impact, implementation, input, inspect, integration, integrations, invalidation, issues, json, key, limits, locking, locking), logging, look, make, management, monitor, monitoring, network, note, operations, optimistic, optimization, overview, parallel, pattern, patterns, payload, performance, practices, processing, promise.allsettled, promise.allsettled?, purpose, query, request, requests, response, responsibilities, result, scenario:, security, selective, server, settings, solutions, state, statistics, status, step, storage, strategy, string, structure, submission, success, summary, table, targets, the, these, time, timeline, tips, trace, transaction, transfer, transformation, update, updated, updates, usage, user, verify, warnings, why, with

[View Document](./guides/INTEGRATION_DATA_FLOW.md)

## Integration Migration Patterns

- **File:** `guides/INTEGRATION_MIGRATION_PATTERNS.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/integrations/`
- **Keywords:** (even, (final, (if, (no, (optional), (quick, (recommended), [migration, actual, add, adding, and, api, appwrite, archive, assessment, attribute, attributes, automated, backend, backup, backups, best, between, but, changes, changes), checklist, cloudinary, code, collection, collections, common, complete, conclusion, conditions, configuration, console, contents, create, data, delete, deprecated, deprecating, directory, disable, do's, don'ts, dry, duplicate, empty), errors, estimated, existing, field, fields, force, from, imagekit, integration, integrations, interface, into, issue:, issues, key, limited), manual, merging, migrate, migrating, migration, multiple, name], needed), new, not, option, out, overview, patterns, phase, photo, photos, plan, plan:, planning, post, practices, pre, procedures, query, references, removal, remove, removing, replacing, restore, revert, risk, rollback, routes, run, safe, scenario, scenario:, scenarios, schema, script, services, splitting, step, step), steps, stop, strategies, table, target, template, templates, testing, time, times, transformation, trigger, troubleshooting, typescript, unused, update, upload, url, validation, verify, version, via, with

[View Document](./guides/INTEGRATION_MIGRATION_PATTERNS.md)

## Integration Patterns Reference

- **File:** `guides/INTEGRATION_PATTERNS_REFERENCE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/integrations/`
- **Keywords:** (`scripts/setup, (`src/components/eventsettingsform/`), (`src/lib/appwrite, (`src/pages/api/event, additional, all, api, appwrite.ts`), backend, checklist, cloudinary, collection, complete, component, components, contents, controls, creation, database, environment, example:, examples, extractintegrationfields, flatteneventsettings, form, function, generic, getter, handler, headers, helper, helper:, icons, integration, integrations, integrations.ts`), integrationstatusindicator, interface, key, onesimpleapi, pattern, patterns, points, questions?, real, reference, resources, section, settings/index.ts`), setup, standard, structure, switchboard, tab, table, template, testing, the, three, typescript, update, updateintegrationwithlocking, usage, validation, variables, with, world

[View Document](./guides/INTEGRATION_PATTERNS_REFERENCE.md)

## Integration Secrets Migration

- **File:** `migration/INTEGRATION_SECRETS_MIGRATION.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `scripts/setup-appwrite.ts`
- **Keywords:** "cloudinary, "invalid, (enterprise), (multi, (recommended, additional, after, api, appwrite, best, changes, checklist, cloudinary, code, configuration, configured", credential, credentials, credentials", database, don't, environment, error:, event, external, fail, for, form, functions, guide, helper, integration, issue, manager, migration, not, option, overview, practices, required, resources, rotation, routes, schema, secrets, security, settings, single, solution, support, switchboard, tenant), troubleshooting, update, uploads, variables

[View Document](./migration/INTEGRATION_SECRETS_MIGRATION.md)

## Integration Security Guide

- **File:** `guides/INTEGRATION_SECURITY_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/integrations/`
- **Keywords:** (optional), (required), [purpose], [service], [type], access, additional, api, architecture, architecture?, are, audit, authentication, automated, based, best, boundaries, calls, check, checklist, client, code, common, concerns, conclusion, configuration, contents, control, conventions, correct:, credentials, database, documentation, environment, error, example, examples:, exposed, exposing, for, guide, handling, implementation, incident, incorrect:, insecure, integration, keys, log, logging, logs, manual, may, messages, multiple, naming, non, not, notices, only, overview, pattern, pattern:, patterns, permission, permissions, photo, pitfall, pitfalls, practices, public, reading, requests, resources, response, responses, role, route, sanitizing, secret, secrets, secure, securely, security, sensitive, separation, server, services, side, signing, specific, status, storing, table, testing, tests, that, this, trail, types, upload, validation, variable, variables, what, why, with

[View Document](./guides/INTEGRATION_SECURITY_GUIDE.md)

## Integration Troubleshooting Guide

- **File:** `guides/INTEGRATION_TROUBLESHOOTING_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/integrations/`
- **Keywords:** "not, (ctrl+c), (use, .env.local, advanced, and, api, appwrite, asking, before, benefits, but, cache, cause, causes, check, checklist, checks, collections, commands, common, conclusion, concurrent, configured", conflicts, connection, console, create, data, database, debug, debugging, diagnostic, documentation, documents, enable, enabled, endpoint, endpoints, environment, error, errors, event, example:, exist, failures, fetch, file, flatteneventsettings, for, getdocuments, getting, guide, happens, help, how, indexes, information, integration, invalidate, invalidation, isolation, issues, limit, loading, locking, logging, logs, manually, message, minimize, monitor, not, null, optimistic, optimization, optimize, overview, pattern, patterns, performance, possible, prevention, problem, promise.allsettled, provide, queries, query, quick, reference, related, restart, results, returns, routes, run, saving, script, script), server, settings, setup, shows, solution, solution:, solutions, specific, status, steps, stop, strategies, symptom, techniques, terminal, test, the, then, tips, troubleshooting, use, useful, using, validation, variable, variables, verbose, verification, verify, view, when, with, working, works, your

[View Document](./guides/INTEGRATION_TROUBLESHOOTING_GUIDE.md)

## Integration Type Examples

- **File:** `guides/INTEGRATION_TYPE_EXAMPLES.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/integrations/`
- **Keywords:** (cloudinary, (environment, (individual, (onesimpleapi, (optional), (required), (switchboard, (wrapper), alternative, api, application, aspect, authentication, auto, backend, best, between, body, case, cases, characteristics, checklist, choose, choosing, cloud, combinations, combining, common, comparison, complexity, component, conclusion, configuration, contents, credential, credentials, criteria, crop, custom, data, database, decision, disable, endpoint, example, examples, feature, field, flow, form, frontend, functions, generate, generation, header, images, implementation, integration, integrations, key, level, logic, maintenance, mapping, mappings, migrating, migration, multiple, name, only), optimize, options, overview, pattern, pattern), performance, photo, placeholder, placeholders, practices, preset, printing, processing, purpose, ratio, record, records), request, requirements, right, schema, selection, sending, services, skip, standard, storage, strategies, system, table, technical, template, the, thumbnails, transformation, tree, type, upload, url, usage, use, value, variable, variables, webhook, when:, widget

[View Document](./guides/INTEGRATION_TYPE_EXAMPLES.md)

## Integration UI Patterns

- **File:** `guides/INTEGRATION_UI_PATTERNS.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/components/`
- **Keywords:** (blue), (for, (green), (purple), accessibility, and, api, approach, aria, association, available, banner, banners, benefits, best, boolean, breakpoints, coding, color, common, complete, component, components, conclusion, configuration, considerations, contents, contrast, descriptive, design, details, dialogs, disabled, documentation, dropdown, elements, enable/disable, example, examples, experience, features, field, fields, first, focus, form, full, grid, grouping, guide, guidelines, header, helper, hiding, hierarchy, implementation, indicator, indicators, info, information, input, integration, integrationstab, integrationstatusindicator, integrationtabcontent, json/html, key, keyboard, label, labels, layout, localstorage, management, mapping, mappings, message, messages, mobile, navigation, notice, organization, overview, pattern, patterns, performance, persistence, placeholder, placeholders, practices, principles, purpose, quick, reader, reference, related, required, responsive, return, screen, section, security, select, setting, settings, settings), spacing, state, status, structure, summary, support, switch, tab, table, templates), testing, text, textarea, toggle, trapping, types, upload, usage, user, visual, width, wrapper

[View Document](./guides/INTEGRATION_UI_PATTERNS.md)

## Integration Version Attribute Implementation Summary

- **File:** `migration/INTEGRATION_VERSION_ATTRIBUTE_SUMMARY.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `scripts/setup-appwrite.ts`
- **Keywords:** again, attribute, collections, completed, configuration, created, created/modified, done, execution, features, files, how, idempotency, implementation, instead, integration, modified, next, notes, optional, required?, requirements, results, run, satisfied, script, steps, summary, task, technical, the, updated, verification, version, was, what, why

[View Document](./migration/INTEGRATION_VERSION_ATTRIBUTE_SUMMARY.md)

## Integration Version Migration

- **File:** `migration/INTEGRATION_VERSION_MIGRATION.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `scripts/setup-appwrite.ts`
- **Keywords:** "appwrite, "document, "version, add, already, api, attribute, collections, documents, environment, error:, existing, exists", failed", guide, integration, key, migrate, migration, missing, next, not, overview, prerequisites, required, rollback, set", some, step, steps, still, support, testing, troubleshooting, update, variables, verification, version

[View Document](./migration/INTEGRATION_VERSION_MIGRATION.md)

## Invitation API Tests Summary

- **File:** `testing/INVITATION_API_TESTS_SUMMARY.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/api/invitations/`
- **Keywords:** (complete.test.ts), (index.test.ts), (validate.test.ts), `/api/invitations/complete`, `/api/invitations/validate`, `/api/invitations`, api, cases, completion, considerations, coverage, covered, created, creation, edge, error, features, files, flow, handling, integration, invitation, key, management, mock, next, notes, overview, points, requirements, results, security, steps, strategy, summary, test, tested, tests, token, validation

[View Document](./testing/INVITATION_API_TESTS_SUMMARY.md)

## Link User Integration Guide

- **File:** `misc/LINK_USER_INTEGRATION.md`
- **Type:** canonical
- **Category:** misc
- **Related Code:**
  - `src/components/LinkUserDialog.tsx`
  - `src/components/DeleteUserDialog.tsx`
  - `src/pages/api/users/`
- **Keywords:** (default), (existing), (new), /api/users, add, and, api, changes, components, create, created, created/updated, dashboard, delete, deletion, dialog, dialogs, endpoints, existing, for, full, guide, header, import, indicators, integration, link, management, migration, new, notes, only, overview, show, state, steps, table, testing, the, unlink, update, use, user, visual, workflow, workflows

[View Document](./misc/LINK_USER_INTEGRATION.md)

## Load Report Delete Race Condition Fix

- **File:** `fixes/LOAD_REPORT_DELETE_RACE_CONDITION_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/components/AdvancedFiltersDialog/components/LoadReportDialog.tsx`
- **Keywords:** condition, delete, files, fix, impact, load, modified, problem, race, report, requirements, solution, summary

[View Document](./fixes/LOAD_REPORT_DELETE_RACE_CONDITION_FIX.md)

## Load Report Edit Form Duplicate Submission Fix

- **File:** `fixes/LOAD_REPORT_EDIT_FORM_DUPLICATE_SUBMISSION_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/components/AdvancedFiltersDialog/components/LoadReportDialog.tsx`
- **Keywords:** duplicate, edit, files, fix, form, impact, load, modified, problem, report, requirements, solution, submission, summary

[View Document](./fixes/LOAD_REPORT_EDIT_FORM_DUPLICATE_SUBMISSION_FIX.md)

## Log Deletion Testing Guide

- **File:** `testing/LOG_DELETION_TESTING_GUIDE.md`
- **Type:** runbook
- **Category:** testing
- **Related Code:**
  - `src/pages/api/logs/delete.ts`
- **Keywords:** "appwrite, "no, action, again, and, api, behavior, benchmarks, case, cleanup, combined, configuration, created, current, date, dates, delete, deletion, documentation, during, errors, expected, fails:, filters, for, found", functionality, gets, guide, inject, injection, instead, issues, key, limit, log, logs, not, observe, option, performance, quick, range, rate, related, run, script, start, test, testing, the, then, troubleshooting, type, user, users, via, watch, what, with

[View Document](./testing/LOG_DELETION_TESTING_GUIDE.md)

## Log Settings Collection Schema Migration

- **File:** `migration/LOG_SETTINGS_SCHEMA_MIGRATION.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `scripts/setup-appwrite.ts`
- **Keywords:** (32, (current), (outdated), add, added, analysis, appwrite.ts, attributes, cause, changes, cleanup, collection, considerations, create, created, date, delete, documentation, documents, execute, files, future, impact, learned, lessons, log, migration, missing, old, original, problem, recommended, related, required, reset, results, root, schema, script, settings, setup, solution, step, steps, total), update, verification

[View Document](./migration/LOG_SETTINGS_SCHEMA_MIGRATION.md)

## Log Settings to Action Mapping

- **File:** `reference/LOG_SETTINGS_MAPPING.md`
- **Type:** canonical
- **Category:** reference
- **Related Code:**
  - `src/lib/logSettings.ts`
  - `src/pages/api/log-settings/index.ts`
  - `src/components/LogSettingsDialog.tsx`
- **Keywords:** (all, `shouldlog`, action, attendee, authentication, check, common, confirmed, credential, custom, date, direct, event, exists, fields, files, fixed, fixed!), fixes, how, implementation, import, instead, issue, issues, log, logs, management, mapping, missing, name, next, operations, overview, pattern, recent, related, role, session, setting, settings, shouldlog, status, steps, structure, system, test, the, this, used, user, verify, view, working, wrong

[View Document](./reference/LOG_SETTINGS_MAPPING.md)

## Log Truncation Utility Refactor

- **File:** `misc/LOG_TRUNCATION_REFACTOR.md`
- **Type:** canonical
- **Category:** misc
- **Related Code:**
  - `src/lib/logTruncation.ts`
  - `src/pages/api/attendees/bulk-delete.ts`
- **Keywords:** backward, benefits, bulk, changes, characteristics, code, compatibility, comprehensive, conclusion, coverage, created, delete.ts, details, enhancements, example, files, function, functionality, future, helper, log, made, minimal, modified, next, optional, overview, partial, performance, proofing, quality, recommended, refactor, results, reusable, step, steps, strategy, test, truncation, updated, usage, utility

[View Document](./misc/LOG_TRUNCATION_REFACTOR.md)

## Logging System Integration Tests - Implementation Summary

- **File:** `testing/LOGS_API_TESTS_SUMMARY.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/api/logs/`
- **Keywords:** (`src/pages/api/log, (`src/pages/api/logs/, /delete.test.ts`), /export.test.ts`), /index.test.ts`), `/api/log, `/api/logs/delete`, `/api/logs/export`, `/api/logs`, all, common, coverage, created, details, enhancements, execution, existing, features, file, files, fixes, fully, future, implementation, integration, issues, key, known, logging, mock, needing, notes, overview, passing, patterns, requirements, run, settings/, settings`, setup, specific, suites, summary, system, test, tested, tests, with

[View Document](./testing/LOGS_API_TESTS_SUMMARY.md)

## Logs Timestamp Migration Summary

- **File:** `migration/LOGS_TIMESTAMP_MIGRATION_SUMMARY.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `scripts/setup-appwrite.ts`
- **Keywords:** `scripts/add, `scripts/migrate, add, assessment, attribute, attribute.ts`, backfill, backward, behavior, compatibility, conclusion, created, data, details, execution, existing, files, future, impact, integrity, learned, lessons, log, logs, migration, next, ordering, overview, performance, plan, process, related, requirements, results, rollback, satisfied, scripts, statistics, step, steps, summary, timestamp, timestamps.ts`, verification

[View Document](./migration/LOGS_TIMESTAMP_MIGRATION_SUMMARY.md)

## Major Package Updates Testing Complete

- **File:** `misc/MAJOR_PACKAGE_UPDATES_TESTING_COMPLETE.md`
- **Type:** worklog
- **Category:** misc
- **Related Code:**
  - `package.json`
  - `src/lib/appwrite.ts`
  - `src/components/`
- **Keywords:** (11, (major, 12.29.2, 21.1.0, actions, appwrite, code, complete, completed, conclusion, created, criteria, current, deferred, deploy, detailed, documentation, files, for, framer, immediate, major, modified, motion, next, node, overview, package, package.json, packages), planned, production, ready, recommendations, results, status, steps, success, summary, test, tested, testing, timeline, updated, updates, versions)

[View Document](./misc/MAJOR_PACKAGE_UPDATES_TESTING_COMPLETE.md)

## Major Package Updates Testing Plan

- **File:** `misc/MAJOR_PACKAGE_UPDATES_TESTING_PLAN.md`
- **Type:** runbook
- **Category:** misc
- **Related Code:**
  - `package.json`
  - `src/lib/appwrite.ts`
  - `src/components/`
- **Keywords:** (11.18.2, (20.3.0, 12.29.2), 21.1.0), appwrite, assessment, breaking, build, changes, checking, checklist, component, criteria, execution, files, findings, framer, initial, installation, integration, major, manual, motion, node, notes, overview, package, performance, phase, plan, pre, review, risk, rollback, success, suite, test, testing, tests, timeline, triggers, type, unit, update, updates, verification, verify, visual

[View Document](./misc/MAJOR_PACKAGE_UPDATES_TESTING_PLAN.md)

## Major Updates Findings and Recommendations

- **File:** `misc/MAJOR_UPDATES_FINDINGS_AND_RECOMMENDATIONS.md`
- **Type:** canonical
- **Category:** misc
- **Related Code:**
  - `package.json`
  - `scripts/`
  - `src/lib/appwrite.ts`
- **Keywords:** (11.18.2, (20.3.0, (higher, (lower, (next, (this, 12.29.2), 21.1.0), action, affected, and, appwrite, areas, assessment, build, can, changes, compatibility, criteria, detected, finding:, findings, framer, immediate, issue, issues, lower, major, medium, motion, next, node, notes, package, plan, plans, potential, priority, proceed, recommendation, recommendations, recommended, required, requires, risk, risk), risk,, rollback, short, significant, sprint), status:, steps, success, summary, term, testing, updates, week), weeks), with

[View Document](./misc/MAJOR_UPDATES_FINDINGS_AND_RECOMMENDATIONS.md)

## Max Retries Alert Dynamic Configuration Fix

- **File:** `fixes/MAX_RETRIES_ALERT_DYNAMIC_CONFIG_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/dashboard.tsx`
  - `src/hooks/useConnectionHealth.ts`
  - `src/types/connectionHealth.ts`
  - `src/lib/connectionNotifications.ts`
- **Keywords:** alert, callback, cause, changes, configuration, dashboard, definition, documentation, dynamic, files, fix, hook, impact, made, max, modified, problem, related, retries, return, root, solution, testing, type, updated, value

[View Document](./fixes/MAX_RETRIES_ALERT_DYNAMIC_CONFIG_FIX.md)

## Memory Leak Fixes - Implementation Summary

- **File:** `fixes/MEMORY_LEAK_FIXES_IMPLEMENTED.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/lib/cache.ts`
  - `src/contexts/`
- **Keywords:** (`src/hooks/usedebouncedcallback.ts`), (`src/hooks/usepagevisibility.ts`), (lower, (memory, (optimized):, after, before, callback, causes, checklist, chrome, conclusion, conditional, console, created, dashboard, date, debounced, development, enhanced, expected, experience, files, fixes, functionality, future, hook, identified, impact, implementation, implemented, improvements, leak, leak):, logs, long, memory, modified, monitoring, new, not, optimizations, overview, page, performance, plan, priority), problem, production, profiling, realtime, recommendations, reduction, rollback, root, running, solutions, subscription, subscriptions, summary, support, test, testing, usage, user, verification, visibility, yet

[View Document](./fixes/MEMORY_LEAK_FIXES_IMPLEMENTED.md)

## Memory Optimization Guide

- **File:** `guides/MEMORY_OPTIMIZATION_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/lib/cache.ts`
  - `src/hooks/usePageVisibility.ts`
- **Keywords:** active, adding, always, arrays, avoid, bad:, callbacks, checklist, cleanup, common, computations, conditional, debounced, developers, development, enable, feature, features, for, good:, growing?, guide, hooks, issues?, large, leak, management, manual, memoized, memory, monitoring, new, not, optimization, patterns, performance, polling, profiling, proper, questions?, quick, realtime, reference, resources, scenario, scenarios, search, settimeout, state, still, subscription, subscriptions, the, timeout, tips, troubleshooting, uncontrolled, use, usedebouncedcallback, usepagevisibility, using, without, working?

[View Document](./guides/MEMORY_OPTIMIZATION_GUIDE.md)

## Migration Lessons Learned

- **File:** `migration/MIGRATION_LESSONS_LEARNED.md`
- **Type:** adr
- **Category:** migration
- **Related Code:**
  - `scripts/`
- **Keywords:** abort, async, attribute, caching, case, check, checklist, cost, creation, critical, different, differently, error, factors, final, functions, gotchas, handling, helper, joins, key, learned, learned:, lessons, limit, migration, model, pattern, patterns, permission, quick, reality, reference, sensitivity, sql, success, the, time, we'd, what, when, win, wisdom

[View Document](./migration/MIGRATION_LESSONS_LEARNED.md)

## Migration Script Validation Tests Summary

- **File:** `migration/MIGRATION_VALIDATION_TESTS_SUMMARY.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `scripts/verify-appwrite-setup.ts`
- **Keywords:** after, and, areas, auth, before, complex, conclusion, configuration, count, coverage, data, documentation, during, environment, error, execution, features, file, findings, handling, integrity, key, location, migration, overview, preservation, progress, quality, recommendations, record, recovery, related, relationship, results, rollback, run, running, scenarios, script, strengths, summary, test, tests, tests), tests:, tracking, transformation, transformations, type, user, validated, validation, with

[View Document](./migration/MIGRATION_VALIDATION_TESTS_SUMMARY.md)

## Migration Scripts Alignment Summary

- **File:** `migration/MIGRATION_SCRIPTS_ALIGNMENT_SUMMARY.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `scripts/`
- **Keywords:** (manually, `complete, `migrate, alignment, and, api), appwrite, clear, compare, comparison, complete, conclusion, consolidation, created, dashboard, data, developers, differences, document, documentation, event, export, exported, for, from, identical, issue, json, log, maintenance, migration, migration.ts`, payload, recommendations, resolution, results, run, schema, script, scripts, selective, settings, settings.ts`, should, summary, test, testing, updated, updates, verification, via

[View Document](./migration/MIGRATION_SCRIPTS_ALIGNMENT_SUMMARY.md)

## Mobile API Reference

- **File:** `reference/MOBILE_API_REFERENCE.md`
- **Type:** canonical
- **Category:** reference
- **Related Code:**
  - `src/pages/api/mobile/`
  - `src/components/MobileApp/`
- **Keywords:** (current), 403, 404, 8601, api, attendees, authentication, bandwidth, caching, common, considerations, data, date, datetime, delta, documentation, endpoint, endpoints, error, errors, event, flow, forbidden, format, formats, found, full, handling, history, info, iso, limiting, logs, mobile, not, offline, optimization, overview, patterns, performance, permissions, profiles, rate, reference, related, required, responses, scan, slow, strategy, support, sync, time, timezone, troubleshooting, upload, v1.0, validation, version

[View Document](./reference/MOBILE_API_REFERENCE.md)

## Mobile Custom Fields Enhancement Summary

- **File:** `guides/MOBILE_CUSTOM_FIELDS_ENHANCEMENT.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/mobile/`
- **Keywords:** added, api, apps, automated, backward, benefits, changes, compatibility, component, custom, details, display, documentation, endpoint, enhancement, example, existing, field, fields, files, for, full, guide, how, implementation, instead, internal, manual, migration, missing, mobile, modified, names, new, next, not, performance, problem, react, related, response, seeing, solution, steps, summary, test, testing, the, troubleshooting, use, was, what, with, works

[View Document](./guides/MOBILE_CUSTOM_FIELDS_ENHANCEMENT.md)

## Mobile Settings Passcode - Test Summary

- **File:** `testing/MOBILE_SETTINGS_PASSCODE_TESTS_SUMMARY.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/`
- **Keywords:** 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, adding, all, api, backward, breakdown, cases, category, clearing, common, compatibility, complete, conclusion, considerations, coverage, covered, current, data, digit, display, documentation, edge, efficiency, end, enhancements, error, execution, files, format, formats, future, include, individual, input, integrity, invalid, known, limitations, maintenance, mobile, mode, new, not, notes, null, only, organization, overview, passcode, passing, patterns, performance, rejection, related, remove, requirement, requirements, response, results, return, running, scenarios, security, set, setting, settings, store, structure, summary, test, tested, tests, tests), tests:, time, total, update, valid, validate, validation, value, when, workflow

[View Document](./testing/MOBILE_SETTINGS_PASSCODE_TESTS_SUMMARY.md)

## Mobile Settings Passcode Implementation Guide

- **File:** `guides/MOBILE_SETTINGS_PASSCODE_IMPLEMENTATION_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/mobile/`
- **Keywords:** (week, access, accessibility, administrator, alternative, and, api, app, appendix, attempts, authentication, backend, backgrounding, basic, best, biometric, case, cases, change, changed, changes, checklist, common, conclusion, considerations, contact, debugging, descriptions, details, document, during, edge, endpoint, enhanced, entry, error, errors, event, example, experience, failed, feature, fetch, field, format, found, functional, getting, guide, guidelines, handling, help, implementation, information, input, integration, issues, launch, log, logging, management, memory, menu, missing, mobile, multiple, network, not, overview, passcode, performance, phase, polish, practices, protect, rapid, recommendations, refinement, removed, request, requests, requirements, response, responses, rules, running, scenarios, schema, secure, security, settings, specification, storage, structure, successful, summary, support, team, testing, tests, timeline, troubleshooting, ui/ux, unauthorized, user, validation, version, while, with, without

[View Document](./guides/MOBILE_SETTINGS_PASSCODE_IMPLEMENTATION_GUIDE.md)

## Monitoring API Permission Fix

- **File:** `fixes/MONITORING_API_PERMISSION_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** api, cause, fix, impact, issue, monitoring, permission, root

[View Document](./fixes/MONITORING_API_PERMISSION_FIX.md)

## Multi-Select Filter Implementation Summary

- **File:** `fixes/MULTI_SELECT_IMPLEMENTATION_SUMMARY.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/components/AdvancedFilter.tsx`
- **Keywords:** accessibility, additional, branches, browser, changed, changes, compatibility, completed, compliance, component, conclusion, core, created, date, display, documentation, enhancements, export, facing, features, files, filter, filtering, functions, future, handler, impact, implementation, key, known, limitations, logic, manual, migration, modified, multi, other, overview, performance, plan, questions, recommended, rollback, select, state, status, structure, summary, support, technical, testing, user, was, what

[View Document](./fixes/MULTI_SELECT_IMPLEMENTATION_SUMMARY.md)

## Multi-Tenancy Setup Guide

- **File:** `guides/MULTI_TENANCY_SETUP_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/`
- **Keywords:** "team, "user, (different), (enable, (same, (shared, ..., access, across, all, already, api, appwrite, architecture, assignment), automatic, backup, being, best, can't, collection, collections, configuration, configure, configured", considerations, console, conventions, create, creation, current, data, database, databases, databases), deploy, deployment, each, environment, error:, flow, for, from, guide, how, ids, important, instructions, isolated, keys, limits, linked, management, membership, migration, migrations, monitoring, multi, multiple, names, naming, not, notes, optimization, other, overview, per, performance, permissions, practices, project, projects, resources, roles, run, same, scaling, script, security, set, setup, shared, signup, single, site, sites), specific, split, step, strategy, summary, support, target, team, team", teams, tenancy, tenant, the, troubleshooting, used, user, users, variable, variables, vs., when, works, wrong

[View Document](./guides/MULTI_TENANCY_SETUP_GUIDE.md)

## Node-Appwrite 21.1.0 Update Test Results

- **File:** `testing/NODE_APPWRITE_UPDATE_TEST_RESULTS.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `package.json`
  - `src/lib/appwrite.ts`
  - `src/pages/api/`
  - `scripts/`
- **Keywords:** (if, 21.1.0, affected, applied, appwrite, areas, build, cause, checking, conclusion, deployment, details, documentation, finding, findings, fix, initial, installation, investigation, key, needed), node, phase, plan, readiness, related, result, results, rollback, root, solution, suite, summary, test, type, update, verification

[View Document](./testing/NODE_APPWRITE_UPDATE_TEST_RESULTS.md)

## Notes Export and Text Sanitization Enhancement

- **File:** `enhancements/NOTES_EXPORT_SANITIZATION.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/pages/api/attendees/export.ts`
- **Keywords:** `sanitizetext()`, added, after, and, applied, before, benefits, changes, csv, details, enhancement, enhancements, escaping, example, export, field, files, for, function, future, implemented, made, modified, new, notes, options, overview, performance, problem, process, recommendations, related, sanitization, solved, technical, testing, text, to:, usage, users

[View Document](./enhancements/NOTES_EXPORT_SANITIZATION.md)

## Notes Field Credential Status Enhancement

- **File:** `enhancements/NOTES_FIELD_CREDENTIAL_STATUS_ENHANCEMENT.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/components/AttendeeForm.tsx`
- **Keywords:** `lastsignificantupdate`, added, api, backward, benefits, changes, compatibility, credential, custom, dashboard, database, documentation, enhancement, enhancements, existing, field, files, for, future, how, installations, logic, migration, mixed, modified, name, new, notes, only, overview, path, photo, problem, recommendations, records, related, scenario, significant, solution, statement, status, test, testing, then, track, update, updated, updates, user, without, works

[View Document](./enhancements/NOTES_FIELD_CREDENTIAL_STATUS_ENHANCEMENT.md)

## Notes Search Functionality Tests Summary

- **File:** `testing/NOTES_SEARCH_TESTS_SUMMARY.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/`
- **Keywords:** "has, (16, (for, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, `applynotesfilter(attendee,, `applytextfilter(value,, all, and, basic, behavior, cases, checkbox, conclusion, contains, coverage, data, development), edge, empty, ends, enhancements, equals, file, filter)`, filters, functionality, functions, future, handling, helper, insights, integration, key, layout, location, logic, management, mode, not, notes, notes", notesfilter)`, operator, operators, other, output, overview, pagination, requirements, responsive, results, run, running, search, starts, state, summary, test, testing, tests, tests), text, the, verbose, watch, whitespace, with

[View Document](./testing/NOTES_SEARCH_TESTS_SUMMARY.md)

## Notes Search Visual Design and Accessibility Verification

- **File:** `testing/NOTES_SEARCH_VISUAL_ACCESSIBILITY_VERIFICATION.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/`
- **Keywords:** 7.1:, 7.2:, 7.3:, 7.4:, accessibility, alignment, and, announcements, aria, association, attributes, automated, browser, checkbox, checklist, chrome/edge, code, compatibility, conclusion, consistency, design, desktop, disabled, dropdown, enabling, field, fields, firefox, for, grid, icon, implementation, indication, input, interaction, keyboard, label, layout, manual, mobile, navigation, notes, operator, order, other, placeholder, positioning, reader, recommendations, responsive, review, safari, screen, search, spacing, state, states, styling, summary, support, tab, tablet, task, testing, text, tools, verification, visual, width, with

[View Document](./testing/NOTES_SEARCH_VISUAL_ACCESSIBILITY_VERIFICATION.md)

## OneSimpleAPI HTML Sanitization Tests Summary

- **File:** `testing/ONESIMPLEAPI_SANITIZATION_TESTS_SUMMARY.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/`
- **Keywords:** (12, 1.3, 1.4, 2.4, 2.5, all, categories, combined, commands, conclusion, coverage, dangerous, details, development, display, documentation, during, elements, experience, fields, file, files, for, function, guarantees, html, implementation, mode, onesimpleapi, output, overview, placeholder, preservation, preserved, process, related, removal, removed, reopen, requirement, requirements, run, safe, sanitization, sanitized, scenarios, security, submit, summary, test, testing, tests, tests), typing, user, variable, verbose, watch, with

[View Document](./testing/ONESIMPLEAPI_SANITIZATION_TESTS_SUMMARY.md)

## Operator Monitoring Descriptions Enhancement

- **File:** `enhancements/OPERATOR_MONITORING_DESCRIPTIONS_ENHANCEMENT.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/components/OperatorMonitoringDashboard.tsx`
- **Keywords:** (credential, administrators, after, before, benefits, cards, changes, comprehension, descriptions, details, documentation, enhanced, enhancement, enhancements, examples, experience, feature, files, flag, for, future, header, health, implementation, improvements, made, maintenance, metrics, modified, monitoring, notes, operator, operators):, overview, performance, problem, readability, related, scannability, solution, system, testing, training, user

[View Document](./enhancements/OPERATOR_MONITORING_DESCRIPTIONS_ENHANCEMENT.md)

## Operator Monitoring User Guide

- **File:** `guides/OPERATOR_MONITORING_USER_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/components/OperatorMonitoringDashboard.tsx`
  - `src/lib/operatorMonitoring.ts`
  - `src/lib/operators.ts`
- **Keywords:** (when, active, alert, alerts, all, are, array, auto, average, avg, best, bulk, calls, can't, card, cards, change, common, credential, critical, data, database, details, disable, documentation, emergency, enable, error, fallback, feature, features, flag, flags, glossary, guide, header, healthy, high, impact, indicators, issues, latency, load, logging, management, master, metrics, monitoring, new, not, operator, operators, operators?, overview, p95, p99, page, performance, permissions, photo, practices, present), problem:, rate, refresh, regular, related, required, retention, scenario, scenarios, section, sections, signs, slow, success, switch:, system, technical, testing, total, troubleshooting, updating, user, warning, what, won't

[View Document](./guides/OPERATOR_MONITORING_USER_GUIDE.md)

## Optimistic Lock retriesUsed Accuracy Fix

- **File:** `fixes/OPTIMISTIC_LOCK_RETRIES_USED_ACCURACY_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/lib/optimisticLock.ts`
- **Keywords:** `withoptimisticlock()`, accuracy, benefits, details, documentation, example, fix, function, how, implementation, lock, mechanism, optimistic, problem, recommendations, related, retriesused, scenario, scenarios, solution, testing, tracking, works

[View Document](./fixes/OPTIMISTIC_LOCK_RETRIES_USED_ACCURACY_FIX.md)

## Package Updates Analysis

- **File:** `misc/PACKAGE_UPDATES_ANALYSIS.md`
- **Type:** canonical
- **Category:** misc
- **Related Code:**
  - `package.json`
- **Keywords:** (11.18.2, (20.3.0, (24.10.9, (3.0.6, (3.10.0, (3.25.76, (3.4.19, (3.6.0, (8.0.0, (breaking, (highest, (medium, (not, (optional), (patch, (plan, (recommended), (today), 10.0.0), 12.29.2), 21.1.0), 25.0.10), 4.1.0), 4.1.18), 4.3.6), 4.5.3), 5.2.2), `@dnd, `@hookform/resolvers`, `@types/node`, `date, `framer, `node, `react, `tailwindcss`, `zod`, analysis, appwrite`, changes, check, checklist, code, coverage, dependencies, errors, fns`, for, future, high, immediate, kit/sortable`, later), lint, low, lower, major, manual, medium, minor, motion`, next, not, notes, now), overview, package, panels`, patch, phase, plan, previous, priority, recommended, reinstall, requires, resizable, resources, revert, review), risk), rollback, run, safe, sprint, strategy, testing, tests, this, tier, time, type, update, updates, verification, verify, version, week, zero

[View Document](./misc/PACKAGE_UPDATES_ANALYSIS.md)

## Package Updates Completion Summary

- **File:** `misc/PACKAGE_UPDATES_COMPLETION_SUMMARY.md`
- **Type:** worklog
- **Category:** misc
- **Related Code:**
  - `package.json`
- **Keywords:** (16.1.3, (16.3.1, (19.2.3, (@types/react, (bug, (happy, (new, (optional), (plan, (recharts, (requires, 16.1.6), 16.3.2), 19.2.10), 19.2.4), 19.2.8, 20.3.1, 20.4.0), 3.6.0, 3.7.0), all, applied, audit, build, changed, chart, commands, complete, completion, config, deferred, definitions, dependency, desired, dom, emulation, eslint, features), fixes), for, future, immediate, integrity, later), library, list, major, minor, next, next.js, package, patch, plan, react, remaining, results, rollback, safe, status, status:, steps, summary, test, testing, testing), the, this, type, update, updates, verification, week, what

[View Document](./misc/PACKAGE_UPDATES_COMPLETION_SUMMARY.md)

## Package Updates Quick Reference

- **File:** `guides/PACKAGE_UPDATES_QUICK_REFERENCE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `package.json`
- **Keywords:** (patch, (type, after, all, also, apply, breaks, check, code, coverage, definitions, errors, for, full, immediate, later, lint, low, manual, now, package, plan, quick, reference, reinstall, revert, risk), run, safe, see, something, testing, tests, the, this, tl;dr, type, update, updates, verification, verify, week, zero

[View Document](./guides/PACKAGE_UPDATES_QUICK_REFERENCE.md)

## Page Visibility Property Test Cumulative Gap Fix

- **File:** `fixes/PAGE_VISIBILITY_PROPERTY_TEST_CUMULATIVE_GAP_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** cause, changes, cumulative, fix, gap, issue, made, page, property, related, requirements, results, root, solution, test, verification, visibility

[View Document](./fixes/PAGE_VISIBILITY_PROPERTY_TEST_CUMULATIVE_GAP_FIX.md)

## Page Visibility Property Test Division by Zero Fix

- **File:** `fixes/PAGE_VISIBILITY_PROPERTY_TEST_DIVISION_BY_ZERO_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** cause, changes, division, fix, issue, made, page, property, related, requirements, results, root, solution, test, verification, visibility, zero

[View Document](./fixes/PAGE_VISIBILITY_PROPERTY_TEST_DIVISION_BY_ZERO_FIX.md)

## Password Reset Admin Guide

- **File:** `guides/PASSWORD_RESET_ADMIN_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/auth/`
- **Keywords:** (optional), accessing, admin, administrator, and, appwrite, audit, best, button, can, clickable, common, communication, configuration, considerations, customize, delivery, details, didn't, disabled/not, documentation, does, doesn't, email, email?, environment, error, errors, exceeded, failed, faq, features, for, found, from, gets, guide, how, include, insufficient, limit, limiting, limits, link, linked, log, logged, logging, logs, long, management, means, messages, multiple, not, overview, own, password, passwords, passwords?, per, permissions, placement, practices, rate, receive, receives, related, required, reset, resets, same, security, send, sends, sent, step, success, successfully, support, the, their, this, trail, troubleshooting, unverified, use, user, user?, users, users?, valid?, variables, viewing, visibility, what, when, with, work, works

[View Document](./guides/PASSWORD_RESET_ADMIN_GUIDE.md)

## Password Reset Feature - Implementation Summary

- **File:** `fixes/PASSWORD_RESET_FEATURE_SUMMARY.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/reset-password.tsx`
  - `src/pages/api/auth/`
- **Keywords:** (defaults, access, action, admin, api, appwrite, behavior, best, button, checklist, common, component, configuration, created, default, deployment, design, documentation, endpoint, enhancements, entry, environment, error, errors, example, experience, feature, features, files, flow, functionality, future, handling, how, implementation, improvements, integration, layout, limit, limiting, log, logged, logging, manual, messages, metrics, mocks, modified, not, notes, optional, overview, password, per, permission, permissions, points, post, potential, practices, pre, problem, rate, related, required, requirements, reset, responsive, role, security, shown), similar, solution, solved, status, styling, success, summary, test, testing, tests, unit, use, user, variables, verification, when, works

[View Document](./fixes/PASSWORD_RESET_FEATURE_SUMMARY.md)

## Performance Best Practices

- **File:** `guides/PERFORMANCE_BEST_PRACTICES.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/`
- **Keywords:** (fixed, 10., 2025), anti, automated, avoid, await, batch, benchmarks, best, caching, checklist, common, conclusion, critical, custom, dashboard, data, dataset, datasets, debounce, december, endpoint, example, examples, fetching, field, for, getting, help, index, inputs, json, key, large, limits, load, loading, loop, manual, measure, metrics, minimize, monitor, monitoring, n+1, pagination, parallel, parsing, pattern, patterns, performance, practices, problems, production, profile, query, real, render, renders, requests, resources, run, search, setting, size, specific, state, strategies, test, testing, time, track, transfer, unnecessary, updates, usage, with, world

[View Document](./guides/PERFORMANCE_BEST_PRACTICES.md)

## Phase 3 Automation Setup Complete

- **File:** `PHASE_3_AUTOMATION_SETUP_COMPLETE.md`
- **Type:** canonical
- **Category:** docs
- **Related Code:**
  - `.github/workflows/docs-maintenance.yml`
  - `scripts/check-docs-staleness.ts`
  - `scripts/validate-docs-frontmatter.ts`
  - `scripts/check-docs-links.ts`
  - `scripts/generate-docs-index.ts`
- **Keywords:** (129, (358, (65, (ongoing), (this, 129, `.github/workflows/docs, `scripts/check, `scripts/generate, `scripts/validate, action, actions, active, all, archived, automation, broken, check, checking, complete, completed, completion, conclusion, created, docs, documentation, files, files), for, frontmatter, frontmatter.ts`, generate, generated, generation, github, how, immediate, index, index.ts`, indexes, interpreting, issues, items, known, link, links, links.ts`, locally, long, maintenance.yml`, modified, modified/created, month), new, next, overview, phase, results, running, scripts, searchable, setup, short, stale, staleness, staleness.ts`, standardization, steps, structure, summary, term, test, the, total), updated, use, validate, validation, was, week), what, workflow

[View Document](./PHASE_3_AUTOMATION_SETUP_COMPLETE.md)

## Phase 3 Implementation Summary

- **File:** `PHASE_3_IMPLEMENTATION_SUMMARY.md`
- **Type:** worklog
- **Category:** docs
- **Related Code:**
  - `.github/workflows/docs-maintenance.yml`
  - `scripts/check-docs-staleness.ts`
  - `scripts/validate-docs-frontmatter.ts`
  - `scripts/check-docs-links.ts`
  - `scripts/generate-docs-index.ts`
- **Keywords:** (65, (8), (9), (ongoing), (this, accomplished, actions, active, archive, archived, assignment, automation, broken, check, checking, completed, completion, conclusion, created, created/modified, deployment, docs, documentation, executive, files, for, four, frontmatter, generate, generated, generation, github, how, immediate, implementation, index, indexes, issues, known, link, links, locally, long, metadata, migration, modified, month), new, next, owner, phase, project, recommendations, results, running, scripts, searchable, setup, short, stale, staleness, standardization, statistics, status, steps, summary, system, term, test, tested, the, total), use, validate, validation, was, what, workflow

[View Document](./PHASE_3_IMPLEMENTATION_SUMMARY.md)

## Phase 6 Automatic Sync Test Complete

- **File:** `PHASE_6_AUTOMATIC_SYNC_TEST_COMPLETE.md`
- **Type:** worklog
- **Category:** docs
- **Keywords:** automatic, automation, cleanup, complete, completed, conclusion, conditions, configuration, create, delete, deletion, documentation, execution, feature, features, file, findings, generated, key, main, means, next, overview, performance, phase, related, results, scope, sequence, statistics, status, steps, strengths, summary, sync, syncs, test, this, trigger, verification, verify, what, workflow

[View Document](./PHASE_6_AUTOMATIC_SYNC_TEST_COMPLETE.md)

## Phase 6 Complete Final Report

- **File:** `PHASE_6_COMPLETE_FINAL_REPORT.md`
- **Type:** canonical
- **Category:** docs
- **Keywords:** (feature, (main, (this, achievements, all, and, applied, architecture, automatic, automation, benefits, bidirectional, both, branch, branches, changes, commit, commits, complete, completed, comprehensive, conclusion, conditions, configuration, creation, critical, deletion, deletions, deliverables, detect, developers, directories, docs, documentation, don't, executive, feature), file, final, fix, for, from, generated, get, handling, how, immediate, implementation, important, including, key, latest, main), make, making, means, metrics, monitoring, month), next, notes, now, ongoing, performance, phase, phases, problem, projects, push, reliability, remove, report, resources, results, scope, seconds, short, solution, source, stage, status, steps, summary, support, sync, synchronization, teams, term, test, testing, the, this, trigger, use, view, wait, week), what, workflow, works

[View Document](./PHASE_6_COMPLETE_FINAL_REPORT.md)

## Photo Service Integration Guide

- **File:** `guides/PHOTO_SERVICE_INTEGRATION_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/attendees/`
- **Keywords:** .env.local, accessibility, accounts, alternative, and, another, api, architecture, attendeeform, audit, aws, azure, backend, basic, best, between, blob, but, button, cdn, changes, checklist, cloudfront, cloudinary, common, component, components, configuration, contents, cropping, data, database, dialog, display, displaying, download, environment, error, evaluate, example, example:, examples, existing, fails, fields, file, flow, for, format, from, frontend, getting, guide, handling, help, hierarchy, hook, imgix, implementation, initialization, integration, interaction, issue:, issues, key, lifecycle, loading, migrating, migration, minimum, new, not, opening, optimization, optional, options, overview, parameters, pattern, performance, phase, photo, photos, plan, points, practices, recommended, remove, replacement, replacing, required, requirements, retrieval, rollback, scenario, schema, script, security, service, setup, silently, size, step, storage, strategy, summary, table, testing, transformation, transformations, troubleshooting, update, upload, url, variables, verify, viable, widget, with, working

[View Document](./guides/PHOTO_SERVICE_INTEGRATION_GUIDE.md)

## Polling Fallback Stale State Fix

- **File:** `fixes/POLLING_FALLBACK_STALE_STATE_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/hooks/usePollingFallback.ts`
  - `src/__tests__/hooks/usePollingFallback.test.ts`
- **Keywords:** (line, (lines, 125, 147), 149, 155), 157, 177), 179, 186), 67), `ispollingref`, `pollnow`, `scheduleretry`, `startpolling`, `stoppolling`, added, cause, changes, documentation, fallback, files, fix, impact, made, modified, polling, problem, related, root, solution, stale, state, testing, updated

[View Document](./fixes/POLLING_FALLBACK_STALE_STATE_FIX.md)

## Polling Fallback State and Type Safety Fix

- **File:** `fixes/POLLING_FALLBACK_STATE_AND_TYPE_SAFETY_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/dashboard.tsx`
  - `src/hooks/usePollingFallback.ts`
  - `src/types/connectionHealth.ts`
- **Keywords:** activation, added, and, based, call, cause, changes, created, documentation, fallback, files, fix, for, function, impact, implemented, made, mapping, modified, polling, problem, related, root, safe, safety, solution, state, testing, timer, type, updated, usepollingfallback

[View Document](./fixes/POLLING_FALLBACK_STATE_AND_TYPE_SAFETY_FIX.md)

## Preventing Performance Regressions

- **File:** `guides/PREVENTING_PERFORMANCE_REGRESSIONS.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/`
- **Keywords:** "batch, "the, (december, (fast), (slow), .github/workflows/performance.yml, 2025), are, automated, before, budgets, changed, checklist, checks, clean, code, committing, common, complex", conclusion, create, dashboard, data, documentation, each, emergency, failing", fetch, for, from, git, happened, hooks, incident, incidents, item", learning, load, monitoring, need, original, performance, preventing, prevention, production, queries, regressions, related, requirements, resources, response, review, scenario, scenarios, strategies, test, testing, the, too, what

[View Document](./guides/PREVENTING_PERFORMANCE_REGRESSIONS.md)

## Printable Field Configuration Change Messaging

- **File:** `enhancements/PRINTABLE_FIELD_CONFIGURATION_MESSAGING.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/components/EventSettingsForm.tsx`
- **Keywords:** are, benefits, capture, cases, change, component:, conclusion, configuration, details, detection, display, documentation, edge, eventsettingsform.tsx, experience, field, files, flags, handled, implementation, informational, logic, management, manual, message, messaging, modified, original, overview, printable, recommendations, related, requirements, satisfied, save, scenarios, state, technical, testing, user, when

[View Document](./enhancements/PRINTABLE_FIELD_CONFIGURATION_MESSAGING.md)

## Printable Field Tracking Implementation

- **File:** `enhancements/PRINTABLE_FIELD_TRACKING_IMPLEMENTATION.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/pages/api/custom-fields/`
  - `src/components/EventSettingsForm.tsx`
- **Keywords:** (task, 4.1), 4.2), 4.3), after, backward, before, behavior, change, changes, checklist, compatibility, conclusion, configuration, considerations, custom, database, date, detection, error, existing, failure, fetch, field, fields, files, flag, handling, hassignificantchanges, implementation, logic, made, manual, memory, missing, next, overview, performance, printable, queries, references, related, requirements, satisfied, steps, testing, tests, this, tracking, updated, usage

[View Document](./enhancements/PRINTABLE_FIELD_TRACKING_IMPLEMENTATION.md)

## Printable Fields User Guide

- **File:** `guides/PRINTABLE_FIELDS_USER_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/components/EventSettingsForm.tsx`
- **Keywords:** access, actions, affect, affected, and, are, backward, badge, before, behavior, best, can't, cannot, cases, changed, changes, compatibility, conference, configuration, configure, conservative, contents, create, creating, credential, credentials, current, custom, day, default, descriptive, design, determine, determined, document, documentation, don't, edit, editing, event, example, examples, exhibitor, existing, field, field:, fields, fields?, filtering, first, guide, how, important, indicators, issue:, many, mark, marked, multi, names, new, non, not, notes, outdated, outdated:, overview, plan, practices, printable, records, regularly, related, review, settings, show, staff, status, status:, step, support, table, test, that, toggle, too, trade, train, triggers, troubleshooting, understanding, updating, use, user, visible, visual, what, when, when:, which, with, your

[View Document](./guides/PRINTABLE_FIELDS_USER_GUIDE.md)

## Quick Start: Testing Delete Logs

- **File:** `testing/TESTING_QUICK_START.md`
- **Type:** runbook
- **Category:** testing
- **Related Code:**
  - `vitest.config.ts`
  - `src/__tests__/`
- **Keywords:** cleanup, data, delete, deletion, inject, logs, performance, quick, start:, test, testing, verify, what

[View Document](./testing/TESTING_QUICK_START.md)

## Quick Test Guide

- **File:** `testing/QUICK_TEST_GUIDE.md`
- **Type:** runbook
- **Category:** testing
- **Related Code:**
  - `vitest.config.ts`
  - `src/__tests__/`
- **Keywords:** (`bulkoperations.unit.test.ts`), (`test, (for, (real, (should, 20.2.1+), [date], after, all, appwrite, appwrite), automated, before, bulk, check, commands, continuous, coverage, criteria, dependencies, deploy, deployment, development), each, environment, expected, fail, fails, getting, guide, help, integration, manual, minutes), mode, node, notes:, only, operations, overall:, pass, passes,, performance, quick, reference, regular, reinstall, results, run, schedule, smoke, start, success, success!, template, test, testing, tests, transactions, transactions.ts`), troubleshooting, unit, variables, verifies, version, watch, what, with

[View Document](./testing/QUICK_TEST_GUIDE.md)

## Real-time Functionality Tests Summary

- **File:** `testing/REALTIME_TESTS_SUMMARY.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/`
- **Keywords:** /integration/realtime, /userealtimesubscription.realtime.test.ts`, 5.1:, 5.2:, 5.3:, 5.4:, 5.5:, 5.6:, `src/, `src/hooks/, all, attendee, cleanup, conclusion, considerations, coverage, covered, created, dashboard, dashboard.test.tsx`, directly, error, event, failure, features, files, functionality, graceful, handling, helper, hook, implementation:, integration, key, log, management, method, mock, overview, patterns, performance, processing, real, requirement, requirements, results, run, running, scenarios, scenarios:, setup, simulation, subscribe, subscription, summary, test, tested, tests, the, time, unit, unmount, unsubscribe, updates, used, utilities, verification, vitest, with, world

[View Document](./testing/REALTIME_TESTS_SUMMARY.md)

## Realtime Subscription Fallback Logic Fix

- **File:** `fixes/REALTIME_SUBSCRIPTION_FALLBACK_LOGIC_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/hooks/useRealtimeSubscription.ts`
  - `src/types/connectionHealth.ts`
- **Keywords:** (line, cause, changes, connection, disconnection, documentation, fallback, files, fix, handler, impact, logic, made, modified, problem, realtime, related, root, solution, subscription, testing, ~139), ~167)

[View Document](./fixes/REALTIME_SUBSCRIPTION_FALLBACK_LOGIC_FIX.md)

## Report Correction JSON Parse Optimization

- **File:** `fixes/REPORT_CORRECTION_JSON_PARSE_OPTIMIZATION.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/components/AdvancedFiltersDialog/components/ReportCorrectionDialog.tsx`
- **Keywords:** correction, files, impact, json, modified, optimization, parse, problem, report, requirements, solution, summary

[View Document](./fixes/REPORT_CORRECTION_JSON_PARSE_OPTIMIZATION.md)

## Report Correction Replacement Dropdown Fix

- **File:** `fixes/REPORT_CORRECTION_REPLACEMENT_DROPDOWN_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/components/AdvancedFiltersDialog/components/ReportCorrectionDialog.tsx`
  - `src/types/reports.ts`
- **Keywords:** correction, dropdown, files, fix, impact, modified, problem, replacement, report, requirements, solution, summary

[View Document](./fixes/REPORT_CORRECTION_REPLACEMENT_DROPDOWN_FIX.md)

## Report Correction Silent Replacement Failure Fix

- **File:** `fixes/REPORT_CORRECTION_SILENT_REPLACEMENT_FAILURE_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/components/AdvancedFiltersDialog/components/ReportCorrectionDialog.tsx`
- **Keywords:** cause, changes, code, correction, details, failure, fix, future, impact, implementation, improvements, problem, related, replacement, report, requirements, root, silent, solution, testing

[View Document](./fixes/REPORT_CORRECTION_SILENT_REPLACEMENT_FAILURE_FIX.md)

## Report Correction Stale Field Removal Fix

- **File:** `fixes/REPORT_CORRECTION_STALE_FIELD_REMOVAL_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/components/AdvancedFiltersDialog/components/ReportCorrectionDialog.tsx`
- **Keywords:** cause, correction, details, field, fix, fixes, impact, implementation, problem, related, removal, report, requirements, root, solution, stale, testing

[View Document](./fixes/REPORT_CORRECTION_STALE_FIELD_REMOVAL_FIX.md)

## Resizable Component Ref Override Fix

- **File:** `fixes/RESIZABLE_COMPONENT_REF_OVERRIDE_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/components/ui/resizable.tsx`
- **Keywords:** cause, component, elementref, fix, groupref, impact, issues, override, prop, ref, related, resizable, resizablehandle, resizablepanelgroup, root, solution, swallowing

[View Document](./fixes/RESIZABLE_COMPONENT_REF_OVERRIDE_FIX.md)

## Role and Permission API Tests Summary

- **File:** `testing/ROLE_API_TESTS_SUMMARY.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/api/roles/`
- **Keywords:** `/api/roles/[id].ts`, `/api/roles/index.ts`, `/api/roles/initialize.ts`, add, and, api, apis, cases, conclusion, coverage, covered, created, edge, enhancements, error, files, for, future, handling, http, integration, logging, methods, more, other, overview, performance, permission, recommendations, requirements, role, scenarios, statistics, summary, test, tested, tests, validation, with

[View Document](./testing/ROLE_API_TESTS_SUMMARY.md)

## Role Permissions Validation Fix

- **File:** `fixes/ROLE_PERMISSIONS_VALIDATION_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/lib/validatePermissions.ts`
  - `src/pages/api/roles/[id].ts`
- **Keywords:** cause, documentation, files, fix, issue, modified, permissions, prevention, related, role, root, solution, validation, verification

[View Document](./fixes/ROLE_PERMISSIONS_VALIDATION_FIX.md)

## Role User Count Caching Implementation

- **File:** `misc/ROLE_USER_COUNT_CACHE.md`
- **Type:** canonical
- **Category:** misc
- **Related Code:**
  - `src/lib/cache.ts`
  - `src/pages/api/roles/`
- **Keywords:** (`src/lib/getroleusercount.ts`), (`src/lib/roleusercountcache.ts`), `src/pages/api/roles/[id].ts`, `src/pages/api/users/index.ts`, `src/pages/api/users/link.ts`, after, appwrite, background, before, benefits, cache, caching, configuration, count, creation, deletion, endpoints, enhancements, function, future, helper, implementation, invalidation, monitoring, notes, option, overview, performance, problem, realtime, redis, refresh, role, solution, strategy, testing, update, updated, user

[View Document](./misc/ROLE_USER_COUNT_CACHE.md)

## Roles Page Redesign Restoration

- **File:** `fixes/ROLES_PAGE_REDESIGN_RESTORATION.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/roles.tsx`
  - `src/components/RoleCard.tsx`
- **Keywords:** (not, added, available, benefits, cause, code, component, conclusion, diagnostics, existing, experience, features, files, fix, fixed, for, future, happened, import, integration, issue, learned, lessons, modified, modified), now, old, page, prevention, quality, recommendations, redesign, reference, related, rendering, replaced, restoration, results, role, rolecard, roles, root, spec, summary, test, testing, the, this, typescript, user, verification, was, what, why

[View Document](./fixes/ROLES_PAGE_REDESIGN_RESTORATION.md)

## Running Integration Tests

- **File:** `testing/RUNNING_INTEGRATION_TESTS.md`
- **Type:** runbook
- **Category:** testing
- **Related Code:**
  - `vitest.config.ts`
  - `src/__tests__/`
- **Keywords:** .env.local, actions, add, appwrite, authentication, available, best, ci/cd, configuration, connection, create, creating, data, database, development, directly, documentation, ensure, environment, environments, errors, example, expected, failures, fix, found, github, ids, instance, integration, logs, new, npm, npx, output, overview, point, points, practices, prerequisites, production, quick, related, run, running, script, specific, staging, start, summary, template, test, tests, timestamp, troubleshooting, update, use, users, variables

[View Document](./testing/RUNNING_INTEGRATION_TESTS.md)

## Saved Reports Custom Field Validation Fix

- **File:** `fixes/SAVED_REPORTS_CUSTOM_FIELD_VALIDATION_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** cause, changed, custom, field, files, fix, problem, reports, root, saved, solution, validation

[View Document](./fixes/SAVED_REPORTS_CUSTOM_FIELD_VALIDATION_FIX.md)

## Saved Reports Duplicate Name Handling Fix

- **File:** `fixes/SAVED_REPORTS_DUPLICATE_NAME_HANDLING_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** cause, changes, documentation, duplicate, experience, fix, handling, key, name, problem, related, reports, root, saved, solution, testing, user

[View Document](./fixes/SAVED_REPORTS_DUPLICATE_NAME_HANDLING_FIX.md)

## Saved Reports Empty Custom Fields Fix

- **File:** `fixes/SAVED_REPORTS_EMPTY_CUSTOM_FIELDS_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** cause, custom, documentation, empty, error, example, fields, fix, function, happened, impact, issue, logic, new, related, reports, root, save, saved, solution, testing, this, updated, utility, verification, why

[View Document](./fixes/SAVED_REPORTS_EMPTY_CUSTOM_FIELDS_FIX.md)

## Saved Reports Feature Guide

- **File:** `guides/SAVED_REPORTS_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Keywords:** access, accessing, adding, advanced, after, and, api, appearing, attributes, behavior, best, button, cannot, check, collection, control, correction, create, createreportresult, creating, custom, database, delete, deleted, denied, descriptions, detection, dialog, documentation, dropdown, endpoints, error, existing, export, feature, features, fields, filters, flow, get, guide, hook, hook:, indexes, integration, interface, key, list, load, loading, maintenance, name, naming, not, overview, parameter, parameters, performance, permission, permissions, practices, prerequisites, react, related, report, reports, return, roles, save, saved, schema, setup, stale, system, the, troubleshooting, type, update, usage, user, usereports, validation, values, verifying, when, with, workflow

[View Document](./guides/SAVED_REPORTS_GUIDE.md)

## Saved Reports Feature Implementation

- **File:** `enhancements/SAVED_REPORTS_FEATURE_IMPLEMENTATION.md`
- **Type:** canonical
- **Category:** enhancements
- **Keywords:** adding, and, api, architecture, best, collection, components, core, coverage, created/modified, creating, database, deployment, details, detection, developers, documentation, end, endpoints, enhancements, error, existing, experience, feature, files, for, functionality, future, handling, highlights, hook, implementation, integration, modified, new, overview, parameter, permission, permissions, practices, prerequisites, react, related, reports, roles, saved, schema, setup, stale, test, testing, the, user, users, workflow

[View Document](./enhancements/SAVED_REPORTS_FEATURE_IMPLEMENTATION.md)

## Saved Reports Malformed filterConfiguration Fix

- **File:** `fixes/SAVED_REPORTS_MALFORMED_FILTERCONFIGURATION_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/pages/api/reports/index.ts`
- **Keywords:** changes, code, details, filterconfiguration, fix, impact, implementation, malformed, problem, related, reports, requirements, saved, skip, solution, strategy?, testing, why

[View Document](./fixes/SAVED_REPORTS_MALFORMED_FILTERCONFIGURATION_FIX.md)

## Saved Reports Permission Fix

- **File:** `fixes/SAVED_REPORTS_PERMISSION_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Keywords:** (`scripts/add, cause, details, display, documentation, error, fix, handling, implementation, improvement, issue, migration, permission, permissions.ts`), related, reports, rollback, root, saved, script, solution, testing

[View Document](./fixes/SAVED_REPORTS_PERMISSION_FIX.md)

## Session Summary - Dependency Updates & Vitest Upgrade

- **File:** `misc/SESSION_SUMMARY_DEPENDENCY_UPDATES.md`
- **Type:** worklog
- **Category:** misc
- **Related Code:**
  - `package.json`
  - `vitest.config.ts`
  - `tsconfig.test.json`
- **Keywords:** (deferred, 12.29.2, 21.1.0, 4.0.18, accomplished, analysis, appwrite, checklist, completed, created, current, dependency, documentation, execution, file), files), fix, for, framer, future, guide, immediate, investigation, later), major, migration, miscellaneous, motion, next, node, overview, package, pending, production, quality, ready, requires, resources, results, session, sprint, status, steps, summary, test, testing, this, updates, upgrade, version, vitest, was, week, what

[View Document](./misc/SESSION_SUMMARY_DEPENDENCY_UPDATES.md)

## Setup Appwrite Helper Extraction

- **File:** `misc/SETUP_APPWRITE_HELPER_EXTRACTION.md`
- **Type:** canonical
- **Category:** misc
- **Related Code:**
  - `scripts/setup-appwrite.ts`
- **Keywords:** appwrite, benefits, call, extraction, files, helper, level, modified, module, problem, setup, sites, solution, summary, updated, verification

[View Document](./misc/SETUP_APPWRITE_HELPER_EXTRACTION.md)

## Steering Update Summary

- **File:** `STEERING_UPDATE_SUMMARY.md`
- **Type:** worklog
- **Category:** docs
- **Related Code:**
  - `.kiro/steering/documentation-organization.md`
- **Keywords:** added, agents, automated, automation, changes, creating, directory, documentation, documents, for, frontmatter, future, helps, how, impact, key, know:, maintenance, new, next, project, related, requirements, rules, section, sections, status, steering, steps, structure, summary, system, this, update, updated, was, what, will, will:

[View Document](./STEERING_UPDATE_SUMMARY.md)

## SweetAlert2 Best Practices Guide

- **File:** `guides/SWEETALERT_BEST_PRACTICES_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/lib/sweetAlertUtils.ts`
- **Keywords:** accessibility, additional, always, and, avoid, awaiting, before, best, blocking, checklist, close, color, common, concurrent, confirmation, considerations, content, contents, context, contrast, debounce, dialog, dialog:, dialogs, don't, duration, each, effective, error, everything, examples:, focus, for, for:, forgetting, guide, guidelines, guidelines:, info, keyboard, limit, loading, management, messages, mistakes, navigation, not, notification, notification:, notifications, optimize, overusing, overview, performance, practices, practices:, providing, quick, rapid, reader, recommendations, reference, resources, screen, showing, spam, state, state:, states, success, summary, support, sweetalert2, table, timing, tone, type, use, user, using, vague, voice, warning, when, with, writing

[View Document](./guides/SWEETALERT_BEST_PRACTICES_GUIDE.md)

## SweetAlert2 Customization Guide

- **File:** `guides/SWEETALERT_CUSTOMIZATION_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/lib/sweetAlertUtils.ts`
- **Keywords:** (`src/lib/sweetalert, (`src/styles/sweetalert, advanced, and, animation, animations, automatic, available, backdrop, bar, best, branded, changing, classes, color, colors, config.ts`), configuration, content, contents, css, custom, custom.css`), customization, customizing, dark, default, design, detection, disabling, duration, examples, file, global, guide, html, icons, main, minimal, mode, next, notification, notifications, override, overrides, overview, padding, per, performance, persistent, position, positions, practices, progress, recommendations, reference, responsive, rich, specific, steps, styles, sweetalert2, table, theme, variables, width

[View Document](./guides/SWEETALERT_CUSTOMIZATION_GUIDE.md)

## SweetAlert2 Progress Modal - Quick Reference

- **File:** `enhancements/SWEETALERT_PROGRESS_QUICK_REFERENCE.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/lib/sweetAlertUtils.ts`
- **Keywords:** (no, (with, `closeprogressmodal()`, `showprogressmodal(isdark:, `updateprogress(options:, api, appear, async/await, bar, basic, best, boolean)`, bulk, close, colors, common, detailed, doesn't, dynamic, error, examples, files, handling, import, item, loop, modal, names), pattern, patterns, practices, processing, progress, progressoptions)`, quick, reference, related, simple, single, styling, sweetalert2, text, theme, tips, troubleshooting, update, updates, usage, with, won't, wrong

[View Document](./enhancements/SWEETALERT_PROGRESS_QUICK_REFERENCE.md)

## SweetAlert2 Progress Modals - Implementation Summary

- **File:** `enhancements/SWEETALERT_PROGRESS_IMPLEMENTATION_SUMMARY.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/lib/sweetAlertUtils.ts`
- **Keywords:** (optional, bar, benefits, bulk, checklist, code, created, custom, dashboard, dependencies, documentation, enhancements), examples, features, files, functions, implementation, implemented, integration, loop, modal, modals, modified, new, next, operation, progress, request, single, solution, status, steps, summary, sweetalert2, testing, theme, updated, utility, visual, with

[View Document](./enhancements/SWEETALERT_PROGRESS_IMPLEMENTATION_SUMMARY.md)

## SweetAlert2 Usage Guide

- **File:** `guides/SWEETALERT_USAGE_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/components/ui/alert-dialog.tsx`
  - `src/lib/utils.ts`
- **Keywords:** accessibility, action, api, available, basic, best, bulk, button, buttons, code, complete, component, confirmation, contents, custom, dialogs, do's, don'ts, error, example, examples, guide, hook, importing, info, loading, methods, next, notifications, operations, options, overview, practices, route, setup, states, steps, success, support, sweetalert2, table, the, theme, toast, transition, usage, warning, with

[View Document](./guides/SWEETALERT_USAGE_GUIDE.md)

## Switchboard Canvas Configuration Guide

- **File:** `guides/SWITCHBOARD_CONFIGURATION_GUIDE.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/pages/api/attendees/[id]/generate-credential.ts`
- **Keywords:** "failed, "invalid, "no, (optional), (switchboard, api, api", available, basic, body, built, canvas, common, complete, configuration, configure, connect, create, credential, custom, enable, error:, event, example, example:, field, fields, generate, guide, help?, integration, internal, issue:, issues, layers, mappings, name, need, not, option, placeholders, replaced, request, returned", settings, specific), steps, switchboard, template, template", templates, test, testing, troubleshooting, url, use, with, your

[View Document](./guides/SWITCHBOARD_CONFIGURATION_GUIDE.md)

## TablesDB Atomic Bulk Operations - Correct Implementation

- **File:** `misc/TABLESDB_ATOMIC_OPERATIONS.md`
- **Type:** canonical
- **Category:** misc
- **Related Code:**
  - `src/lib/bulkOperations.ts`
- **Keywords:** "usedtransactions:, (atomic, (sequential), after, api, api:, atomic, available, before, behavior, benefits, bulk, check, common, comparison, correct, corrected, create, current, default, delete, documentation, fallback, false", files, how, implementation, issue:, issues, methods, multiple, operations, optional, partial, performance, references, response, rows, staging, strategy, summary, tablesdb, tablesdb), testing, the, transaction, understanding, update, updated, updates, upsert, verify, works

[View Document](./misc/TABLESDB_ATOMIC_OPERATIONS.md)

## TablesDB: updateRows vs upsertRows - Critical Difference

- **File:** `misc/TABLESDB_UPDATE_VS_UPSERT.md`
- **Type:** canonical
- **Category:** misc
- **Related Code:**
  - `src/lib/bulkOperations.ts`
- **Keywords:** 'rows', (after), (atomic, (before), (sequential, `createrows()`, `deleterows()`, `src/lib/bulkoperations.ts`, `updaterows()`, `upsertrows()`, after, api, array, before, bulk, check, common, correct, correct:, critical, data, data,, difference, different, discovered, each, edit, failing, fix, impact, implementation, incorrect, issue, logs, message, method, methods, mistake, mistakes, multiple, name, parameter, perform, performance, reference, response, rows, same, server, signature, success, summary, tablesdb:, testing, the, two, updated:, updaterows, updates), upsert), upsertrows, use, using, was, when, when:, why, with, wrong, you

[View Document](./misc/TABLESDB_UPDATE_VS_UPSERT.md)

## Time Until Event Display Enhancement

- **File:** `enhancements/TIME_UNTIL_EVENT_DISPLAY_ENHANCEMENT.md`
- **Type:** canonical
- **Category:** enhancements
- **Keywords:** (`src/pages/dashboard.tsx`,, 1021, 1095), 2971, 2989), away, behavior, calculation, changes, considerations, details, display, ended, enhancement, enhancements, event, examples, files, future, has, hours, less, lines, logic, more, overview, problem, related, solution, statement, technical, testing, than, time, until

[View Document](./enhancements/TIME_UNTIL_EVENT_DISPLAY_ENHANCEMENT.md)

## Transaction Monitoring Dashboard Empty-State Logic Fix

- **File:** `fixes/TRANSACTION_MONITORING_EMPTY_STATE_LOGIC_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/components/TransactionMonitoringDashboard.tsx`
- **Keywords:** all, applied, benefits, cards, dashboard, details, documentation, empty, example, fix, implementation, logic, monitoring, pattern, problem, recommendations, related, scenario, solution, state, testing, three, transaction, updated

[View Document](./fixes/TRANSACTION_MONITORING_EMPTY_STATE_LOGIC_FIX.md)

## Transactions & Bulk Operations - Comprehensive Test Plan

- **File:** `testing/TRANSACTIONS_TEST_PLAN.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/`
- **Keywords:** "database, "invalid, (atomic, (failure, (optional), (real, (single, /bulk, /bulkoperations.test.ts`, /reorder.integration.test.ts`, 10:, [date], `scripts/test, `src/lib/, `src/pages/api/attendees/, `src/pages/api/custom, after, all, appwrite), are, attendees, audit, automated, bulk, categories, cleanup, clear, comprehensive, conflict, create, create), created, criteria, custom, data, delete, delete), document, edit, edit.integration.test.ts`, error, errors, field, fields, fields/, file:, found", handling, import, integration, issue:, large, log, logs, manual, minutes), next, not, occurring, operation), operations, overall, overview, partial, performance, plan, procedures, quick, reorder, resolution, result, results, rollback, scenario), script:, slow, smoke, steps, structure", success, template, test, testing, tests, transactions, transactions.ts`, troubleshooting, unit, update), updates, validation, verification

[View Document](./testing/TRANSACTIONS_TEST_PLAN.md)

## Universal Placeholder Support

- **File:** `enhancements/UNIVERSAL_PLACEHOLDER_SUPPORT.md`
- **Type:** canonical
- **Category:** enhancements
- **Related Code:**
  - `src/components/CustomFieldInput.tsx`
- **Keywords:** (all, all, based, benefits, case, cases, changes, common, component, conclusion, conditional, corner, created, creator, custom, definitions, dropdown, dynamic, elements, elements), enhanced, enhancements, example, existing, experience, field, fields, fixed, font, for, future, image, improvements, input, issue, json, made, migration, new, notes, now, numeric, opacity, overview, placeholder, placeholders, properties, radius, recommendations, rectangle, scrolling, sizes, stroke, support, system, technical, templates, testing, text, that, type, universal, updated, use, user, validation, variable, visual, width

[View Document](./enhancements/UNIVERSAL_PLACEHOLDER_SUPPORT.md)

## User Management API Integration Tests Summary

- **File:** `testing/USER_MANAGEMENT_API_TESTS_SUMMARY.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/api/users/`
- **Keywords:** /api/users, api, appwrite, authentication, count, coverage, data, delete, enforcement, error, execution, features, file, get, handling, integration, key, location, logging, management, methods, mock, notes, overview, permission, post, put, requirements, satisfied, scenarios, summary, test, test), tested, tests, tests), total, unsupported, updates, user, validation

[View Document](./testing/USER_MANAGEMENT_API_TESTS_SUMMARY.md)

## User Management Enhancement for Appwrite

- **File:** `misc/USER_MANAGEMENT_ENHANCEMENT.md`
- **Type:** canonical
- **Category:** misc
- **Related Code:**
  - `src/pages/api/users/`
  - `src/components/UserForm.tsx`
- **Keywords:** (task, /api/users/[id], /api/users/available, /api/users/link, 12.5.1, 12.5.2), 12.5.3), 12.5.4), api, appwrite, architecture, backend, benefits, changes, considerations, current, delete, deletion, endpoints, enhanced, enhancement, enhancements, for, frontend, future, get, implementation, management, migration, new, notes, page, phase, plan, post, problem, proposed, security, solution, statement, testing, updated, user

[View Document](./misc/USER_MANAGEMENT_ENHANCEMENT.md)

## UserForm Testing Summary

- **File:** `testing/USERFORM_TESTING_SUMMARY.md`
- **Type:** worklog
- **Category:** testing
- **Related Code:**
  - `src/__tests__/components/UserForm/`
- **Keywords:** (100%, (15, (optional), (partial, all, alternatives, areas, benefits, business, complete, component, conclusion, confidence, coverage, created, current, documentation, encountered:, enhancements, environment, execution, files, files:, future, hook, hooks, immediate, individual, issues, logic, maintainability, management, metrics, mock, mocking, needs, next, overview, passing), password, patterns, quality, recommendation:, refactoring, reset, running, setup), state, statistics, steps, strategy, summary, test, testing, tests, tests), useapierror, used, usepasswordreset, userform, useuserformstate, useuserformvalidation, validation

[View Document](./testing/USERFORM_TESTING_SUMMARY.md)

## useUserFormState Test Expectations Fix

- **File:** `fixes/USEFORMSTATE_TEST_EXPECTATIONS_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/components/UserForm/hooks/__tests__/useUserFormState.test.ts`
  - `src/components/UserForm/hooks/useUserFormState.ts`
  - `src/components/UserForm/types.ts`
- **Keywords:** after, before, cause, changes, expectations, files, fix, impact, issue, issues, learned, lessons, made, modified, related, results, root, solution, summary, test, useuserformstate, verification

[View Document](./fixes/USEFORMSTATE_TEST_EXPECTATIONS_FIX.md)

## Vitest 4 Constructor Mocking Fix

- **File:** `fixes/VITEST_4_CONSTRUCTOR_MOCKING_FIX.md`
- **Type:** canonical
- **Category:** fixes
- **Related Code:**
  - `src/lib/__tests__/tabCoordinator.test.ts`
  - `src/test/setup.ts`
- **Keywords:** (check, (recommended, `class`, `function`, affected, assignment, cases), cause, changes, class, complex, constructor, direct, files, fix, for, implementation, keyword, mocking, notes, pattern, patterns), primary, problem, related, root, secondary, similar, simple, solution, steps, syntax, using, verification, vitest

[View Document](./fixes/VITEST_4_CONSTRUCTOR_MOCKING_FIX.md)

## Vitest 4.0.18 Upgrade Analysis

- **File:** `migration/VITEST_4_0_18_UPGRADE_ANALYSIS.md`
- **Type:** runbook
- **Category:** migration
- **Related Code:**
  - `vitest.config.ts`
  - `tsconfig.test.json`
  - `package.json`
  - `src/test/setup.ts`
- **Keywords:** (106, (critical, **constructor, **coverage, **module, **reporter, **workspace, 384, 4.0, 4.0.18, action, affects, analysis, breaking, changes, changes**, checklist, configuration, configuration**, current, executive, failures, files, files,, high, improvements**, low, medium, migration, mocking, notes, plan, priority, recommended, requiring, resources, summary, test, tests), tests)**, upgrade, vitest, your

[View Document](./migration/VITEST_4_0_18_UPGRADE_ANALYSIS.md)

## Vitest 4.0.18 Upgrade Summary

- **File:** `migration/VITEST_4_UPGRADE_SUMMARY.md`
- **Type:** worklog
- **Category:** migration
- **Related Code:**
  - `package.json`
  - `vitest.config.ts`
  - `tsconfig.test.json`
- **Keywords:** (high, (immediate), (low, (medium, 4.0.18, address, affecting, all, arrow, breaking, change, changes, checklist, compatibility, configuration, constructor, coverage, current, done, enhance, failures, files, fix, fixes, from, function, issue, keyword, line, mocking, mocks, need, next, notes, pass, phase, plan, primary, priority), project, remaining, reporter, resources, rollback, src/test/setup.ts, status, status:, steps, summary, tabcoordinator, test, tests, the, timeline, tsconfig.test.json, updated,, upgrade, verification, verify, version, vitest, vitest.config.ts, was, what, your

[View Document](./migration/VITEST_4_UPGRADE_SUMMARY.md)

## Z-Index Layering System

- **File:** `guides/Z_INDEX_LAYERING_SYSTEM.md`
- **Type:** canonical
- **Category:** guides
- **Related Code:**
  - `src/styles/globals.css`
- **Keywords:** (defined, `src/styles/globals.css`), `src/styles/sweetalert, adding, appearing, benefits, best, cloudinary, component, considerations, core, css, custom.css`), dialog, extended, files, future, hierarchy, implementation, index, issues, layering, layers, migration, new, not, notes, order, overview, practices, previous, related, scale, shadcn, specific, stacking, sweetalert2, system, troubleshooting, usage, widget

[View Document](./guides/Z_INDEX_LAYERING_SYSTEM.md)


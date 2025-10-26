# Testing Documentation - Index

## Quick Links

- 🚀 **[Quick Test Guide](QUICK_TEST_GUIDE.md)** - Start here! 5-minute quick tests
- 📋 **[Comprehensive Test Plan](TRANSACTIONS_TEST_PLAN.md)** - Detailed manual testing procedures
- 📊 **[Testing Summary](TESTING_SUMMARY.md)** - Overview of all tests and files

## Test Files

### Automated Tests

| File | Type | Run Command | Duration |
|------|------|-------------|----------|
| `scripts/test-all-transactions.ts` | Integration | `npx tsx scripts/test-all-transactions.ts` | ~30s |
| `src/lib/__tests__/bulkOperations.unit.test.ts` | Unit | `npx vitest --run src/lib/__tests__/bulkOperations.unit.test.ts` | ~5s |

### Manual Tests

| Test | Description | Time | Document |
|------|-------------|------|----------|
| Smoke Test | Quick verification | 5 min | [Quick Guide](QUICK_TEST_GUIDE.md) |
| Full Suite | All 10 test cases | 30 min | [Test Plan](TRANSACTIONS_TEST_PLAN.md) |

### Test Data

| File | Purpose |
|------|---------|
| `test-import-data.csv` | Sample CSV with 20 attendees for import testing |

## Quick Start

### 1. Run All Automated Tests (30 seconds)

```bash
# Integration test (real Appwrite)
npx tsx scripts/test-all-transactions.ts

# Unit tests (mocked)
npx vitest --run src/lib/__tests__/bulkOperations.unit.test.ts
```

### 2. Quick Manual Smoke Test (5 minutes)

1. Bulk edit 5 attendees
2. Check server logs for "Atomic bulk update completed successfully"
3. Verify all 5 attendees updated

### 3. Check Results

**Expected**:
- ✅ All automated tests pass
- ✅ Server logs show atomic operations
- ✅ Manual test succeeds

## What Gets Tested

### Operations
- ✅ Bulk Edit Attendees (atomic update)
- ✅ Bulk Delete Attendees (atomic delete)
- ✅ Bulk Import Attendees (atomic create)
- ✅ Custom Fields Reorder (atomic update)
- ✅ Custom Field Create (single operation)

### Scenarios
- ✅ Atomicity (all-or-nothing)
- ✅ Performance (large operations)
- ✅ Error Handling (validation, conflicts)
- ✅ Fallback (sequential when atomic fails)
- ✅ Audit Logging (proper log creation)
- ✅ Concurrent Operations (conflict resolution)
- ✅ Data Integrity (no partial updates)

## Test Coverage

| Component | Unit Test | Integration Test | Manual Test |
|-----------|-----------|------------------|-------------|
| bulkOperations.ts | ✅ | ✅ | ✅ |
| bulk-edit.ts | ❌ | ✅ | ✅ |
| bulk-delete.ts | ❌ | ✅ | ✅ |
| import.ts | ❌ | ✅ | ✅ |
| custom-fields/reorder.ts | ❌ | ✅ | ✅ |
| custom-fields/index.ts | ❌ | ❌ | ✅ |

## Success Criteria

All tests pass when:
- ✅ Integration test: 8/8 tests pass
- ✅ Unit tests: All tests pass
- ✅ Manual smoke test: Works atomically
- ✅ Server logs: Show atomic operations
- ✅ Performance: Within benchmarks

## Documentation Structure

```
docs/testing/
├── README.md                      # This file - index of all tests
├── QUICK_TEST_GUIDE.md           # Quick reference (5 min)
├── TRANSACTIONS_TEST_PLAN.md     # Comprehensive manual tests (30 min)
├── TESTING_SUMMARY.md            # Overview and reference
└── test-import-data.csv          # Test data

scripts/
└── test-all-transactions.ts      # Integration test script

src/lib/__tests__/
└── bulkOperations.unit.test.ts   # Unit tests
```

## Related Documentation

### Implementation
- `docs/fixes/ALL_TRANSACTIONS_FIXED_SUMMARY.md` - What was fixed
- `docs/fixes/TABLESDB_BULK_OPERATIONS_WORKING.md` - How bulk operations work
- `docs/fixes/TRANSACTIONS_API_COMPREHENSIVE_AUDIT.md` - Audit findings

### Guides
- `docs/guides/TRANSACTIONS_CODE_EXAMPLES.md` - Code examples
- `docs/guides/TRANSACTIONS_DEVELOPER_GUIDE.md` - Developer guide

## Before Deployment Checklist

- [ ] Run integration test: `npx tsx scripts/test-all-transactions.ts`
- [ ] Run unit tests: `npx vitest --run src/lib/__tests__/bulkOperations.unit.test.ts`
- [ ] Perform manual smoke test (5 min)
- [ ] Check server logs for atomic operations
- [ ] Verify audit logs are created
- [ ] All tests pass ✅

## After Deployment Checklist

- [ ] Run integration test against production
- [ ] Perform manual smoke test in production
- [ ] Check production logs for atomic operations
- [ ] Verify audit logs in production
- [ ] Monitor for errors in first 24 hours

## Troubleshooting

See [Quick Test Guide](QUICK_TEST_GUIDE.md#-troubleshooting) for common issues and solutions.

## Getting Help

If tests fail:
1. Check server logs for error messages
2. Review [Troubleshooting section](QUICK_TEST_GUIDE.md#-troubleshooting)
3. Check [Testing Summary](TESTING_SUMMARY.md#troubleshooting)
4. Report issue with test output and logs

## Maintenance

### When to Run Tests
- **Before deployment**: Integration + smoke test (required)
- **After code changes**: Unit + integration tests
- **Weekly**: Full manual test suite
- **Monthly**: Performance benchmarking

### Updating Tests
When adding new bulk operations:
1. Add unit tests
2. Add integration test
3. Add manual test procedure
4. Update documentation

## Quick Commands Reference

```bash
# Run all automated tests
npx tsx scripts/test-all-transactions.ts && \
npx vitest --run src/lib/__tests__/bulkOperations.unit.test.ts

# Run tests in watch mode (development)
npx vitest src/lib/__tests__/bulkOperations.unit.test.ts

# Run with coverage
npx vitest --run --coverage src/lib/__tests__/bulkOperations.unit.test.ts

# Check TablesDB availability
npx tsx scripts/test-tablesdb.ts
```

## Performance Benchmarks

| Operation | Items | Expected Time |
|-----------|-------|---------------|
| Bulk Edit | 10 | 2-3 seconds |
| Bulk Edit | 25 | 4-5 seconds |
| Bulk Edit | 50 | 7-8 seconds |
| Bulk Edit | 100 | 12-15 seconds |

See [Testing Summary](TESTING_SUMMARY.md#performance-benchmarks) for complete benchmarks.

---

**Ready to test?** Start with the [Quick Test Guide](QUICK_TEST_GUIDE.md)!

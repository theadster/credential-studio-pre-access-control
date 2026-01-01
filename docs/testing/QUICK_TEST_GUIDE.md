---
title: "Quick Test Guide"
type: runbook
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["vitest.config.ts", "src/__tests__/"]
---

# Quick Test Guide - Transactions & Bulk Operations

## 🚀 Quick Start (5 Minutes)

### 1. Run Automated Integration Test
```bash
npx tsx scripts/test-all-transactions.ts
```

**What it does**: Tests all bulk operations against your real Appwrite instance
**Expected output**: All tests pass with ✅
**Time**: ~30 seconds

### 2. Run Unit Tests
```bash
npx vitest --run src/lib/__tests__/bulkOperations.unit.test.ts
```

**What it does**: Tests bulk operations library with mocks
**Expected output**: All tests pass
**Time**: ~5 seconds

### 3. Quick Manual Smoke Test

**Test bulk edit** (2 minutes):
1. Go to Attendees page
2. Select 5 attendees
3. Click "Bulk Edit"
4. Change a field value
5. Click "Apply"
6. ✅ Verify all 5 updated

**Check server logs**:
```
[bulkEditWithFallback] Atomic bulk update completed successfully
usedTransactions: true
```

---

## 📊 Test Commands Reference

### Automated Tests

```bash
# Run all integration tests (real Appwrite)
npx tsx scripts/test-all-transactions.ts

# Run unit tests only
npx vitest --run src/lib/__tests__/bulkOperations.unit.test.ts

# Run all tests in watch mode (for development)
npx vitest src/lib/__tests__/bulkOperations.unit.test.ts

# Run with coverage
npx vitest --run --coverage src/lib/__tests__/bulkOperations.unit.test.ts
```

### Manual Tests

See `docs/testing/TRANSACTIONS_TEST_PLAN.md` for detailed manual test procedures.

---

## ✅ Success Criteria

All tests should show:

1. **Atomicity**: ✅ All-or-nothing behavior
2. **Performance**: ✅ Reasonable completion times
3. **Audit Logs**: ✅ Proper logging
4. **Error Handling**: ✅ Clear error messages
5. **Server Logs**: ✅ Shows "Atomic bulk update completed successfully"

---

## 🐛 Troubleshooting

### Integration Test Fails

**Error**: "Database not found"
```bash
# Check environment variables
cat .env.local | grep APPWRITE
```

**Error**: "TablesDB methods not available"
```bash
# Check node-appwrite version (should be 20.2.1+)
npm list node-appwrite
```

### Unit Tests Fail

**Error**: "Cannot find module"
```bash
# Reinstall dependencies
npm install
```

### Manual Tests Fail

**Issue**: Bulk operations not atomic
- Check server logs for "Falling back to sequential updates"
- This indicates TablesDB is not being used
- Verify admin client is being used

---

## 📈 Expected Performance

| Operation | Items | Expected Time |
|-----------|-------|---------------|
| Bulk Edit | 10 | ~2-3 seconds |
| Bulk Edit | 25 | ~4-5 seconds |
| Bulk Edit | 50 | ~7-8 seconds |
| Bulk Edit | 100 | ~12-15 seconds |
| Bulk Delete | 10 | ~1-2 seconds |
| Bulk Import | 20 | ~3-4 seconds |
| Reorder Fields | 5 | ~1-2 seconds |

**Note**: Times include fetch-merge-upsert overhead

---

## 🎯 What Each Test Verifies

### Integration Test (`test-all-transactions.ts`)
- ✅ TablesDB methods exist
- ✅ Bulk create works atomically
- ✅ Bulk update works atomically
- ✅ Bulk delete works atomically
- ✅ Custom fields reorder works atomically
- ✅ Error handling works correctly
- ✅ Performance is acceptable
- ✅ Audit logs are created

### Unit Test (`bulkOperations.unit.test.ts`)
- ✅ Fetch-merge-upsert pattern works
- ✅ Fallback to sequential operations works
- ✅ Audit log failures don't break operations
- ✅ Error handling is correct
- ✅ All parameters passed correctly

### Manual Tests
- ✅ User experience is smooth
- ✅ UI updates correctly
- ✅ Error messages are clear
- ✅ Data persists after refresh
- ✅ Concurrent operations handled

---

## 📝 Test Results Template

```markdown
## Test Run - [Date]

### Automated Tests
- Integration Test: ✅ PASS / ❌ FAIL
- Unit Tests: ✅ PASS / ❌ FAIL

### Manual Smoke Test
- Bulk Edit (5 attendees): ✅ PASS / ❌ FAIL
- Server logs show atomic: ✅ YES / ❌ NO

### Notes:
[Any issues or observations]

### Overall: ✅ PASS / ❌ FAIL
```

---

## 🔄 Continuous Testing

### Run Before Deployment
```bash
# Quick check
npx tsx scripts/test-all-transactions.ts

# If passes, deploy
npm run build
```

### Run After Deployment
1. Run integration test against production
2. Perform manual smoke test
3. Check production logs for atomic operations

### Schedule Regular Tests
- **Daily**: Automated integration tests
- **Weekly**: Full manual test suite
- **Monthly**: Performance benchmarking

---

## 📞 Getting Help

If tests fail:

1. **Check server logs** - Look for error messages
2. **Check environment** - Verify .env.local is correct
3. **Check Appwrite version** - Ensure using latest SDK
4. **Check documentation** - See TRANSACTIONS_TEST_PLAN.md
5. **Report issue** - Include test output and server logs

---

## 🎉 Success!

If all tests pass:
- ✅ All bulk operations are atomic
- ✅ Error handling is working
- ✅ Performance is acceptable
- ✅ Ready for production use

**Next steps**:
- Deploy to production
- Monitor logs for atomic operations
- Schedule regular regression tests

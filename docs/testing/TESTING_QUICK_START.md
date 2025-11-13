# Quick Start: Testing Delete Logs

## 1. Inject Test Data
```bash
npm run test:inject-logs
```
Creates 1000 test log entries in ~2 minutes.

## 2. Test Deletion
1. Open dashboard → **Activity Logs** tab
2. Click **Delete Logs** button
3. Select filters (date, action, or user)
4. Click **Delete Logs**

## 3. What to Verify
✅ Progress shows "Processing..." (not inflated numbers)  
✅ No 429 errors in console  
✅ Page doesn't refresh during deletion  
✅ Shows actual count when complete  
✅ Page refreshes 3 seconds after completion  

## Performance
- ~10 logs deleted per second
- 1000 logs = ~100 seconds (~1.7 minutes)

## Cleanup
Delete all test logs:
1. Activity Logs → Delete Logs
2. Select "before" tomorrow's date
3. Click Delete Logs

---

📖 **Full Documentation**: [docs/testing/LOG_DELETION_TESTING_GUIDE.md](docs/testing/LOG_DELETION_TESTING_GUIDE.md)

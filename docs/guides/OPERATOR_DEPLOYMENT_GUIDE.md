# Database Operators Deployment Guide

This guide provides step-by-step instructions for deploying database operators to production with feature flags, monitoring, and gradual rollout.

## Overview

Database operators are deployed incrementally using feature flags to minimize risk and allow quick rollback if issues are detected. The deployment follows a phased approach:

1. Deploy operator utilities with all features disabled
2. Enable credential tracking operators
3. Monitor for 24 hours
4. Enable photo tracking operators
5. Enable bulk operation operators
6. Enable logging operators
7. Enable array operators for custom fields

## Prerequisites

- All operator code deployed to production
- Monitoring infrastructure in place
- Access to environment variables or feature flag management
- Admin access to the application

## Phase 1: Initial Deployment (All Features Disabled)

### Step 1: Deploy Code

Deploy all operator code to production with feature flags disabled by default.

```bash
# Ensure all feature flags are disabled in .env
ENABLE_OPERATORS=false
ENABLE_CREDENTIAL_OPERATORS=false
ENABLE_PHOTO_OPERATORS=false
ENABLE_BULK_OPERATORS=false
ENABLE_LOGGING_OPERATORS=false
ENABLE_ARRAY_OPERATORS=false
```

### Step 2: Verify Deployment

1. Check that the application starts successfully
2. Verify no operator code is executing (all features disabled)
3. Test that traditional update methods still work

### Step 3: Test Monitoring Endpoints

```bash
# Test metrics endpoint
curl -X GET https://your-app.com/api/operators/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test feature flags endpoint
curl -X GET https://your-app.com/api/operators/feature-flags \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Phase 2: Enable Credential Tracking (First Feature)

### Step 1: Enable Feature Flag

Update environment variables or use the API:

```bash
# Option 1: Environment variables (requires restart)
ENABLE_OPERATORS=true
ENABLE_CREDENTIAL_OPERATORS=true

# Option 2: Runtime API (no restart required)
curl -X PUT https://your-app.com/api/operators/feature-flags \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enableOperators": true,
    "enableCredentialOperators": true
  }'
```

### Step 2: Monitor for 24 Hours

Monitor the following metrics:

1. **Error Rate**: Should be < 5%
2. **Fallback Rate**: Should be < 10%
3. **P95 Latency**: Should be < 500ms
4. **P99 Latency**: Should be < 1000ms

Check metrics regularly:

```bash
# Get current metrics
curl -X GET https://your-app.com/api/operators/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 3: Verify Functionality

1. Generate credentials for test attendees
2. Verify `credentialCount` increments correctly
3. Check that `lastCredentialGenerated` timestamp is set
4. Verify no errors in logs

### Step 4: Decision Point

After 24 hours:

- ✅ **If metrics are good**: Proceed to Phase 3
- ❌ **If issues detected**: Rollback (see Rollback Procedure)

## Phase 3: Enable Photo Tracking

### Step 1: Enable Feature Flag

```bash
curl -X PUT https://your-app.com/api/operators/feature-flags \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enablePhotoOperators": true
  }'
```

### Step 2: Monitor for 24 Hours

Same monitoring as Phase 2.

### Step 3: Verify Functionality

1. Upload photos for test attendees
2. Verify `photoUploadCount` increments
3. Delete photos and verify count decrements
4. Check that counts don't go below 0

### Step 4: Decision Point

After 24 hours:

- ✅ **If metrics are good**: Proceed to Phase 4
- ❌ **If issues detected**: Rollback photo operators only

## Phase 4: Enable Bulk Operations

### Step 1: Enable Feature Flag

```bash
curl -X PUT https://your-app.com/api/operators/feature-flags \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enableBulkOperators": true
  }'
```

### Step 2: Monitor for 24 Hours

Pay special attention to:

- Bulk edit performance
- Memory usage during bulk operations
- Error rates on large batches

### Step 3: Verify Functionality

1. Perform bulk edits on test data
2. Verify all records updated correctly
3. Check performance improvements vs traditional method
4. Test with various batch sizes (10, 100, 1000 records)

### Step 4: Decision Point

After 24 hours:

- ✅ **If metrics are good**: Proceed to Phase 5
- ❌ **If issues detected**: Rollback bulk operators only

## Phase 5: Enable Logging Operators

### Step 1: Enable Feature Flag

```bash
curl -X PUT https://your-app.com/api/operators/feature-flags \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enableLoggingOperators": true
  }'
```

### Step 2: Monitor for 24 Hours

Verify:

- Log timestamps are accurate (server time)
- Log counters increment correctly
- No performance degradation in logging

### Step 3: Verify Functionality

1. Perform various logged actions
2. Verify timestamps use server time
3. Check log aggregation queries work correctly

## Phase 6: Enable Array Operators

### Step 1: Enable Feature Flag

```bash
curl -X PUT https://your-app.com/api/operators/feature-flags \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enableArrayOperators": true
  }'
```

### Step 2: Monitor for 24 Hours

Focus on:

- Multi-value custom field operations
- Array manipulation accuracy
- No data loss in concurrent updates

### Step 3: Verify Functionality

1. Add/remove values from multi-value custom fields
2. Test concurrent updates to same field
3. Verify no duplicates with arrayUnique
4. Test bulk operations on array fields

## Monitoring Dashboard

### Key Metrics to Track

1. **Total Calls**: Number of operator operations
2. **Success Rate**: Percentage of successful operations
3. **Error Rate**: Percentage of failed operations
4. **Fallback Rate**: Percentage of operations that fell back to traditional updates
5. **Average Latency**: Mean operation duration
6. **P95 Latency**: 95th percentile latency
7. **P99 Latency**: 99th percentile latency

### Accessing Metrics

```bash
# Get summary metrics
curl -X GET https://your-app.com/api/operators/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get metrics by operator type
curl -X GET "https://your-app.com/api/operators/metrics?type=increment" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get full export for monitoring systems
curl -X GET "https://your-app.com/api/operators/metrics?format=export" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Alert Thresholds

The system automatically alerts when:

- Error rate > 5%
- Fallback rate > 10%
- P95 latency > 500ms
- P99 latency > 1000ms

Check recent alerts:

```bash
curl -X GET https://your-app.com/api/operators/metrics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.alerts'
```

## Rollback Procedure

### Quick Rollback (Disable All Operators)

```bash
# Option 1: Environment variable (requires restart)
ENABLE_OPERATORS=false

# Option 2: Runtime API (immediate)
curl -X PUT https://your-app.com/api/operators/feature-flags \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enableOperators": false
  }'
```

### Selective Rollback (Disable Specific Feature)

```bash
# Disable only credential operators
curl -X PUT https://your-app.com/api/operators/feature-flags \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enableCredentialOperators": false
  }'
```

### Reset to Defaults

```bash
curl -X POST https://your-app.com/api/operators/feature-flags \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reset"
  }'
```

## Troubleshooting

### High Error Rate

1. Check recent logs for error patterns
2. Verify database connectivity
3. Check for permission issues
4. Review operator validation errors

```bash
# Get recent logs with errors
curl -X GET https://your-app.com/api/operators/metrics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.recentLogs[] | select(.success == false)'
```

### High Fallback Rate

1. Check for operator compatibility issues
2. Verify field types match operator types
3. Review validation errors
4. Check for network issues

### High Latency

1. Check database performance
2. Review batch sizes for bulk operations
3. Check for network latency
4. Monitor database connection pool

### Data Inconsistency

1. Verify operator-managed fields are accurate
2. Compare with expected values
3. Check for race conditions
4. Review concurrent operation logs

## Best Practices

### 1. Gradual Rollout

- Enable one feature at a time
- Monitor for 24 hours between phases
- Don't rush the deployment

### 2. Monitoring

- Check metrics multiple times per day
- Set up automated alerts
- Review logs regularly
- Track trends over time

### 3. Communication

- Notify team before enabling new features
- Document any issues encountered
- Share metrics with stakeholders
- Plan rollback windows

### 4. Testing

- Test each feature in staging first
- Verify functionality after enabling
- Test rollback procedures
- Document test results

### 5. Documentation

- Keep deployment log
- Document issues and resolutions
- Update runbooks as needed
- Share lessons learned

## Environment Variables Reference

```bash
# Master switch - must be true for any operators to work
ENABLE_OPERATORS=true

# Individual feature flags
ENABLE_CREDENTIAL_OPERATORS=true
ENABLE_PHOTO_OPERATORS=true
ENABLE_BULK_OPERATORS=true
ENABLE_LOGGING_OPERATORS=true
ENABLE_ARRAY_OPERATORS=true
```

## API Endpoints Reference

### Get Metrics

```
GET /api/operators/metrics
GET /api/operators/metrics?type=increment
GET /api/operators/metrics?format=export
```

### Manage Feature Flags

```
GET /api/operators/feature-flags
PUT /api/operators/feature-flags
POST /api/operators/feature-flags (action: reset)
```

## Success Criteria

Deployment is considered successful when:

- ✅ All features enabled without issues
- ✅ Error rate < 5%
- ✅ Fallback rate < 10%
- ✅ P95 latency < 500ms
- ✅ P99 latency < 1000ms
- ✅ No data integrity issues
- ✅ Performance improvements documented
- ✅ Team trained on monitoring

## Post-Deployment

### Week 1

- Monitor metrics daily
- Review alerts
- Document any issues
- Fine-tune alert thresholds

### Week 2-4

- Monitor metrics every 2-3 days
- Review performance trends
- Optimize based on data
- Update documentation

### Ongoing

- Weekly metrics review
- Monthly performance analysis
- Quarterly optimization review
- Continuous improvement

## Support

For issues or questions:

1. Check this guide first
2. Review operator documentation
3. Check monitoring dashboard
4. Contact development team
5. Escalate to infrastructure team if needed

## Conclusion

Following this deployment guide ensures a safe, monitored rollout of database operators. The gradual approach minimizes risk while providing valuable data for optimization and improvement.

Remember: It's better to deploy slowly and safely than to rush and cause issues. Take your time, monitor carefully, and don't hesitate to rollback if needed.

---
title: Operator Monitoring User Guide
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-22
review_interval_days: 90
related_code: ["src/components/OperatorMonitoringDashboard.tsx", "src/lib/operatorMonitoring.ts", "src/lib/operators.ts"]
---

# Operator Monitoring User Guide

## Overview

The Operator Monitoring page is a real-time dashboard that helps administrators monitor and manage database operators - special atomic operations that improve performance and data consistency in credential.studio. This page provides visibility into how these operations are performing and allows you to control which features are enabled.

## What Are Database Operators?

Database operators are atomic operations that run directly on the database server, ensuring data consistency even when multiple users are editing the same records simultaneously. They replace traditional "read-modify-write" patterns with single atomic operations that can't be interrupted.

**Why They Matter:**
- **Prevent data loss**: When two users edit the same attendee, operators ensure both changes are saved correctly
- **Improve performance**: Atomic operations are faster than traditional update patterns
- **Ensure accuracy**: Counters (like credentials printed) stay accurate even under heavy load
- **Reduce conflicts**: Fewer "someone else modified this record" errors

## Page Sections

### 1. Header Section

**Location:** Top of the page

**What You See:**
- Page title: "Operator Monitoring"
- Description: "Real-time metrics and feature flag management for database operators"
- **Refresh Button**: Manually reload all metrics and data

**What It Does:**
- The page automatically refreshes every 30 seconds to show current data
- Click "Refresh" to get the latest data immediately


### 2. Error Alert (When Present)

**Location:** Below the header, only appears when there's a problem

**What You See:**
- Red alert box with warning icon
- Error message explaining what went wrong
- "Dismiss" button

**What It Means:**
- The system couldn't load operator metrics
- Common causes: Permission issues, API errors, or network problems
- Click "Dismiss" to hide the alert and try refreshing

### 3. Active Alerts (When Present)

**Location:** Below the header, only appears when thresholds are exceeded

**What You See:**
- Red alert boxes with specific alert types
- Alert message with details
- Timestamp showing when the alert was triggered

**Alert Types:**
- **HIGH_ERROR_RATE**: More than 5% of operator calls are failing
- **HIGH_FALLBACK_RATE**: More than 10% of operations are falling back to traditional updates
- **HIGH_P95_LATENCY**: 95% of operations are taking longer than 500ms
- **HIGH_P99_LATENCY**: 99% of operations are taking longer than 1000ms

**What To Do:**
- High error rates may indicate database connectivity issues
- High fallback rates suggest operators aren't working properly
- High latency may indicate database performance problems
- Contact your system administrator if alerts persist



### 4. Metrics Cards

**Location:** Four cards in a row below alerts

#### Card 1: Total Calls

**What You See:**
- Large number showing total operator calls
- Small text showing successful calls count
- Activity icon

**What It Means:**
- **Total Calls**: How many times operators have been used since the system started
- **Successful**: How many of those calls completed without errors
- Higher numbers indicate active system usage

**Example:** "1,234 total calls, 1,200 successful" means operators have been used 1,234 times with 1,200 successes

#### Card 2: Error Rate

**What You See:**
- Percentage showing how many calls failed
- Icon: Green checkmark (good) or red trending up arrow (problem)
- Small text showing failed call count

**What It Means:**
- **Error Rate**: Percentage of operator calls that failed
- **Green checkmark**: Error rate is below 5% (healthy)
- **Red arrow**: Error rate is above 5% (needs attention)
- Lower is better - aim for under 1%

**Example:** "2.5% error rate, 30 failed calls" means 2.5% of all operator calls encountered errors



#### Card 3: Avg Latency

**What You See:**
- Milliseconds (ms) showing average operation time
- Clock icon
- Small text showing P95 latency

**What It Means:**
- **Avg Latency**: Average time it takes for an operator call to complete
- **P95 Latency**: 95% of calls complete faster than this time
- Lower is better - faster operations mean better performance
- Typical good values: 50-200ms average, under 500ms P95

**Example:** "125ms average, P95: 350ms" means most operations complete in 125ms, and 95% complete in under 350ms

#### Card 4: Fallback Rate

**What You See:**
- Percentage showing how often fallbacks occur
- Icon: Green trending down (good) or yellow trending up (warning)
- Small text showing fallback count

**What It Means:**
- **Fallback Rate**: How often the system falls back to traditional updates instead of using operators
- **Green arrow**: Fallback rate is below 10% (healthy)
- **Yellow arrow**: Fallback rate is above 10% (operators may not be working properly)
- Lower is better - high fallback rates mean operators aren't being used effectively

**Example:** "5.2% fallback rate, 65 fallbacks" means 5.2% of operations couldn't use operators and fell back to traditional updates



### 5. Feature Flags Section

**Location:** Large card below the metrics cards

**What You See:**
- Settings icon and "Feature Flags" title
- Description: "Enable or disable operator features for gradual rollout"
- Six toggle switches with labels and descriptions

**What It Does:**
- Allows you to turn operator features on or off without redeploying code
- Useful for gradual rollout, testing, or disabling problematic features
- Changes take effect immediately across the entire system

#### Master Switch: Enable All Operators

**Toggle:** "Master Switch"

**What It Does:**
- Controls whether ANY operators are used at all
- When OFF: All operators are disabled, system uses traditional updates
- When ON: Individual operator types can be enabled/disabled below

**When To Use:**
- Turn OFF if operators are causing system-wide problems
- Turn ON for normal operation
- This is the "kill switch" for all operator functionality

**Impact:**
- OFF: System falls back to traditional updates (slower, more conflicts)
- ON: Operators can be used (faster, fewer conflicts)



#### Credential Operators

**Toggle:** "Credential Operators"

**Description:** "Atomic credential count tracking"

**What It Does:**
- Tracks how many credentials have been printed for each attendee
- Uses atomic increment/decrement operations
- Prevents credential count from becoming inaccurate when multiple users print simultaneously

**When To Use:**
- Keep ON for accurate credential tracking
- Turn OFF if credential printing is having issues

**Impact:**
- ON: Credential counts stay accurate even under heavy load
- OFF: Credential counts may become inaccurate with concurrent printing

**Example:** When two staff members print credentials for the same attendee at the same time, operators ensure the count increases by 2, not 1.

#### Photo Operators

**Toggle:** "Photo Operators"

**Description:** "Atomic photo upload count tracking"

**What It Does:**
- Tracks how many photos have been uploaded
- Uses atomic operations to maintain accurate counts
- Prevents photo count from becoming inaccurate during bulk uploads

**When To Use:**
- Keep ON for accurate photo statistics
- Turn OFF if photo uploads are having issues

**Impact:**
- ON: Photo counts stay accurate during concurrent uploads
- OFF: Photo counts may become inaccurate with simultaneous uploads



#### Bulk Operators

**Toggle:** "Bulk Operators"

**Description:** "Optimized bulk operations"

**What It Does:**
- Optimizes bulk edit, bulk delete, and bulk credential generation operations
- Uses atomic operations for better performance and consistency
- Reduces the chance of partial failures during bulk operations

**When To Use:**
- Keep ON for faster, more reliable bulk operations
- Turn OFF if bulk operations are causing problems

**Impact:**
- ON: Bulk operations are faster and more reliable
- OFF: Bulk operations use traditional methods (slower, more prone to conflicts)

**Example:** When bulk editing 500 attendees, operators ensure all changes are applied consistently even if other users are editing the same records.

#### Logging Operators

**Toggle:** "Logging Operators"

**Description:** "Server-side timestamps for logs"

**What It Does:**
- Uses server-side timestamps for audit logs
- Ensures log timestamps are accurate and consistent
- Prevents timestamp discrepancies from client clock differences

**When To Use:**
- Keep ON for accurate audit trails
- Turn OFF if logging is having issues

**Impact:**
- ON: Log timestamps are accurate and server-synchronized
- OFF: Log timestamps may vary based on client device clocks

**Example:** When users in different time zones create logs, operators ensure all timestamps are consistent and accurate.



#### Array Operators

**Toggle:** "Array Operators"

**Description:** "Atomic array operations for custom fields"

**What It Does:**
- Handles custom field arrays (multi-select fields) atomically
- Adds or removes items from arrays without race conditions
- Prevents data loss when multiple users edit the same custom field simultaneously

**When To Use:**
- Keep ON if you use multi-select custom fields
- Turn OFF if custom field editing is having issues

**Impact:**
- ON: Multi-select custom fields stay accurate with concurrent edits
- OFF: Multi-select fields may lose data with simultaneous edits

**Example:** When two users add different values to the same multi-select custom field, operators ensure both values are saved, not just one.

### 6. Performance Details Section

**Location:** Card at the bottom of the page

**What You See:**
- "Performance Details" title
- Four rows of metrics with labels and values

**What It Shows:**

#### Average Latency
- How long operator calls take on average
- Measured in milliseconds (ms)
- Lower is better - indicates faster operations

#### P95 Latency
- 95% of operator calls complete faster than this time
- Helps identify performance outliers
- Should typically be under 500ms

#### P99 Latency
- 99% of operator calls complete faster than this time
- Shows worst-case performance for most operations
- Should typically be under 1000ms

#### Success Rate
- Percentage of operator calls that completed successfully
- Should be above 95% for healthy operation
- Lower rates indicate problems that need investigation



## Common Scenarios

### Scenario 1: High Error Rate Alert

**What You See:**
- Red alert: "HIGH_ERROR_RATE: Operator error rate is 8.5%"
- Error Rate card shows red trending up arrow

**What It Means:**
- More than 5% of operator calls are failing
- Database may be experiencing connectivity issues
- Operators may not be configured correctly

**What To Do:**
1. Check if the database is accessible
2. Review recent system changes
3. Consider temporarily disabling operators with the Master Switch
4. Contact your system administrator

### Scenario 2: High Fallback Rate

**What You See:**
- Yellow alert: "HIGH_FALLBACK_RATE: Operator fallback rate is 15%"
- Fallback Rate card shows yellow trending up arrow

**What It Means:**
- Operators are falling back to traditional updates frequently
- Operators may not be working as expected
- Database may not support the operator features being used

**What To Do:**
1. Check which specific operator types are falling back
2. Review operator configuration
3. Verify database version supports operators
4. Consider disabling specific operator types that are problematic

### Scenario 3: Slow Performance

**What You See:**
- High latency numbers (e.g., 800ms average, 1500ms P95)
- Possible HIGH_P95_LATENCY or HIGH_P99_LATENCY alerts

**What It Means:**
- Operator calls are taking longer than expected
- Database may be under heavy load
- Network latency may be high

**What To Do:**
1. Check database performance metrics
2. Review system load and concurrent users
3. Consider scaling database resources
4. Monitor if performance improves during off-peak hours



### Scenario 4: Testing New Features

**What You Want:**
- Gradually roll out a new operator feature
- Test without affecting all users

**What To Do:**
1. Start with Master Switch ON, specific feature OFF
2. Enable the specific feature toggle (e.g., "Array Operators")
3. Monitor metrics for 15-30 minutes
4. Check for increased error rates or latency
5. If stable, leave enabled; if problems occur, disable immediately

### Scenario 5: Emergency Disable

**What You See:**
- Multiple alerts firing
- Very high error rates (>20%)
- System experiencing widespread issues

**What To Do:**
1. Click the Master Switch to turn OFF all operators
2. System will immediately fall back to traditional updates
3. Monitor if issues resolve
4. Investigate root cause before re-enabling
5. Re-enable operators one at a time to identify problematic feature

## Best Practices

### Regular Monitoring

**Daily:**
- Check for active alerts
- Review error rate (should be <2%)
- Verify fallback rate is low (<5%)

**Weekly:**
- Review performance trends
- Check if latency is increasing over time
- Verify all feature flags are in desired state

**Monthly:**
- Review total calls to understand usage patterns
- Analyze which operator types are most used
- Plan capacity based on growth trends

### Feature Flag Management

**When Enabling Features:**
1. Enable during low-traffic periods
2. Monitor for 30 minutes after enabling
3. Have a rollback plan ready
4. Document why you enabled it

**When Disabling Features:**
1. Document the reason for disabling
2. Set a reminder to investigate and re-enable
3. Notify team members of the change
4. Monitor impact on system performance



### Healthy System Indicators

Your system is healthy when you see:
- ✅ Error rate below 2%
- ✅ Fallback rate below 5%
- ✅ Average latency under 200ms
- ✅ P95 latency under 500ms
- ✅ Success rate above 98%
- ✅ No active alerts
- ✅ All desired feature flags enabled

### Warning Signs

Watch for these indicators of potential problems:
- ⚠️ Error rate between 2-5%
- ⚠️ Fallback rate between 5-10%
- ⚠️ Average latency 200-400ms
- ⚠️ P95 latency 500-800ms
- ⚠️ Success rate 95-98%
- ⚠️ Occasional alerts that resolve quickly

### Critical Issues

Take immediate action if you see:
- 🚨 Error rate above 5%
- 🚨 Fallback rate above 10%
- 🚨 Average latency above 400ms
- 🚨 P95 latency above 800ms
- 🚨 Success rate below 95%
- 🚨 Persistent alerts that don't clear
- 🚨 Multiple alerts firing simultaneously

## Troubleshooting

### Problem: Can't Load Metrics

**Symptoms:**
- Red error alert at top of page
- "Failed to load metrics" message

**Possible Causes:**
- Insufficient permissions
- API endpoint not responding
- Network connectivity issues

**Solutions:**
1. Verify you have "monitoring" read permission in your role
2. Try refreshing the page
3. Check browser console for errors
4. Contact system administrator

### Problem: Feature Flag Won't Change

**Symptoms:**
- Toggle switch doesn't move
- "Failed to update feature flag" toast message

**Possible Causes:**
- Insufficient permissions
- Master Switch is OFF (for sub-features)
- API error

**Solutions:**
1. Verify you have "monitoring" write permission
2. Check if Master Switch is ON (required for sub-features)
3. Try refreshing and attempting again
4. Check browser console for errors



### Problem: Metrics Not Updating

**Symptoms:**
- Numbers stay the same
- Timestamp doesn't change
- Refresh button doesn't help

**Possible Causes:**
- Operators not being used
- Monitoring system not recording data
- Browser caching issue

**Solutions:**
1. Verify operators are enabled (Master Switch ON)
2. Perform some actions that use operators (edit attendees, print credentials)
3. Clear browser cache and reload
4. Check if other users see the same issue

## Technical Details

### Data Retention

**Metrics Storage:**
- Last 1,000 operator calls are stored in memory
- Last 10,000 latency samples are kept for percentile calculations
- Data resets when the server restarts

**Alert History:**
- Last 10 alerts are displayed
- Alerts have a 5-minute cooldown to prevent spam
- Same alert type won't trigger again within 5 minutes

### Auto-Refresh

**Behavior:**
- Page automatically refreshes every 30 seconds
- Refresh happens in the background
- No page reload required
- Manual refresh available via button

### Performance Impact

**Monitoring Overhead:**
- Minimal impact on system performance
- Metrics calculated in-memory
- No database queries for monitoring data
- Async processing prevents blocking operations

## Permissions Required

To access the Operator Monitoring page, you need:
- **monitoring** read permission in your role

To change feature flags, you need:
- **monitoring** write permission in your role

Default role permissions:
- **Super Administrator**: Full access (read + write)
- **Event Manager**: Full access (read + write)
- **Registration Staff**: Read-only access
- **Viewer**: No access

## Related Documentation

- **Operator Performance Guide**: `docs/guides/PERFORMANCE_BEST_PRACTICES.md`
- **Transaction Monitoring**: `src/components/TransactionMonitoringDashboard.tsx`
- **Operator Implementation**: `src/lib/operators.ts`
- **Monitoring API**: `src/pages/api/operators/metrics.ts`

## Glossary

**Atomic Operation**: A database operation that completes entirely or not at all, preventing partial updates

**Fallback**: When an operator can't be used, the system falls back to traditional read-modify-write updates

**Latency**: Time taken for an operation to complete, measured in milliseconds

**P95/P99**: Percentile metrics - P95 means 95% of operations complete faster than this time

**Operator**: A database function that performs updates atomically on the server side

**Feature Flag**: A toggle that enables or disables a feature without code changes

**Error Rate**: Percentage of operations that fail

**Success Rate**: Percentage of operations that complete successfully

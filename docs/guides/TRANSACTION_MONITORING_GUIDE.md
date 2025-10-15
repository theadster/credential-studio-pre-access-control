# Transaction Monitoring Guide

## Overview

The transaction monitoring system provides comprehensive tracking and analysis of Appwrite TablesDB transaction operations. It tracks success rates, performance metrics, retry behavior, fallback usage, and generates alerts when thresholds are exceeded.

## Features

- **Real-time Metrics**: Track transaction success rates, durations, and operation counts
- **Performance Monitoring**: Monitor P50, P95, and P99 latency percentiles
- **Retry Tracking**: Track retry attempts and conflict rates
- **Fallback Monitoring**: Monitor when legacy API fallback is used
- **Automated Alerts**: Get notified when metrics exceed configured thresholds
- **Time Window Filtering**: View metrics for specific time periods
- **Error Categorization**: Track errors by type for better debugging

## Architecture

### Components

1. **TransactionMonitor**: Core monitoring class that tracks all transaction metrics
2. **Monitoring API**: REST API endpoint for accessing metrics (`/api/monitoring/transactions`)
3. **Dashboard Component**: React component for visualizing metrics
4. **Integration**: Automatic tracking in transaction utilities

### Data Flow

```
Transaction Execution
        ↓
Transaction Utilities (transactions.ts)
        ↓
recordTransaction() call
        ↓
TransactionMonitor
        ↓
Metrics Calculation & Alert Checking
        ↓
API Endpoint / Dashboard
```

## Usage

### Automatic Tracking

Transaction monitoring is automatically integrated into all transaction utilities. No additional code is required in your API routes.

```typescript
// This automatically records metrics
await executeTransactionWithRetry(tablesDB, operations, {}, 'bulk_import');
```

### Accessing Metrics via API

#### Get Current Metrics

```bash
# Get all-time metrics
GET /api/monitoring/transactions

# Get metrics for last hour
GET /api/monitoring/transactions?timeWindow=3600000

# Get metrics without alerts
GET /api/monitoring/transactions?includeAlerts=false

# Get summary format
GET /api/monitoring/transactions?format=summary
```

#### Response Format

```json
{
  "metrics": {
    "totalTransactions": 150,
    "successfulTransactions": 145,
    "failedTransactions": 5,
    "successRate": 96.67,
    "averageDuration": 1250,
    "p50Duration": 1100,
    "p95Duration": 2500,
    "p99Duration": 3200,
    "totalRetries": 12,
    "retriesPerTransaction": 0.08,
    "conflictRate": 2.0,
    "operationsPerTransaction": 45,
    "batchedTransactions": 8,
    "errorsByType": {
      "CONFLICT": 3,
      "VALIDATION": 1,
      "NETWORK": 1
    },
    "rollbackFailures": 0,
    "fallbackUsageCount": 2,
    "fallbackUsageRate": 1.33
  },
  "alerts": [
    {
      "severity": "warning",
      "type": "fallback_rate",
      "message": "Fallback usage rate (1.3%) exceeds threshold (1.0%)",
      "currentValue": 1.33,
      "threshold": 1.0,
      "timestamp": 1704067200000
    }
  ],
  "timestamp": 1704067200000,
  "timeWindow": "all"
}
```

### Using the Dashboard Component

```tsx
import { TransactionMonitoringDashboard } from '@/components/TransactionMonitoringDashboard';

function AdminPage() {
  return (
    <div>
      <h1>System Monitoring</h1>
      <TransactionMonitoringDashboard />
    </div>
  );
}
```

### Programmatic Access

```typescript
import { getMetrics, getAlerts, logMetricsSummary } from '@/lib/transactionMonitoring';

// Get current metrics
const metrics = getMetrics();
console.log(`Success rate: ${metrics.successRate}%`);

// Get metrics for last 24 hours
const recentMetrics = getMetrics(86400000);

// Get active alerts
const alerts = getAlerts();
alerts.forEach(alert => {
  console.log(`${alert.severity}: ${alert.message}`);
});

// Log formatted summary
logMetricsSummary();
```

## Metrics Explained

### Success Metrics

- **totalTransactions**: Total number of transactions attempted
- **successfulTransactions**: Number of transactions that completed successfully
- **failedTransactions**: Number of transactions that failed
- **successRate**: Percentage of successful transactions (0-100)

### Performance Metrics

- **averageDuration**: Mean transaction duration in milliseconds
- **p50Duration**: Median transaction duration (50th percentile)
- **p95Duration**: 95th percentile duration (95% of transactions complete faster)
- **p99Duration**: 99th percentile duration (99% of transactions complete faster)

### Retry Metrics

- **totalRetries**: Total number of retry attempts across all transactions
- **retriesPerTransaction**: Average number of retries per transaction
- **conflictRate**: Percentage of transactions that encountered conflicts

### Operation Metrics

- **operationsPerTransaction**: Average number of operations per transaction
- **batchedTransactions**: Number of transactions that used batching

### Fallback Metrics

- **fallbackUsageCount**: Number of times legacy API fallback was used
- **fallbackUsageRate**: Percentage of transactions that used fallback

### Error Metrics

- **errorsByType**: Count of errors by type (CONFLICT, VALIDATION, etc.)
- **rollbackFailures**: Number of transactions that failed to rollback (critical)

## Alert System

### Alert Types

1. **success_rate**: Triggered when success rate drops below threshold
2. **fallback_rate**: Triggered when fallback usage exceeds threshold
3. **conflict_rate**: Triggered when conflict rate exceeds threshold
4. **performance**: Triggered when duration exceeds thresholds
5. **rollback_failure**: Triggered on any rollback failure (always critical)

### Alert Severities

- **warning**: Minor issue, monitor but not urgent
- **error**: Significant issue, requires attention
- **critical**: Severe issue, requires immediate action

### Default Thresholds

```typescript
{
  minSuccessRate: 95,        // Alert if success rate < 95%
  maxFallbackRate: 5,        // Alert if fallback rate > 5%
  maxConflictRate: 1,        // Alert if conflict rate > 1%
  maxAverageDuration: 3000,  // Alert if avg duration > 3000ms
  maxP95Duration: 5000       // Alert if P95 duration > 5000ms
}
```

### Customizing Alert Thresholds

```typescript
import { getTransactionMonitor } from '@/lib/transactionMonitoring';

const monitor = getTransactionMonitor({
  minSuccessRate: 98,        // Stricter success rate
  maxFallbackRate: 2,        // Lower fallback tolerance
  maxConflictRate: 0.5,      // Lower conflict tolerance
  maxAverageDuration: 2000,  // Faster performance requirement
  maxP95Duration: 4000       // Faster P95 requirement
});
```

## Best Practices

### 1. Regular Monitoring

- Check metrics at least daily
- Set up automated alerts for critical thresholds
- Monitor trends over time, not just current values

### 2. Performance Targets

- **Success Rate**: Maintain > 95%
- **Fallback Rate**: Keep < 5%
- **Conflict Rate**: Keep < 1%
- **Average Duration**: Keep < 3 seconds
- **P95 Duration**: Keep < 5 seconds

### 3. Alert Response

#### Low Success Rate
1. Check error logs for patterns
2. Verify database connectivity
3. Check for validation issues
4. Review recent code changes

#### High Fallback Rate
1. Investigate why transactions are failing
2. Check if plan limits are being exceeded
3. Review transaction operation counts
4. Consider upgrading plan if needed

#### High Conflict Rate
1. Review concurrent operation patterns
2. Consider implementing optimistic locking
3. Add retry delays if needed
4. Review transaction isolation levels

#### Performance Issues
1. Check operation counts per transaction
2. Review database performance
3. Consider batching optimization
4. Check network latency

#### Rollback Failures
1. **CRITICAL**: Investigate immediately
2. Check database state for inconsistencies
3. Review transaction logs
4. May require manual data cleanup

### 4. Time Window Analysis

Use different time windows for different purposes:

- **Last Hour**: Real-time monitoring, immediate issues
- **Last 24 Hours**: Daily patterns, recent changes
- **Last 7 Days**: Weekly trends, capacity planning
- **All Time**: Historical analysis, long-term trends

### 5. Logging

The monitoring system automatically logs:
- Each transaction completion
- Retry attempts
- Fallback usage
- Alert triggers

Review logs regularly for patterns and anomalies.

## Integration with Existing Systems

### Adding Monitoring to Custom Transactions

```typescript
import { recordTransaction } from '@/lib/transactionMonitoring';
import { TransactionErrorType, detectTransactionErrorType } from '@/lib/transactions';

async function myCustomTransaction() {
  const startTime = Date.now();
  const transactionId = 'custom-tx-123';
  
  try {
    // Your transaction logic here
    await executeTransaction(tablesDB, operations);
    
    // Record success
    recordTransaction({
      transactionId,
      operationType: 'custom_operation',
      operationCount: operations.length,
      startTime,
      endTime: Date.now(),
      success: true,
      retries: 0,
      batched: false,
      usedFallback: false
    });
  } catch (error: any) {
    // Record failure
    recordTransaction({
      transactionId,
      operationType: 'custom_operation',
      operationCount: operations.length,
      startTime,
      endTime: Date.now(),
      success: false,
      retries: 0,
      batched: false,
      usedFallback: false,
      error: {
        type: detectTransactionErrorType(error),
        message: error.message,
        code: error.code
      }
    });
    throw error;
  }
}
```

### Exporting Metrics

```typescript
import { getMetrics } from '@/lib/transactionMonitoring';

// Export to external monitoring system
async function exportMetrics() {
  const metrics = getMetrics();
  
  // Send to external service (e.g., DataDog, New Relic)
  await fetch('https://monitoring-service.com/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service: 'credential-studio',
      metrics: {
        transaction_success_rate: metrics.successRate,
        transaction_avg_duration: metrics.averageDuration,
        transaction_p95_duration: metrics.p95Duration,
        transaction_fallback_rate: metrics.fallbackUsageRate,
        transaction_conflict_rate: metrics.conflictRate
      }
    })
  });
}
```

## Troubleshooting

### No Metrics Showing

1. Verify transactions are being executed
2. Check that monitoring is imported in transaction utilities
3. Verify API endpoint is accessible
4. Check browser console for errors

### Inaccurate Metrics

1. Verify system time is correct
2. Check for multiple monitor instances
3. Review time window filters
4. Verify transaction recording calls

### High Memory Usage

The monitor keeps the last 10,000 transactions in memory. If this is too much:

```typescript
// Reduce max records (requires modifying TransactionMonitor class)
// Or implement persistent storage (database, Redis)
```

### Missing Alerts

1. Verify alert thresholds are configured
2. Check that enough transactions have been recorded (minimum 10)
3. Review alert deduplication (5-minute window)
4. Check console logs for alert messages

## Production Considerations

### 1. Persistent Storage

The current implementation uses in-memory storage. For production:

- Store metrics in a database (PostgreSQL, MongoDB)
- Use Redis for real-time metrics
- Implement metric aggregation for long-term storage

### 2. Scalability

For high-volume systems:

- Implement sampling (record 1 in N transactions)
- Use background workers for metric calculation
- Implement metric aggregation windows

### 3. Security

- Restrict monitoring API to admin users only
- Implement rate limiting on monitoring endpoints
- Sanitize error messages to avoid leaking sensitive data

### 4. Integration

- Send alerts to Slack/email
- Export metrics to monitoring platforms
- Create dashboards in Grafana/DataDog
- Set up automated reports

## Example: Complete Monitoring Setup

```typescript
// 1. Configure monitoring with custom thresholds
import { getTransactionMonitor } from '@/lib/transactionMonitoring';

const monitor = getTransactionMonitor({
  minSuccessRate: 98,
  maxFallbackRate: 2,
  maxConflictRate: 0.5,
  maxAverageDuration: 2000,
  maxP95Duration: 4000
});

// 2. Set up periodic metric export
setInterval(async () => {
  const metrics = monitor.getMetrics(3600000); // Last hour
  
  // Log summary
  console.log(monitor.getMetricsSummary(3600000));
  
  // Check for alerts
  const alerts = monitor.getAlerts(3600000);
  if (alerts.length > 0) {
    // Send to alerting system
    await sendAlertsToSlack(alerts);
  }
  
  // Export to monitoring platform
  await exportToDataDog(metrics);
}, 60000); // Every minute

// 3. Add monitoring dashboard to admin page
import { TransactionMonitoringDashboard } from '@/components/TransactionMonitoringDashboard';

function AdminDashboard() {
  return (
    <div>
      <h1>System Health</h1>
      <TransactionMonitoringDashboard />
    </div>
  );
}
```

## Conclusion

The transaction monitoring system provides comprehensive visibility into transaction health and performance. Use it to:

- Ensure high reliability (>95% success rate)
- Maintain good performance (<3s average)
- Minimize fallback usage (<5%)
- Detect and resolve issues quickly
- Plan capacity and optimize operations

Regular monitoring and proactive alert response will ensure your transaction system remains healthy and performant.

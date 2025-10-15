# Transaction Monitoring Integration Example

## Quick Start: Adding Monitoring to Admin Dashboard

This guide shows how to quickly add transaction monitoring to your admin dashboard.

## Step 1: Create Admin Monitoring Page

Create a new page at `src/pages/admin/monitoring.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { TransactionMonitoringDashboard } from '@/components/TransactionMonitoringDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Database, Server } from 'lucide-react';

export default function MonitoringPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify user is admin
    // Add your auth check here
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor transaction health, performance, and reliability
        </p>
      </div>

      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="transactions">
            <Activity className="mr-2 h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="mr-2 h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="system">
            <Server className="mr-2 h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <TransactionMonitoringDashboard />
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Database Metrics</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Database monitoring features will be added here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Metrics</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                System monitoring features will be added here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## Step 2: Add Navigation Link

Add a link to the monitoring page in your admin navigation:

```tsx
// In your Header or Navigation component
import { Activity } from 'lucide-react';
import Link from 'next/link';

<Link href="/admin/monitoring">
  <Button variant="ghost">
    <Activity className="mr-2 h-4 w-4" />
    Monitoring
  </Button>
</Link>
```

## Step 3: Protect the Route

Ensure only admins can access the monitoring page:

```tsx
// In src/pages/admin/monitoring.tsx
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function MonitoringPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || !user || !user.isAdmin) {
    return <div>Loading...</div>;
  }

  return (
    // ... monitoring dashboard
  );
}
```

## Step 4: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/admin/monitoring`

3. Verify you can see:
   - Transaction metrics
   - Performance charts
   - Active alerts
   - Time window selector
   - Auto-refresh toggle

## Alternative: Embed in Existing Dashboard

If you want to add monitoring to an existing dashboard page:

```tsx
// In your existing dashboard page
import { TransactionMonitoringDashboard } from '@/components/TransactionMonitoringDashboard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function Dashboard() {
  return (
    <div className="container mx-auto py-8">
      {/* Your existing dashboard content */}
      
      {/* Add monitoring section */}
      <Accordion type="single" collapsible className="mt-8">
        <AccordionItem value="monitoring">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <span>Transaction Monitoring</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <TransactionMonitoringDashboard />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
```

## Customizing the Dashboard

### Change Auto-Refresh Interval

The default auto-refresh interval is 30 seconds. To change it, modify the component:

```tsx
// In TransactionMonitoringDashboard.tsx
useEffect(() => {
  if (autoRefresh) {
    const interval = setInterval(fetchMetrics, 60000); // 60 seconds
    return () => clearInterval(interval);
  }
}, [autoRefresh, timeWindow]);
```

### Add Custom Time Windows

```tsx
// Add custom time window buttons
<Button
  variant={timeWindow === 1800000 ? 'default' : 'outline'}
  size="sm"
  onClick={() => setTimeWindow(1800000)}
>
  Last 30 Minutes
</Button>
```

### Customize Alert Display

```tsx
// Filter alerts by severity
const criticalAlerts = alerts.filter(a => a.severity === 'critical');
const warningAlerts = alerts.filter(a => a.severity === 'warning');

// Display separately
<div className="space-y-4">
  {criticalAlerts.length > 0 && (
    <Card className="border-red-500">
      <CardHeader>
        <CardTitle>Critical Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Display critical alerts */}
      </CardContent>
    </Card>
  )}
  
  {warningAlerts.length > 0 && (
    <Card className="border-yellow-500">
      <CardHeader>
        <CardTitle>Warnings</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Display warnings */}
      </CardContent>
    </Card>
  )}
</div>
```

## Setting Up Automated Alerts

### Email Alerts

```typescript
// Create src/lib/alerting.ts
import { getAlerts } from '@/lib/transactionMonitoring';

export async function sendEmailAlerts() {
  const alerts = getAlerts(3600000); // Last hour
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  
  if (criticalAlerts.length > 0) {
    // Send email using your email service
    await sendEmail({
      to: 'admin@example.com',
      subject: `[CRITICAL] ${criticalAlerts.length} Transaction Alerts`,
      body: criticalAlerts.map(a => a.message).join('\n')
    });
  }
}

// Run periodically (e.g., via cron job or setInterval)
setInterval(sendEmailAlerts, 300000); // Every 5 minutes
```

### Slack Alerts

```typescript
// Create src/lib/slackAlerting.ts
import { getAlerts } from '@/lib/transactionMonitoring';

export async function sendSlackAlerts() {
  const alerts = getAlerts(3600000);
  
  if (alerts.length > 0) {
    const webhook = process.env.SLACK_WEBHOOK_URL;
    
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 Transaction Monitoring Alerts`,
        attachments: alerts.map(alert => ({
          color: alert.severity === 'critical' ? 'danger' : 'warning',
          text: alert.message,
          fields: [
            {
              title: 'Current Value',
              value: alert.currentValue.toFixed(2),
              short: true
            },
            {
              title: 'Threshold',
              value: alert.threshold.toFixed(2),
              short: true
            }
          ]
        }))
      })
    });
  }
}
```

## Exporting Metrics

### Export to CSV

```typescript
import { getMetrics } from '@/lib/transactionMonitoring';

export function exportMetricsToCSV() {
  const metrics = getMetrics();
  
  const csv = [
    'Metric,Value',
    `Total Transactions,${metrics.totalTransactions}`,
    `Success Rate,${metrics.successRate}%`,
    `Average Duration,${metrics.averageDuration}ms`,
    `P95 Duration,${metrics.p95Duration}ms`,
    `Fallback Rate,${metrics.fallbackUsageRate}%`,
    `Conflict Rate,${metrics.conflictRate}%`
  ].join('\n');
  
  // Download CSV
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transaction-metrics-${Date.now()}.csv`;
  a.click();
}
```

### Export to External Monitoring

```typescript
import { getMetrics } from '@/lib/transactionMonitoring';

export async function exportToDataDog() {
  const metrics = getMetrics();
  
  await fetch('https://api.datadoghq.com/api/v1/series', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': process.env.DATADOG_API_KEY!
    },
    body: JSON.stringify({
      series: [
        {
          metric: 'transaction.success_rate',
          points: [[Date.now() / 1000, metrics.successRate]],
          type: 'gauge',
          tags: ['service:credential-studio']
        },
        {
          metric: 'transaction.avg_duration',
          points: [[Date.now() / 1000, metrics.averageDuration]],
          type: 'gauge',
          tags: ['service:credential-studio']
        }
      ]
    })
  });
}
```

## Testing the Monitoring System

### Generate Test Transactions

```typescript
// Create a test script to generate sample transactions
import { recordTransaction } from '@/lib/transactionMonitoring';
import { TransactionErrorType } from '@/lib/transactions';

async function generateTestData() {
  // Generate 100 successful transactions
  for (let i = 0; i < 100; i++) {
    recordTransaction({
      transactionId: `test-${i}`,
      operationType: 'bulk_import',
      operationCount: Math.floor(Math.random() * 100) + 1,
      startTime: Date.now() - Math.random() * 1000,
      endTime: Date.now(),
      success: true,
      retries: Math.random() > 0.9 ? 1 : 0,
      batched: Math.random() > 0.8,
      usedFallback: false
    });
  }
  
  // Generate some failures
  for (let i = 0; i < 5; i++) {
    recordTransaction({
      transactionId: `test-fail-${i}`,
      operationType: 'bulk_delete',
      operationCount: Math.floor(Math.random() * 50) + 1,
      startTime: Date.now() - Math.random() * 1000,
      endTime: Date.now(),
      success: false,
      retries: 3,
      batched: false,
      usedFallback: false,
      error: {
        type: TransactionErrorType.CONFLICT,
        message: 'Test conflict error'
      }
    });
  }
  
  console.log('Test data generated!');
}

// Run in browser console or as a script
generateTestData();
```

## Troubleshooting

### Dashboard Not Loading

1. Check browser console for errors
2. Verify API endpoint is accessible: `GET /api/monitoring/transactions`
3. Check authentication is working
4. Verify component imports are correct

### No Metrics Showing

1. Verify transactions are being executed
2. Check that monitoring is integrated in transaction utilities
3. Generate test data to verify system is working
4. Check console logs for monitoring output

### Alerts Not Triggering

1. Verify enough transactions have been recorded (minimum 10)
2. Check alert thresholds are configured correctly
3. Review alert deduplication (5-minute window)
4. Check console logs for alert messages

## Next Steps

1. ✅ Add monitoring page to your application
2. ✅ Test with real transaction data
3. ⏭️ Set up automated alerting (email/Slack)
4. ⏭️ Export metrics to external monitoring platform
5. ⏭️ Create custom dashboards for specific metrics
6. ⏭️ Implement persistent storage for historical data

## Conclusion

The transaction monitoring system is now integrated into your application! You can:

- View real-time metrics in the dashboard
- Get automated alerts for issues
- Export metrics for analysis
- Monitor transaction health and performance

For more details, see the [Transaction Monitoring Guide](./TRANSACTION_MONITORING_GUIDE.md).

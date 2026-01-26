/**
 * Operator Monitoring Dashboard Component
 * 
 * Displays real-time metrics, logs, and alerts for database operators.
 * Allows administrators to monitor operator performance and manage feature flags.
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
} from 'lucide-react';

interface OperatorMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  fallbackCalls: number;
  averageExecutionTime: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  fallbackRate: number;
}

interface OperatorAlert {
  timestamp: string;
  type: string;
  message: string;
}

interface FeatureFlags {
  enableOperators: boolean;
  enableCredentialOperators: boolean;
  enablePhotoOperators: boolean;
  enableBulkOperators: boolean;
  enableLoggingOperators: boolean;
  enableArrayOperators: boolean;
}

/** Safely convert a value to a number, returning fallback if invalid */
const safeNum = (value: unknown, fallback = 0): number => 
  typeof value === 'number' && !Number.isNaN(value) ? value : fallback;

export default function OperatorMonitoringDashboard() {
  const [metrics, setMetrics] = useState<OperatorMetrics | null>(null);
  const [alerts, setAlerts] = useState<OperatorAlert[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/operators/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
        setAlerts(data.alerts || []);
        setFeatureFlags(data.featureFlags);
        setError(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(
          errorData.message ||
          errorData.error ||
          `Failed to load metrics (HTTP ${response.status})`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load metrics';
      setError(errorMessage);
      console.error('Failed to fetch operator metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFeatureFlag = async (flag: keyof FeatureFlags, value: boolean) => {
    if (!featureFlags) return;

    setUpdating(true);
    try {
      const response = await fetch('/api/operators/feature-flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [flag]: value }),
      });

      if (response.ok) {
        const data = await response.json();
        setFeatureFlags(data.flags);
        toast.success(`Feature flag updated successfully`, {
          description: `${flag} is now ${value ? 'enabled' : 'disabled'}`,
          duration: 3000,
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          errorData.error ||
          `Failed to update feature flag (HTTP ${response.status})`;
        toast.error('Failed to update feature flag', {
          description: errorMessage,
          duration: 4000,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update feature flag';
      toast.error('Failed to update feature flag', {
        description: errorMessage,
        duration: 4000,
      });
      console.error('Failed to update feature flag:', error);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Operator Monitoring</h2>
          <p className="text-muted-foreground mt-1">
            Monitor database operators - special atomic operations that prevent data loss and improve performance when multiple users edit the same records simultaneously.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            This page automatically refreshes every 30 seconds to show current performance metrics and system health.
          </p>
        </div>
        <Button onClick={fetchMetrics} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to Load Metrics</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-2"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{alert.type}</AlertTitle>
              <AlertDescription>
                {alert.message}
                <span className="ml-2 text-xs">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Metrics Cards */}
      {metrics && (
        <>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="text-lg font-semibold">Performance Metrics Overview</h3>
            <p className="text-sm text-muted-foreground">
              These cards show real-time statistics about how database operators are performing. Lower error rates and faster response times indicate a healthy system.
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{safeNum(metrics.totalCalls).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {safeNum(metrics.successfulCalls)} successful
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Total number of times operators have been used. Higher numbers indicate active system usage.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                {safeNum(metrics.errorRate) > 5 ? (
                  <TrendingUp className="h-4 w-4 text-destructive" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-success" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {safeNum(metrics.errorRate).toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {safeNum(metrics.failedCalls)} failed calls
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Percentage of operations that failed. Healthy systems stay below 2%. Above 5% triggers an alert.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {safeNum(metrics.averageExecutionTime).toFixed(0)}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  P95: {safeNum(metrics.p95Latency).toFixed(0)}ms
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  How long operations take to complete. Lower is better. Typical: 50-200ms average.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fallback Rate</CardTitle>
                {safeNum(metrics.fallbackRate) > 10 ? (
                  <TrendingUp className="h-4 w-4 text-warning" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-success" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {safeNum(metrics.fallbackRate).toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {safeNum(metrics.fallbackCalls)} fallbacks
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  How often the system falls back to traditional updates. Lower is better. Above 10% may indicate issues.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Feature Flags */}
      {featureFlags && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Feature Flags
            </CardTitle>
            <CardDescription>
              Control which operator features are enabled. Use these toggles to gradually roll out features, test performance, or quickly disable problematic features without redeploying code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-operators" className="text-base font-semibold">Master Switch</Label>
                <p className="text-sm text-muted-foreground">
                  Enable all operator features. When OFF, the system uses traditional updates (slower, more conflicts). This is the emergency "kill switch" for all operators.
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Example: Turn OFF if operators are causing system-wide problems, then investigate and re-enable specific features one at a time.
                </p>
              </div>
              <Switch
                id="enable-operators"
                checked={featureFlags.enableOperators}
                onCheckedChange={(checked) =>
                  updateFeatureFlag('enableOperators', checked)
                }
                disabled={updating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-credential" className="text-base font-semibold">Credential Operators</Label>
                <p className="text-sm text-muted-foreground">
                  Tracks how many credentials have been printed for each attendee using atomic operations. Prevents credential counts from becoming inaccurate when multiple staff print simultaneously.
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Example: Two staff members print credentials for the same attendee at the same time. With operators ON, the count increases by 2 correctly. With operators OFF, it might only increase by 1.
                </p>
              </div>
              <Switch
                id="enable-credential"
                checked={featureFlags.enableCredentialOperators}
                onCheckedChange={(checked) =>
                  updateFeatureFlag('enableCredentialOperators', checked)
                }
                disabled={updating || !featureFlags.enableOperators}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-photo" className="text-base font-semibold">Photo Operators</Label>
                <p className="text-sm text-muted-foreground">
                  Tracks photo upload counts using atomic operations. Ensures accurate statistics even during bulk photo uploads or when multiple users upload photos simultaneously.
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Example: During event check-in, 5 registration stations upload photos at the same time. Operators ensure the total photo count increases by exactly 5, not a random number.
                </p>
              </div>
              <Switch
                id="enable-photo"
                checked={featureFlags.enablePhotoOperators}
                onCheckedChange={(checked) =>
                  updateFeatureFlag('enablePhotoOperators', checked)
                }
                disabled={updating || !featureFlags.enableOperators}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-bulk" className="text-base font-semibold">Bulk Operators</Label>
                <p className="text-sm text-muted-foreground">
                  Optimizes bulk edit, bulk delete, and bulk credential generation operations. Makes these operations faster and more reliable by using atomic operations instead of individual updates.
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Example: Bulk editing 500 attendees to change their registration status. With operators ON, all changes apply consistently even if other users are editing the same records. With operators OFF, some changes might be lost.
                </p>
              </div>
              <Switch
                id="enable-bulk"
                checked={featureFlags.enableBulkOperators}
                onCheckedChange={(checked) =>
                  updateFeatureFlag('enableBulkOperators', checked)
                }
                disabled={updating || !featureFlags.enableOperators}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-logging" className="text-base font-semibold">Logging Operators</Label>
                <p className="text-sm text-muted-foreground">
                  Uses server-side timestamps for audit logs. Ensures log timestamps are accurate and consistent regardless of client device clock settings or time zones.
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Example: Staff in New York and staff in Los Angeles both create logs at "3:00 PM their time". With operators ON, both logs show the correct server time. With operators OFF, logs might show different times based on device clocks.
                </p>
              </div>
              <Switch
                id="enable-logging"
                checked={featureFlags.enableLoggingOperators}
                onCheckedChange={(checked) =>
                  updateFeatureFlag('enableLoggingOperators', checked)
                }
                disabled={updating || !featureFlags.enableOperators}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-array" className="text-base font-semibold">Array Operators</Label>
                <p className="text-sm text-muted-foreground">
                  Handles multi-select custom fields atomically. Adds or removes items from arrays without race conditions, preventing data loss when multiple users edit the same custom field simultaneously.
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Example: Two users add different dietary restrictions to the same attendee's multi-select field. With operators ON, both values are saved. With operators OFF, only the last person's change might be saved.
                </p>
              </div>
              <Switch
                id="enable-array"
                checked={featureFlags.enableArrayOperators}
                onCheckedChange={(checked) =>
                  updateFeatureFlag('enableArrayOperators', checked)
                }
                disabled={updating || !featureFlags.enableOperators}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Details */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Details</CardTitle>
            <CardDescription>
              Detailed latency and performance metrics. These numbers help you understand how fast operators are responding and identify performance issues before they become problems.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-sm font-medium">Average Latency</span>
                  <p className="text-xs text-muted-foreground">
                    How long operator calls take on average. Lower is better. Typical healthy range: 50-200ms.
                  </p>
                </div>
                <span className="text-sm font-bold">
                  {safeNum(metrics.averageExecutionTime).toFixed(2)}ms
                </span>
              </div>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-sm font-medium">P95 Latency</span>
                  <p className="text-xs text-muted-foreground">
                    95% of operations complete faster than this time. Helps identify performance outliers. Should be under 500ms.
                  </p>
                </div>
                <span className="text-sm font-bold">
                  {safeNum(metrics.p95Latency).toFixed(2)}ms
                </span>
              </div>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-sm font-medium">P99 Latency</span>
                  <p className="text-xs text-muted-foreground">
                    99% of operations complete faster than this time. Shows worst-case performance. Should be under 1000ms.
                  </p>
                </div>
                <span className="text-sm font-bold">
                  {safeNum(metrics.p99Latency).toFixed(2)}ms
                </span>
              </div>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-sm font-medium">Success Rate</span>
                  <p className="text-xs text-muted-foreground">
                    Percentage of operations that completed successfully. Healthy systems stay above 98%.
                  </p>
                </div>
                <span className="text-sm font-bold">
                  {safeNum(metrics.totalCalls) > 0 
                    ? ((safeNum(metrics.successfulCalls) / safeNum(metrics.totalCalls)) * 100).toFixed(2) 
                    : '0.00'}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

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
          <p className="text-muted-foreground">
            Real-time metrics and feature flag management for database operators
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalCalls.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.successfulCalls} successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              {metrics.errorRate > 5 ? (
                <TrendingUp className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle className="h-4 w-4 text-success" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.errorRate.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.failedCalls} failed calls
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
                {metrics.averageExecutionTime.toFixed(0)}ms
              </div>
              <p className="text-xs text-muted-foreground">
                P95: {metrics.p95Latency.toFixed(0)}ms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fallback Rate</CardTitle>
              {metrics.fallbackRate > 10 ? (
                <TrendingUp className="h-4 w-4 text-warning" />
              ) : (
                <TrendingDown className="h-4 w-4 text-success" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.fallbackRate.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.fallbackCalls} fallbacks
              </p>
            </CardContent>
          </Card>
        </div>
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
              Enable or disable operator features for gradual rollout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-operators">Master Switch</Label>
                <p className="text-sm text-muted-foreground">
                  Enable all operator features
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
                <Label htmlFor="enable-credential">Credential Operators</Label>
                <p className="text-sm text-muted-foreground">
                  Atomic credential count tracking
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
                <Label htmlFor="enable-photo">Photo Operators</Label>
                <p className="text-sm text-muted-foreground">
                  Atomic photo upload count tracking
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
                <Label htmlFor="enable-bulk">Bulk Operators</Label>
                <p className="text-sm text-muted-foreground">
                  Optimized bulk operations
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
                <Label htmlFor="enable-logging">Logging Operators</Label>
                <p className="text-sm text-muted-foreground">
                  Server-side timestamps for logs
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
                <Label htmlFor="enable-array">Array Operators</Label>
                <p className="text-sm text-muted-foreground">
                  Atomic array operations for custom fields
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
              Detailed latency and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Average Latency:</span>
                <span className="text-sm font-medium">
                  {metrics.averageExecutionTime.toFixed(2)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">P95 Latency:</span>
                <span className="text-sm font-medium">
                  {metrics.p95Latency.toFixed(2)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">P99 Latency:</span>
                <span className="text-sm font-medium">
                  {metrics.p99Latency.toFixed(2)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Success Rate:</span>
                <span className="text-sm font-medium">
                  {metrics.totalCalls > 0 ? ((metrics.successfulCalls / metrics.totalCalls) * 100).toFixed(2) : '0.00'}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

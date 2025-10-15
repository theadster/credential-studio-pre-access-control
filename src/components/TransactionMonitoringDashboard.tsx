/**
 * Transaction Monitoring Dashboard Component
 * 
 * Displays real-time transaction metrics, alerts, and performance data.
 * This component is intended for administrators to monitor transaction health.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  TrendingUp,
  XCircle,
  Zap
} from 'lucide-react';

interface TransactionMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  averageDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  totalRetries: number;
  retriesPerTransaction: number;
  conflictRate: number;
  operationsPerTransaction: number;
  batchedTransactions: number;
  errorsByType: Record<string, number>;
  rollbackFailures: number;
  fallbackUsageCount: number;
  fallbackUsageRate: number;
}

interface Alert {
  severity: 'warning' | 'error' | 'critical';
  type: string;
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: number;
}

interface MonitoringData {
  metrics: TransactionMetrics;
  alerts: Alert[];
  timestamp: number;
  timeWindow: string;
}

export function TransactionMonitoringDashboard() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<number | undefined>(undefined);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (timeWindow) {
        params.append('timeWindow', timeWindow.toString());
      }
      
      const response = await fetch(`/api/monitoring/transactions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [timeWindow]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, timeWindow]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            <p>Error loading metrics: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { metrics, alerts } = data;

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600 dark:text-green-400';
    if (rate >= 90) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transaction Monitoring</h2>
          <p className="text-sm text-muted-foreground">
            Real-time metrics and alerts for transaction operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Time Window Selector */}
      <div className="flex gap-2">
        <Button
          variant={timeWindow === undefined ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeWindow(undefined)}
        >
          All Time
        </Button>
        <Button
          variant={timeWindow === 3600000 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeWindow(3600000)}
        >
          Last Hour
        </Button>
        <Button
          variant={timeWindow === 86400000 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeWindow(86400000)}
        >
          Last 24 Hours
        </Button>
        <Button
          variant={timeWindow === 604800000 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeWindow(604800000)}
        >
          Last 7 Days
        </Button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-yellow-500 dark:border-yellow-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 rounded-lg bg-muted"
                >
                  <Badge variant={getAlertSeverityColor(alert.severity)}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-3xl font-bold">{metrics.totalTransactions}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className={`text-3xl font-bold ${getSuccessRateColor(metrics.successRate)}`}>
                  {metrics.successRate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle2 className={`h-8 w-8 ${getSuccessRateColor(metrics.successRate)}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                <p className="text-3xl font-bold">{metrics.averageDuration}ms</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fallback Rate</p>
                <p className={`text-3xl font-bold ${metrics.fallbackUsageRate > 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {metrics.fallbackUsageRate.toFixed(1)}%
                </p>
              </div>
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Transaction duration statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Average Duration</span>
                <span className="font-medium">{metrics.averageDuration}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">P50 (Median)</span>
                <span className="font-medium">{metrics.p50Duration}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">P95</span>
                <span className="font-medium">{metrics.p95Duration}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">P99</span>
                <span className="font-medium">{metrics.p99Duration}ms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Retry & Conflict Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Retry & Conflict Metrics</CardTitle>
            <CardDescription>Transaction retry and conflict statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Retries</span>
                <span className="font-medium">{metrics.totalRetries}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg Retries/Transaction</span>
                <span className="font-medium">{metrics.retriesPerTransaction.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Conflict Rate</span>
                <span className={`font-medium ${metrics.conflictRate > 1 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {metrics.conflictRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Rollback Failures</span>
                <span className={`font-medium ${metrics.rollbackFailures > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.rollbackFailures}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operation Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Operation Metrics</CardTitle>
            <CardDescription>Transaction operation statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Successful</span>
                <span className="font-medium text-green-600">{metrics.successfulTransactions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Failed</span>
                <span className="font-medium text-red-600">{metrics.failedTransactions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Batched Transactions</span>
                <span className="font-medium">{metrics.batchedTransactions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg Operations/Transaction</span>
                <span className="font-medium">{metrics.operationsPerTransaction}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Error Breakdown</CardTitle>
            <CardDescription>Errors by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.errorsByType)
                .filter(([_, count]) => count > 0)
                .map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{type}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              {Object.values(metrics.errorsByType).every(count => count === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No errors recorded
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

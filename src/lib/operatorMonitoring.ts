/**
 * Operator Monitoring and Metrics
 * 
 * This module provides monitoring, metrics tracking, and alerting for database operators.
 * It tracks operator usage, performance, errors, and provides data for dashboards and alerts.
 * 
 * CONCURRENCY SAFETY:
 * This module uses a queue-based locking mechanism to ensure thread-safe access to shared
 * arrays (operatorLogs, latencySamples, alerts) in concurrent environments. All mutations
 * are serialized through a single queue to prevent race conditions.
 */

import { OperatorType } from '@/types/operators';

export interface OperatorMetrics {
  /** Total number of operator calls */
  totalCalls: number;
  
  /** Number of successful operator calls */
  successfulCalls: number;
  
  /** Number of failed operator calls */
  failedCalls: number;
  
  /** Number of fallback to traditional updates */
  fallbackCalls: number;
  
  /** Total execution time in milliseconds */
  totalExecutionTime: number;
  
  /** Average execution time in milliseconds */
  averageExecutionTime: number;
  
  /** P95 latency in milliseconds */
  p95Latency: number;
  
  /** P99 latency in milliseconds */
  p99Latency: number;
  
  /** Error rate (percentage) */
  errorRate: number;
  
  /** Fallback rate (percentage) */
  fallbackRate: number;
}

export interface OperatorLog {
  timestamp: string;
  operatorType: OperatorType;
  field: string;
  collection: string;
  operation: string;
  success: boolean;
  duration: number;
  errorMessage?: string;
  userId?: string;
  fallback?: boolean;
}

/**
 * In-memory storage for operator logs (last 1000 entries)
 * In production, this should be replaced with a proper logging service
 */
const operatorLogs: OperatorLog[] = [];
const MAX_LOGS = 1000;

/**
 * Latency samples for percentile calculations
 */
const latencySamples: number[] = [];
const MAX_SAMPLES = 10000;

/**
 * Queue-based lock for thread-safe array mutations
 * Ensures all modifications to operatorLogs, latencySamples, and alerts are serialized
 */
type QueuedOperation = () => void;
const operationQueue: QueuedOperation[] = [];
let isProcessing = false;

/**
 * Execute an operation in a thread-safe manner
 * Operations are queued and executed sequentially to prevent race conditions
 */
function executeThreadSafe(operation: QueuedOperation): void {
  operationQueue.push(operation);
  processQueue();
}

/**
 * Process queued operations sequentially
 */
function processQueue(): void {
  if (isProcessing || operationQueue.length === 0) {
    return;
  }

  isProcessing = true;

  // Use setImmediate to allow other operations to queue up
  setImmediate(() => {
    while (operationQueue.length > 0) {
      const operation = operationQueue.shift();
      if (operation) {
        operation();
      }
    }
    isProcessing = false;
  });
}

/**
 * Log an operator operation (thread-safe)
 */
export function logOperatorUsage(log: OperatorLog): void {
  executeThreadSafe(() => {
    // Add to logs
    operatorLogs.push(log);
    
    // Keep only last MAX_LOGS entries
    if (operatorLogs.length > MAX_LOGS) {
      operatorLogs.shift();
    }
    
    // Track latency samples
    latencySamples.push(log.duration);
    if (latencySamples.length > MAX_SAMPLES) {
      latencySamples.shift();
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Operator]', {
        type: log.operatorType,
        field: log.field,
        success: log.success,
        duration: `${log.duration}ms`,
        fallback: log.fallback,
      });
    }
    
    // Check for alerts
    checkAlerts(log);
  });
}

/**
 * Get operator metrics
 */
export function getOperatorMetrics(): OperatorMetrics {
  const totalCalls = operatorLogs.length;
  const successfulCalls = operatorLogs.filter(log => log.success).length;
  const failedCalls = operatorLogs.filter(log => !log.success).length;
  const fallbackCalls = operatorLogs.filter(log => log.fallback).length;
  
  const totalExecutionTime = operatorLogs.reduce((sum, log) => sum + log.duration, 0);
  const averageExecutionTime = totalCalls > 0 ? totalExecutionTime / totalCalls : 0;
  
  const errorRate = totalCalls > 0 ? (failedCalls / totalCalls) * 100 : 0;
  const fallbackRate = totalCalls > 0 ? (fallbackCalls / totalCalls) * 100 : 0;
  
  // Calculate percentiles
  const sortedLatencies = [...latencySamples].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedLatencies.length * 0.95);
  const p99Index = Math.floor(sortedLatencies.length * 0.99);
  
  const p95Latency = sortedLatencies[p95Index] || 0;
  const p99Latency = sortedLatencies[p99Index] || 0;
  
  return {
    totalCalls,
    successfulCalls,
    failedCalls,
    fallbackCalls,
    totalExecutionTime,
    averageExecutionTime,
    p95Latency,
    p99Latency,
    errorRate,
    fallbackRate,
  };
}

/**
 * Get operator metrics by type
 */
export function getOperatorMetricsByType(operatorType: OperatorType): OperatorMetrics {
  const typeLogs = operatorLogs.filter(log => log.operatorType === operatorType);
  
  const totalCalls = typeLogs.length;
  const successfulCalls = typeLogs.filter(log => log.success).length;
  const failedCalls = typeLogs.filter(log => !log.success).length;
  const fallbackCalls = typeLogs.filter(log => log.fallback).length;
  
  const totalExecutionTime = typeLogs.reduce((sum, log) => sum + log.duration, 0);
  const averageExecutionTime = totalCalls > 0 ? totalExecutionTime / totalCalls : 0;
  
  const errorRate = totalCalls > 0 ? (failedCalls / totalCalls) * 100 : 0;
  const fallbackRate = totalCalls > 0 ? (fallbackCalls / totalCalls) * 100 : 0;
  
  // Calculate percentiles for this type
  const typeLatencies = typeLogs.map(log => log.duration).sort((a, b) => a - b);
  const p95Index = Math.floor(typeLatencies.length * 0.95);
  const p99Index = Math.floor(typeLatencies.length * 0.99);
  
  const p95Latency = typeLatencies[p95Index] || 0;
  const p99Latency = typeLatencies[p99Index] || 0;
  
  return {
    totalCalls,
    successfulCalls,
    failedCalls,
    fallbackCalls,
    totalExecutionTime,
    averageExecutionTime,
    p95Latency,
    p99Latency,
    errorRate,
    fallbackRate,
  };
}

/**
 * Get recent operator logs
 */
export function getRecentOperatorLogs(limit: number = 100): OperatorLog[] {
  return operatorLogs.slice(-limit);
}

/**
 * Get operator logs by operation
 */
export function getOperatorLogsByOperation(operation: string): OperatorLog[] {
  return operatorLogs.filter(log => log.operation === operation);
}

/**
 * Alert thresholds
 */
const ALERT_THRESHOLDS = {
  errorRate: 5, // Alert if error rate > 5%
  fallbackRate: 10, // Alert if fallback rate > 10%
  p95Latency: 500, // Alert if P95 latency > 500ms
  p99Latency: 1000, // Alert if P99 latency > 1000ms
};

/**
 * Alert cooldown period in milliseconds (5 minutes)
 * Prevents duplicate alerts for the same alert type within this window
 */
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Track last alert time for each alert type to prevent duplicate alerts
 * Maps alert type to timestamp of last triggered alert
 */
const lastAlertTime: Record<string, number> = {};

/**
 * Alert tracking
 */
const alerts: Array<{
  timestamp: string;
  type: string;
  message: string;
  metrics: Partial<OperatorMetrics>;
}> = [];

/**
 * Check if an alert should be triggered based on cooldown period
 * Prevents duplicate alerts for the same alert type within ALERT_COOLDOWN_MS
 * 
 * @param alertType - The type of alert (e.g., 'HIGH_ERROR_RATE')
 * @returns true if enough time has passed since the last alert of this type
 */
function shouldTriggerAlert(alertType: string): boolean {
  const now = Date.now();
  const lastTime = lastAlertTime[alertType];
  
  // If no previous alert or cooldown period has passed
  if (!lastTime || now - lastTime >= ALERT_COOLDOWN_MS) {
    lastAlertTime[alertType] = now;
    return true;
  }
  
  return false;
}

/**
 * Check for alert conditions (called within thread-safe context)
 */
function checkAlerts(log: OperatorLog): void {
  const metrics = getOperatorMetrics();
  
  // Check error rate
  if (metrics.errorRate > ALERT_THRESHOLDS.errorRate) {
    if (shouldTriggerAlert('HIGH_ERROR_RATE')) {
      triggerAlert('HIGH_ERROR_RATE', `Operator error rate is ${metrics.errorRate.toFixed(2)}%`, metrics);
    }
  }
  
  // Check fallback rate
  if (metrics.fallbackRate > ALERT_THRESHOLDS.fallbackRate) {
    if (shouldTriggerAlert('HIGH_FALLBACK_RATE')) {
      triggerAlert('HIGH_FALLBACK_RATE', `Operator fallback rate is ${metrics.fallbackRate.toFixed(2)}%`, metrics);
    }
  }
  
  // Check P95 latency
  if (metrics.p95Latency > ALERT_THRESHOLDS.p95Latency) {
    if (shouldTriggerAlert('HIGH_P95_LATENCY')) {
      triggerAlert('HIGH_P95_LATENCY', `Operator P95 latency is ${metrics.p95Latency.toFixed(2)}ms`, metrics);
    }
  }
  
  // Check P99 latency
  if (metrics.p99Latency > ALERT_THRESHOLDS.p99Latency) {
    if (shouldTriggerAlert('HIGH_P99_LATENCY')) {
      triggerAlert('HIGH_P99_LATENCY', `Operator P99 latency is ${metrics.p99Latency.toFixed(2)}ms`, metrics);
    }
  }
}

/**
 * Trigger an alert (called within thread-safe context)
 */
function triggerAlert(type: string, message: string, metrics: Partial<OperatorMetrics>): void {
  const alert = {
    timestamp: new Date().toISOString(),
    type,
    message,
    metrics,
  };
  
  alerts.push(alert);
  
  // Log alert
  console.error('[Operator Alert]', alert);
  
  // In production, send to alerting service (e.g., PagerDuty, Slack, etc.)
  // sendToAlertingService(alert);
}

/**
 * Get recent alerts
 */
export function getRecentAlerts(limit: number = 10): typeof alerts {
  return alerts.slice(-limit);
}

/**
 * Clear all metrics and logs (for testing) - thread-safe
 */
export function clearMetrics(): void {
  executeThreadSafe(() => {
    operatorLogs.length = 0;
    latencySamples.length = 0;
    alerts.length = 0;
    // Clear alert cooldown tracking for testing
    Object.keys(lastAlertTime).forEach(key => {
      delete lastAlertTime[key];
    });
  });
}

/**
 * Export metrics for external monitoring systems
 */
export function exportMetricsForMonitoring(): {
  metrics: OperatorMetrics;
  metricsByType: Record<OperatorType, OperatorMetrics>;
  recentLogs: OperatorLog[];
  alerts: typeof alerts;
} {
  const metrics = getOperatorMetrics();
  
  // Get metrics by type - dynamically enumerate all OperatorType values
  // This ensures new enum members are automatically included without manual updates
  const operatorTypes: OperatorType[] = Object.values(OperatorType).filter(
    (value): value is OperatorType => typeof value === 'string'
  );
  
  const metricsByType = operatorTypes.reduce((acc, type) => {
    acc[type] = getOperatorMetricsByType(type);
    return acc;
  }, {} as Record<OperatorType, OperatorMetrics>);
  
  return {
    metrics,
    metricsByType,
    recentLogs: getRecentOperatorLogs(100),
    alerts: getRecentAlerts(10),
  };
}

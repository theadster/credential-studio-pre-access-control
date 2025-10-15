/**
 * Transaction Monitoring System
 * 
 * This module provides comprehensive monitoring and metrics tracking for
 * Appwrite TablesDB transactions, including success rates, performance metrics,
 * retry tracking, and fallback usage monitoring.
 * 
 * @module transactionMonitoring
 */

import { TransactionErrorType } from './transactions';

/**
 * Transaction metrics for monitoring and analysis
 */
export interface TransactionMetrics {
  /** Total number of transactions attempted */
  totalTransactions: number;
  
  /** Number of successful transactions */
  successfulTransactions: number;
  
  /** Number of failed transactions */
  failedTransactions: number;
  
  /** Success rate as a percentage (0-100) */
  successRate: number;
  
  /** Average transaction duration in milliseconds */
  averageDuration: number;
  
  /** 50th percentile (median) duration in milliseconds */
  p50Duration: number;
  
  /** 95th percentile duration in milliseconds */
  p95Duration: number;
  
  /** 99th percentile duration in milliseconds */
  p99Duration: number;
  
  /** Total number of retry attempts across all transactions */
  totalRetries: number;
  
  /** Average retries per transaction */
  retriesPerTransaction: number;
  
  /** Conflict rate as a percentage (0-100) */
  conflictRate: number;
  
  /** Average operations per transaction */
  operationsPerTransaction: number;
  
  /** Number of transactions that used batching */
  batchedTransactions: number;
  
  /** Number of errors by type */
  errorsByType: Record<TransactionErrorType, number>;
  
  /** Number of rollback failures */
  rollbackFailures: number;
  
  /** Number of times fallback to legacy API was used */
  fallbackUsageCount: number;
  
  /** Fallback usage rate as a percentage (0-100) */
  fallbackUsageRate: number;
}

/**
 * Individual transaction record for detailed tracking
 */
export interface TransactionRecord {
  /** Unique transaction ID */
  transactionId: string;
  
  /** Operation type (import, delete, edit, etc.) */
  operationType: string;
  
  /** Number of operations in the transaction */
  operationCount: number;
  
  /** Start timestamp */
  startTime: number;
  
  /** End timestamp */
  endTime: number;
  
  /** Duration in milliseconds */
  duration: number;
  
  /** Whether the transaction succeeded */
  success: boolean;
  
  /** Number of retry attempts */
  retries: number;
  
  /** Whether batching was used */
  batched: boolean;
  
  /** Number of batches if batched */
  batchCount?: number;
  
  /** Whether fallback to legacy API was used */
  usedFallback: boolean;
  
  /** Error details if failed */
  error?: {
    type: TransactionErrorType;
    message: string;
    code?: number;
  };
}

/**
 * Alert configuration for monitoring thresholds
 */
export interface AlertConfig {
  /** Alert when success rate drops below this percentage */
  minSuccessRate: number;
  
  /** Alert when fallback usage exceeds this percentage */
  maxFallbackRate: number;
  
  /** Alert when conflict rate exceeds this percentage */
  maxConflictRate: number;
  
  /** Alert when average duration exceeds this in milliseconds */
  maxAverageDuration: number;
  
  /** Alert when p95 duration exceeds this in milliseconds */
  maxP95Duration: number;
}

/**
 * Alert triggered when thresholds are exceeded
 */
export interface Alert {
  /** Alert severity level */
  severity: 'warning' | 'error' | 'critical';
  
  /** Alert type */
  type: 'success_rate' | 'fallback_rate' | 'conflict_rate' | 'performance' | 'rollback_failure';
  
  /** Alert message */
  message: string;
  
  /** Current value that triggered the alert */
  currentValue: number;
  
  /** Threshold that was exceeded */
  threshold: number;
  
  /** Timestamp when alert was triggered */
  timestamp: number;
}

/**
 * In-memory transaction monitoring store
 * In production, this should be replaced with a persistent store (database, Redis, etc.)
 */
class TransactionMonitor {
  private records: TransactionRecord[] = [];
  private maxRecords: number = 10000; // Keep last 10k transactions
  private alertConfig: AlertConfig;
  private alerts: Alert[] = [];
  
  constructor(alertConfig?: Partial<AlertConfig>) {
    this.alertConfig = {
      minSuccessRate: 95,
      maxFallbackRate: 5,
      maxConflictRate: 1,
      maxAverageDuration: 3000,
      maxP95Duration: 5000,
      ...alertConfig
    };
  }
  
  /**
   * Record the start of a transaction
   */
  startTransaction(transactionId: string, operationType: string, operationCount: number): void {
    // This is a placeholder - actual implementation would track in-progress transactions
    console.log(`[Monitor] Transaction started: ${transactionId} (${operationType}, ${operationCount} ops)`);
  }
  
  /**
   * Record a completed transaction
   */
  recordTransaction(record: Omit<TransactionRecord, 'duration'>): void {
    const duration = record.endTime - record.startTime;
    const fullRecord: TransactionRecord = {
      ...record,
      duration
    };
    
    this.records.push(fullRecord);
    
    // Trim old records if we exceed max
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }
    
    // Log the transaction
    this.logTransaction(fullRecord);
    
    // Check for alerts
    this.checkAlerts();
  }
  
  /**
   * Log transaction details
   */
  private logTransaction(record: TransactionRecord): void {
    const status = record.success ? '✓' : '✗';
    const fallback = record.usedFallback ? ' [FALLBACK]' : '';
    const batched = record.batched ? ` [BATCHED: ${record.batchCount}]` : '';
    const retries = record.retries > 0 ? ` [RETRIES: ${record.retries}]` : '';
    
    console.log(
      `[Monitor] ${status} ${record.operationType} ` +
      `(${record.operationCount} ops, ${record.duration}ms)` +
      `${fallback}${batched}${retries}`
    );
    
    if (!record.success && record.error) {
      console.error(
        `[Monitor] Error: ${record.error.type} - ${record.error.message}`
      );
    }
  }
  
  /**
   * Get current metrics
   */
  getMetrics(timeWindowMs?: number): TransactionMetrics {
    const now = Date.now();
    const records = timeWindowMs
      ? this.records.filter(r => now - r.endTime < timeWindowMs)
      : this.records;
    
    if (records.length === 0) {
      return this.getEmptyMetrics();
    }
    
    const successful = records.filter(r => r.success).length;
    const failed = records.filter(r => !r.success).length;
    const totalRetries = records.reduce((sum, r) => sum + r.retries, 0);
    const conflicts = records.filter(r => 
      r.error?.type === TransactionErrorType.CONFLICT
    ).length;
    const batched = records.filter(r => r.batched).length;
    const fallbacks = records.filter(r => r.usedFallback).length;
    
    // Calculate durations
    const durations = records.map(r => r.duration).sort((a, b) => a - b);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const p50Duration = this.percentile(durations, 50);
    const p95Duration = this.percentile(durations, 95);
    const p99Duration = this.percentile(durations, 99);
    
    // Calculate operations per transaction
    const totalOps = records.reduce((sum, r) => sum + r.operationCount, 0);
    const avgOps = totalOps / records.length;
    
    // Count errors by type
    const errorsByType: Record<TransactionErrorType, number> = {
      [TransactionErrorType.CONFLICT]: 0,
      [TransactionErrorType.VALIDATION]: 0,
      [TransactionErrorType.PERMISSION]: 0,
      [TransactionErrorType.NOT_FOUND]: 0,
      [TransactionErrorType.PLAN_LIMIT]: 0,
      [TransactionErrorType.NETWORK]: 0,
      [TransactionErrorType.ROLLBACK]: 0,
      [TransactionErrorType.UNKNOWN]: 0
    };
    
    records.forEach(r => {
      if (r.error) {
        errorsByType[r.error.type]++;
      }
    });
    
    const rollbackFailures = errorsByType[TransactionErrorType.ROLLBACK];
    
    return {
      totalTransactions: records.length,
      successfulTransactions: successful,
      failedTransactions: failed,
      successRate: (successful / records.length) * 100,
      averageDuration: Math.round(avgDuration),
      p50Duration: Math.round(p50Duration),
      p95Duration: Math.round(p95Duration),
      p99Duration: Math.round(p99Duration),
      totalRetries,
      retriesPerTransaction: totalRetries / records.length,
      conflictRate: (conflicts / records.length) * 100,
      operationsPerTransaction: Math.round(avgOps),
      batchedTransactions: batched,
      errorsByType,
      rollbackFailures,
      fallbackUsageCount: fallbacks,
      fallbackUsageRate: (fallbacks / records.length) * 100
    };
  }
  
  /**
   * Get empty metrics (when no data available)
   */
  private getEmptyMetrics(): TransactionMetrics {
    return {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      successRate: 0,
      averageDuration: 0,
      p50Duration: 0,
      p95Duration: 0,
      p99Duration: 0,
      totalRetries: 0,
      retriesPerTransaction: 0,
      conflictRate: 0,
      operationsPerTransaction: 0,
      batchedTransactions: 0,
      errorsByType: {
        [TransactionErrorType.CONFLICT]: 0,
        [TransactionErrorType.VALIDATION]: 0,
        [TransactionErrorType.PERMISSION]: 0,
        [TransactionErrorType.NOT_FOUND]: 0,
        [TransactionErrorType.PLAN_LIMIT]: 0,
        [TransactionErrorType.NETWORK]: 0,
        [TransactionErrorType.ROLLBACK]: 0,
        [TransactionErrorType.UNKNOWN]: 0
      },
      rollbackFailures: 0,
      fallbackUsageCount: 0,
      fallbackUsageRate: 0
    };
  }
  
  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }
  
  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    const metrics = this.getMetrics();
    const now = Date.now();
    
    // Check success rate
    if (metrics.successRate < this.alertConfig.minSuccessRate && metrics.totalTransactions >= 10) {
      this.addAlert({
        severity: metrics.successRate < 90 ? 'critical' : 'error',
        type: 'success_rate',
        message: `Transaction success rate (${metrics.successRate.toFixed(1)}%) is below threshold (${this.alertConfig.minSuccessRate}%)`,
        currentValue: metrics.successRate,
        threshold: this.alertConfig.minSuccessRate,
        timestamp: now
      });
    }
    
    // Check fallback rate
    if (metrics.fallbackUsageRate > this.alertConfig.maxFallbackRate && metrics.totalTransactions >= 10) {
      this.addAlert({
        severity: metrics.fallbackUsageRate > 10 ? 'error' : 'warning',
        type: 'fallback_rate',
        message: `Fallback usage rate (${metrics.fallbackUsageRate.toFixed(1)}%) exceeds threshold (${this.alertConfig.maxFallbackRate}%)`,
        currentValue: metrics.fallbackUsageRate,
        threshold: this.alertConfig.maxFallbackRate,
        timestamp: now
      });
    }
    
    // Check conflict rate
    if (metrics.conflictRate > this.alertConfig.maxConflictRate && metrics.totalTransactions >= 10) {
      this.addAlert({
        severity: metrics.conflictRate > 5 ? 'error' : 'warning',
        type: 'conflict_rate',
        message: `Conflict rate (${metrics.conflictRate.toFixed(1)}%) exceeds threshold (${this.alertConfig.maxConflictRate}%)`,
        currentValue: metrics.conflictRate,
        threshold: this.alertConfig.maxConflictRate,
        timestamp: now
      });
    }
    
    // Check average duration
    if (metrics.averageDuration > this.alertConfig.maxAverageDuration && metrics.totalTransactions >= 10) {
      this.addAlert({
        severity: 'warning',
        type: 'performance',
        message: `Average transaction duration (${metrics.averageDuration}ms) exceeds threshold (${this.alertConfig.maxAverageDuration}ms)`,
        currentValue: metrics.averageDuration,
        threshold: this.alertConfig.maxAverageDuration,
        timestamp: now
      });
    }
    
    // Check p95 duration
    if (metrics.p95Duration > this.alertConfig.maxP95Duration && metrics.totalTransactions >= 10) {
      this.addAlert({
        severity: 'warning',
        type: 'performance',
        message: `P95 transaction duration (${metrics.p95Duration}ms) exceeds threshold (${this.alertConfig.maxP95Duration}ms)`,
        currentValue: metrics.p95Duration,
        threshold: this.alertConfig.maxP95Duration,
        timestamp: now
      });
    }
    
    // Check for rollback failures (always critical)
    if (metrics.rollbackFailures > 0) {
      this.addAlert({
        severity: 'critical',
        type: 'rollback_failure',
        message: `Rollback failures detected: ${metrics.rollbackFailures} transaction(s) failed to rollback`,
        currentValue: metrics.rollbackFailures,
        threshold: 0,
        timestamp: now
      });
    }
  }
  
  /**
   * Add an alert (with deduplication)
   */
  private addAlert(alert: Alert): void {
    // Check if we already have a recent alert of this type (within last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentAlert = this.alerts.find(
      a => a.type === alert.type && a.timestamp > fiveMinutesAgo
    );
    
    if (recentAlert) {
      return; // Don't spam alerts
    }
    
    this.alerts.push(alert);
    
    // Log the alert
    const emoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'error' ? '⚠️' : '⚡';
    console.warn(`${emoji} [Monitor Alert] ${alert.severity.toUpperCase()}: ${alert.message}`);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }
  
  /**
   * Get recent alerts
   */
  getAlerts(timeWindowMs?: number): Alert[] {
    if (!timeWindowMs) {
      return [...this.alerts];
    }
    
    const cutoff = Date.now() - timeWindowMs;
    return this.alerts.filter(a => a.timestamp > cutoff);
  }
  
  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }
  
  /**
   * Get metrics summary for logging
   */
  getMetricsSummary(timeWindowMs?: number): string {
    const metrics = this.getMetrics(timeWindowMs);
    
    if (metrics.totalTransactions === 0) {
      return 'No transaction data available';
    }
    
    const lines = [
      `Transaction Metrics Summary`,
      `─────────────────────────────`,
      `Total Transactions: ${metrics.totalTransactions}`,
      `Success Rate: ${metrics.successRate.toFixed(1)}% (${metrics.successfulTransactions}/${metrics.totalTransactions})`,
      `Failed: ${metrics.failedTransactions}`,
      ``,
      `Performance:`,
      `  Average Duration: ${metrics.averageDuration}ms`,
      `  P50 Duration: ${metrics.p50Duration}ms`,
      `  P95 Duration: ${metrics.p95Duration}ms`,
      `  P99 Duration: ${metrics.p99Duration}ms`,
      ``,
      `Retries & Conflicts:`,
      `  Total Retries: ${metrics.totalRetries}`,
      `  Avg Retries/Transaction: ${metrics.retriesPerTransaction.toFixed(2)}`,
      `  Conflict Rate: ${metrics.conflictRate.toFixed(1)}%`,
      ``,
      `Operations:`,
      `  Avg Operations/Transaction: ${metrics.operationsPerTransaction}`,
      `  Batched Transactions: ${metrics.batchedTransactions}`,
      ``,
      `Fallback Usage:`,
      `  Fallback Count: ${metrics.fallbackUsageCount}`,
      `  Fallback Rate: ${metrics.fallbackUsageRate.toFixed(1)}%`,
      ``,
      `Errors by Type:`,
      ...Object.entries(metrics.errorsByType)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => `  ${type}: ${count}`),
      ``,
      `Rollback Failures: ${metrics.rollbackFailures}`
    ];
    
    return lines.join('\n');
  }
  
  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.records = [];
    this.alerts = [];
  }
}

// Singleton instance
let monitorInstance: TransactionMonitor | null = null;

/**
 * Get the transaction monitor instance
 */
export function getTransactionMonitor(alertConfig?: Partial<AlertConfig>): TransactionMonitor {
  if (!monitorInstance) {
    monitorInstance = new TransactionMonitor(alertConfig);
  }
  return monitorInstance;
}

/**
 * Helper function to record a transaction
 */
export function recordTransaction(record: Omit<TransactionRecord, 'duration'>): void {
  const monitor = getTransactionMonitor();
  monitor.recordTransaction(record);
}

/**
 * Helper function to get current metrics
 */
export function getMetrics(timeWindowMs?: number): TransactionMetrics {
  const monitor = getTransactionMonitor();
  return monitor.getMetrics(timeWindowMs);
}

/**
 * Helper function to get recent alerts
 */
export function getAlerts(timeWindowMs?: number): Alert[] {
  const monitor = getTransactionMonitor();
  return monitor.getAlerts(timeWindowMs);
}

/**
 * Helper function to log metrics summary
 */
export function logMetricsSummary(timeWindowMs?: number): void {
  const monitor = getTransactionMonitor();
  console.log('\n' + monitor.getMetricsSummary(timeWindowMs) + '\n');
}

/**
 * Export the TransactionMonitor class for testing
 */
export { TransactionMonitor };

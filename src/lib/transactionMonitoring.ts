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
  
  /** Concurrency conflict metrics */
  concurrencyConflicts?: ConcurrencyConflictMetrics;
}

/**
 * Metrics specific to concurrency conflicts
 */
export interface ConcurrencyConflictMetrics {
  /** Total number of conflicts detected */
  totalConflicts: number;
  
  /** Number of conflicts successfully resolved */
  resolvedConflicts: number;
  
  /** Number of conflicts that failed to resolve */
  failedConflicts: number;
  
  /** Conflict resolution success rate as a percentage (0-100) */
  resolutionSuccessRate: number;
  
  /** Average retries per conflict */
  averageRetriesPerConflict: number;
  
  /** Conflicts by operation type */
  conflictsByOperationType: Record<string, number>;
  
  /** Conflicts by resolution strategy */
  conflictsByStrategy: Record<string, number>;
  
  /** Conflicts by conflict type */
  conflictsByType: Record<string, number>;
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


// ============================================================================
// Concurrency Conflict Monitoring
// ============================================================================

/**
 * Record for tracking individual concurrency conflicts
 */
export interface ConflictRecord {
  /** Unique conflict ID */
  conflictId: string;
  
  /** Document ID affected by the conflict */
  documentId: string;
  
  /** Type of operation that caused the conflict */
  operationType: string;
  
  /** Type of conflict (VERSION_MISMATCH, FIELD_COLLISION, TRANSIENT) */
  conflictType: string;
  
  /** Expected version */
  expectedVersion: number;
  
  /** Actual version found */
  actualVersion: number;
  
  /** Fields involved in the conflict */
  conflictingFields: string[];
  
  /** Resolution strategy used */
  resolutionStrategy: string;
  
  /** Whether resolution was successful */
  resolutionSuccess: boolean;
  
  /** Number of retries used */
  retriesUsed: number;
  
  /** Timestamp when conflict was detected */
  timestamp: number;
}

/**
 * Alert configuration for conflict monitoring
 */
export interface ConflictAlertConfig {
  /** Alert when conflict rate exceeds this per minute */
  maxConflictsPerMinute: number;
  
  /** Alert when resolution success rate drops below this percentage */
  minResolutionSuccessRate: number;
  
  /** Alert when average retries per conflict exceeds this */
  maxAverageRetries: number;
}

/**
 * Conflict-specific alert
 */
export interface ConflictAlert {
  /** Alert severity level */
  severity: 'warning' | 'error' | 'critical';
  
  /** Alert type */
  type: 'conflict_rate' | 'resolution_rate' | 'retry_rate';
  
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
 * In-memory conflict monitoring store
 * 
 * TODO: Implement persistent storage for conflict logs to meet 30-day retention requirement.
 * Current implementation uses in-memory storage with a 5,000-record cap, which:
 * - Does not survive application restarts
 * - Cannot guarantee 30-day retention
 * - May lose records when capacity is exceeded
 * 
 * Required work:
 * 1. Persist conflict records to durable storage (database collection or S3)
 * 2. Implement TTL/retention logic to keep logs for >=30 days
 * 3. Add cleanup job to remove logs older than retention period
 * 4. Update monitoring dashboard to query persistent storage
 * 5. Maintain in-memory cache for performance while persisting to storage
 */
class ConflictMonitor {
  private records: ConflictRecord[] = [];
  private maxRecords: number = 5000; // Keep last 5k conflicts
  private alertConfig: ConflictAlertConfig;
  private alerts: ConflictAlert[] = [];
  private conflictIdCounter: number = 0;
  
  constructor(alertConfig?: Partial<ConflictAlertConfig>) {
    this.alertConfig = {
      maxConflictsPerMinute: 10,
      minResolutionSuccessRate: 90,
      maxAverageRetries: 2,
      ...alertConfig
    };
  }
  
  /**
   * Record a conflict
   */
  recordConflict(record: Omit<ConflictRecord, 'conflictId' | 'timestamp'>): void {
    const fullRecord: ConflictRecord = {
      ...record,
      conflictId: `conflict-${++this.conflictIdCounter}`,
      timestamp: Date.now()
    };
    
    this.records.push(fullRecord);
    
    // Trim old records if we exceed max
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }
    
    // Log the conflict
    this.logConflict(fullRecord);
    
    // Check for alerts
    this.checkAlerts();
  }
  
  /**
   * Log conflict details
   */
  private logConflict(record: ConflictRecord): void {
    const status = record.resolutionSuccess ? '✓' : '✗';
    const retries = record.retriesUsed > 0 ? ` [RETRIES: ${record.retriesUsed}]` : '';
    
    console.log(
      `[ConflictMonitor] ${status} ${record.operationType} ` +
      `(${record.conflictType}, v${record.expectedVersion}→v${record.actualVersion})` +
      ` [${record.resolutionStrategy}]${retries}`
    );
  }
  
  /**
   * Get conflict metrics
   */
  getMetrics(timeWindowMs?: number): ConcurrencyConflictMetrics {
    const now = Date.now();
    const records = timeWindowMs
      ? this.records.filter(r => now - r.timestamp < timeWindowMs)
      : this.records;
    
    if (records.length === 0) {
      return this.getEmptyMetrics();
    }
    
    const resolved = records.filter(r => r.resolutionSuccess).length;
    const failed = records.filter(r => !r.resolutionSuccess).length;
    const totalRetries = records.reduce((sum, r) => sum + r.retriesUsed, 0);
    
    // Count by operation type
    const conflictsByOperationType: Record<string, number> = {};
    records.forEach(r => {
      conflictsByOperationType[r.operationType] = (conflictsByOperationType[r.operationType] || 0) + 1;
    });
    
    // Count by resolution strategy
    const conflictsByStrategy: Record<string, number> = {};
    records.forEach(r => {
      conflictsByStrategy[r.resolutionStrategy] = (conflictsByStrategy[r.resolutionStrategy] || 0) + 1;
    });
    
    // Count by conflict type
    const conflictsByType: Record<string, number> = {};
    records.forEach(r => {
      conflictsByType[r.conflictType] = (conflictsByType[r.conflictType] || 0) + 1;
    });
    
    return {
      totalConflicts: records.length,
      resolvedConflicts: resolved,
      failedConflicts: failed,
      resolutionSuccessRate: records.length > 0 ? (resolved / records.length) * 100 : 0,
      averageRetriesPerConflict: records.length > 0 ? totalRetries / records.length : 0,
      conflictsByOperationType,
      conflictsByStrategy,
      conflictsByType
    };
  }
  
  /**
   * Get empty metrics
   */
  private getEmptyMetrics(): ConcurrencyConflictMetrics {
    return {
      totalConflicts: 0,
      resolvedConflicts: 0,
      failedConflicts: 0,
      resolutionSuccessRate: 0,
      averageRetriesPerConflict: 0,
      conflictsByOperationType: {},
      conflictsByStrategy: {},
      conflictsByType: {}
    };
  }
  
  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const recentRecords = this.records.filter(r => r.timestamp > oneMinuteAgo);
    
    // Check conflicts per minute
    if (recentRecords.length > this.alertConfig.maxConflictsPerMinute) {
      this.addAlert({
        severity: recentRecords.length > this.alertConfig.maxConflictsPerMinute * 2 ? 'error' : 'warning',
        type: 'conflict_rate',
        message: `Conflict rate (${recentRecords.length}/min) exceeds threshold (${this.alertConfig.maxConflictsPerMinute}/min)`,
        currentValue: recentRecords.length,
        threshold: this.alertConfig.maxConflictsPerMinute,
        timestamp: now
      });
    }
    
    // Check resolution success rate (only if we have enough data)
    if (recentRecords.length >= 5) {
      const resolved = recentRecords.filter(r => r.resolutionSuccess).length;
      const successRate = (resolved / recentRecords.length) * 100;
      
      if (successRate < this.alertConfig.minResolutionSuccessRate) {
        this.addAlert({
          severity: successRate < 80 ? 'critical' : 'error',
          type: 'resolution_rate',
          message: `Conflict resolution success rate (${successRate.toFixed(1)}%) is below threshold (${this.alertConfig.minResolutionSuccessRate}%)`,
          currentValue: successRate,
          threshold: this.alertConfig.minResolutionSuccessRate,
          timestamp: now
        });
      }
    }
    
    // Check average retries
    if (recentRecords.length >= 5) {
      const totalRetries = recentRecords.reduce((sum, r) => sum + r.retriesUsed, 0);
      const avgRetries = totalRetries / recentRecords.length;
      
      if (avgRetries > this.alertConfig.maxAverageRetries) {
        this.addAlert({
          severity: 'warning',
          type: 'retry_rate',
          message: `Average retries per conflict (${avgRetries.toFixed(2)}) exceeds threshold (${this.alertConfig.maxAverageRetries})`,
          currentValue: avgRetries,
          threshold: this.alertConfig.maxAverageRetries,
          timestamp: now
        });
      }
    }
  }
  
  /**
   * Add an alert (with deduplication)
   */
  private addAlert(alert: ConflictAlert): void {
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
    console.warn(`${emoji} [ConflictMonitor Alert] ${alert.severity.toUpperCase()}: ${alert.message}`);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }
  
  /**
   * Get recent alerts
   */
  getAlerts(timeWindowMs?: number): ConflictAlert[] {
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
    
    if (metrics.totalConflicts === 0) {
      return 'No conflict data available';
    }
    
    const lines = [
      `Concurrency Conflict Metrics Summary`,
      `─────────────────────────────────────`,
      `Total Conflicts: ${metrics.totalConflicts}`,
      `Resolution Success Rate: ${metrics.resolutionSuccessRate.toFixed(1)}% (${metrics.resolvedConflicts}/${metrics.totalConflicts})`,
      `Failed Resolutions: ${metrics.failedConflicts}`,
      `Average Retries/Conflict: ${metrics.averageRetriesPerConflict.toFixed(2)}`,
      ``,
      `Conflicts by Operation Type:`,
      ...Object.entries(metrics.conflictsByOperationType)
        .map(([type, count]) => `  ${type}: ${count}`),
      ``,
      `Conflicts by Strategy:`,
      ...Object.entries(metrics.conflictsByStrategy)
        .map(([strategy, count]) => `  ${strategy}: ${count}`),
      ``,
      `Conflicts by Type:`,
      ...Object.entries(metrics.conflictsByType)
        .map(([type, count]) => `  ${type}: ${count}`)
    ];
    
    return lines.join('\n');
  }
  
  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.records = [];
    this.alerts = [];
    this.conflictIdCounter = 0;
  }
}

// Singleton instance for conflict monitor
let conflictMonitorInstance: ConflictMonitor | null = null;

/**
 * Get the conflict monitor instance
 */
export function getConflictMonitor(alertConfig?: Partial<ConflictAlertConfig>): ConflictMonitor {
  if (!conflictMonitorInstance) {
    conflictMonitorInstance = new ConflictMonitor(alertConfig);
  }
  return conflictMonitorInstance;
}

/**
 * Helper function to record a conflict
 */
export function recordConflict(record: Omit<ConflictRecord, 'conflictId' | 'timestamp'>): void {
  const monitor = getConflictMonitor();
  monitor.recordConflict(record);
}

/**
 * Helper function to get conflict metrics
 */
export function getConflictMetrics(timeWindowMs?: number): ConcurrencyConflictMetrics {
  const monitor = getConflictMonitor();
  return monitor.getMetrics(timeWindowMs);
}

/**
 * Helper function to get conflict alerts
 */
export function getConflictAlerts(timeWindowMs?: number): ConflictAlert[] {
  const monitor = getConflictMonitor();
  return monitor.getAlerts(timeWindowMs);
}

/**
 * Helper function to log conflict metrics summary
 */
export function logConflictMetricsSummary(timeWindowMs?: number): void {
  const monitor = getConflictMonitor();
  console.log('\n' + monitor.getMetricsSummary(timeWindowMs) + '\n');
}

/**
 * Get combined metrics including conflict metrics
 */
export function getCombinedMetrics(timeWindowMs?: number): TransactionMetrics {
  const transactionMetrics = getMetrics(timeWindowMs);
  const conflictMetrics = getConflictMetrics(timeWindowMs);
  
  return {
    ...transactionMetrics,
    concurrencyConflicts: conflictMetrics
  };
}

/**
 * Export the ConflictMonitor class for testing
 */
export { ConflictMonitor };

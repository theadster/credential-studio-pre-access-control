/**
 * Performance monitoring utilities for database operator usage
 * Tracks timing metrics, operator usage, and generates performance reports
 */

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  operatorUsageCount: number;
  traditionalUpdateCount: number;
  totalOperations: number;
  operationsPerSecond?: number;
  usedTransactions?: boolean;
  batchCount?: number;
  operation: string;
}

export interface PerformanceReport {
  operation: string;
  timestamp: string;
  metrics: PerformanceMetrics;
  summary: string;
}

/**
 * Creates a new performance tracker
 */
export function createPerformanceTracker(operation: string): PerformanceMetrics {
  return {
    startTime: Date.now(),
    operatorUsageCount: 0,
    traditionalUpdateCount: 0,
    totalOperations: 0,
    operation
  };
}

/**
 * Increments the operator usage count
 */
export function trackOperatorUsage(metrics: PerformanceMetrics): void {
  metrics.operatorUsageCount++;
  metrics.totalOperations++;
}

/**
 * Increments the traditional update count
 */
export function trackTraditionalUpdate(metrics: PerformanceMetrics): void {
  metrics.traditionalUpdateCount++;
  metrics.totalOperations++;
}

/**
 * Finalizes the performance metrics and calculates derived values
 */
export function finalizeMetrics(metrics: PerformanceMetrics): PerformanceMetrics {
  metrics.endTime = Date.now();
  metrics.duration = metrics.endTime - metrics.startTime;
  
  if (metrics.duration > 0 && metrics.totalOperations > 0) {
    metrics.operationsPerSecond = parseFloat(
      (metrics.totalOperations / (metrics.duration / 1000)).toFixed(2)
    );
  } else {
    metrics.operationsPerSecond = 0;
  }

  return metrics;
}

/**
 * Generates a performance report from metrics
 */
export function generatePerformanceReport(metrics: PerformanceMetrics): PerformanceReport {
  const finalMetrics = finalizeMetrics(metrics);
  
  const operatorPercentage = finalMetrics.totalOperations > 0
    ? ((finalMetrics.operatorUsageCount / finalMetrics.totalOperations) * 100).toFixed(1)
    : '0';

  const summary = [
    `Operation: ${finalMetrics.operation}`,
    `Duration: ${finalMetrics.duration}ms`,
    `Total Operations: ${finalMetrics.totalOperations}`,
    `Operator Usage: ${finalMetrics.operatorUsageCount} (${operatorPercentage}%)`,
    `Traditional Updates: ${finalMetrics.traditionalUpdateCount}`,
    `Throughput: ${finalMetrics.operationsPerSecond} ops/sec`
  ].join(' | ');

  return {
    operation: finalMetrics.operation,
    timestamp: new Date().toISOString(),
    metrics: finalMetrics,
    summary
  };
}

/**
 * Logs performance metrics to console
 */
export function logPerformanceMetrics(metrics: PerformanceMetrics): void {
  const report = generatePerformanceReport(metrics);
  
  console.log(`[Performance Report] ${report.summary}`);
  console.log('[Performance Details]', {
    operation: report.operation,
    timestamp: report.timestamp,
    duration: `${report.metrics.duration}ms`,
    totalOperations: report.metrics.totalOperations,
    operatorUsage: report.metrics.operatorUsageCount,
    traditionalUpdates: report.metrics.traditionalUpdateCount,
    operationsPerSecond: `${report.metrics.operationsPerSecond} ops/sec`,
    usedTransactions: report.metrics.usedTransactions,
    batchCount: report.metrics.batchCount
  });
}

/**
 * Compares two performance metrics and calculates improvement
 */
export function comparePerformance(
  baseline: PerformanceMetrics,
  optimized: PerformanceMetrics
): {
  durationImprovement: number;
  throughputImprovement: number;
  operatorAdoption: number;
  summary: string;
} {
  // Calculate duration if not already set
  const baselineDuration = baseline.duration ?? (baseline.endTime && baseline.startTime ? baseline.endTime - baseline.startTime : 0);
  const optimizedDuration = optimized.duration ?? (optimized.endTime && optimized.startTime ? optimized.endTime - optimized.startTime : 0);

  const durationImprovement = baselineDuration && optimizedDuration
    ? ((baselineDuration - optimizedDuration) / baselineDuration) * 100
    : 0;

  const throughputImprovement = baseline.operationsPerSecond && optimized.operationsPerSecond
    ? ((optimized.operationsPerSecond - baseline.operationsPerSecond) / baseline.operationsPerSecond) * 100
    : 0;

  const operatorAdoption = optimized.totalOperations > 0
    ? (optimized.operatorUsageCount / optimized.totalOperations) * 100
    : 0;

  const summary = [
    `Duration: ${durationImprovement >= 0 ? 'improved' : 'degraded'} by ${Math.abs(durationImprovement).toFixed(1)}%`,
    `Throughput: ${throughputImprovement >= 0 ? 'improved' : 'degraded'} by ${Math.abs(throughputImprovement).toFixed(1)}%`,
    `Operator Adoption: ${operatorAdoption.toFixed(1)}%`
  ].join(' | ');

  return {
    durationImprovement,
    throughputImprovement,
    operatorAdoption,
    summary
  };
}

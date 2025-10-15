/**
 * Unit tests for transaction monitoring system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  TransactionMonitor,
  getTransactionMonitor,
  recordTransaction,
  getMetrics,
  getAlerts
} from '../transactionMonitoring';
import { TransactionErrorType } from '../transactions';

describe('TransactionMonitor', () => {
  let monitor: TransactionMonitor;

  beforeEach(() => {
    monitor = new TransactionMonitor();
    monitor.reset();
  });

  describe('recordTransaction', () => {
    it('should record a successful transaction', () => {
      monitor.recordTransaction({
        transactionId: 'tx1',
        operationType: 'bulk_import',
        operationCount: 10,
        startTime: 1000,
        endTime: 1500,
        success: true,
        retries: 0,
        batched: false,
        usedFallback: false
      });

      const metrics = monitor.getMetrics();
      expect(metrics.totalTransactions).toBe(1);
      expect(metrics.successfulTransactions).toBe(1);
      expect(metrics.failedTransactions).toBe(0);
      expect(metrics.successRate).toBe(100);
    });

    it('should record a failed transaction', () => {
      monitor.recordTransaction({
        transactionId: 'tx1',
        operationType: 'bulk_delete',
        operationCount: 5,
        startTime: 1000,
        endTime: 1200,
        success: false,
        retries: 2,
        batched: false,
        usedFallback: false,
        error: {
          type: TransactionErrorType.CONFLICT,
          message: 'Conflict detected',
          code: 409
        }
      });

      const metrics = monitor.getMetrics();
      expect(metrics.totalTransactions).toBe(1);
      expect(metrics.successfulTransactions).toBe(0);
      expect(metrics.failedTransactions).toBe(1);
      expect(metrics.successRate).toBe(0);
      expect(metrics.totalRetries).toBe(2);
    });

    it('should track fallback usage', () => {
      monitor.recordTransaction({
        transactionId: 'fallback',
        operationType: 'bulk_import',
        operationCount: 100,
        startTime: 1000,
        endTime: 2000,
        success: true,
        retries: 0,
        batched: false,
        usedFallback: true
      });

      const metrics = monitor.getMetrics();
      expect(metrics.fallbackUsageCount).toBe(1);
      expect(metrics.fallbackUsageRate).toBe(100);
    });

    it('should track batched transactions', () => {
      monitor.recordTransaction({
        transactionId: 'batched',
        operationType: 'bulk_import',
        operationCount: 1500,
        startTime: 1000,
        endTime: 3000,
        success: true,
        retries: 0,
        batched: true,
        batchCount: 2,
        usedFallback: false
      });

      const metrics = monitor.getMetrics();
      expect(metrics.batchedTransactions).toBe(1);
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      // Record multiple transactions
      monitor.recordTransaction({
        transactionId: 'tx1',
        operationType: 'bulk_import',
        operationCount: 10,
        startTime: 1000,
        endTime: 1500,
        success: true,
        retries: 0,
        batched: false,
        usedFallback: false
      });

      monitor.recordTransaction({
        transactionId: 'tx2',
        operationType: 'bulk_delete',
        operationCount: 5,
        startTime: 2000,
        endTime: 2300,
        success: true,
        retries: 1,
        batched: false,
        usedFallback: false
      });

      monitor.recordTransaction({
        transactionId: 'tx3',
        operationType: 'bulk_edit',
        operationCount: 20,
        startTime: 3000,
        endTime: 3800,
        success: false,
        retries: 3,
        batched: false,
        usedFallback: false,
        error: {
          type: TransactionErrorType.CONFLICT,
          message: 'Conflict',
          code: 409
        }
      });
    });

    it('should calculate correct success rate', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.totalTransactions).toBe(3);
      expect(metrics.successfulTransactions).toBe(2);
      expect(metrics.failedTransactions).toBe(1);
      expect(metrics.successRate).toBeCloseTo(66.67, 1);
    });

    it('should calculate correct average duration', () => {
      const metrics = monitor.getMetrics();
      // Durations: 500ms, 300ms, 800ms
      // Average: (500 + 300 + 800) / 3 = 533.33ms
      expect(metrics.averageDuration).toBeCloseTo(533, 0);
    });

    it('should calculate correct retry metrics', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.totalRetries).toBe(4); // 0 + 1 + 3
      expect(metrics.retriesPerTransaction).toBeCloseTo(1.33, 1);
    });

    it('should calculate correct conflict rate', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.conflictRate).toBeCloseTo(33.33, 1);
    });

    it('should calculate correct operations per transaction', () => {
      const metrics = monitor.getMetrics();
      // Operations: 10, 5, 20
      // Average: (10 + 5 + 20) / 3 = 11.67
      expect(metrics.operationsPerTransaction).toBeCloseTo(12, 0);
    });

    it('should count errors by type', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.errorsByType[TransactionErrorType.CONFLICT]).toBe(1);
      expect(metrics.errorsByType[TransactionErrorType.VALIDATION]).toBe(0);
    });

    it('should calculate percentiles correctly', () => {
      const metrics = monitor.getMetrics();
      // Sorted durations: 300ms, 500ms, 800ms
      expect(metrics.p50Duration).toBe(500); // Median
      expect(metrics.p95Duration).toBe(800); // 95th percentile
      expect(metrics.p99Duration).toBe(800); // 99th percentile
    });
  });

  describe('alerts', () => {
    it('should trigger alert for low success rate', () => {
      // Record 10 transactions with 80% success rate (below 95% threshold)
      for (let i = 0; i < 8; i++) {
        monitor.recordTransaction({
          transactionId: `tx${i}`,
          operationType: 'test',
          operationCount: 1,
          startTime: 1000,
          endTime: 1100,
          success: true,
          retries: 0,
          batched: false,
          usedFallback: false
        });
      }

      for (let i = 8; i < 10; i++) {
        monitor.recordTransaction({
          transactionId: `tx${i}`,
          operationType: 'test',
          operationCount: 1,
          startTime: 1000,
          endTime: 1100,
          success: false,
          retries: 0,
          batched: false,
          usedFallback: false,
          error: {
            type: TransactionErrorType.UNKNOWN,
            message: 'Error'
          }
        });
      }

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(a => a.type === 'success_rate')).toBe(true);
    });

    it('should trigger alert for high fallback rate', () => {
      // Record 10 transactions with 20% fallback rate (above 5% threshold)
      for (let i = 0; i < 8; i++) {
        monitor.recordTransaction({
          transactionId: `tx${i}`,
          operationType: 'test',
          operationCount: 1,
          startTime: 1000,
          endTime: 1100,
          success: true,
          retries: 0,
          batched: false,
          usedFallback: false
        });
      }

      for (let i = 8; i < 10; i++) {
        monitor.recordTransaction({
          transactionId: `tx${i}`,
          operationType: 'test',
          operationCount: 1,
          startTime: 1000,
          endTime: 1100,
          success: true,
          retries: 0,
          batched: false,
          usedFallback: true
        });
      }

      const alerts = monitor.getAlerts();
      expect(alerts.some(a => a.type === 'fallback_rate')).toBe(true);
    });

    it('should trigger alert for rollback failures', () => {
      monitor.recordTransaction({
        transactionId: 'tx1',
        operationType: 'test',
        operationCount: 1,
        startTime: 1000,
        endTime: 1100,
        success: false,
        retries: 0,
        batched: false,
        usedFallback: false,
        error: {
          type: TransactionErrorType.ROLLBACK,
          message: 'Rollback failed'
        }
      });

      const alerts = monitor.getAlerts();
      expect(alerts.some(a => a.type === 'rollback_failure')).toBe(true);
      expect(alerts.find(a => a.type === 'rollback_failure')?.severity).toBe('critical');
    });

    it('should not duplicate alerts within 5 minutes', () => {
      // Record multiple transactions that would trigger the same alert
      for (let i = 0; i < 10; i++) {
        monitor.recordTransaction({
          transactionId: `tx${i}`,
          operationType: 'test',
          operationCount: 1,
          startTime: 1000,
          endTime: 1100,
          success: false,
          retries: 0,
          batched: false,
          usedFallback: false,
          error: {
            type: TransactionErrorType.UNKNOWN,
            message: 'Error'
          }
        });
      }

      const alerts = monitor.getAlerts();
      const successRateAlerts = alerts.filter(a => a.type === 'success_rate');
      expect(successRateAlerts.length).toBe(1); // Should only have one alert
    });
  });

  describe('time window filtering', () => {
    it('should filter metrics by time window', () => {
      const now = Date.now();
      
      // Record old transaction (2 hours ago)
      monitor.recordTransaction({
        transactionId: 'tx1',
        operationType: 'test',
        operationCount: 1,
        startTime: now - 7200000,
        endTime: now - 7199000,
        success: true,
        retries: 0,
        batched: false,
        usedFallback: false
      });

      // Record recent transaction (30 minutes ago)
      monitor.recordTransaction({
        transactionId: 'tx2',
        operationType: 'test',
        operationCount: 1,
        startTime: now - 1800000,
        endTime: now - 1799000,
        success: true,
        retries: 0,
        batched: false,
        usedFallback: false
      });

      // Get metrics for last hour
      const metrics = monitor.getMetrics(3600000);
      expect(metrics.totalTransactions).toBe(1); // Only recent transaction
    });
  });

  describe('getMetricsSummary', () => {
    it('should generate readable summary', () => {
      monitor.recordTransaction({
        transactionId: 'tx1',
        operationType: 'bulk_import',
        operationCount: 10,
        startTime: 1000,
        endTime: 1500,
        success: true,
        retries: 0,
        batched: false,
        usedFallback: false
      });

      const summary = monitor.getMetricsSummary();
      expect(summary).toContain('Transaction Metrics Summary');
      expect(summary).toContain('Total Transactions: 1');
      expect(summary).toContain('Success Rate: 100.0%');
    });

    it('should handle empty metrics', () => {
      const summary = monitor.getMetricsSummary();
      expect(summary).toContain('No transaction data available');
    });
  });

  describe('singleton instance', () => {
    it('should return same instance', () => {
      const instance1 = getTransactionMonitor();
      const instance2 = getTransactionMonitor();
      expect(instance1).toBe(instance2);
    });
  });

  describe('helper functions', () => {
    it('should record transaction via helper', () => {
      recordTransaction({
        transactionId: 'tx1',
        operationType: 'test',
        operationCount: 1,
        startTime: 1000,
        endTime: 1100,
        success: true,
        retries: 0,
        batched: false,
        usedFallback: false
      });

      const metrics = getMetrics();
      expect(metrics.totalTransactions).toBeGreaterThan(0);
    });

    it('should get alerts via helper', () => {
      const alerts = getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});

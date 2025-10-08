/**
 * Performance monitoring utilities for tracking query execution times
 * and logging performance metrics
 */

export interface QueryMetrics {
  queryName: string;
  duration: number;
  timestamp: number;
}

export interface PerformanceMetrics {
  totalTime: number;
  queryTimes: Record<string, number>;
  warnings: string[];
}

/**
 * Threshold for slow query warnings (in milliseconds)
 */
const SLOW_QUERY_THRESHOLD = 1000;

/**
 * Measures the execution time of a query function
 * @param queryName - Name of the query for logging purposes
 * @param queryFn - Async function to execute and measure
 * @returns Object containing the result and duration
 */
export async function measureQueryTime<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    // Log warning if query exceeds threshold
    if (duration > SLOW_QUERY_THRESHOLD) {
      console.warn(`⚠️ Slow query detected: "${queryName}" took ${duration}ms (threshold: ${SLOW_QUERY_THRESHOLD}ms)`);
    }
    
    return { result, duration };
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Query "${queryName}" failed after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Performance tracker for monitoring multiple queries in a request
 */
export class PerformanceTracker {
  private startTime: number;
  private queryMetrics: QueryMetrics[] = [];
  private warnings: string[] = [];

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Measures and tracks a query execution
   */
  async trackQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const { result, duration } = await measureQueryTime(queryName, queryFn);
    
    this.queryMetrics.push({
      queryName,
      duration,
      timestamp: Date.now()
    });

    if (duration > SLOW_QUERY_THRESHOLD) {
      this.warnings.push(`${queryName} exceeded ${SLOW_QUERY_THRESHOLD}ms (${duration}ms)`);
    }

    return result;
  }

  /**
   * Gets the total elapsed time since tracker creation
   */
  getTotalTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Gets all collected metrics
   */
  getMetrics(): PerformanceMetrics {
    const queryTimes: Record<string, number> = {};
    
    for (const metric of this.queryMetrics) {
      queryTimes[metric.queryName] = metric.duration;
    }

    return {
      totalTime: this.getTotalTime(),
      queryTimes,
      warnings: this.warnings
    };
  }

  /**
   * Logs a summary of all performance metrics
   */
  logSummary(requestPath: string): void {
    const metrics = this.getMetrics();
    
    console.log(`\n📊 Performance Summary for ${requestPath}`);
    console.log(`   Total Request Time: ${metrics.totalTime}ms`);
    console.log(`   Query Breakdown:`);
    
    for (const [queryName, duration] of Object.entries(metrics.queryTimes)) {
      const icon = duration > SLOW_QUERY_THRESHOLD ? '⚠️' : '✓';
      console.log(`     ${icon} ${queryName}: ${duration}ms`);
    }

    if (metrics.warnings.length > 0) {
      console.log(`   ⚠️ Warnings:`);
      for (const warning of metrics.warnings) {
        console.log(`     - ${warning}`);
      }
    }
    
    console.log('');
  }

  /**
   * Gets metrics formatted for HTTP response headers
   */
  getResponseHeaders(): Record<string, string> {
    const metrics = this.getMetrics();
    
    return {
      'X-Response-Time': `${metrics.totalTime}ms`,
      'X-Query-Count': String(Object.keys(metrics.queryTimes).length),
      'X-Slow-Queries': String(metrics.warnings.length)
    };
  }
}

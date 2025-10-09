/**
 * Performance monitoring utilities for tracking query execution times
 * and logging performance metrics
 */

export interface QueryMetrics {
  queryName: string;
  duration: number;
  timestamp: number;
}

/**
 * Query aggregation statistics with bounded duration samples
 * 
 * Memory Strategy:
 * - durations array uses a FIFO buffer with max size (default: 100 samples)
 * - When max size is reached, oldest samples are evicted
 * - This prevents unbounded memory growth while maintaining recent samples
 * - Set maxDurationSamples to 0 to disable duration tracking entirely
 */
export interface QueryAggregation {
  count: number;
  total: number;
  average: number;
  min: number;
  max: number;
  durations: number[];
}

export interface PerformanceMetrics {
  totalTime: number;
  queryTimes: Record<string, QueryAggregation>;
  warnings: string[];
}

/**
 * Threshold for slow query warnings (in milliseconds)
 */
const SLOW_QUERY_THRESHOLD = 1000;

/**
 * Maximum number of duration samples to keep per query (FIFO buffer)
 * Set to 0 to disable duration tracking and save memory
 * Default: 100 samples provides good statistical insight without excessive memory usage
 */
const MAX_DURATION_SAMPLES = 100;

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
   * Gets all collected metrics with aggregated query times
   * Aggregates multiple executions of the same query name
   * 
   * Memory Management:
   * - Uses bounded FIFO buffer for duration samples (max: MAX_DURATION_SAMPLES)
   * - Oldest samples are evicted when buffer is full
   * - Prevents unbounded memory growth in long-running processes
   */
  getMetrics(): PerformanceMetrics {
    const queryTimes: Record<string, QueryAggregation> = {};

    // Aggregate metrics by query name
    for (const metric of this.queryMetrics) {
      if (!queryTimes[metric.queryName]) {
        queryTimes[metric.queryName] = {
          count: 0,
          total: 0,
          average: 0,
          min: Infinity,
          max: -Infinity,
          durations: []
        };
      }

      const agg = queryTimes[metric.queryName];
      agg.count++;
      agg.total += metric.duration;
      agg.min = Math.min(agg.min, metric.duration);
      agg.max = Math.max(agg.max, metric.duration);

      // Bounded FIFO buffer: only store up to MAX_DURATION_SAMPLES
      if (MAX_DURATION_SAMPLES > 0) {
        agg.durations.push(metric.duration);

        // Evict oldest sample if buffer exceeds max size
        if (agg.durations.length > MAX_DURATION_SAMPLES) {
          agg.durations.shift(); // Remove oldest (first) element
        }
      }
      // If MAX_DURATION_SAMPLES is 0, durations array stays empty (memory optimization)

      agg.average = agg.total / agg.count;
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

    for (const [queryName, agg] of Object.entries(metrics.queryTimes)) {
      const icon = agg.max > SLOW_QUERY_THRESHOLD ? '⚠️' : '✓';

      if (agg.count === 1) {
        // Single execution - show simple format
        console.log(`     ${icon} ${queryName}: ${agg.total}ms`);
      } else {
        // Multiple executions - show aggregated stats
        console.log(`     ${icon} ${queryName}: ${agg.total}ms total (${agg.count}x, avg: ${Math.round(agg.average)}ms, min: ${agg.min}ms, max: ${agg.max}ms)`);
      }
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

    // Calculate total number of query executions (not unique query names)
    const totalExecutions = Object.values(metrics.queryTimes)
      .reduce((sum, agg) => sum + agg.count, 0);

    return {
      'X-Response-Time': `${metrics.totalTime}ms`,
      'X-Query-Count': String(totalExecutions),
      'X-Unique-Queries': String(Object.keys(metrics.queryTimes).length),
      'X-Slow-Queries': String(metrics.warnings.length)
    };
  }
}

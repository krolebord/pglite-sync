export interface QueryTimingResult<T = any> {
  result: T;
  duration: number;
  query: string;
  params?: any[];
  timestamp: number;
}

export interface QueryStats {
  totalQueries: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  slowestQuery: string;
  fastestQuery: string;
}

class QueryTimer {
  private stats: QueryTimingResult[] = [];
  private readonly maxHistorySize = 1000;

  async timeQuery<T>(
    queryFn: () => Promise<T>,
    query: string,
    params?: any[]
  ): Promise<QueryTimingResult<T>> {
    const start = performance.now();
    const timestamp = Date.now();
    
    try {
      const result = await queryFn();
      const duration = performance.now() - start;
      
      const timingResult: QueryTimingResult<T> = {
        result,
        duration,
        query,
        params,
        timestamp
      };
      
      this.addToStats(timingResult);
      this.logTiming(timingResult);
      
      return timingResult;
    } catch (error) {
      const duration = performance.now() - start;
      
      const timingResult: QueryTimingResult<T> = {
        result: null as T,
        duration,
        query,
        params,
        timestamp
      };
      
      this.addToStats(timingResult);
      this.logError(timingResult, error);
      
      throw error;
    }
  }

  private addToStats(result: QueryTimingResult): void {
    this.stats.push(result);
    
    // Keep only recent queries to prevent memory bloat
    if (this.stats.length > this.maxHistorySize) {
      this.stats = this.stats.slice(-this.maxHistorySize);
    }
  }

  private logTiming(result: QueryTimingResult): void {
    const { duration, query, params } = result;
    const color = this.getDurationColor(duration);
    
    console.log(
      `%c🔍 Query: ${this.truncateQuery(query)}`,
      `color: ${color}; font-weight: bold;`
    );
    console.log(
      `%c⏱️  Duration: ${duration.toFixed(2)}ms`,
      `color: ${color};`
    );
    
    if (params && params.length > 0) {
      console.log(`%c📄 Params:`, 'color: #666;', params);
    }
    
    // Warn on slow queries
    if (duration > 100) {
      console.warn(
        `🐌 Slow query detected (${duration.toFixed(2)}ms): ${this.truncateQuery(query)}`
      );
    }
  }

  private logError(result: QueryTimingResult, error: any): void {
    console.error(
      `❌ Query failed after ${result.duration.toFixed(2)}ms: ${this.truncateQuery(result.query)}`,
      error
    );
  }

  private getDurationColor(duration: number): string {
    if (duration < 10) return '#28a745'; // Green - fast
    if (duration < 50) return '#ffc107'; // Yellow - moderate
    if (duration < 100) return '#fd7e14'; // Orange - slow
    return '#dc3545'; // Red - very slow
  }

  private truncateQuery(query: string): string {
    const cleaned = query.trim().replace(/\s+/g, ' ');
    return cleaned.length > 100 ? `${cleaned.substring(0, 100)}...` : cleaned;
  }

  getStats(): QueryStats {
    if (this.stats.length === 0) {
      return {
        totalQueries: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        slowestQuery: '',
        fastestQuery: ''
      };
    }

    const durations = this.stats.map(s => s.duration);
    const totalTime = durations.reduce((sum, d) => sum + d, 0);
    const minTime = Math.min(...durations);
    const maxTime = Math.max(...durations);
    
    const slowestQueryResult = this.stats.find(s => s.duration === maxTime);
    const fastestQueryResult = this.stats.find(s => s.duration === minTime);

    return {
      totalQueries: this.stats.length,
      totalTime,
      averageTime: totalTime / this.stats.length,
      minTime,
      maxTime,
      slowestQuery: slowestQueryResult?.query || '',
      fastestQuery: fastestQueryResult?.query || ''
    };
  }

  getRecentQueries(count: number = 10): QueryTimingResult[] {
    return this.stats.slice(-count).reverse();
  }

  getSlowQueries(threshold: number = 50): QueryTimingResult[] {
    return this.stats
      .filter(s => s.duration > threshold)
      .sort((a, b) => b.duration - a.duration);
  }

  clearStats(): void {
    this.stats = [];
    console.log('📊 Query statistics cleared');
  }

  logSummary(): void {
    const stats = this.getStats();
    
    console.group('📊 Query Performance Summary');
    console.log(`Total Queries: ${stats.totalQueries}`);
    console.log(`Total Time: ${stats.totalTime.toFixed(2)}ms`);
    console.log(`Average Time: ${stats.averageTime.toFixed(2)}ms`);
    console.log(`Fastest Query: ${stats.minTime.toFixed(2)}ms`);
    console.log(`Slowest Query: ${stats.maxTime.toFixed(2)}ms`);
    
    if (stats.slowestQuery) {
      console.log(`Slowest: ${this.truncateQuery(stats.slowestQuery)}`);
    }
    
    const slowQueries = this.getSlowQueries(50);
    if (slowQueries.length > 0) {
      console.warn(`🐌 ${slowQueries.length} slow queries (>50ms) detected`);
    }
    
    console.groupEnd();
  }
}

// Create singleton instance
export const queryTimer = new QueryTimer();

// Helper function for quick timing
export async function timeQuery<T>(
  queryFn: () => Promise<T>,
  query: string,
  params?: any[]
): Promise<T> {
  const result = await queryTimer.timeQuery(queryFn, query, params);
  return result.result;
}

// Helper function for database query timing
export async function timeDbQuery<T>(
  db: any,
  query: string,
  params?: any[]
): Promise<T> {
  return timeQuery(() => db.query(query, params), query, params);
}
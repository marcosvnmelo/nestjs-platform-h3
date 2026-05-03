import type { Result } from 'autocannon';

import type {
  BenchmarkAggregate,
  BenchmarkCase,
  BenchmarkStats,
} from '../types.ts';

export function printPairComparison(
  results: BenchmarkAggregate[],
  pureName: string,
  nestName: string,
) {
  const pure = results.find((item) => item.name === pureName);
  const nest = results.find((item) => item.name === nestName);

  if (!pure || !nest) {
    return;
  }

  const delta =
    ((nest.requestsPerSecMedian - pure.requestsPerSecMedian) /
      pure.requestsPerSecMedian) *
    100;
  const sign = delta >= 0 ? '+' : '';

  console.log(`\n${pureName} vs ${nestName}`);
  console.log(
    `- req/s median: ${pure.requestsPerSecMedian.toFixed(2)} vs ${nest.requestsPerSecMedian.toFixed(2)}`,
  );
  console.log(`- delta: ${sign}${delta.toFixed(2)}%`);
}

export function toStats(
  name: string,
  result: Result,
  run: number,
): BenchmarkStats {
  return {
    name,
    run,
    requestsPerSec: result.requests.average,
    latencyAvgMs: result.latency.average,
    latencyP99Ms: result.latency.p99,
    throughputMbps: (result.throughput.average * 8) / (1024 * 1024),
    errors: result.errors,
    timeouts: result.timeouts,
  };
}

export function printRunStats(stats: BenchmarkStats) {
  console.log(
    [
      `run=${stats.run}`,
      `req/s=${stats.requestsPerSec.toFixed(2)}`,
      `lat(avg)=${stats.latencyAvgMs.toFixed(2)}ms`,
      `lat(p99)=${stats.latencyP99Ms.toFixed(2)}ms`,
      `errors=${stats.errors}`,
      `timeouts=${stats.timeouts}`,
    ].join(' | '),
  );
}

export function shuffleCases(entries: BenchmarkCase[]): BenchmarkCase[] {
  const shuffled = [...entries];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

export function aggregateResults(
  results: BenchmarkStats[],
): BenchmarkAggregate[] {
  const grouped = new Map<string, BenchmarkStats[]>();
  for (const result of results) {
    const entries = grouped.get(result.name);
    if (entries) {
      entries.push(result);
    } else {
      grouped.set(result.name, [result]);
    }
  }

  return [...grouped.entries()]
    .map(([name, entries]) => ({
      name,
      runs: entries.length,
      requestsPerSecMedian: percentile(
        entries.map((entry) => entry.requestsPerSec),
        0.5,
      ),
      requestsPerSecP25: percentile(
        entries.map((entry) => entry.requestsPerSec),
        0.25,
      ),
      requestsPerSecP75: percentile(
        entries.map((entry) => entry.requestsPerSec),
        0.75,
      ),
      latencyAvgMedianMs: percentile(
        entries.map((entry) => entry.latencyAvgMs),
        0.5,
      ),
      latencyP99MedianMs: percentile(
        entries.map((entry) => entry.latencyP99Ms),
        0.5,
      ),
      throughputMedianMbps: percentile(
        entries.map((entry) => entry.throughputMbps),
        0.5,
      ),
      totalErrors: entries.reduce((sum, entry) => sum + entry.errors, 0),
      totalTimeouts: entries.reduce((sum, entry) => sum + entry.timeouts, 0),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

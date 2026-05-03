import type { ChildProcess } from 'node:child_process';

export interface ServerProcess {
  url: string;
  pid: ChildProcess;
}

export interface BenchmarkCase {
  name: string;
  scriptPath: string;
  args?: string[];
}

export interface BenchmarkStats {
  name: string;
  run: number;
  requestsPerSec: number;
  latencyAvgMs: number;
  latencyP99Ms: number;
  throughputMbps: number;
  errors: number;
  timeouts: number;
}

export interface BenchmarkAggregate {
  name: string;
  runs: number;
  requestsPerSecMedian: number;
  requestsPerSecP25: number;
  requestsPerSecP75: number;
  latencyAvgMedianMs: number;
  latencyP99MedianMs: number;
  throughputMedianMbps: number;
  totalErrors: number;
  totalTimeouts: number;
}

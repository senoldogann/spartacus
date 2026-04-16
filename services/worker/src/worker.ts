/**
 * Benchmark worker process.
 * Consumes benchmark run jobs from a Redis queue and orchestrates execution.
 */

function describeRedisTarget(redisConnectionString: string): {
  readonly protocol: string;
  readonly host: string;
  readonly port: string;
} {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(redisConnectionString);
  } catch {
    throw new Error("REDIS_URL must be a valid URL");
  }

  return {
    protocol: parsedUrl.protocol.replace(":", ""),
    host: parsedUrl.hostname,
    port: parsedUrl.port === "" ? "6379" : parsedUrl.port,
  };
}

// eslint-disable-next-line no-console
console.log("RepoBench Worker starting...");

const redisUrl = process.env["REDIS_URL"];
if (redisUrl === undefined) {
  throw new Error("REDIS_URL environment variable is required");
}

const concurrency = parseInt(process.env["WORKER_CONCURRENCY"] ?? "2", 10);

if (Number.isNaN(concurrency)) {
  throw new Error("WORKER_CONCURRENCY must be a valid number");
}

const redisTarget = describeRedisTarget(redisUrl);

// eslint-disable-next-line no-console
console.log("Worker configured", {
  redisProtocol: redisTarget.protocol,
  redisHost: redisTarget.host,
  redisPort: redisTarget.port,
  concurrency,
});

// TODO: Initialize BullMQ Worker
// - Listen for 'benchmark-run' jobs
// - Call runBenchmarkJob for each job
// - Report progress and results

// eslint-disable-next-line no-console
console.log("Worker bootstrap complete. Benchmark job consumer is not implemented yet.");

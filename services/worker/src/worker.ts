/**
 * Benchmark worker process.
 * Consumes benchmark run jobs from a Redis queue and orchestrates execution.
 */
import { Worker } from "bullmq";
import { createRedisConnectionOptions } from "@repobench/storage";
import { runBenchmarkJob } from "./run-benchmark-job.js";
import type { BenchmarkJobInput } from "./run-benchmark-job.js";

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

const databaseUrl = process.env["DATABASE_URL"];
if (databaseUrl === undefined) {
    throw new Error("DATABASE_URL environment variable is required");
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

// A single benchmark job can take: clone (≤180s) + agent (≤120s) + tests (≤120s) = ~7 min.
// Lock must exceed the maximum expected job duration so BullMQ doesn't mark it stalled and
// re-queue it while a worker is still processing it — which would cause duplicate execution.
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const worker = new Worker<BenchmarkJobInput>(
    "benchmark-run",
    async (job) => {
        // eslint-disable-next-line no-console
        console.log(`Processing job ${job.id}: run=${job.data.runId}`);
        await runBenchmarkJob(job.data, databaseUrl);
        // eslint-disable-next-line no-console
        console.log(`Completed job ${job.id}: run=${job.data.runId}`);
    },
    {
        concurrency,
        lockDuration: LOCK_DURATION_MS,
        // Retry up to 2 more times on transient failures (network blip, DB hiccup).
        // The job is idempotent for already-settled tasks so retries are safe.
        settings: {
            backoffStrategy: (attemptsMade: number): number => Math.min(10_000 * attemptsMade, 60_000),
        },
        connection: createRedisConnectionOptions(redisUrl),
    },
);

worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("Worker error:", err.message);
});

// Gracefully drain in-flight jobs before shutting down so the run state machine
// always reaches a terminal state and the lock is cleanly released.
process.on("SIGTERM", () => {
    // eslint-disable-next-line no-console
    console.log("SIGTERM received — closing worker gracefully...");
    worker
        .close()
        .then(() => {
            // eslint-disable-next-line no-console
            console.log("Worker closed");
            process.exit(0);
        })
        .catch((err: unknown) => {
            // eslint-disable-next-line no-console
            console.error("Error closing worker:", err);
            process.exit(1);
        });
});

// eslint-disable-next-line no-console
console.log("Worker listening on queue: benchmark-run");

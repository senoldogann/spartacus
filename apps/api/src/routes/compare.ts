import type { FastifyInstance } from "fastify";
import { calculateCompletionRate, calculatePassRate } from "./run-metrics.js";

const compareSchema = {
    querystring: {
        type: "object" as const,
        required: ["runA", "runB"],
        properties: {
            runA: { type: "string" as const, minLength: 1 },
            runB: { type: "string" as const, minLength: 1 },
        },
    },
};

/**
 * Comparison and reporting endpoints.
 */
export function registerCompareRoutes(server: FastifyInstance): void {
    server.get<{ Querystring: { runA: string; runB: string } }>(
        "/api/compare",
        { schema: compareSchema },
        async (request, reply) => {
            const { runA, runB } = request.query;

            if (typeof runA !== "string" || typeof runB !== "string") {
                return reply.code(400).send({ error: "runA and runB query params are required" });
            }

            const [a, b] = await Promise.all([server.runs.findById(runA), server.runs.findById(runB)]);

            if (a === null || b === null) {
                return reply.code(404).send({ error: "One or both runs not found" });
            }

            if (a.suiteId !== b.suiteId) {
                return reply.code(422).send({ error: "Runs must belong to the same suite" });
            }

            return {
                comparison: {
                    suiteId: a.suiteId,
                    runA: {
                        id: a.id,
                        status: a.status,
                        totalTasks: a.totalTasks,
                        completedTasks: a.completedTasks,
                        passedTasks: a.passedTasks,
                        failedTasks: a.failedTasks,
                        completionRate: calculateCompletionRate(a),
                        passRate: calculatePassRate(a),
                    },
                    runB: {
                        id: b.id,
                        status: b.status,
                        totalTasks: b.totalTasks,
                        completedTasks: b.completedTasks,
                        passedTasks: b.passedTasks,
                        failedTasks: b.failedTasks,
                        completionRate: calculateCompletionRate(b),
                        passRate: calculatePassRate(b),
                    },
                },
            };
        },
    );

    server.get<{ Params: { id: string } }>("/api/runs/:id/report", async (request, reply) => {
        const run = await server.runs.findById(request.params.id);
        if (run === null) {
            return reply.code(404).send({ error: "Run not found" });
        }

        return {
            report: {
                runId: run.id,
                suiteId: run.suiteId,
                agentProfileId: run.agentProfileId,
                status: run.status,
                totalTasks: run.totalTasks,
                completedTasks: run.completedTasks,
                passedTasks: run.passedTasks,
                failedTasks: run.failedTasks,
                completionRate: calculateCompletionRate(run),
                passRate: calculatePassRate(run),
                createdAt: run.createdAt,
                completedAt: run.completedAt,
            },
        };
    });
}

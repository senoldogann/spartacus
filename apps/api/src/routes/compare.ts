import type { FastifyInstance } from "fastify";

/**
 * Comparison and reporting endpoints.
 */
export function registerCompareRoutes(server: FastifyInstance): void {
  server.get<{ Querystring: { runA: string; runB: string } }>(
    "/api/compare",
    async (request, reply) => {
      const { runA, runB } = request.query;

      if (typeof runA !== "string" || typeof runB !== "string") {
        return reply.code(400).send({ error: "runA and runB query params are required" });
      }

      const [a, b] = await Promise.all([server.runs.findById(runA), server.runs.findById(runB)]);

      if (a === null || b === null) {
        return reply.code(404).send({ error: "One or both runs not found" });
      }

      return {
        comparison: {
          runA: {
            id: a.id,
            status: a.status,
            totalTasks: a.totalTasks,
            passedTasks: a.passedTasks,
            failedTasks: a.failedTasks,
            passRate: a.completedTasks > 0 ? a.passedTasks / a.completedTasks : 0,
          },
          runB: {
            id: b.id,
            status: b.status,
            totalTasks: b.totalTasks,
            passedTasks: b.passedTasks,
            failedTasks: b.failedTasks,
            passRate: b.completedTasks > 0 ? b.passedTasks / b.completedTasks : 0,
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
        passedTasks: run.passedTasks,
        failedTasks: run.failedTasks,
        passRate: run.completedTasks > 0 ? run.passedTasks / run.completedTasks : 0,
        createdAt: run.createdAt,
        completedAt: run.completedAt,
      },
    };
  });
}

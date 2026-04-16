import type { FastifyInstance } from "fastify";
import { sendNotImplemented } from "../not-implemented.js";

/**
 * Benchmark run management endpoints.
 */
export function registerRunRoutes(server: FastifyInstance): void {
  // Start a new benchmark run
  server.post<{ Params: { suiteId: string } }>(
    "/api/suites/:suiteId/runs",
    async (_request, reply) => {
      await sendNotImplemented(reply, "Run creation");
    },
  );

  // Get run status and progress
  server.get<{ Params: { id: string } }>("/api/runs/:id", async (_request, reply) => {
    await sendNotImplemented(reply, "Run status lookup");
  });

  // List runs for a suite
  server.get<{ Params: { suiteId: string } }>(
    "/api/suites/:suiteId/runs",
    async (_request, reply) => {
      await sendNotImplemented(reply, "Run listing");
    },
  );

  // Get detailed results for a run
  server.get<{ Params: { id: string } }>("/api/runs/:id/results", async (_request, reply) => {
    await sendNotImplemented(reply, "Run results lookup");
  });
}

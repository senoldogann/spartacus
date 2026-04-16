import type { FastifyInstance } from "fastify";
import { sendNotImplemented } from "../not-implemented.js";

/**
 * Benchmark suite management endpoints.
 */
export function registerSuiteRoutes(server: FastifyInstance): void {
  // List suites for a repository
  server.get<{ Params: { repoId: string } }>(
    "/api/repos/:repoId/suites",
    async (_request, reply) => {
      await sendNotImplemented(reply, "Suite listing");
    },
  );

  // Get suite detail
  server.get<{ Params: { id: string } }>("/api/suites/:id", async (_request, reply) => {
    await sendNotImplemented(reply, "Suite detail lookup");
  });

  // Create a new suite from imported PRs
  server.post<{ Params: { repoId: string } }>(
    "/api/repos/:repoId/suites",
    async (_request, reply) => {
      await sendNotImplemented(reply, "Suite creation");
    },
  );
}

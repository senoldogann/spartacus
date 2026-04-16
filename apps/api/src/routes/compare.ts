import type { FastifyInstance } from "fastify";
import { sendNotImplemented } from "../not-implemented.js";

/**
 * Comparison and reporting endpoints.
 */
export function registerCompareRoutes(server: FastifyInstance): void {
    // Compare two runs side-by-side
    server.get("/api/compare", async (_request, reply) => {
        await sendNotImplemented(reply, "Run comparison");
    });

    // Export run report as JSON
    server.get<{ Params: { id: string } }>(
        "/api/runs/:id/report",
        async (_request, reply) => {
            await sendNotImplemented(reply, "Run reporting");
        },
    );
}

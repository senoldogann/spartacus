import type { FastifyInstance } from "fastify";
import { sendNotImplemented } from "../not-implemented.js";

/**
 * Repository management endpoints.
 */
export function registerRepoRoutes(server: FastifyInstance): void {
    // List all tracked repositories
    server.get("/api/repos", async (_request, reply) => {
        await sendNotImplemented(reply, "Repository listing");
    });

    // Get a single repository
    server.get<{ Params: { id: string } }>("/api/repos/:id", async (_request, reply) => {
        await sendNotImplemented(reply, "Repository detail lookup");
    });

    // Connect a new repository
    server.post("/api/repos", async (_request, reply) => {
        await sendNotImplemented(reply, "Repository creation");
    });
}

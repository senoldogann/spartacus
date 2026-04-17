import { registerRepoRoutes } from "./routes/repos.js";
import { registerSuiteRoutes } from "./routes/suites.js";
import { registerRunRoutes } from "./routes/runs.js";
import { registerCompareRoutes } from "./routes/compare.js";
import { registerAgentProfileRoutes } from "./routes/agent-profiles.js";
import { authPlugin } from "./plugins/auth.js";
import { dbPlugin } from "./plugins/db.js";

/**
 * RepoBench API server.
 * Fastify-based REST API for managing repositories, suites, runs, and reports.
 */
async function start(): Promise<void> {
    const { default: Fastify } = await import("fastify");

    const port = parseInt(process.env["API_PORT"] ?? "3001", 10);
    const host = process.env["API_HOST"] ?? "0.0.0.0";

    if (Number.isNaN(port)) {
        throw new Error("API_PORT must be a valid number");
    }

    const server = Fastify({
        logger: {
            redact: ["req.headers.authorization"],
        },
    });

    await server.register(authPlugin);
    await server.register(dbPlugin);

    // Health check — verifies DB connectivity (registered after plugins but exempted from auth)
    server.get("/health", async () => {
        const dbOk = await server.repos
            .listAll()
            .then(() => true)
            .catch(() => false);

        if (!dbOk) {
            throw new Error("Database health check failed");
        }

        return { status: "ok" };
    });

    // Register route modules
    registerRepoRoutes(server);
    registerAgentProfileRoutes(server);
    registerSuiteRoutes(server);
    registerRunRoutes(server);
    registerCompareRoutes(server);

    await server.listen({ port, host });
}

start().catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start API server:", err);
    process.exit(1);
});

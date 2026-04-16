import { registerRepoRoutes } from "./routes/repos.js";
import { registerSuiteRoutes } from "./routes/suites.js";
import { registerRunRoutes } from "./routes/runs.js";
import { registerCompareRoutes } from "./routes/compare.js";
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

  // Health check
  server.get("/health", async () => ({ status: "ok" }));

  await server.register(authPlugin);
  await server.register(dbPlugin);

  // Register route modules
  registerRepoRoutes(server);
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

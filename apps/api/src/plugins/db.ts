import type { FastifyPluginAsync } from "fastify";

function validateDatabaseUrl(databaseUrl: string): void {
  try {
    new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid URL");
  }
}

/**
 * Validates database configuration required to bootstrap the API.
 */
export const dbPlugin: FastifyPluginAsync = async (_server) => {
  const databaseUrl = process.env["DATABASE_URL"];
  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  validateDatabaseUrl(databaseUrl);
};

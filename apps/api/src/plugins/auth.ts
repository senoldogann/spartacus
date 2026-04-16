import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";

const BEARER_PREFIX = "Bearer ";
const HMAC_KEY = randomBytes(32);

function getExpectedApiToken(): Buffer {
  const apiToken = process.env["API_AUTH_TOKEN"];
  if (apiToken === undefined || apiToken.trim().length === 0) {
    throw new Error("API_AUTH_TOKEN environment variable is required");
  }

  return Buffer.from(apiToken, "utf8");
}

function hasMatchingToken(expectedToken: Buffer, providedToken: string): boolean {
  const providedBuffer = Buffer.from(providedToken, "utf8");
  const expectedHmac = createHmac("sha256", HMAC_KEY).update(expectedToken).digest();
  const providedHmac = createHmac("sha256", HMAC_KEY).update(providedBuffer).digest();
  return timingSafeEqual(expectedHmac, providedHmac);
}

/**
 * Validates API tokens for protected endpoints.
 */
export const authPlugin: FastifyPluginAsync = async (server) => {
  const expectedToken = getExpectedApiToken();

  server.addHook("onRequest", async (request, reply) => {
    // Skip auth for health check
    if (request.url === "/health") {
      return;
    }

    const authHeader = request.headers.authorization;
    if (authHeader === undefined) {
      await reply.code(401).send({ error: "Missing authorization header" });
      return;
    }

    if (!authHeader.startsWith("Bearer ")) {
      await reply.code(401).send({ error: "Invalid authorization format" });
      return;
    }

    const providedToken = authHeader.slice(BEARER_PREFIX.length).trim();
    if (providedToken.length === 0) {
      await reply.code(401).send({ error: "Missing bearer token" });
      return;
    }

    if (!hasMatchingToken(expectedToken, providedToken)) {
      await reply.code(401).send({ error: "Invalid API token" });
      return;
    }
  });
};

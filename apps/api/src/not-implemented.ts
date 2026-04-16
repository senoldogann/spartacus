import type { FastifyReply } from "fastify";

/**
 * Sends a consistent not-implemented response for unfinished API capabilities.
 */
export async function sendNotImplemented(reply: FastifyReply, capability: string): Promise<void> {
  await reply.code(501).send({
    error: `${capability} is not implemented yet`,
  });
}

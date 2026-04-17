import type { FastifyInstance } from "fastify";
import { fetchRepository } from "@repobench/repo-ingest";

type CreateRepoBody = {
  readonly owner: string;
  readonly name: string;
};

function parseCreateRepoBody(body: unknown): CreateRepoBody | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const candidate = body as Record<string, unknown>;
  const owner = candidate["owner"];
  const name = candidate["name"];

  if (typeof owner !== "string" || typeof name !== "string") {
    return null;
  }

  return { owner, name };
}

/**
 * Repository management endpoints.
 */
export function registerRepoRoutes(server: FastifyInstance): void {
  server.get("/api/repos", async () => {
    const repos = await server.repos.listAll();
    return { repos };
  });

  server.get<{ Params: { id: string } }>("/api/repos/:id", async (request, reply) => {
    const repo = await server.repos.findById(request.params.id);
    if (repo === null) {
      return reply.code(404).send({ error: "Repository not found" });
    }
    return { repo };
  });

  server.post<{ Body: CreateRepoBody }>("/api/repos", async (request, reply) => {
    const body = parseCreateRepoBody(request.body);
    if (body === null) {
      return reply.code(400).send({ error: "owner and name are required" });
    }

    const { owner, name } = body;

    const token = process.env["GITHUB_TOKEN"];
    if (token === undefined || token.trim().length === 0) {
      return reply.code(500).send({ error: "GITHUB_TOKEN not configured" });
    }

    const existing = await server.repos.findByFullName(`${owner}/${name}`);
    if (existing !== null) {
      return { repo: existing };
    }

    const repo = await fetchRepository(owner, name, token);
    const created = await server.repos.create(repo);
    return reply.code(201).send({ repo: created });
  });
}

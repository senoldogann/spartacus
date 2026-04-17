import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  assertSupportedAgentProfile,
  getDefaultExecutionModeForProvider,
  resolveRequestedAgentRuntimeConfig,
} from "@repobench/agents";
import type { AgentExecutionMode, AgentProfile, AgentProvider } from "@repobench/domain";

type CreateAgentProfileBody = {
  readonly name: string;
  readonly provider: AgentProvider;
  readonly model: string;
  readonly executionMode?: AgentExecutionMode;
  readonly runtimeConfig?: Record<string, unknown>;
  readonly config?: Record<string, unknown>;
};

const VALID_AGENT_PROVIDERS = new Set<AgentProvider>(["claude", "codex", "open-source"]);
const VALID_EXECUTION_MODES = new Set<AgentExecutionMode>(["hosted", "local"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCreateAgentProfileBody(body: unknown): CreateAgentProfileBody | null {
  if (!isRecord(body)) {
    return null;
  }

  const name = body["name"];
  const provider = body["provider"];
  const model = body["model"];
  const executionMode = body["executionMode"];
  const runtimeConfig = body["runtimeConfig"];
  const config = body["config"];

  if (
    typeof name !== "string" ||
    typeof provider !== "string" ||
    typeof model !== "string" ||
    !VALID_AGENT_PROVIDERS.has(provider as AgentProvider) ||
    (executionMode !== undefined &&
      (typeof executionMode !== "string" ||
        !VALID_EXECUTION_MODES.has(executionMode as AgentExecutionMode)))
  ) {
    return null;
  }

  if (runtimeConfig !== undefined && !isRecord(runtimeConfig)) {
    return null;
  }

  if (config !== undefined && !isRecord(config)) {
    return null;
  }

  return {
    name,
    provider: provider as AgentProvider,
    model,
    executionMode: executionMode as AgentExecutionMode | undefined,
    runtimeConfig,
    config,
  };
}

/**
 * Agent profile management endpoints.
 */
export function registerAgentProfileRoutes(server: FastifyInstance): void {
  server.get("/api/agent-profiles", async () => {
    const agentProfiles = await server.agentProfiles.listAll();
    return { agentProfiles };
  });

  server.get<{ Params: { id: string } }>("/api/agent-profiles/:id", async (request, reply) => {
    const agentProfile = await server.agentProfiles.findById(request.params.id);
    if (agentProfile === null) {
      return reply.code(404).send({ error: "Agent profile not found" });
    }

    return { agentProfile };
  });

  server.post<{ Body: CreateAgentProfileBody }>("/api/agent-profiles", async (request, reply) => {
    const body = parseCreateAgentProfileBody(request.body);
    if (body === null) {
      return reply
        .code(400)
        .send({ error: "name, provider, and model are required; config must be an object" });
    }

    if (body.name.trim().length === 0 || body.model.trim().length === 0) {
      return reply.code(400).send({ error: "name and model must not be empty" });
    }

    const executionMode = body.executionMode ?? getDefaultExecutionModeForProvider(body.provider);
    let runtimeConfig: AgentProfile["runtimeConfig"];

    try {
      runtimeConfig = resolveRequestedAgentRuntimeConfig(
        body.provider,
        executionMode,
        body.runtimeConfig,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.code(400).send({ error: message });
    }

    const agentProfile: AgentProfile = {
      id: randomUUID(),
      name: body.name,
      provider: body.provider,
      model: body.model,
      executionMode,
      runtimeConfig,
      config: body.config ?? {},
      createdAt: new Date(),
    };

    try {
      assertSupportedAgentProfile(agentProfile);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.code(400).send({ error: message });
    }

    const created = await server.agentProfiles.create(agentProfile);
    return reply.code(201).send({ agentProfile: created });
  });
}

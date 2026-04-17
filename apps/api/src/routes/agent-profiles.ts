import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  assertSupportedAgentProfile,
  getDefaultExecutionModeForProvider,
  resolveRequestedAgentRuntimeConfig,
} from "@repobench/agents";
import type { AgentExecutionMode, AgentProfile, AgentProvider } from "@repobench/domain";
import type { PaginationParams } from "@repobench/storage";

const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 50;

function parsePagination(query: Record<string, unknown>): PaginationParams {
  const rawLimit = query["limit"];
  const rawOffset = query["offset"];
  const limit = typeof rawLimit === "string" ? Math.min(parseInt(rawLimit, 10) || DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT) : DEFAULT_PAGE_LIMIT;
  const offset = typeof rawOffset === "string" ? Math.max(parseInt(rawOffset, 10) || 0, 0) : 0;
  return { limit, offset };
}

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

const createAgentProfileSchema = {
  body: {
    type: "object" as const,
    required: ["name", "provider", "model"],
    properties: {
      name: { type: "string" as const, minLength: 1 },
      provider: { type: "string" as const, enum: ["claude", "codex", "open-source"] },
      model: { type: "string" as const, minLength: 1 },
      executionMode: { type: "string" as const, enum: ["hosted", "local"] },
      runtimeConfig: { type: "object" as const },
      config: { type: "object" as const },
    },
    additionalProperties: false,
  },
};

const SENSITIVE_CONFIG_KEYS = new Set([
  "apiKey", "api_key", "secretKey", "secret_key", "token", "password",
  "secret", "credentials", "accessKey", "access_key",
]);

function sanitizeAgentProfileConfig(config: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (SENSITIVE_CONFIG_KEYS.has(key)) {
      sanitized[key] = "***REDACTED***";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function sanitizeAgentProfile(profile: AgentProfile): Omit<AgentProfile, "config"> & { config: Record<string, unknown> } {
  return {
    ...profile,
    config: sanitizeAgentProfileConfig(profile.config),
  };
}

/**
 * Agent profile management endpoints.
 */
export function registerAgentProfileRoutes(server: FastifyInstance): void {
  server.get("/api/agent-profiles", async (request) => {
    const pagination = parsePagination(request.query as Record<string, unknown>);
    const agentProfiles = await server.agentProfiles.listAll(pagination);
    return { agentProfiles: agentProfiles.map(sanitizeAgentProfile) };
  });

  server.get<{ Params: { id: string } }>("/api/agent-profiles/:id", async (request, reply) => {
    const agentProfile = await server.agentProfiles.findById(request.params.id);
    if (agentProfile === null) {
      return reply.code(404).send({ error: "Agent profile not found" });
    }

    return { agentProfile: sanitizeAgentProfile(agentProfile) };
  });

  server.post<{ Body: CreateAgentProfileBody }>("/api/agent-profiles", { schema: createAgentProfileSchema }, async (request, reply) => {
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

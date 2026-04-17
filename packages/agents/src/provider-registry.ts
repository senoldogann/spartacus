import type { AgentExecutionMode, AgentProfile, AgentRuntimeConfig } from "@repobench/domain";
import type { AgentAdapter } from "./agent-adapter.js";
import { createClaudeAdapter } from "./providers/claude.js";
import { createCodexAdapter } from "./providers/codex.js";
import { createOpenSourceAdapter } from "./providers/open-source.js";

const LOCAL_OPENAI_BASE_URL = "http://127.0.0.1:11434/v1";

const HOSTED_PROVIDER_CREDENTIAL_ENV_VARS = {
  claude: "ANTHROPIC_API_KEY",
  codex: "OPENAI_API_KEY",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isLoopbackUrl(value: string): boolean {
  try {
    const parsedUrl = new URL(value);
    const normalizedHostname = parsedUrl.hostname === "[::1]" ? "::1" : parsedUrl.hostname;
    return (
      normalizedHostname === "127.0.0.1" ||
      normalizedHostname === "localhost" ||
      normalizedHostname === "::1"
    );
  } catch {
    return false;
  }
}

export function getDefaultExecutionModeForProvider(
  provider: AgentProfile["provider"],
): AgentExecutionMode {
  if (provider === "open-source") {
    return "local";
  }

  return "hosted";
}

export function getDefaultRuntimeConfig(
  provider: AgentProfile["provider"],
  executionMode: AgentExecutionMode,
): AgentRuntimeConfig {
  if (executionMode === "hosted") {
    return {
      transport: "provider-api",
    };
  }

  if (provider !== "open-source") {
    throw new Error(`Local execution is not supported for provider: ${provider}`);
  }

  return {
    transport: "openai-compatible-http",
    baseUrl: LOCAL_OPENAI_BASE_URL,
  };
}

export function normalizeAgentRuntimeConfig(
  provider: AgentProfile["provider"],
  executionMode: AgentExecutionMode,
  runtimeConfig: unknown,
): AgentRuntimeConfig {
  if (!isRecord(runtimeConfig)) {
    return getDefaultRuntimeConfig(provider, executionMode);
  }

  const transport = runtimeConfig["transport"];
  const apiKeyEnvVar = runtimeConfig["apiKeyEnvVar"];

  if (typeof transport !== "string") {
    return getDefaultRuntimeConfig(provider, executionMode);
  }

  if (transport === "provider-api") {
    return {
      transport,
      apiKeyEnvVar: typeof apiKeyEnvVar === "string" ? apiKeyEnvVar : undefined,
    };
  }

  if (transport === "openai-compatible-http") {
    const baseUrl = runtimeConfig["baseUrl"];

    if (typeof baseUrl !== "string" || !isValidUrl(baseUrl)) {
      return getDefaultRuntimeConfig(provider, executionMode);
    }

    return {
      transport,
      baseUrl,
      apiKeyEnvVar: typeof apiKeyEnvVar === "string" ? apiKeyEnvVar : undefined,
    };
  }

  return getDefaultRuntimeConfig(provider, executionMode);
}

export function resolveRequestedAgentRuntimeConfig(
  provider: AgentProfile["provider"],
  executionMode: AgentExecutionMode,
  runtimeConfig: unknown,
): AgentRuntimeConfig {
  if (runtimeConfig === undefined) {
    return getDefaultRuntimeConfig(provider, executionMode);
  }

  if (!isRecord(runtimeConfig)) {
    throw new Error("runtimeConfig must be an object");
  }

  const transport = runtimeConfig["transport"];
  const apiKeyEnvVar = runtimeConfig["apiKeyEnvVar"];

  if (typeof transport !== "string") {
    throw new Error("runtimeConfig.transport is required");
  }

  if (apiKeyEnvVar !== undefined && typeof apiKeyEnvVar !== "string") {
    throw new Error("runtimeConfig.apiKeyEnvVar must be a string");
  }

  if (transport === "provider-api") {
    return {
      transport,
      apiKeyEnvVar: typeof apiKeyEnvVar === "string" ? apiKeyEnvVar : undefined,
    };
  }

  if (transport === "openai-compatible-http") {
    const baseUrl = runtimeConfig["baseUrl"];

    if (typeof baseUrl !== "string" || !isValidUrl(baseUrl)) {
      throw new Error("runtimeConfig.baseUrl must be a valid URL");
    }

    return {
      transport,
      baseUrl,
      apiKeyEnvVar: typeof apiKeyEnvVar === "string" ? apiKeyEnvVar : undefined,
    };
  }

  throw new Error(`Unsupported runtimeConfig.transport: ${String(transport)}`);
}

export function assertSupportedAgentProfile(agentProfile: AgentProfile): void {
  if (agentProfile.executionMode === "hosted") {
    if (agentProfile.provider === "open-source") {
      throw new Error("Hosted execution is not supported for the open-source provider");
    }

    if (agentProfile.runtimeConfig.transport !== "provider-api") {
      throw new Error("Hosted execution requires runtimeConfig.transport=provider-api");
    }

    return;
  }

  if (agentProfile.provider !== "open-source") {
    throw new Error("Local execution is currently supported only for the open-source provider");
  }

  if (agentProfile.runtimeConfig.transport !== "openai-compatible-http") {
    throw new Error(
      "Local execution currently requires runtimeConfig.transport=openai-compatible-http",
    );
  }

  if (!isValidUrl(agentProfile.runtimeConfig.baseUrl)) {
    throw new Error("Local open-source execution requires a valid runtimeConfig.baseUrl");
  }

  if (!isLoopbackUrl(agentProfile.runtimeConfig.baseUrl)) {
    throw new Error(
      "Local open-source execution requires a loopback runtimeConfig.baseUrl (localhost/127.0.0.1/::1)",
    );
  }
}

export function isHostedAgentProfile(agentProfile: AgentProfile): boolean {
  return agentProfile.executionMode === "hosted";
}

export function getRequiredCredentialEnvVar(agentProfile: AgentProfile): string | null {
  if (agentProfile.executionMode === "hosted") {
    if (agentProfile.provider === "claude" || agentProfile.provider === "codex") {
      return (
        agentProfile.runtimeConfig.apiKeyEnvVar ??
        HOSTED_PROVIDER_CREDENTIAL_ENV_VARS[agentProfile.provider]
      );
    }

    return agentProfile.runtimeConfig.apiKeyEnvVar ?? null;
  }

  if (agentProfile.runtimeConfig.transport === "openai-compatible-http") {
    return agentProfile.runtimeConfig.apiKeyEnvVar ?? null;
  }

  return null;
}

export function createAgentAdapterForProfile(agentProfile: AgentProfile): AgentAdapter {
  assertSupportedAgentProfile(agentProfile);

  switch (agentProfile.provider) {
    case "claude":
      return createClaudeAdapter();
    case "codex":
      return createCodexAdapter();
    case "open-source":
      return createOpenSourceAdapter();
  }
}

import type { AgentExecutionMode, AgentProfile, AgentRuntimeConfig } from "@repobench/domain";
import type { AgentAdapter } from "./agent-adapter.js";
import { createClaudeAdapter } from "./providers/claude.js";
import { createCodexAdapter } from "./providers/codex.js";
import { createOpenSourceAdapter } from "./providers/open-source.js";

const DEFAULT_LOCAL_OPENAI_BASE_URLS = [
  "http://127.0.0.1:11434/v1",
  "http://localhost:11434/v1",
  "http://[::1]:11434/v1",
] as const;
const LOCAL_OPENAI_BASE_URL = DEFAULT_LOCAL_OPENAI_BASE_URLS[0];
const LOCAL_OPENAI_API_KEY_ENV_VAR = "OPEN_SOURCE_API_KEY";
const LOCAL_OPENAI_BASE_URLS_ENV_VAR = "ALLOWED_LOCAL_OPENAI_BASE_URLS";

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

function normalizeUrlForComparison(value: string): string {
  const parsedUrl = new URL(value);
  parsedUrl.hash = "";
  parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/u, "");
  if (parsedUrl.pathname.length === 0) {
    parsedUrl.pathname = "/";
  }

  return parsedUrl.toString();
}

function getAllowedLocalOpenAiBaseUrls(): ReadonlySet<string> {
  const configuredValue = process.env[LOCAL_OPENAI_BASE_URLS_ENV_VAR];
  const configuredUrls =
    configuredValue === undefined
      ? [...DEFAULT_LOCAL_OPENAI_BASE_URLS]
      : configuredValue
          .split(",")
          .map((value) => value.trim())
          .filter((value) => value.length > 0);

  if (configuredUrls.length === 0) {
    throw new Error(`${LOCAL_OPENAI_BASE_URLS_ENV_VAR} must contain at least one URL`);
  }

  return new Set(configuredUrls.map((value) => normalizeUrlForComparison(value)));
}

function isAllowedLocalOpenAiBaseUrl(value: string): boolean {
  if (!isValidUrl(value)) {
    return false;
  }

  return getAllowedLocalOpenAiBaseUrls().has(normalizeUrlForComparison(value));
}

function getAllowedCredentialEnvVar(
  provider: AgentProfile["provider"],
  executionMode: AgentExecutionMode,
  transport: AgentRuntimeConfig["transport"],
): string | null {
  if (executionMode === "hosted") {
    if (transport !== "provider-api") {
      return null;
    }

    if (provider === "claude" || provider === "codex") {
      return HOSTED_PROVIDER_CREDENTIAL_ENV_VARS[provider];
    }

    return null;
  }

  if (provider === "open-source" && transport === "openai-compatible-http") {
    return LOCAL_OPENAI_API_KEY_ENV_VAR;
  }

  return null;
}

function assertSupportedCredentialEnvVar(agentProfile: AgentProfile): void {
  const configuredCredentialEnvVar = agentProfile.runtimeConfig.apiKeyEnvVar;
  if (configuredCredentialEnvVar === undefined) {
    return;
  }

  const allowedCredentialEnvVar = getAllowedCredentialEnvVar(
    agentProfile.provider,
    agentProfile.executionMode,
    agentProfile.runtimeConfig.transport,
  );
  if (allowedCredentialEnvVar === null) {
    throw new Error("runtimeConfig.apiKeyEnvVar is not supported for this agent profile");
  }

  if (configuredCredentialEnvVar !== allowedCredentialEnvVar) {
    throw new Error(`runtimeConfig.apiKeyEnvVar must be ${allowedCredentialEnvVar}`);
  }
}

function resolveRequestedCredentialEnvVar(
  provider: AgentProfile["provider"],
  executionMode: AgentExecutionMode,
  transport: AgentRuntimeConfig["transport"],
  apiKeyEnvVar: unknown,
): string | undefined {
  if (apiKeyEnvVar === undefined) {
    return undefined;
  }

  if (typeof apiKeyEnvVar !== "string") {
    throw new Error("runtimeConfig.apiKeyEnvVar must be a string");
  }

  const allowedCredentialEnvVar = getAllowedCredentialEnvVar(provider, executionMode, transport);
  if (allowedCredentialEnvVar === null) {
    throw new Error("runtimeConfig.apiKeyEnvVar is not supported for this agent profile");
  }

  if (apiKeyEnvVar !== allowedCredentialEnvVar) {
    throw new Error(`runtimeConfig.apiKeyEnvVar must be ${allowedCredentialEnvVar}`);
  }

  return apiKeyEnvVar;
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

  if (typeof transport !== "string") {
    return getDefaultRuntimeConfig(provider, executionMode);
  }

  if (transport === "provider-api") {
    return {
      transport,
      apiKeyEnvVar:
        typeof runtimeConfig["apiKeyEnvVar"] === "string"
          ? runtimeConfig["apiKeyEnvVar"]
          : undefined,
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
      apiKeyEnvVar:
        typeof runtimeConfig["apiKeyEnvVar"] === "string"
          ? runtimeConfig["apiKeyEnvVar"]
          : undefined,
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

  if (typeof transport !== "string") {
    throw new Error("runtimeConfig.transport is required");
  }

  if (transport === "provider-api") {
    const resolvedApiKeyEnvVar = resolveRequestedCredentialEnvVar(
      provider,
      executionMode,
      transport,
      runtimeConfig["apiKeyEnvVar"],
    );
    return {
      transport,
      apiKeyEnvVar: resolvedApiKeyEnvVar,
    };
  }

  if (transport === "openai-compatible-http") {
    const baseUrl = runtimeConfig["baseUrl"];

    if (typeof baseUrl !== "string" || !isValidUrl(baseUrl)) {
      throw new Error("runtimeConfig.baseUrl must be a valid URL");
    }

    const resolvedApiKeyEnvVar = resolveRequestedCredentialEnvVar(
      provider,
      executionMode,
      transport,
      runtimeConfig["apiKeyEnvVar"],
    );
    return {
      transport,
      baseUrl,
      apiKeyEnvVar: resolvedApiKeyEnvVar,
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

    assertSupportedCredentialEnvVar(agentProfile);
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

  if (!isAllowedLocalOpenAiBaseUrl(agentProfile.runtimeConfig.baseUrl)) {
    throw new Error(
      "Local open-source execution requires runtimeConfig.baseUrl to match ALLOWED_LOCAL_OPENAI_BASE_URLS",
    );
  }

  assertSupportedCredentialEnvVar(agentProfile);
}

export function isHostedAgentProfile(agentProfile: AgentProfile): boolean {
  return agentProfile.executionMode === "hosted";
}

export function getRequiredCredentialEnvVar(agentProfile: AgentProfile): string | null {
  assertSupportedAgentProfile(agentProfile);

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

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AgentExecutionMode, AgentProvider } from "@repobench/domain";
import { apiClient } from "../../lib/api-client";

function readRequiredString(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    throw new Error(`${fieldName} is required`);
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return trimmedValue;
}

function readOptionalString(formData: FormData, fieldName: string): string | undefined {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function readOptionalInteger(formData: FormData, fieldName: string): number | undefined {
  const value = readOptionalString(formData, fieldName);
  if (value === undefined) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${fieldName} must be a whole number`);
  }

  return parsedValue;
}

function buildSetupRedirectPath(
  notice: string,
  details?: Readonly<Record<string, string>>,
): string {
  const searchParams = new URLSearchParams({ notice });

  if (details !== undefined) {
    for (const [key, value] of Object.entries(details)) {
      searchParams.set(key, value);
    }
  }

  return `/setup?${searchParams.toString()}`;
}

function buildRuntimeConfig(
  provider: AgentProvider,
  executionMode: AgentExecutionMode,
  baseUrl: string | undefined,
): Readonly<Record<string, unknown>> {
  if (provider === "open-source") {
    if (executionMode !== "local") {
      throw new Error("Open-source agent profiles must use local execution mode");
    }

    return {
      transport: "openai-compatible-http",
      baseUrl: baseUrl ?? "http://127.0.0.1:11434/v1",
    };
  }

  if (executionMode !== "hosted") {
    throw new Error("Claude and Codex profiles currently require hosted execution mode");
  }

  return {
    transport: "provider-api",
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected setup error";
}

export async function createAgentProfileAction(formData: FormData): Promise<never> {
  try {
    const name = readRequiredString(formData, "name");
    const provider = readRequiredString(formData, "provider") as AgentProvider;
    const model = readRequiredString(formData, "model");
    const executionMode = readRequiredString(formData, "executionMode") as AgentExecutionMode;
    const baseUrl = readOptionalString(formData, "baseUrl");

    const response = await apiClient.agentProfiles.create({
      name,
      provider,
      model,
      executionMode,
      runtimeConfig: buildRuntimeConfig(provider, executionMode, baseUrl),
    });

    revalidatePath("/setup");

    redirect(
      buildSetupRedirectPath("agent-created", {
        id: response.agentProfile.id,
      }),
    );
  } catch (error: unknown) {
    redirect(
      buildSetupRedirectPath("error", {
        message: getErrorMessage(error),
      }),
    );
  }
}

export async function createRepositoryAction(formData: FormData): Promise<never> {
  try {
    const owner = readRequiredString(formData, "owner");
    const name = readRequiredString(formData, "name");

    const response = await apiClient.repos.create({ owner, name });

    revalidatePath("/repos");
    revalidatePath("/setup");

    redirect(
      buildSetupRedirectPath("repo-created", {
        id: response.repo.id,
      }),
    );
  } catch (error: unknown) {
    redirect(
      buildSetupRedirectPath("error", {
        message: getErrorMessage(error),
      }),
    );
  }
}

export async function createSuiteAction(formData: FormData): Promise<never> {
  try {
    const repoId = readRequiredString(formData, "repoId");
    const name = readRequiredString(formData, "name");
    const description = readOptionalString(formData, "description");
    const testCommand = readRequiredString(formData, "testCommand");
    const maxPrs = readOptionalInteger(formData, "maxPrs");

    const response = await apiClient.suites.create(repoId, {
      name,
      description,
      testCommand,
      maxPrs,
    });

    revalidatePath("/setup");
    revalidatePath("/runs");

    redirect(
      buildSetupRedirectPath("suite-created", {
        id: response.suite.id,
      }),
    );
  } catch (error: unknown) {
    redirect(
      buildSetupRedirectPath("error", {
        message: getErrorMessage(error),
      }),
    );
  }
}

export async function createRunAction(formData: FormData): Promise<never> {
  try {
    const suiteId = readRequiredString(formData, "suiteId");
    const agentProfileId = readRequiredString(formData, "agentProfileId");

    const response = await apiClient.runs.create(suiteId, { agentProfileId });

    revalidatePath("/runs");
    redirect(`/runs/${response.run.id}`);
  } catch (error: unknown) {
    redirect(
      buildSetupRedirectPath("error", {
        message: getErrorMessage(error),
      }),
    );
  }
}

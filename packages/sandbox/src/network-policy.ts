/**
 * Network access policy for sandbox containers.
 */
export type NetworkPolicy = {
  readonly enabled: boolean;
  readonly allowedHosts: ReadonlyArray<string>;
};

/**
 * Default network policy: no network access.
 */
export const DENY_ALL: NetworkPolicy = {
  enabled: false,
  allowedHosts: [],
};

/**
 * Network policy allowing access only to agent API endpoints.
 */
export const AGENT_API_ONLY: NetworkPolicy = {
  enabled: true,
  allowedHosts: ["api.anthropic.com", "api.openai.com"],
};

/**
 * Returns the Docker network arguments for a given policy.
 *
 * Currently only DENY_ALL is supported. AGENT_API_ONLY requires host-level
 * firewall enforcement which has not been implemented yet.
 */
export function toDockerNetworkArgs(policy: NetworkPolicy): ReadonlyArray<string> {
  if (!policy.enabled) {
    return ["--network", "none"];
  }

  throw new Error(
    "Network policy with enabled=true (e.g. AGENT_API_ONLY) requires host-level " +
      "firewall enforcement which is not implemented. Use DENY_ALL until enforcement is in place.",
  );
}

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
    allowedHosts: [
        "api.anthropic.com",
        "api.openai.com",
    ],
};

/**
 * Returns the Docker network arguments for a given policy.
 */
export function toDockerNetworkArgs(policy: NetworkPolicy): ReadonlyArray<string> {
    if (!policy.enabled) {
        return ["--network", "none"];
    }
    // When network is enabled, use default bridge.
    // Host-level firewall rules should restrict to allowedHosts.
    return [];
}

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
 * Returns the Docker network arguments for a given policy.
 */
export function toDockerNetworkArgs(policy: NetworkPolicy): ReadonlyArray<string> {
  if (!policy.enabled) {
    return ["--network", "none"];
  }

  throw new Error(
    "Network policy with enabled=true requires host-level firewall enforcement which is not " +
      "implemented. Use DENY_ALL until enforcement is in place.",
  );
}

import type { PrCandidate } from "@repobench/repo-ingest";

/**
 * Maximum number of changed files for a PR to be a valid benchmark candidate.
 * PRs with too many file changes are likely large features, not focused bugfixes.
 */
const MAX_CHANGED_FILES = 10;

/**
 * Labels that indicate a PR is a bugfix.
 */
const BUGFIX_LABELS = new Set(["bug", "bugfix", "fix", "hotfix", "patch"]);

/**
 * Filters PR candidates to find suitable benchmark tasks.
 * Criteria:
 * - Has a bugfix-related label OR title starts with "fix"
 * - Changed file count is within reasonable bounds
 * - Has a non-empty description
 */
export function filterBugfixCandidates(
    candidates: ReadonlyArray<PrCandidate>,
): ReadonlyArray<PrCandidate> {
    return candidates.filter((candidate) => {
        const hasBugLabel = candidate.labels.some((label) =>
            BUGFIX_LABELS.has(label.toLowerCase()),
        );
        const hasFixTitle = candidate.title.toLowerCase().startsWith("fix");
        const isBugfix = hasBugLabel || hasFixTitle;
        const isReasonableSize = candidate.changedFiles <= MAX_CHANGED_FILES;
        const hasDescription = candidate.description.trim().length > 0;

        return isBugfix && isReasonableSize && hasDescription;
    });
}

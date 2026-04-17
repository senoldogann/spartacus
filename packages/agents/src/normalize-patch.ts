function findUnifiedDiffStart(value: string): number {
  return value.search(/^---[ \t].*$/mu);
}

/**
 * Extracts the unified diff portion from common hosted-model response wrappers.
 */
export function normalizePatchContent(value: string): string {
  const trimmedValue = value.trim();

  const fencedMatch = /```(?:diff|patch)?\n([\s\S]*?)```/u.exec(trimmedValue);
  const candidateValue = fencedMatch?.[1]?.trim() ?? trimmedValue;
  const diffStartIndex = findUnifiedDiffStart(candidateValue);

  if (diffStartIndex >= 0) {
    return candidateValue.slice(diffStartIndex).trim();
  }

  return candidateValue;
}

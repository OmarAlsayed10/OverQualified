const NUMBER_PATTERN = /\d+(?:[.,]\d+)*/g;
const PERCENT_SUFFIX_PATTERN = /^\s*(?:%|percent(?:age)?)/i;
const NUMBER_OCCURRENCE_PATTERN = /\d+(?:[.,]\d+)*(?:\+|%|\s+percent(?:age)?)?/gi;

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sourceContainsClaim = (
  statement: string,
  numberMatch: RegExpMatchArray,
  sourceText: string,
): boolean => {
  const number = numberMatch[0].replace(/,/g, "");
  const matchEnd = (numberMatch.index ?? 0) + numberMatch[0].length;
  const isPercentage = PERCENT_SUFFIX_PATTERN.test(statement.slice(matchEnd));
  const escapedNumber = escapeRegex(number);
  const suffix = isPercentage ? "\\s*(?:%|percent(?:age)?)" : "";
  const claimEnd = isPercentage ? "(?!\\w)" : "\\b";
  return new RegExp(`\\b${escapedNumber}${suffix}${claimEnd}`, "i").test(
    sourceText.replace(/,/g, ""),
  );
};

export function unsourcedNumbers(statement: string, sourceText: string): string[] {
  return [...statement.matchAll(NUMBER_PATTERN)]
    .filter((numberMatch) => !sourceContainsClaim(statement, numberMatch, sourceText))
    .map((numberMatch) => numberMatch[0]);
}

export function statementUsesOnlySourceNumbers(statement: string, sourceText: string): boolean {
  return unsourcedNumbers(statement, sourceText).length === 0;
}

const numberOccurrenceKey = (value: string): string =>
  value.toLowerCase().replace(/,/g, "").replace(/\s+percent(?:age)?/, "%");

export function unsupportedNumberOccurrences(statement: string, sourceText: string): string[] {
  const available = new Map<string, number>();
  for (const match of sourceText.match(NUMBER_OCCURRENCE_PATTERN) ?? []) {
    const key = numberOccurrenceKey(match);
    available.set(key, (available.get(key) ?? 0) + 1);
  }

  return (statement.match(NUMBER_OCCURRENCE_PATTERN) ?? []).filter((match) => {
    const key = numberOccurrenceKey(match);
    const remaining = available.get(key) ?? 0;
    if (remaining === 0) return true;
    available.set(key, remaining - 1);
    return false;
  });
}

export function hasSameNumberOccurrences(original: string, proposed: string): boolean {
  return unsupportedNumberOccurrences(proposed, original).length === 0
    && unsupportedNumberOccurrences(original, proposed).length === 0;
}

export function evidenceGroundedDescription(description: string, sourceText: string): string {
  return statementUsesOnlySourceNumbers(description, sourceText) ? description : "";
}

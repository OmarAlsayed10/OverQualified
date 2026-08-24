export interface LanguageEntry {
  name: string;
  proficiency: string;
}

export const parseLanguageEntries = (value: string): LanguageEntry[] =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
      return match
        ? { name: match[1].trim(), proficiency: match[2].trim() }
        : { name: part, proficiency: '' };
    });

export const serializeLanguageEntries = (entries: LanguageEntry[]): string =>
  entries
    .map(({ name, proficiency }) => ({ name: name.trim(), proficiency: proficiency.trim() }))
    .filter(({ name }) => name)
    .map(({ name, proficiency }) => proficiency ? `${name} (${proficiency})` : name)
    .join(', ');

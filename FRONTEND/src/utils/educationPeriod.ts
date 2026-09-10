export const EDUCATION_STATUSES = ['graduated', 'undergraduate'] as const;

export type EducationStatus = (typeof EDUCATION_STATUSES)[number];

interface EducationPeriodEntry {
  startYear?: string;
  endYear?: string;
  status?: string;
}

type Translate = (key: string) => string;

const identity: Translate = (key) => key;

// A CV stores the plain year the user typed. Only the rendered line changes with the status:
// someone still enrolled reads as "Present" or "Expected 2027", never as a finished degree.
export const educationEndLabel = (entry: EducationPeriodEntry, t: Translate = identity): string => {
  if (entry.status !== 'undergraduate') return entry.endYear || '';
  return entry.endYear ? `${t('Expected')} ${entry.endYear}` : t('Present');
};

export const educationPeriod = (
  entry: EducationPeriodEntry,
  t: Translate = identity,
  separator = ' – ',
): string => [entry.startYear, educationEndLabel(entry, t)].filter(Boolean).join(separator);

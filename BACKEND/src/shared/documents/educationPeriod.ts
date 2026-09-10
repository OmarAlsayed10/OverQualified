interface EducationPeriodEntry {
  status?: string;
  endYear?: string | Date;
}

// Mirrors the builder's rule: a CV stores the plain year, and only the rendered line reflects
// that the person is still enrolled. Exports must not turn an expected year into a finished one.
export const educationEndLabel = (
  entry: EducationPeriodEntry,
  format: (value: string | Date) => string = String,
): string => {
  const year = entry.endYear ? format(entry.endYear) : "";
  if (entry.status !== "undergraduate") return year;
  return year ? `Expected ${year}` : "Present";
};

export const titleFor = (targetRole: string) => `Interview practice · ${targetRole}`;

const timedQuestionLimits = [
  [10, 5], [15, 6], [20, 8], [25, 9], [30, 10],
  [35, 11], [40, 12], [45, 13], [50, 14], [60, 15],
] as const;

export const questionLimitFor = (durationMinutes: number | null) =>
  durationMinutes === null
    ? 8
    : timedQuestionLimits.find(([maximumMinutes]) => durationMinutes <= maximumMinutes)?.[1] ?? 15;

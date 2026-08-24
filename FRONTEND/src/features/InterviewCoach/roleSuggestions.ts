import { InterviewCvData } from "./interviewCoach.types";

export const roleSuggestionsFromCv = (cv: InterviewCvData | null | undefined): string[] => {
  if (!cv) return [];
  const roles = [
    cv.personalInfo?.professionalTitle,
    ...(cv.experience ?? []).map((experience) => experience.jobTitle),
  ];
  const seen = new Set<string>();
  return roles.flatMap((role) => {
    const trimmedRole = role?.trim();
    if (!trimmedRole) return [];
    const key = trimmedRole.toLocaleLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    return [trimmedRole];
  }).slice(0, 6);
};

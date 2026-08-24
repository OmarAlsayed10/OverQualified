import type { BuilderFormData } from '../../../redux/store/slices/cvBuilderSlice';

export const mergeBuilderImprovements = (
  current: BuilderFormData,
  improved: BuilderFormData,
): BuilderFormData => ({
  ...current,
  personalInfo: {
    ...current.personalInfo,
    ProfessionalSummary: improved.personalInfo.ProfessionalSummary,
  },
  experience: current.experience.map((entry, index) => ({
    ...entry,
    description: improved.experience[index]?.description ?? entry.description,
  })),
  education: current.education.map((entry, index) => ({
    ...entry,
    description: improved.education[index]?.description ?? entry.description,
  })),
  projects: current.projects.map((entry, index) => ({
    ...entry,
    description: improved.projects[index]?.description ?? entry.description,
  })),
  skills: {
    ...current.skills,
    certifications: current.skills.certifications.map((certification, index) => {
      const corrected = improved.skills.certifications[index];
      return corrected
        ? {
            ...certification,
            name: corrected.name,
            issuer: corrected.issuer,
            description: corrected.description,
          }
        : certification;
    }),
  },
});

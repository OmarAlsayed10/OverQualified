import * as z from 'zod';
import { EDUCATION_STATUSES } from '../../utils/educationPeriod.ts';

const LETTERS_ONLY = /^[؀-ۿa-zA-Z\s]*$/;

export const personalSchema = z.object({
  firstName: z.string().min(1, 'First Name is required').regex(LETTERS_ONLY, 'Letters only'),
  lastName: z.string().min(1, 'Last Name is required').regex(LETTERS_ONLY, 'Letters only'),
  professionalTitle: z.string().min(1, 'Professional Title is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  phoneCode: z.string().min(1, 'Country code is required'),
  phone: z.string().min(7, 'Phone number too short').max(15, 'Phone number too long').regex(/^[0-9]+$/, 'Digits only'),
  country: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  town: z.string().optional(),
  ProfessionalSummary: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
  photo: z.string().optional(),
});

export const experienceEntrySchema = z.object({
  jobTitle: z.string().min(1, 'Job Title is required'),
  company: z.string().min(1, 'Company is required'),
  location: z.string().min(1, 'Location is required'),
  startDate: z.string().min(1, 'Start Date is required'),
  endDate: z.string().min(1, 'End Date is required'),
  description: z.string().optional(),
});

// A graduate has a graduation year; an undergraduate has at most an expected one. Only the
// requirement changes — the stored fields stay the same, so templates and exports need no
// new columns.
export const educationEntrySchema = z
  .object({
    status: z.enum(EDUCATION_STATUSES).optional().default('graduated'),
    institution: z.string().min(1, 'Institution is required').regex(LETTERS_ONLY, 'Letters only'),
    degree: z.string().regex(LETTERS_ONLY, 'Letters only'),
    location: z.string().min(1, 'Location is required'),
    startYear: z.string().min(1, 'Start Year is required'),
    endYear: z.string(),
    description: z.string().optional(),
  })
  .superRefine((entry, ctx) => {
    if (!entry.degree) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['degree'], message: 'Degree is required' });
    }
    if (entry.status !== 'undergraduate' && !entry.endYear) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endYear'], message: 'Graduation Year is required' });
    }
  });

export const projectEntrySchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  technologies: z.string().optional(),
  demoUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  description: z.string().optional(),
});

export const experienceSchema = z.object({ experience: z.array(experienceEntrySchema) });
export const educationSchema = z.object({ education: z.array(educationEntrySchema) });
export const projectsSchema = z.object({ projects: z.array(projectEntrySchema) });

export type ProjectsFormData = z.infer<typeof projectsSchema>;

export type RequirementSection = 'personal' | 'experience' | 'education' | 'projects';

export interface MissingRequirement {
  section: RequirementSection;
  // Kept apart from the message so the caller can translate both halves; a pre-joined
  // "Experience 1: Start Date is required" matches no translation key.
  label?: string;
  index?: number;
  message: string;
}

interface RequirementsInput {
  personalInfo: unknown;
  experience: unknown[];
  education: unknown[];
  projects: unknown[];
}

const entryIssues = (
  section: RequirementSection,
  label: string,
  entries: unknown[],
  schema: z.ZodTypeAny,
): MissingRequirement[] =>
  entries.flatMap((entry, index) => {
    const result = schema.safeParse(entry);
    if (result.success) return [];
    return result.error.issues.map((issue) => ({
      section,
      label,
      index: index + 1,
      message: issue.message,
    }));
  });

// The section forms each own a slice of the CV, so none of them can answer "is this CV
// finishable". This reads the same schemas against the saved data, which is what the preview,
// the download and the analysis actually consume.
export const missingRequirements = (formData: RequirementsInput): MissingRequirement[] => {
  const personal = personalSchema.safeParse(formData.personalInfo);
  const personalIssues: MissingRequirement[] = personal.success
    ? []
    : personal.error.issues.map((issue) => ({ section: 'personal', message: issue.message }));

  return [
    ...personalIssues,
    ...entryIssues('experience', 'Experience', formData.experience || [], experienceEntrySchema),
    ...entryIssues('education', 'Education', formData.education || [], educationEntrySchema),
    ...entryIssues('projects', 'Project', formData.projects || [], projectEntrySchema),
  ];
};

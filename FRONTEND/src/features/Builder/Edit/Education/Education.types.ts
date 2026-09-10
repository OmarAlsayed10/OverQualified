import type { EducationStatus } from '../../../../utils/educationPeriod';

export interface EducationProps {}

export interface EducationEntry {
  status?: EducationStatus;
  institution: string;
  degree: string;
  location: string;
  startYear: string;
  endYear: string;
  description?: string;
}

export interface EducationFormData {
  education: EducationEntry[];
}

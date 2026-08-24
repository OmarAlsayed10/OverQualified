import type { CvVariant } from '../components/CvVariantResults';

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ScreeningAnswer {
  id: string;
  question: string;
  answer: string;
  source: 'ai' | 'user';
  editable: boolean;
}

export interface ApplicationMatch {
  title: string;
  company: string;
  location?: string | null;
  url?: string | null;
  status?: string;
  notes?: string | null;
  coverLetter?: string | null;
  reminderAt?: string | null;
  selectedCvVariant?: string | null;
  analysisStatus?: string;
  fitScore?: number;
}

export interface ApplicationUserProfile {
  salaryExpectation?: string | number | null;
  salaryCurrency?: string | null;
  noticePeriod?: string | null;
  visaStatus?: string | null;
  workPreference?: string | null;
}

export interface ApplicationWorkspaceData {
  match: ApplicationMatch;
  userProfile?: ApplicationUserProfile | null;
  primaryCv?: { id: string; text: string } | null;
  cvVariants: CvVariant[];
  checklist: ChecklistItem[];
  screeningAnswers: ScreeningAnswer[];
}

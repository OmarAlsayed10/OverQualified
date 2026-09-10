import type { CvVariant } from '../components/CvVariantResults';
import type { CareerMatchResponse } from '../../CareerMatch/CareerMatch.types';
import type { CVAnalysisResult } from '../../CVAnalysis/CVAnalysisDashboard/CVAnalysisDashboard.types';

export interface ScreeningAnswer {
  id: string;
  question: string;
  answer: string;
  source: 'ai' | 'user';
  editable: boolean;
}

export type PreparationStepId = 'cvAnalysis' | 'careerMatch' | 'coverLetter' | 'cvVariants' | 'screeningAnswers';
export type PreparationStepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PreparationStep {
  id: PreparationStepId;
  status: PreparationStepStatus;
  error?: string;
}

export interface ApplicationPreparation {
  status: 'idle' | 'running' | 'completed' | 'completed_with_errors';
  steps: PreparationStep[];
  cvSource?: { type: 'saved' | 'upload'; id?: string; name: string; text: string };
  cvAnalysis?: CVAnalysisResult;
  careerMatch?: CareerMatchResponse;
  updatedAt?: string;
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
  workspaceData?: { preparation?: ApplicationPreparation } | null;
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
  job: { description: string };
  userProfile?: ApplicationUserProfile | null;
  primaryCv?: { id: string; text: string } | null;
  cvVariants: CvVariant[];
  screeningAnswers: ScreeningAnswer[];
}

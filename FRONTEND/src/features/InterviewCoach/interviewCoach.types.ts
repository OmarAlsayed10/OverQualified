export interface InterviewCvData {
  personalInfo?: {
    professionalTitle?: string;
  };
  experience?: Array<{
    jobTitle?: string;
  }>;
  [key: string]: unknown;
}

export interface SavedCvOption extends InterviewCvData {
  id: string;
  title: string | null;
  isPrimary: boolean;
}

export interface UploadedInterviewCv {
  fileName: string;
  formData: InterviewCvData;
}

export interface InterviewFeedbackStrength {
  feedback: string;
  evidenceExcerpt: string;
}

export interface InterviewFeedback {
  score: number;
  strengths: InterviewFeedbackStrength[];
  improvements: string[];
}

export interface InterviewTurn {
  question: string;
  answer: string;
  feedback: InterviewFeedback;
}

export interface InterviewReportFinding {
  feedback: string;
  evidenceExcerpt: string;
}

export interface InterviewReport {
  overallScore: number;
  strengths: InterviewReportFinding[];
  improvements: InterviewReportFinding[];
  practiceNext: string[];
  topicsNotReached: string[];
}

export interface InterviewSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  cvId: string | null;
  cvTitle: string;
  targetRole: string;
  jobDescription: string;
  language: "en" | "ar";
  status: "active" | "completed";
  currentQuestion: string | null;
  turns: InterviewTurn[];
  report: InterviewReport | null;
  durationMinutes: number | null;
  remainingSeconds: number | null;
  questionLimit: number;
}

export interface InterviewSetupValues {
  source: "saved" | "upload";
  cvId: string;
  uploadedCv: UploadedInterviewCv | null;
  targetRole: string;
  jobDescription: string;
  durationMinutes: number | null;
}

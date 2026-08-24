export interface CVAnalysisDashboardProps {
  uploadedFile?: File;
  cvId?: string;
  level?: string;
}

export interface LevelContext {
  role: string;
  level: string;
  fit?: number;
  message: string;
  nextLevel: string;
  nextLevelTips: string[];
  belowBar: boolean;
  detected?: boolean;
  yearsOfExperience?: number;
  levelReasons?: string[];
  skillLevel?: string;
}

export interface SectionImprovement {
  sectionKey: 'summary' | 'experience' | 'education' | 'projects' | 'skills' | 'formatting' | 'other';
  section: string;
  suggestion: string;
  evidence: {
    cvExcerpt: string | null;
    jobRequirement: string | null;
    rationale: string;
  };
}

export interface ScoreCategory {
  name: string;
  earned: number;
  max: number;
  tip: string | null;
  blocker?: 'content' | 'experience' | null;
}

export interface ScoreDimension {
  name: string;
  score: number;
  details: string[];
}

export interface CVAnalysisResult {
  qualityScore: number;
  scoreBreakdown: ScoreCategory[];
  dimensions: ScoreDimension[];
  detailsLocked: boolean;
  positiveFeedback: string[];
  negativeFeedback: string[];
  neutralFeedback: string[];
  sectionsToImprove: SectionImprovement[];
  atsCheckerNotes: string[];
  interviewQuestions: string[];
  matchJobTitle: string;
  extractedText: string;
  pageCount?: number;
  targetRole?: string;
  level?: string;
  levelContext?: LevelContext;
}

export interface InterviewQA {
  question: string;
  answer: string;
}

import { clearAiResponseCache } from "./aiService";
import { clearScoreCache } from "./cvScoring";
import { clearSavedCvAnalysisArtifacts } from "../../shared/savedCvAnalysisService";

export function clearCVAnalysisCaches(): void {
  clearAiResponseCache();
  clearScoreCache();
  clearSavedCvAnalysisArtifacts();
}

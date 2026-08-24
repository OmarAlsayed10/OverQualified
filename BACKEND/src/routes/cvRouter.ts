import { Router } from "express";
import { exportCVController } from "../controllers/cvExportController";
import { uploadToMemory, uploadMdToMemory, uploadAvatar } from "../services/importService";
import { importCVController } from "../controllers/cvImportController";
import { analyzeCVController } from "../controllers/cvAnalysisController";
import { aiWritingAssist } from "../controllers/AIWritingController";
import { GrammarController } from "../controllers/grammarCheckerController";
import { adjustCVController } from "../controllers/cvAdjustController";
import { improveBuilderCVController } from "../controllers/builderImproveController";
import { exportAdjustedCVController } from "../controllers/exportAdjustedCVController";
import { cvChatController, interviewAnswersController } from "../controllers/cvChatController";
import { parseCvController, polishEntryController, conversationalBuildController, importCvController, optimizeCvLengthController, editFieldWithAIController, generateSmartSkillsController, uploadCvPhotoController } from "../controllers/cvBuilderAssistController";
import { authenticateToken, optionalAuth } from "../middleware/validateJWTMiddleware";
import { requireProUser } from "../middleware/roleMiddleware";
import { requireCredits, withUserContext } from "../middleware/creditMiddleware";
import { careerMatchController, careerMatchLimitsController } from "../controllers/careerMatchController";

import { importProjectFromUrlController, importProjectFromFileController } from "../controllers/projectImportController";
import { validateUrlMiddleware, validateFileMiddleware } from "../middleware/projectImportValidator";
import { projectImportLimiter } from "../middleware/projectImportLimiter";
import { analyzeRepoController, auditClaimsController, positioningController } from "../controllers/cvEvidenceController";

import {
  getSkillRoadmapController,
  getSkillTrendsController,
  getUserSkillProgressController,
  updateUserSkillProgressController,
  deleteUserSkillProgressController,
} from "../controllers/roadmapController";

import { aiLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();
router.get("/exports/:cvId", authenticateToken, exportCVController);
router.post("/upload-cv", authenticateToken, uploadToMemory.single("cv"), importCVController);

router.post("/analyze", aiLimiter, optionalAuth, uploadToMemory.single("cv"), analyzeCVController);
router.get("/career-match/limits", authenticateToken, careerMatchLimitsController);
router.post("/career-match", authenticateToken, aiLimiter, withUserContext, uploadToMemory.single("cv"), careerMatchController);
router.post("/skill-roadmap", authenticateToken, aiLimiter, requireCredits, withUserContext, getSkillRoadmapController);
router.get("/skill-trends", authenticateToken, getSkillTrendsController);
router.get("/skill-progress", authenticateToken, getUserSkillProgressController);
router.post("/skill-progress", authenticateToken, updateUserSkillProgressController);
router.delete("/skill-progress", authenticateToken, deleteUserSkillProgressController);
router.post("/import-cv", authenticateToken, aiLimiter, requireCredits, withUserContext, uploadToMemory.single("cv"), importCvController);

router.post(
  "/import-project-url",
  authenticateToken,
  aiLimiter,
  projectImportLimiter,
  validateUrlMiddleware,
  requireCredits,
  withUserContext,
  importProjectFromUrlController
);

router.post(
  "/import-project-file",
  authenticateToken,
  aiLimiter,
  projectImportLimiter,
  uploadMdToMemory.single("readme"),
  validateFileMiddleware,
  requireCredits,
  withUserContext,
  importProjectFromFileController
);

router.post(
  "/analyze-repo",
  authenticateToken,
  projectImportLimiter,
  analyzeRepoController
);

router.post("/audit-claims", authenticateToken, auditClaimsController);

router.post(
  "/positioning",
  authenticateToken,
  aiLimiter,
  requireCredits,
  withUserContext,
  positioningController
);

router.post(
  "/ai-writing-assist",
  authenticateToken,
  aiLimiter,
  requireProUser,
  requireCredits,
  withUserContext,
  aiWritingAssist
);
router.post(
  "/grammarcheck",
  authenticateToken,
  aiLimiter,
  requireProUser,
  requireCredits,
  withUserContext,
  GrammarController
);
router.post(
  "/improve-builder-cv",
  authenticateToken,
  aiLimiter,
  requireProUser,
  requireCredits,
  withUserContext,
  improveBuilderCVController
);
router.post(
  "/adjust-cv",
  authenticateToken,
  aiLimiter,
  requireProUser,
  requireCredits,
  withUserContext,
  adjustCVController
);
router.post(
  "/export-adjusted-cv",
  authenticateToken,
  requireProUser,
  exportAdjustedCVController
);
router.post(
  "/cv-chat",
  authenticateToken,
  aiLimiter,
  requireProUser,
  requireCredits,
  withUserContext,
  cvChatController
);
router.post(
  "/interview-answers",
  authenticateToken,
  aiLimiter,
  requireProUser,
  requireCredits,
  withUserContext,
  interviewAnswersController
);
router.post("/parse-cv", authenticateToken, aiLimiter, requireProUser, requireCredits, withUserContext, parseCvController);
router.post("/polish-entry", authenticateToken, aiLimiter, requireProUser, requireCredits, withUserContext, polishEntryController);
router.post("/conversational-build", authenticateToken, aiLimiter, requireProUser, requireCredits, withUserContext, conversationalBuildController);
router.post("/optimize-cv-length", authenticateToken, aiLimiter, requireProUser, requireCredits, withUserContext, optimizeCvLengthController);
router.post("/cv-photo", authenticateToken, uploadAvatar.single("photo"), uploadCvPhotoController);
router.post("/edit-field-ai", authenticateToken, aiLimiter, requireProUser, requireCredits, withUserContext, editFieldWithAIController);
router.post("/generate-smart-skills", authenticateToken, aiLimiter, requireProUser, requireCredits, withUserContext, generateSmartSkillsController);

export default router;

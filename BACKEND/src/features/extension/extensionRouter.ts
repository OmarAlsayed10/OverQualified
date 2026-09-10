import { Router } from "express";
import express from "express";
import { authenticateToken, requireExtensionToken } from "../../middleware/validateJWTMiddleware";
import { requireCredits, withUserContext } from "../../middleware/creditMiddleware";
import {
  answerQuestionsController,
  saveAnswerController,
  downloadCvController,
  approvalPageController,
  approvePairingController,
  captureJobController,
  claimPairingController,
  extensionMeController,
  startPairingController,
} from "./extensionController";

const router = Router();

router.post("/pair", startPairingController);
router.get("/pair", claimPairingController);

router.get("/approve", authenticateToken, approvalPageController);
router.post("/approve", express.urlencoded({ extended: false }), authenticateToken, approvePairingController);

router.get("/me", requireExtensionToken, extensionMeController);
router.post("/jobs", requireExtensionToken, captureJobController);
router.post("/answers", requireExtensionToken, withUserContext, requireCredits, answerQuestionsController);
router.post("/answers/save", requireExtensionToken, saveAnswerController);
router.get("/cv/:cvId", requireExtensionToken, downloadCvController);

export default router;

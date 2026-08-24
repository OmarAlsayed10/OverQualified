import { Router } from "express";
import {
  answerInterviewController,
  finishInterviewController,
  listInterviewsController,
  startInterviewController,
} from "../controllers/interviewCoachController";
import { requireCredits, withUserContext } from "../middleware/creditMiddleware";
import { authenticateToken } from "../middleware/validateJWTMiddleware";

const router = Router();

router.use(authenticateToken);
router.get("/sessions", listInterviewsController);
router.post("/sessions", requireCredits, withUserContext, startInterviewController);
router.post("/sessions/:id/answers", requireCredits, withUserContext, answerInterviewController);
router.post("/sessions/:id/finish", requireCredits, withUserContext, finishInterviewController);

export default router;

import { Router } from "express";
import { authenticateToken } from "../../middleware/validateJWTMiddleware";
import { createReviewController, getMyReviewController } from "./reviewController";

const router = Router();

router.post("/", authenticateToken, createReviewController);
router.get("/me", authenticateToken, getMyReviewController);

export default router;

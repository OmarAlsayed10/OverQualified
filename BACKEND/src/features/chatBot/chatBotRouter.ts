import { Router } from "express";
import {
  chatBotController,
  createChatController,
  getChatHistoryController,
} from "./chatBotController";
import { authenticateToken } from "../../middleware/validateJWTMiddleware";
import { requireProUser } from "../../middleware/roleMiddleware";

import { requireCredits, withUserContext } from "../../middleware/creditMiddleware";
const router = Router();

router.post("/", authenticateToken, requireProUser, requireCredits, withUserContext, chatBotController);
router.post("/create", authenticateToken,requireProUser, createChatController);
router.get("/history", authenticateToken, requireProUser,getChatHistoryController);

export default router;

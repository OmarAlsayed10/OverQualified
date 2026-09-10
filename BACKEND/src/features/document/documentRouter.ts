import { Router } from "express";
import { authenticateToken } from "../../middleware/validateJWTMiddleware";
import { requireProUser } from "../../middleware/roleMiddleware";
import {
  createGeneratedDocument,
  getUserDocuments,
  getUserDocument,
  editDocument,
  removeDocument,
  makePrimaryDocument,
} from "./documentController";

const router = Router();

router.use(authenticateToken);

router.get("/", getUserDocuments);
router.get("/:id", getUserDocument);
router.post("/generate", requireProUser, createGeneratedDocument);
router.put("/:id", editDocument);
router.patch("/:id/primary", makePrimaryDocument);
router.delete("/:id", removeDocument);

export default router;

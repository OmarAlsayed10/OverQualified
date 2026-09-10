import { Router } from "express";
import { communityController } from "./communityController";

const router = Router();

router.get("/", communityController);

export default router;

import { Request } from "express";
import { CustomRequest } from "../../../middleware/validateJWTMiddleware";

export const authenticatedUserId = (request: Request): string | undefined => (
  request as CustomRequest
).user?.userId;

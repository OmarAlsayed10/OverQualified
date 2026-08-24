import { Router } from "express";
import { authenticateToken } from "../middleware/validateJWTMiddleware";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  listUsersController,
  getUserController,
  deleteUserController,
  banUserController,
  unbanUserController,
  revokeProController,
  setPlanController,
  grantAnalysesController,
  listBannedIpsController,
  banIpController,
  unbanIpController,
  listAllPaymentsController,
  aiStatusController,
} from "../controllers/admin";
import {
  adminListBlogsController,
  createBlogController,
  updateBlogController,
  deleteBlogController,
} from "../controllers/blogController";
import {
  adminCreateJobCategoryController,
  adminCreateJobRoleController,
  adminJobCatalogController,
  adminReviewRoleSuggestionController,
  adminRoleSuggestionsController,
  adminUpdateJobCategoryController,
  adminUpdateJobRoleController,
} from "../controllers/jobCatalogController";
import {
  adminJobSubmissionsController,
  adminReviewJobSubmissionController,
} from "../controllers/jobSubmissionController";
import {
  adminPendingReviewsController,
  adminAllReviewsController,
  adminReviewActionController,
  adminDeleteReviewController,
} from "../controllers/reviewController";

const router = Router();

router.use(authenticateToken, requireAdmin);

router.get("/users", listUsersController);
router.get("/users/:id", getUserController);
router.delete("/users/:id", deleteUserController);
router.patch("/users/:id/ban", banUserController);
router.patch("/users/:id/unban", unbanUserController);
router.patch("/users/:id/revoke-pro", revokeProController);
router.patch("/users/:id/plan", setPlanController);
router.patch("/users/:id/grant-analyses", grantAnalysesController);

router.get("/ai-status", aiStatusController);

router.get("/banned-ips", listBannedIpsController);
router.post("/banned-ips", banIpController);
router.delete("/banned-ips/:ip", unbanIpController);

router.get("/payments", listAllPaymentsController);

router.get("/job-catalog", adminJobCatalogController);
router.post("/job-categories", adminCreateJobCategoryController);
router.patch("/job-categories/:id", adminUpdateJobCategoryController);
router.post("/job-categories/:categoryId/roles", adminCreateJobRoleController);
router.patch("/job-roles/:id", adminUpdateJobRoleController);
router.get("/job-role-suggestions", adminRoleSuggestionsController);
router.patch("/job-role-suggestions/:id", adminReviewRoleSuggestionController);
router.get("/job-submissions", adminJobSubmissionsController);
router.patch("/job-submissions/:id", adminReviewJobSubmissionController);

router.get("/blogs", adminListBlogsController);
router.post("/blogs", createBlogController);
router.patch("/blogs/:id", updateBlogController);
router.delete("/blogs/:id", deleteBlogController);

router.get("/reviews/pending", adminPendingReviewsController);
router.get("/reviews", adminAllReviewsController);
router.patch("/reviews/:id", adminReviewActionController);
router.delete("/reviews/:id", adminDeleteReviewController);

export default router;

import { Router } from "express";
import { authenticateToken } from "../../middleware/validateJWTMiddleware";
import {
  listPublishedBlogsController,
  getBlogController,
  blogSitemapController,
  recordBlogViewController,
  listBlogCommentsController,
  createBlogCommentController,
} from "./blogController";

const router = Router();

router.get("/", listPublishedBlogsController);
// Must stay above "/:slug", which would otherwise capture "sitemap.xml".
router.get("/sitemap.xml", blogSitemapController);
router.get("/:slug", getBlogController);
router.post("/:slug/view", recordBlogViewController);
router.get("/:slug/comments", listBlogCommentsController);
router.post("/:slug/comments", authenticateToken, createBlogCommentController);

export default router;

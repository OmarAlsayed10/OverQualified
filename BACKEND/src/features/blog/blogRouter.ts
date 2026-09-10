import { Router } from "express";
import {
  listPublishedBlogsController,
  getBlogController,
  blogSitemapController,
} from "./blogController";

const router = Router();

router.get("/", listPublishedBlogsController);
// Must stay above "/:slug", which would otherwise capture "sitemap.xml".
router.get("/sitemap.xml", blogSitemapController);
router.get("/:slug", getBlogController);

export default router;

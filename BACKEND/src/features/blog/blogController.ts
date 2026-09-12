import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";
import { displayName } from "../../lib/displayName";

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";

// ─── Public ───────────────────────────────────────────────────────────────────

export const listPublishedBlogsController = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const blogs = await prisma.blog.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      category: true,
      views: true,
      createdAt: true,
    },
  });
  res.status(200).json({ blogs });
};

const xmlEscape = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Blog posts live in the DB, so the crawler cannot get them from the static
// sitemap the SPA ships. robots.txt points here as a second sitemap.
export const blogSitemapController = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const blogs = await prisma.blog.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  });
  const origin = (process.env.CLIENT_URL ?? "").replace(/\/+$/, "");
  const urls = blogs
    .map(
      (b) =>
        `<url><loc>${xmlEscape(`${origin}/blogs/${b.slug}`)}</loc><lastmod>${b.updatedAt.toISOString()}</lastmod></url>`
    )
    .join("");

  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
  );
};

export const getBlogController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const blog = await prisma.blog.findUnique({ where: { slug: req.params.slug } });
  if (!blog || !blog.published) {
    res.status(404).json({ message: "Blog not found." });
    return;
  }
  res.status(200).json({ blog });
};

export const recordBlogViewController = async (
  req: Request,
  res: Response
): Promise<void> => {
  await prisma.blog
    .update({ where: { slug: req.params.slug, published: true }, data: { views: { increment: 1 } } })
    .catch(() => null);
  res.status(204).end();
};

export const listBlogCommentsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const comments = await prisma.blogComment.findMany({
    where: { approved: true, blog: { slug: req.params.slug, published: true } },
    orderBy: { createdAt: "asc" },
    select: { id: true, displayName: true, content: true, createdAt: true },
  });
  res.status(200).json({ comments });
};

export const createBlogCommentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = (req as CustomRequest).user!;
  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
  if (content.length < 3 || content.length > 2000) {
    res.status(400).json({ message: "Comment must be between 3 and 2000 characters." });
    return;
  }

  const blog = await prisma.blog.findUnique({ where: { slug: req.params.slug }, select: { id: true, published: true } });
  if (!blog || !blog.published) {
    res.status(404).json({ message: "Blog not found." });
    return;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { firstName: true, lastName: true },
  });

  const comment = await prisma.blogComment.create({
    data: {
      blogId: blog.id,
      userId: user.userId,
      displayName: dbUser ? displayName(dbUser.firstName, dbUser.lastName) || "User" : "User",
      content,
    },
  });
  res.status(201).json({ comment });
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminListBlogsController = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const blogs = await prisma.blog.findMany({ orderBy: { createdAt: "desc" } });
  res.status(200).json({ blogs });
};

export const createBlogController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { title, excerpt, content, coverImage, category, published } = req.body;
  if (!title || !content) {
    res.status(400).json({ message: "title and content are required." });
    return;
  }

  let slug = slugify(title);
  if (await prisma.blog.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const blog = await prisma.blog.create({
    data: {
      slug,
      title,
      excerpt: excerpt ?? "",
      content,
      coverImage: coverImage ?? null,
      category: category ?? "General",
      published: published ?? true,
    },
  });
  res.status(201).json({ blog });
};

export const updateBlogController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { title, excerpt, content, coverImage, category, published } = req.body;
  const blog = await prisma.blog
    .update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(excerpt !== undefined ? { excerpt } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(coverImage !== undefined ? { coverImage } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(published !== undefined ? { published } : {}),
      },
    })
    .catch(() => null);

  if (!blog) {
    res.status(404).json({ message: "Blog not found." });
    return;
  }
  res.status(200).json({ blog });
};

export const deleteBlogController = async (
  req: Request,
  res: Response
): Promise<void> => {
  await prisma.blog.delete({ where: { id: req.params.id } }).catch(() => null);
  res.status(200).json({ message: "Blog deleted." });
};

export const adminListBlogCommentsController = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const comments = await prisma.blogComment.findMany({
    orderBy: [{ approved: "asc" }, { createdAt: "desc" }],
    include: {
      blog: { select: { title: true, slug: true } },
      user: { select: { email: true } },
    },
  });
  res.status(200).json({ comments });
};

export const adminApproveBlogCommentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const comment = await prisma.blogComment
    .update({ where: { id: req.params.id }, data: { approved: true } })
    .catch(() => null);
  if (!comment) {
    res.status(404).json({ message: "Comment not found." });
    return;
  }
  res.status(200).json({ comment });
};

export const adminDeleteBlogCommentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  await prisma.blogComment.delete({ where: { id: req.params.id } }).catch(() => null);
  res.status(200).json({ message: "Comment deleted." });
};

import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";
import { displayName } from "../../lib/displayName";

// POST /reviews — create a pending review (signed-in user only)
export const createReviewController = async (req: Request, res: Response) => {
  const user = (req as CustomRequest).user!;
  const { rating, description } = req.body;

  // Validate rating
  if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ message: "Rating must be an integer between 1 and 5." });
    return;
  }

  // Validate description
  const desc = typeof description === "string" ? description.trim() : "";
  if (desc.length < 10 || desc.length > 1000) {
    res.status(400).json({ message: "Review must be between 10 and 1000 characters." });
    return;
  }

  // Check for existing pending or approved review
  const existing = await prisma.review.findFirst({
    where: {
      userId: user.userId,
      status: { in: ["PENDING", "APPROVED"] },
    },
  });

  if (existing) {
    res.status(409).json({ message: "You already have a pending or approved review." });
    return;
  }

  // Get user's display name from DB
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { firstName: true, lastName: true },
  });

  const name = dbUser ? displayName(dbUser.firstName, dbUser.lastName) : "User";

  const review = await prisma.review.create({
    data: {
      userId: user.userId,
      displayName: name,
      rating,
      description: desc,
    },
  });

  res.status(201).json(review);
};

// GET /reviews/me — get current user's review state
export const getMyReviewController = async (req: Request, res: Response) => {
  const user = (req as CustomRequest).user!;

  const review = await prisma.review.findFirst({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
  });

  res.json({ review: review ?? null });
};

// GET /admin/reviews/pending — admin: list pending reviews
export const adminPendingReviewsController = async (_req: Request, res: Response) => {
  const reviews = await prisma.review.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  res.json({ reviews });
};

// GET /admin/reviews — admin: list all reviews (optional ?status= filter)
export const adminAllReviewsController = async (req: Request, res: Response) => {
  const { status } = req.query;
  const where: any = {};
  if (status && ["PENDING", "APPROVED", "REJECTED"].includes(String(status))) {
    where.status = String(status);
  }

  const reviews = await prisma.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  res.json({ reviews });
};

// PATCH /admin/reviews/:id — admin: approve or reject
export const adminReviewActionController = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action } = req.body;

  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ message: 'Action must be "approve" or "reject".' });
    return;
  }

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    res.status(404).json({ message: "Review not found." });
    return;
  }

  if (review.status !== "PENDING") {
    res.status(400).json({ message: "Only pending reviews can be reviewed." });
    return;
  }

  const updated = await prisma.review.update({
    where: { id },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      reviewedAt: new Date(),
    },
  });

  res.json(updated);
};

// DELETE /admin/reviews/:id — admin: permanently delete a review
export const adminDeleteReviewController = async (req: Request, res: Response) => {
  const { id } = req.params;

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    res.status(404).json({ message: "Review not found." });
    return;
  }

  await prisma.review.delete({ where: { id } });
  res.json({ message: "Review deleted." });
};

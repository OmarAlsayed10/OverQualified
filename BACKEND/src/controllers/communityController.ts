import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { countDistinctCountries } from "../lib/countryNormalize";

const CACHE_TTL_MS = 60 * 60 * 1000;
let cached: { at: number; payload: unknown } | null = null;

export const communityController = async (_req: Request, res: Response) => {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    res.json(cached.payload);
    return;
  }

  try {
    const [cvsCreated, cvsAnalyzed, approvedReviews, userLocations] = await Promise.all([
      prisma.cV.count(),
      prisma.analysisEvent.count(),
      prisma.review.findMany({
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          displayName: true,
          rating: true,
          description: true,
          createdAt: true,
        },
      }),
      prisma.user.findMany({
        where: { emailVerified: true, location: { not: null } },
        select: { location: true },
        distinct: ["location"],
      }),
    ]);

    const countries = countDistinctCountries(
      userLocations.map((user: { location: string | null }) => user.location),
    );

    const reviewCount = approvedReviews.length;
    const averageRating = reviewCount > 0
      ? Math.round((approvedReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviewCount) * 10) / 10
      : null;

    const payload = {
      cvsCreated,
      cvsAnalyzed,
      averageRating,
      reviewCount,
      countries,
      reviews: approvedReviews,
    };

    cached = { at: Date.now(), payload };
    res.json(payload);
  } catch (error) {
    console.error("Community metrics error:", error);
    // A stale number beats an empty section on the home page.
    if (cached) {
      res.json(cached.payload);
      return;
    }
    res.status(500).json({ message: "Failed to load community data." });
  }
};

import { createReviewController, getMyReviewController, adminReviewActionController } from "../reviewController";
import prisma from "../../../lib/prisma";

jest.mock("../../../lib/prisma", () => ({
  __esModule: true,
  default: {
    review: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("reviewController", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { userId: "user-123" },
      body: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("createReviewController", () => {
    it("returns 400 if rating is missing or invalid", async () => {
      req.body = { rating: 0, description: "Great product experience!" };
      await createReviewController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Rating must be an integer between 1 and 5.",
      });
    });

    it("returns 400 if description is less than 10 characters", async () => {
      req.body = { rating: 5, description: "Short" };
      await createReviewController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Review must be between 10 and 1000 characters.",
      });
    });

    it("returns 409 if user already has a pending or approved review", async () => {
      req.body = { rating: 5, description: "Awesome app that helped my resume!" };
      (prisma.review.findFirst as any).mockResolvedValue({ id: "existing-rev", status: "PENDING" });

      await createReviewController(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: "You already have a pending or approved review.",
      });
    });

    it("creates a pending review successfully when inputs are valid", async () => {
      req.body = { rating: 5, description: "Awesome platform! Highly recommended." };
      (prisma.review.findFirst as any).mockResolvedValue(null);
      (prisma.user.findUnique as any).mockResolvedValue({ firstName: "John", lastName: "Doe" });
      (prisma.review.create as any).mockResolvedValue({
        id: "rev-1",
        userId: "user-123",
        displayName: "John D.",
        rating: 5,
        description: "Awesome platform! Highly recommended.",
        status: "PENDING",
      });

      await createReviewController(req, res);

      expect(prisma.review.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          displayName: "John Doe",
          rating: 5,
          description: "Awesome platform! Highly recommended.",
        },
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("getMyReviewController", () => {
    it("returns the current user's latest review or null", async () => {
      const mockReview = { id: "rev-1", status: "PENDING", rating: 5 };
      (prisma.review.findFirst as any).mockResolvedValue(mockReview);

      await getMyReviewController(req, res);
      expect(res.json).toHaveBeenCalledWith({ review: mockReview });
    });
  });

  describe("adminReviewActionController", () => {
    it("returns 400 for invalid action", async () => {
      req.params = { id: "rev-1" };
      req.body = { action: "invalid" };

      await adminReviewActionController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("approves a pending review successfully", async () => {
      req.params = { id: "rev-1" };
      req.body = { action: "approve" };
      (prisma.review.findUnique as any).mockResolvedValue({ id: "rev-1", status: "PENDING" });
      (prisma.review.update as any).mockResolvedValue({ id: "rev-1", status: "APPROVED" });

      await adminReviewActionController(req, res);
      expect(prisma.review.update).toHaveBeenCalledWith({
        where: { id: "rev-1" },
        data: expect.objectContaining({ status: "APPROVED" }),
      });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "APPROVED" }));
    });

    it("rejects a pending review successfully", async () => {
      req.params = { id: "rev-1" };
      req.body = { action: "reject" };
      (prisma.review.findUnique as any).mockResolvedValue({ id: "rev-1", status: "PENDING" });
      (prisma.review.update as any).mockResolvedValue({ id: "rev-1", status: "REJECTED" });

      await adminReviewActionController(req, res);
      expect(prisma.review.update).toHaveBeenCalledWith({
        where: { id: "rev-1" },
        data: expect.objectContaining({ status: "REJECTED" }),
      });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "REJECTED" }));
    });
  });
});

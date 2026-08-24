jest.mock("../../lib/prisma", () => ({
  __esModule: true,
  default: {
    cV: { count: jest.fn() },
    analysisEvent: { count: jest.fn() },
    review: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  },
}));

describe("communityController", () => {
  let req: any;
  let res: any;
  let prisma: any;
  let communityController: typeof import("../communityController").communityController;

  // The controller holds its metrics in a module-level TTL cache, so without a fresh
  // module per test the second case is served the first one's numbers instead of running.
  beforeEach(() => {
    jest.resetModules();
    prisma = require("../../lib/prisma").default;
    communityController = require("../communityController").communityController;
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  it("returns live metrics and approved reviews", async () => {
    (prisma.cV.count as any).mockResolvedValue(150);
    (prisma.analysisEvent.count as any).mockResolvedValue(75);
    (prisma.review.findMany as any).mockResolvedValue([
      { id: "r1", displayName: "Alice S.", rating: 5, description: "Awesome!", createdAt: new Date() },
      { id: "r2", displayName: "Bob K.", rating: 4, description: "Great tool!", createdAt: new Date() },
    ]);
    (prisma.user.findMany as any).mockResolvedValue([
      { location: "Cairo, Egypt" },
    ]);

    await communityController(req, res);

    expect(res.json).toHaveBeenCalledWith({
      cvsCreated: 150,
      cvsAnalyzed: 75,
      averageRating: 4.5,
      reviewCount: 2,
      countries: 1,
      reviews: expect.arrayContaining([
        expect.objectContaining({ id: "r1", rating: 5 }),
        expect.objectContaining({ id: "r2", rating: 4 }),
      ]),
    });
  });

  it("handles empty reviews correctly", async () => {
    (prisma.cV.count as any).mockResolvedValue(0);
    (prisma.analysisEvent.count as any).mockResolvedValue(0);
    (prisma.review.findMany as any).mockResolvedValue([]);
    (prisma.user.findMany as any).mockResolvedValue([]);

    await communityController(req, res);

    expect(res.json).toHaveBeenCalledWith({
      cvsCreated: 0,
      cvsAnalyzed: 0,
      averageRating: null,
      reviewCount: 0,
      countries: 0,
      reviews: [],
    });
  });
});

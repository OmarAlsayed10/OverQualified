import prisma from "../../../lib/prisma";
import { activeBoardSources, configuredJobBoards, createBoardSource, recordBoardRun } from "../jobBoardSourceService";

jest.mock("../../../lib/prisma", () => ({
  __esModule: true,
  default: { jobBoardSource: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() } },
}));

const mockedPrisma = prisma as unknown as {
  jobBoardSource: { findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.GREENHOUSE_BOARDS;
});

describe("activeBoardSources", () => {
  test("prefers rows from the database", async () => {
    mockedPrisma.jobBoardSource.findMany.mockResolvedValue([
      { id: "1", provider: "greenhouse", slug: "figma", company: "Figma" },
    ]);
    await expect(activeBoardSources("greenhouse")).resolves.toEqual([
      { id: "1", provider: "greenhouse", slug: "figma", company: "Figma" },
    ]);
  });

  test("falls back to the env var while the table is empty", async () => {
    mockedPrisma.jobBoardSource.findMany.mockResolvedValue([]);
    process.env.GREENHOUSE_BOARDS = "Paymob:paymob";
    await expect(activeBoardSources("greenhouse")).resolves.toEqual([
      { id: null, provider: "greenhouse", slug: "paymob", company: "Paymob" },
    ]);
  });

  test("returns nothing for a provider with no rows and no env fallback", async () => {
    mockedPrisma.jobBoardSource.findMany.mockResolvedValue([]);
    await expect(activeBoardSources("workable")).resolves.toEqual([]);
  });
});

describe("createBoardSource", () => {
  test("rejects an unknown provider", async () => {
    await expect(createBoardSource({ provider: "monster", slug: "x", company: "X", country: null }))
      .rejects.toThrow("INVALID_BOARD_PROVIDER");
  });

  test("rejects a missing slug", async () => {
    await expect(createBoardSource({ provider: "workable", slug: " ", company: "Paymob", country: null }))
      .rejects.toThrow("INVALID_BOARD_SOURCE");
  });

  test("normalizes provider and country", async () => {
    mockedPrisma.jobBoardSource.create.mockResolvedValue({});
    await createBoardSource({ provider: "Workable", slug: " paymob ", company: " Paymob ", country: "eg" });
    expect(mockedPrisma.jobBoardSource.create).toHaveBeenCalledWith({
      data: { provider: "workable", slug: "paymob", company: "Paymob", country: "EG" },
    });
  });
});

describe("recordBoardRun", () => {
  test("skips env-backed sources that have no row to update", async () => {
    await recordBoardRun({ id: null, provider: "lever", slug: "x", company: "X" }, { jobCount: 3 });
    expect(mockedPrisma.jobBoardSource.update).not.toHaveBeenCalled();
  });

  test("stores the error for a failing board", async () => {
    mockedPrisma.jobBoardSource.update.mockResolvedValue({});
    await recordBoardRun({ id: "1", provider: "lever", slug: "x", company: "X" }, { jobCount: 0, error: "404" });
    expect(mockedPrisma.jobBoardSource.update.mock.calls[0][0].data).toMatchObject({ lastJobCount: 0, lastError: "404" });
  });
});

describe("configuredJobBoards", () => {
  test("still parses the legacy env format", () => {
    expect(configuredJobBoards("Figma:figma, GitLab:gitlab, broken")).toEqual([
      { company: "Figma", board: "figma" },
      { company: "GitLab", board: "gitlab" },
    ]);
  });
});

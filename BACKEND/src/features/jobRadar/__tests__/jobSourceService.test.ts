import { configuredJobBoards } from "../jobSourceService";

describe("configuredJobBoards", () => {
  it("reads only complete company-board pairs", () => {
    expect(configuredJobBoards("Figma:figma, GitLab:gitlab, broken")).toEqual([
      { company: "Figma", board: "figma" },
      { company: "GitLab", board: "gitlab" },
    ]);
  });
});
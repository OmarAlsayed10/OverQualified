import { joinPageItems } from "../extractTextService";

const item = (str: string, x: number, width: number, y: number, hasEOL = false) =>
  ({ str, x, y, width, height: 10, fontSize: 10, fontFamily: "Arial", dir: "ltr", hasEOL });

describe("PDF text item joining", () => {
  test("separate runs on one line keep their word boundary", () => {
    const items = [
      item("React, Node", 50, 60, 700),
      item("Jan 2020 - Present", 400, 90, 700),
      item("Built payment APIs.", 50, 100, 686, true),
    ];
    expect(joinPageItems(items)).toBe("React, Node Jan 2020 - Present\nBuilt payment APIs.");
  });

  test("adjacent kerned runs stay one word", () => {
    expect(joinPageItems([item("Engi", 50, 20, 700), item("neer", 70, 20, 700)])).toBe("Engineer");
  });

  test("a new baseline without hasEOL still breaks the line", () => {
    expect(joinPageItems([item("Skills", 50, 30, 700), item("Docker", 50, 30, 686)])).toBe("Skills\nDocker");
  });

  test("right-to-left runs keep their word boundary", () => {
    const items = [item("خلفية", 400, 40, 700), item("في", 350, 20, 700)];
    expect(joinPageItems(items)).toBe("خلفية في");
  });

  test("adjacent right-to-left runs stay one word", () => {
    expect(joinPageItems([item("خلفي", 400, 40, 700), item("ة", 390, 10, 700)])).toBe("خلفية");
  });
});

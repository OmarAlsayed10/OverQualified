import { parseQuestions } from "../extensionAnswerService";

jest.mock("../../../lib/prisma", () => ({ __esModule: true, default: {} }));
jest.mock("../../../lib/groqChat", () => ({ __esModule: true, groqChat: jest.fn(), MODELS: { fast: "fast" } }));

describe("parseQuestions", () => {
  const valid = { id: "q1", label: "Years of experience", type: "number" };

  test("keeps a valid question", () => {
    expect(parseQuestions([valid])).toEqual([
      { id: "q1", label: "Years of experience", type: "number", options: undefined, maxLength: undefined },
    ]);
  });

  test("drops entries with an unknown type", () => {
    expect(parseQuestions([{ ...valid, type: "colour" }])).toEqual([]);
  });

  test("drops entries with no id or too short a label", () => {
    expect(parseQuestions([{ ...valid, id: "" }])).toEqual([]);
    expect(parseQuestions([{ ...valid, label: "x" }])).toEqual([]);
  });

  test("normalizes whitespace in the label", () => {
    expect(parseQuestions([{ ...valid, label: "  Why   this   role?  " }])[0].label).toBe("Why this role?");
  });

  test("keeps select options and caps them", () => {
    const options = Array.from({ length: 40 }, (_, index) => `option ${index}`);
    const parsed = parseQuestions([{ id: "q", label: "Notice period", type: "select", options }]);
    expect(parsed[0].options).toHaveLength(30);
  });

  test("clamps an absurd maxLength", () => {
    expect(parseQuestions([{ ...valid, maxLength: 99999 }])[0].maxLength).toBe(5000);
    expect(parseQuestions([{ ...valid, maxLength: -3 }])[0].maxLength).toBeUndefined();
  });

  test("caps the number of questions accepted", () => {
    const many = Array.from({ length: 40 }, (_, index) => ({ ...valid, id: `q${index}` }));
    expect(parseQuestions(many)).toHaveLength(25);
  });

  test("returns nothing for non-array input", () => {
    expect(parseQuestions(undefined)).toEqual([]);
    expect(parseQuestions({})).toEqual([]);
  });
});

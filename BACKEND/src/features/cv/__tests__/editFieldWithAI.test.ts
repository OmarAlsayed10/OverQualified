import { groqChat } from "../../../lib/groqChat";
import { editFieldWithAI } from "../AIWritingService";

jest.mock("../../../lib/groqChat", () => ({
  groqChat: jest.fn(),
  MODELS: { versatile: "versatile" },
}));

const mockedGroqChat = groqChat as jest.MockedFunction<typeof groqChat>;

const reply = (content: string) =>
  ({ choices: [{ message: { content } }] } as never);

const experienceContext = { jobTitle: "Frontend Web Developer", company: "Penta-B" };

describe("editFieldWithAI", () => {
  beforeEach(() => jest.resetAllMocks());

  test("joins the bullet array into one bullet per line, with no markers", async () => {
    mockedGroqChat.mockResolvedValueOnce(reply(JSON.stringify({ bullets: ["Built the thing", "Shipped the thing"] })));

    const result = await editFieldWithAI("experience", "Make it 2 bullets", "old text", experienceContext);

    expect(result).toBe("Built the thing\nShipped the thing");
  });

  test("drops a line that only repeats the entry's own header", async () => {
    mockedGroqChat.mockResolvedValueOnce(
      reply(JSON.stringify({ bullets: ["Frontend Web Developer, Penta-B", "Delivered six GIS plugins"] }))
    );

    const result = await editFieldWithAI("experience", "Add metrics", "old text", experienceContext);

    expect(result).toBe("Delivered six GIS plugins");
  });

  test("keeps the content when every line looks like the header", async () => {
    mockedGroqChat.mockResolvedValueOnce(reply(JSON.stringify({ bullets: ["Penta-B"] })));

    const result = await editFieldWithAI("experience", "Make concise", "old text", experienceContext);

    expect(result).toBe("Penta-B");
  });

  test("flattens typographic punctuation an ATS parser cannot read", async () => {
    mockedGroqChat.mockResolvedValueOnce(
      reply(JSON.stringify({ bullets: ["Owned find‑nearest end—to—end  ", "Wrote the team’s “style guide”"] }))
    );

    const result = await editFieldWithAI("experience", "Make concise", "old text", experienceContext);

    expect(result).toBe('Owned find-nearest end-to-end\nWrote the team\'s "style guide"');
  });

  test("returns a single string for sections that are not bullet lists", async () => {
    mockedGroqChat.mockResolvedValueOnce(reply(JSON.stringify({ text: "- Software Engineer with **five** years" })));

    const result = await editFieldWithAI("summary", "Make shorter", "old summary", {});

    expect(result).toBe("Software Engineer with five years");
  });

  test("falls back to the raw body rather than losing the edit when the JSON is malformed", async () => {
    mockedGroqChat.mockResolvedValueOnce(reply("Built the thing\nShipped the thing"));

    const result = await editFieldWithAI("experience", "Make it 2 bullets", "old text", experienceContext);

    expect(result).toBe("Built the thing\nShipped the thing");
  });

  test("asks for a budget the reasoning tokens cannot exhaust", async () => {
    mockedGroqChat.mockResolvedValueOnce(reply(JSON.stringify({ bullets: ["Built the thing"] })));

    await editFieldWithAI("experience", "Make concise", "old text", experienceContext);

    const params = mockedGroqChat.mock.calls[0][0] as any;
    expect(params.max_tokens).toBeGreaterThanOrEqual(1200);
    expect(params.reasoning_effort).toBe("low");
    expect(params.response_format).toEqual({ type: "json_object" });
  });
});

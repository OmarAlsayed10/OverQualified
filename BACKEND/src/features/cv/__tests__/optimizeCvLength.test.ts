import { groqChat } from "../../../lib/groqChat";
import { optimizeCvLength } from "../AIWritingService";

jest.mock("../../../lib/groqChat", () => ({
  groqChat: jest.fn(),
  MODELS: { fast: "fast" },
}));

const mockedGroqChat = groqChat as jest.MockedFunction<typeof groqChat>;

const reply = (payload: unknown) =>
  ({ choices: [{ message: { content: JSON.stringify(payload) } }] } as never);

const words = (count: number) => Array.from({ length: count }, () => "word").join(" ");

const cv = (descriptionWords: number) => ({
  personalInfo: { ProfessionalSummary: words(40) },
  experience: [{ jobTitle: "Dev", company: "Acme", description: words(descriptionWords) }],
  education: [],
  projects: [],
  skills: { skills: ["React"], languages: "", certifications: [] },
});

describe("optimizeCvLength", () => {
  beforeEach(() => jest.resetAllMocks());

  test("asks for a word budget derived from the measured page count", async () => {
    mockedGroqChat.mockResolvedValueOnce(reply(cv(80)));

    await optimizeCvLength(cv(360), 2);

    const prompt = mockedGroqChat.mock.calls[0][0].messages[0].content as string;
    // 400 words of prose over 2 pages -> ~200 word target.
    expect(prompt).toContain("about 200 words");
  });

  test("retries when the rewrite is still too long", async () => {
    mockedGroqChat.mockResolvedValueOnce(reply(cv(360))).mockResolvedValueOnce(reply(cv(80)));

    const result = await optimizeCvLength(cv(360), 2);

    expect(mockedGroqChat).toHaveBeenCalledTimes(2);
    expect(result.experience[0].description.split(" ")).toHaveLength(80);
  });

  test("keeps every entry when the model drops one", async () => {
    const shortened = cv(60);
    shortened.experience = [];
    mockedGroqChat.mockResolvedValueOnce(reply(shortened));

    const result = await optimizeCvLength(cv(360), 2);

    expect(result.experience).toHaveLength(1);
  });
});

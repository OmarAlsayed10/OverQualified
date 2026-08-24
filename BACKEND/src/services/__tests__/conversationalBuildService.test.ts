import { InvalidAiResponseError } from "../../lib/aiResponseValidation";
import { groqChat } from "../../lib/groqChat";
import { conversationalBuild } from "../conversationalBuildService";

jest.mock("../../lib/groqChat", () => ({
  groqChat: jest.fn(),
  MODELS: { versatile: "test-model" },
}));

const mockedGroqChat = groqChat as jest.MockedFunction<typeof groqChat>;

const currentFormData = {
  personalInfo: {
    firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", phoneCode: "",
    phone: "", country: "", city: "", town: "", professionalTitle: "Engineer",
    ProfessionalSummary: "", linkedin: "", github: "", portfolio: "",
  },
  experience: [],
  education: [],
  projects: [],
  skills: { skills: [], languages: "", certifications: [] },
};

const messages = [{ role: "user" as const, content: "Add TypeScript to my skills." }];

describe("conversationalBuild AI response integrity", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  test.each([
    ["malformed JSON", "not-json"],
    ["a response without form data", JSON.stringify({ reply: "I updated your CV." })],
    ["a response without a reply", JSON.stringify({ formData: currentFormData })],
  ])("2026-07 %s rejects the response without returning a CV update", async (_scenario, content) => {
    mockedGroqChat.mockResolvedValueOnce({ choices: [{ message: { content } }] } as never);

    await expect(conversationalBuild(messages, currentFormData)).rejects.toBeInstanceOf(
      InvalidAiResponseError,
    );
  });

  test("2026-07 missing provider content rejects the response without returning a CV update", async () => {
    mockedGroqChat.mockResolvedValueOnce({ choices: [] } as never);

    await expect(conversationalBuild(messages, currentFormData)).rejects.toBeInstanceOf(
      InvalidAiResponseError,
    );
  });

  test("normalizes a legacy flat skill update into a category", async () => {
    const formData = { ...currentFormData, skills: { ...currentFormData.skills, skills: ["TypeScript"] } };
    const categorizedFormData = {
      ...formData,
      skills: {
        ...formData.skills,
        skillCategories: [{ name: "Other Skills", skills: ["TypeScript"] }],
      },
    };
    mockedGroqChat.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        changeIntent: "add",
        changedSections: ["skills"],
        formData,
        reply: "Added TypeScript to your skills.",
      }) } }],
    } as never);

    await expect(conversationalBuild(messages, currentFormData)).resolves.toEqual({
      formData: categorizedFormData,
      reply: "Added TypeScript to your skills.",
    });
  });

  test("2026-07 additive Arabic request preserves the imported CV when the provider returns only new entries", async () => {
    const importedFormData = {
      ...currentFormData,
      personalInfo: { ...currentFormData.personalInfo, ProfessionalSummary: "Insurance and retail sales professional." },
      experience: [{
        jobTitle: "Insurance Broker", company: "ABC Insurance", location: "", startDate: "", endDate: "", description: "Advised clients on insurance products.",
      }],
    };
    const providerFormData = {
      ...currentFormData,
      personalInfo: {
        ...currentFormData.personalInfo,
        firstName: "",
        lastName: "",
        email: "",
        professionalTitle: "",
        ProfessionalSummary: "Motivated and results-driven Sales & Customer Service Professional.",
      },
      experience: [{
        jobTitle: "Sales Associate", company: "TAG Store", location: "", startDate: "", endDate: "6 months", description: "Supported retail sales of household goods.",
      }],
      skills: {
        ...currentFormData.skills,
        certifications: [{ name: "Digital Marketing Course", issuer: "", date: "", url: "", description: "35-hour course covering content creation and media buying." }],
      },
    };
    mockedGroqChat.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        changeIntent: "modify",
        changedSections: ["personalInfo", "experience", "skills"],
        formData: providerFormData,
        reply: "تمت إضافة الخبرة والكورس.",
      }) } }],
    } as never);

    const update = await conversationalBuild([
      { role: "user", content: "add: زودلي اني اشتغلت في tag store للادوات المنزلية ٦ شهور وخدت كورس ديجيتال ماركتينج (content creation - media buying) حوالي ٣٥ ساعة" },
    ], importedFormData);

    expect(update.formData.personalInfo).toEqual(importedFormData.personalInfo);
    expect(update.formData.experience).toEqual([...importedFormData.experience, ...providerFormData.experience]);
    expect(update.formData.skills.certifications).toEqual(providerFormData.skills.certifications);
  });
});
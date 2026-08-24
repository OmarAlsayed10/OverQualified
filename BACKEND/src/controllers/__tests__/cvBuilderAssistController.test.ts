import { Request, Response } from "express";
import { InvalidAiResponseError } from "../../lib/aiResponseValidation";
import { conversationalBuild } from "../../services/conversationalBuildService";
import { conversationalBuildController } from "../cv";

jest.mock("../../services/conversationalBuildService", () => ({ conversationalBuild: jest.fn() }));
jest.mock("../../services/cvParseService", () => ({
  coerceFormData: jest.fn((formData: unknown) => formData),
  parseCvToStructured: jest.fn(),
}));

const mockedConversationalBuild = conversationalBuild as jest.MockedFunction<typeof conversationalBuild>;

const createResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response;
};

const request = { body: { messages: [{ role: "user", content: "Add TypeScript." }], formData: {} } } as Request;

describe("conversationalBuildController", () => {
  beforeEach(() => jest.resetAllMocks());

  test("returns the verified CV update", async () => {
    const result = { formData: { personalInfo: {} }, reply: "Added TypeScript." } as never;
    mockedConversationalBuild.mockResolvedValueOnce(result);
    const response = createResponse();

    await conversationalBuildController(request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(result);
  });

  test("returns a non-success response when the provider output is invalid", async () => {
    mockedConversationalBuild.mockRejectedValueOnce(
      new InvalidAiResponseError("malformed_json", "The AI provider returned malformed JSON."),
    );
    const response = createResponse();

    await conversationalBuildController(request, response);

    expect(response.status).toHaveBeenCalledWith(502);
    expect(response.json).toHaveBeenCalledWith({
      code: "AI_RESPONSE_INVALID",
      message: "The AI response could not be verified. Your CV was not updated.",
    });
  });
});

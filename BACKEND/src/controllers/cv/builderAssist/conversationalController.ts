import { Request, Response } from "express";
import { sendAiError } from "../../../lib/aiError";
import { InvalidAiResponseError } from "../../../lib/aiResponseValidation";
import { conversationalBuild } from "../../../services/conversationalBuildService";
import { coerceFormData } from "../../../services/cvParseService";

export const conversationalBuildController = async (request: Request, response: Response) => {
  const { messages, formData } = request.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    response.status(400).json({ message: "messages are required" });
    return;
  }
  try {
    const buildResponse = await conversationalBuild(messages, coerceFormData(formData));
    response.status(200).json(buildResponse);
  } catch (error) {
    if (error instanceof InvalidAiResponseError) {
      response.status(502).json({
        code: "AI_RESPONSE_INVALID",
        message: "The AI response could not be verified. Your CV was not updated.",
      });
      return;
    }
    sendAiError(response, error, "Conversational build error", "Failed to process message");
  }
};

import { Request, Response } from "express";
import {
  buildInstapayDetails,
  getActivePlans,
  getPlanById,
} from "../../services/paymentService";
import {
  customCreditQuote,
  customInstapayDetails,
} from "../../services/creditPurchaseService";
import { PricingConfigurationError } from "../../services/creditPricingService";

export const listPlansController = async (_request: Request, response: Response): Promise<void> => {
  const plans = await getActivePlans();
  response.status(200).json({ plans });
};

export const instapayDetailsController = async (request: Request, response: Response): Promise<void> => {
  const plan = await getPlanById(request.params.planId);
  if (!plan) {
    response.status(404).json({ message: "Plan not found." });
    return;
  }
  response.status(200).json(buildInstapayDetails(plan));
};

export const creditQuoteController = async (request: Request, response: Response): Promise<void> => {
  try {
    const quote = customCreditQuote(request.body.amountEGP);
    if ("code" in quote) {
      response.status(422).json({
        ...quote,
        message: "Choose an amount that buys a whole number of credits.",
      });
      return;
    }
    response.status(200).json(quote);
  } catch (error) {
    if (error instanceof RangeError) {
      response.status(400).json({ code: "INVALID_CUSTOM_AMOUNT", message: error.message });
      return;
    }
    if (error instanceof PricingConfigurationError) {
      response.status(503).json({
        code: "PRICING_UNAVAILABLE",
        message: "Credit purchasing is temporarily unavailable.",
      });
      return;
    }
    throw error;
  }
};

export const customInstapayDetailsController = async (request: Request, response: Response): Promise<void> => {
  try {
    response.status(200).json(customInstapayDetails(request.body.amountEGP));
  } catch (error) {
    if (
      error instanceof RangeError
      || (error instanceof Error && error.message === "INVALID_CREDIT_QUOTE")
    ) {
      response.status(422).json({
        code: "INVALID_CREDIT_QUOTE",
        message: "Enter an amount that buys a whole number of credits.",
      });
      return;
    }
    if (error instanceof PricingConfigurationError) {
      response.status(503).json({
        code: "PRICING_UNAVAILABLE",
        message: "Credit purchasing is temporarily unavailable.",
      });
      return;
    }
    throw error;
  }
};

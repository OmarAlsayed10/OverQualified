import OpenAI from "openai";
import { recordUsage, recordRateLimit } from "../services/aiStatusService";
import { getUserId } from "./creditContext";
import { spendCredits, creditCost } from "../services/quotaService";
import { AI_MODELS } from "../config/aiModels";

const charge = (model: string, usage: OpenAI.Completions.CompletionUsage | undefined) => {
  const userId = getUserId();
  if (userId && usage) spendCredits(userId, creditCost(model, usage));
};

const makeClient = (apiKey: string) =>
  new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });

const clients = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
]
  .map((key, i) => (key ? { client: makeClient(key), label: `key${i + 1}` } : null))
  .filter((c): c is { client: OpenAI; label: string } => c !== null);

export const MODELS = AI_MODELS;

const FALLBACK_MODEL = MODELS.fast;

export type ChatParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
  compound_custom?: {
    tools?: { enabled_tools: Array<"web_search" | "visit_website"> };
  };
  citation_options?: "enabled" | "disabled";
};

export const isGroqRateLimit = (err: any): boolean =>
  err?.status === 429 || err?.code === "rate_limit_exceeded";

// Try each configured key in order. Move to the next key only on a rate-limit;
// any other error propagates immediately. Returns after the first success.
async function runOnKeys(
  params: ChatParams,
  model: string
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  let lastErr: any;
  for (const { client, label } of clients) {
    try {
      const res = await client.chat.completions.create({ ...params, model });
      recordUsage(`${model}-${label}`, res.usage?.total_tokens ?? 0);
      charge(model, res.usage);
      return res;
    } catch (err: any) {
      lastErr = err;
      if (!isGroqRateLimit(err)) throw err;
      recordRateLimit(`${model}-${label}`);
    }
  }
  throw lastErr;
}

// Groq free tier caps tokens-per-day per model. When the primary (70b) model is
// exhausted across all keys, retry the same request on the smaller model, which
// has its own budget, so a feature degrades in quality instead of failing outright.
// Pass { fallback: false } for accuracy-critical calls (e.g. scoring) that must not
// silently drop to the weaker model — the rate-limit error propagates instead.
export async function groqChat(
  params: ChatParams,
  opts: { fallback?: boolean } = {}
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  try {
    return await runOnKeys(params, params.model);
  } catch (err: any) {
    if (isGroqRateLimit(err) && opts.fallback !== false && params.model !== FALLBACK_MODEL) {
      return runOnKeys(params, FALLBACK_MODEL);
    }
    throw err;
  }
}

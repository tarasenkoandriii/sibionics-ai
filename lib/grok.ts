const DEFAULT_GROK_API_BASE_URL = "https://api.x.ai/v1";
const DEFAULT_GROK_MODEL = "grok-4";
const DEFAULT_GROK_VISION_MODEL = "grok-4";

export type GrokMessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

export type GrokMessage = {
  role: "system" | "user" | "assistant";
  content: GrokMessageContent;
};

export function readBooleanEnv(name: string, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

export function readPositiveNumberEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function readPositiveIntegerEnv(name: string, fallback: number) {
  return Math.round(readPositiveNumberEnv(name, fallback));
}

export function getGrokApiKey() {
  const key = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!key) throw new Error("XAI_API_KEY is not configured");
  return key;
}

export function hasGrokApiKey() {
  return Boolean(process.env.XAI_API_KEY || process.env.GROK_API_KEY);
}

export function getGrokBaseUrl() {
  const raw = process.env.GROK_API_BASE_URL || DEFAULT_GROK_API_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function getGrokModel() {
  return process.env.GROK_MODEL || DEFAULT_GROK_MODEL;
}

function normalizeModelList(models: Array<string | undefined>) {
  const seen = new Set<string>();
  return models
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

export function getGrokVisionModel() {
  return getGrokVisionModels()[0];
}

export function isGrokImageGenerationModel(model: string) {
  const normalized = model.toLowerCase();
  return (
    normalized.includes("imagine") ||
    normalized.includes("image-gen") ||
    normalized.includes("image_generation") ||
    normalized.includes("image-generation") ||
    normalized.includes("aurora")
  );
}

export function isLikelyOpenRouterModelId(model: string) {
  return model.includes("/");
}

export function normalizeGrokModelCandidates(models: Array<string | undefined>) {
  return normalizeModelList(models).filter((model) => {
    if (isLikelyOpenRouterModelId(model)) return false;
    if (isGrokImageGenerationModel(model)) return false;
    return true;
  });
}

export function getGrokVisionModels() {
  return normalizeGrokModelCandidates([
    process.env.GROK_VISION_MODEL,
    process.env.GROK_VISION_MODEL_CANDIDATES,
    process.env.GROK_MODEL,
    DEFAULT_GROK_VISION_MODEL
  ]);
}

export async function listGrokModels() {
  const response = await fetch(`${getGrokBaseUrl()}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getGrokApiKey()}`,
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });

  const raw = await response.text();
  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = { raw };
  }

  return { response, payload, raw };
}

export function extractGrokModelIds(payload: any) {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  return normalizeGrokModelCandidates(
    data
      .map((item: any) => item?.id || item?.name || item?.model)
      .filter(Boolean)
  );
}

export function mergeGrokModelCandidates(...groups: string[][]) {
  return normalizeGrokModelCandidates(groups.flat());
}

export function isGrokRetryableModelError(payload: any) {
  const message = String(payload?.error?.message || payload?.error || "").toLowerCase();
  const code = String(payload?.code || payload?.error?.code || "").toLowerCase();

  return (
    message.includes("model not found") ||
    message.includes("does not support") ||
    message.includes("image input") ||
    message.includes("invalid model") ||
    code.includes("model")
  );
}

export function getGrokMaxOutputTokens(fallback = 700) {
  return readPositiveIntegerEnv("GROK_MAX_OUTPUT_TOKENS", fallback);
}

export function extractGrokText(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === "string") return content.trim();

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        if (typeof part?.content === "string") return part.content;
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return "";
}

export function parseJsonFromText(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1]);

    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);

    throw new Error("Grok response is not valid JSON");
  }
}

export async function callGrokChatCompletion(args: {
  messages: GrokMessage[];
  model?: string;
  maxTokens?: number;
  responseFormat?: { type: "json_object" };
}) {
  const response = await fetch(`${getGrokBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getGrokApiKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: args.model || getGrokModel(),
      messages: args.messages,
      temperature: 0.2,
      max_tokens: args.maxTokens ?? getGrokMaxOutputTokens(),
      ...(args.responseFormat ? { response_format: args.responseFormat } : {})
    }),
    cache: "no-store"
  });

  const raw = await response.text();
  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = { raw };
  }

  return { response, payload, raw };
}

// Provider layer. Each provider knows its key env var, a sensible default model,
// and how to turn a (system, user) pair into a single text reply.

export interface CompletionRequest {
  model: string;
  system: string;
  user: string;
  apiKey: string;
  timeoutMs: number;
}

interface ProviderDef {
  label: string;
  keyEnv: string;
  defaultModel: string;
  complete: (req: CompletionRequest) => Promise<string>;
}

const MAX_TOKENS = 1024;

/** An HTTP error that carries the status code so callers can give a friendly hint. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new HttpError(res.status, `HTTP ${res.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

const PROVIDERS: Record<string, ProviderDef> = {
  anthropic: {
    label: "Anthropic (Claude)",
    keyEnv: "ANTHROPIC_API_KEY",
    defaultModel: "claude-opus-4-8",
    async complete({ model, system, user, apiKey, timeoutMs }) {
      const data = await postJson(
        "https://api.anthropic.com/v1/messages",
        { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        { model, max_tokens: MAX_TOKENS, system, messages: [{ role: "user", content: user }] },
        timeoutMs
      );
      return (data.content ?? [])
        .filter((b: any) => b.type === "text" && typeof b.text === "string")
        .map((b: any) => b.text)
        .join("\n");
    },
  },
  openai: {
    label: "OpenAI (GPT)",
    keyEnv: "OPENAI_API_KEY",
    defaultModel: "gpt-5.5",
    async complete({ model, system, user, apiKey, timeoutMs }) {
      const data = await postJson(
        "https://api.openai.com/v1/chat/completions",
        { authorization: `Bearer ${apiKey}` },
        {
          model,
          max_completion_tokens: MAX_TOKENS,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        },
        timeoutMs
      );
      return data.choices?.[0]?.message?.content ?? "";
    },
  },
  google: {
    label: "Google (Gemini)",
    keyEnv: "GEMINI_API_KEY",
    defaultModel: "gemini-3.5-flash",
    async complete({ model, system, user, apiKey, timeoutMs }) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const data = await postJson(
        url,
        {},
        {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { maxOutputTokens: MAX_TOKENS },
        },
        timeoutMs
      );
      return (data.candidates?.[0]?.content?.parts ?? [])
        .map((p: any) => p.text)
        .filter(Boolean)
        .join("\n");
    },
  },
};

export const PROVIDER_NAMES = Object.keys(PROVIDERS);

export function isProvider(name: string): boolean {
  return name in PROVIDERS;
}

export function providerDef(name: string): ProviderDef {
  const def = PROVIDERS[name];
  if (!def) {
    throw new Error(`unknown provider '${name}' (use one of: ${PROVIDER_NAMES.join(", ")})`);
  }
  return def;
}

export function providerKeyEnv(name: string): string {
  return providerDef(name).keyEnv;
}

export function providerDefaultModel(name: string): string {
  return providerDef(name).defaultModel;
}

/** Read a provider's key from the environment. Unexpanded ${VARS} count as missing. */
export function resolveKey(name: string): { keyEnv: string; key?: string } {
  const keyEnv = providerKeyEnv(name);
  const value = process.env[keyEnv];
  if (!value || /^\$\{.*\}$/.test(value)) return { keyEnv };
  return { keyEnv, key: value };
}

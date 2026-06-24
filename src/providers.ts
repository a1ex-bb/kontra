// provider abstraction: anthropic only for the mvp, interface ready for openai/gemini.

export interface CompletionRequest {
  model: string;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  apiKey: string;
  timeoutMs: number;
}

export interface Provider {
  complete(req: CompletionRequest): Promise<string>;
}

const anthropic: Provider = {
  async complete({ model, system, messages, apiKey, timeoutMs }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model, max_tokens: 1024, system, messages }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`anthropic api ${res.status}: ${body.slice(0, 300)}`);
      }
      const data = (await res.json()) as {
        content: Array<{ type: string; text?: string }>;
      };
      return data.content
        .filter((block) => block.type === "text" && typeof block.text === "string")
        .map((block) => block.text)
        .join("\n");
    } finally {
      clearTimeout(timer);
    }
  },
};

const providers: Record<string, Provider> = { anthropic };

export function getProvider(name: string): Provider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(
      `unknown provider '${name}' (available: ${Object.keys(providers).join(", ")})`
    );
  }
  return provider;
}

#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  applyConfig,
  configLocation,
  DEFAULT_MAX_ROUNDS,
  loadConfig,
  MAX_DEBATERS,
  MAX_ROUNDS_CAP,
} from "./config.js";
import { callDebater, type Debater, type TranscriptEntry } from "./debate.js";
import { PROVIDER_NAMES, providerKeyEnv, resolveKey } from "./providers.js";

const server = new McpServer({ name: "kontra", version: "0.2.6" });

const debaterInputSchema = z.object({
  name: z.string().min(1).describe("short unique label for this voice"),
  persona: z.string().min(1).describe("how this voice thinks and argues, e.g. 'a cautious risk analyst'"),
  provider: z.enum(PROVIDER_NAMES as [string, ...string[]]).optional().describe("ai provider; defaults to anthropic"),
  model: z.string().optional().describe("model id for this provider; defaults to the provider's default"),
});

function jsonResult(value: unknown, isError = false) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }], isError };
}

function textResult(text: string, isError = false) {
  return { content: [{ type: "text" as const, text }], isError };
}

/** Setup instructions the assistant relays to the user when a key is missing. */
function onboarding(providers: string[]): string {
  // The common case is one provider (the default Claude debater): ask for that
  // single key. Only list several if the user configured several providers.
  const single = providers.length === 1;
  const primaryEnv = providerKeyEnv(providers[0]);
  const lines = single
    ? [
        `Kontra needs your ${providers[0]} API key before it can run. Ask the user to add it (do not ask them to paste it into the chat).`,
        "",
        `Set ${primaryEnv} in your MCP client config, then restart the client.`,
      ]
    : [
        "Kontra needs an API key for each provider in the debate. Ask the user to add them (do not ask them to paste them into the chat).",
        "",
        "Set these in your MCP client config, then restart the client:",
        ...providers.map((p) => `  - ${p}: ${providerKeyEnv(p)}`),
      ];
  lines.push(
    "",
    "Example (Claude Desktop, Claude Code, Cursor, and other MCP clients):",
    '  "kontra": {',
    '    "command": "npx",',
    '    "args": ["-y", "mcp-kontra"],',
    `    "env": { "${primaryEnv}": "your-key-here" }`,
    "  }",
    "",
    "Or install the one-click bundle and paste the key into the secure form.",
    "The key stays on the user's machine and is never sent through the chat.",
  );
  return lines.join("\n");
}

server.registerTool(
  "debate_status",
  {
    title: "Debate status",
    description:
      "Show the saved debate setup (debaters, providers, models, round limit) and whether each provider's API key is set. " +
      "Call this to confirm setup or when the user asks who is in the debate.",
    inputSchema: {},
  },
  async () => {
    const config = loadConfig();
    const debaters = config.debaters.map((d) => ({
      ...d,
      key: resolveKey(d.provider).key ? "set" : `missing (${providerKeyEnv(d.provider)})`,
    }));
    return jsonResult({
      ready: config.debaters.every((d) => resolveKey(d.provider).key),
      max_rounds: config.max_rounds,
      debaters,
      limits: { max_debaters: MAX_DEBATERS, max_rounds_cap: MAX_ROUNDS_CAP },
      providers: PROVIDER_NAMES,
      config_file: configLocation(),
    });
  }
);

server.registerTool(
  "configure_debate",
  {
    title: "Configure the debate",
    description:
      "Set and SAVE the debate setup. The settings persist across sessions until changed. " +
      "Use this whenever the user wants to change who debates (their personalities, how many up to " +
      `${MAX_DEBATERS}, which provider and model each uses) or the round limit (up to ${MAX_ROUNDS_CAP}). ` +
      `Providers: ${PROVIDER_NAMES.join(", ")}. Pass only the fields you want to change.`,
    inputSchema: {
      debaters: z
        .array(debaterInputSchema)
        .min(1)
        .max(MAX_DEBATERS)
        .optional()
        .describe("replace the full set of debaters"),
      max_rounds: z.number().int().optional().describe("safety cap on rounds"),
    },
  },
  async ({ debaters, max_rounds }) => {
    if (debaters === undefined && max_rounds === undefined) {
      return textResult("Nothing to change. Pass debaters and/or max_rounds.", true);
    }
    let config;
    try {
      config = applyConfig({ debaters, max_rounds });
    } catch (err) {
      return textResult(err instanceof Error ? err.message : String(err), true);
    }
    const missing = [...new Set(config.debaters.map((d) => d.provider))].filter(
      (p) => !resolveKey(p).key
    );
    return jsonResult({
      saved: true,
      config_file: configLocation(),
      max_rounds: config.max_rounds,
      debaters: config.debaters,
      keys_needed: missing.map((p) => providerKeyEnv(p)),
    });
  }
);

server.registerTool(
  "challenge",
  {
    title: "Challenge my position",
    description:
      "Present your position to the saved debaters and run a discussion before you answer. " +
      'When the user has activated kontra mode (e.g. said "kontra mode on"), ALWAYS run this loop before answering substantive questions. ' +
      "The loop: (1) call with your position; (2) answer the debaters' questions directly, respond to their specific points, ask questions back where their objections are ambiguous, " +
      "then call again with the FULL transcript (debater replies under their names, your own turns as speaker 'host'); " +
      "(3) keep going for as many rounds as the debate needs. The 'status' field is 'settled' once every debater has nothing new to add (or the round cap is hit), or 'error' if every debater failed; never synthesize while it is 'continue'. " +
      "If the result is an onboarding message about a missing API key, relay it to the user and stop; do not retry until they confirm the key is set. " +
      "To change the debaters or round limit, use configure_debate (it saves). Follow the 'instruction' field in the result for how to format your final reply.",
    inputSchema: {
      topic: z.string().describe("the user's question, restated"),
      position: z.string().describe("the host's current argument or answer"),
      transcript: z
        .array(z.object({ speaker: z.string(), text: z.string() }))
        .optional()
        .describe("prior rounds in order; debater replies under their names, your turns as 'host'"),
    },
  },
  async ({ topic, position, transcript }) => {
    const config = loadConfig();
    const roster: Debater[] = config.debaters;

    // If no debater can run because its key is unset, prompt for setup instead of failing.
    if (roster.every((d) => !resolveKey(d.provider).key)) {
      const missing = [...new Set(roster.map((d) => d.provider))];
      return textResult(onboarding(missing), true);
    }

    const cap = config.max_rounds;
    const priorRounds: TranscriptEntry[] = transcript ?? [];
    const nameSet = new Set(roster.map((d) => d.name));
    const priorDebaterTurns = priorRounds.filter((e) => nameSet.has(e.speaker)).length;
    const round = Math.floor(priorDebaterTurns / roster.length) + 1;
    const finalRound = round >= cap;

    const responses = await Promise.all(
      roster.map((d) => callDebater(d, topic, position, priorRounds, finalRound))
    );

    const answered = responses.filter((r) => "debate" in r);
    const allFailed = responses.every((r) => "error" in r);
    const settled =
      !allFailed &&
      (finalRound || (answered.length > 0 && answered.every((r) => r.debate === "settled")));
    const status = allFailed ? "error" : settled ? "settled" : "continue";

    const instruction = allFailed
      ? "Every debater failed to respond. Do not retry automatically. Tell the user what went wrong (see the error field on each debater) and how to fix it, then stop."
      : settled
        ? [
            "The debate is settled. Write the final reply for the user. Give them the real insight from the debate, not just a verdict, but keep it short and well-structured (roughly 120 to 180 words). Two rules: do not use one-word labels like 'Verdict' or 'Crux', and never name the debaters, since their names are arbitrary labels; attribute points by their stance or substance instead (for example 'the case for shipping now', or 'the pushback').",
            "",
            "Use this shape:",
            "**The debate** - the distinct positions and their strongest reasoning, one tight bullet each, so the user sees the actual thinking. Preserve the nuance; this is the most valuable part.",
            "**Where it lands** - what held up under challenge, what you concede, and anything genuinely still open.",
            "**Recommendation** - your specific, concrete next step.",
            "",
            "No preamble and no restating the question.",
          ].join("\n")
        : [
            "The debate continues. Hard requirement: you MUST begin your reply with a recap of this round, written for the user. Write it before you answer any point and before you call any tool. Never skip it.",
            "",
            "Recap format:",
            "- A one-line header naming the round (for example 'Round 1').",
            "- Then 2 to 4 bullets, one per point or question raised this round. Each bullet states the actual argument and the reasoning behind it in a single sentence, enough to give real insight, not just a label. Attribute by stance or substance, never by debater name.",
            "",
            "Keep the whole recap under about 80 words. After it, answer the points directly (you may ask questions back), then call challenge again with the full transcript. Do not write the final synthesis yet.",
          ].join("\n");

    return jsonResult({ round, max_rounds: cap, status, responses, instruction }, allFailed);
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("kontra mcp server running on stdio");

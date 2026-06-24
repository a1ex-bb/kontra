#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  callDebater,
  DEFAULT_DEBATERS,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_MODEL,
  MAX_DEBATERS,
  MAX_ROUNDS_CAP,
  apiKeyHint,
  resolveApiKey,
  type Debater,
  type TranscriptEntry,
} from "./debate.js";

const server = new McpServer({ name: "kontra", version: "0.1.0" });

const debaterSchema = z.object({
  name: z.string().min(1).describe("short unique label for this voice in the transcript"),
  persona: z
    .string()
    .min(1)
    .describe("how this voice thinks and argues, e.g. 'a cautious risk analyst'"),
  model: z
    .string()
    .optional()
    .describe(`Anthropic model id for this voice; defaults to ${DEFAULT_MODEL}`),
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

server.registerTool(
  "debate_status",
  {
    title: "Debate status",
    description:
      "Show the default debaters, the model and round limits, and whether the Anthropic API key is set. " +
      "Call this to confirm setup or when the user asks who is in the debate.",
    inputSchema: {},
  },
  async () => {
    const status = {
      api_key: resolveApiKey() ? "resolved" : `missing (${apiKeyHint})`,
      default_model: DEFAULT_MODEL,
      max_debaters: MAX_DEBATERS,
      default_max_rounds: DEFAULT_MAX_ROUNDS,
      max_rounds_cap: MAX_ROUNDS_CAP,
      default_debaters: DEFAULT_DEBATERS,
    };
    return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
  }
);

server.registerTool(
  "challenge",
  {
    title: "Challenge my position",
    description:
      "Present your position to kontra's debaters and run a discussion before you answer. " +
      'When the user has activated kontra mode (e.g. said "kontra mode on"), ALWAYS run this loop before answering substantive questions. ' +
      "The loop: (1) call with your position; (2) answer the debaters' questions directly, respond to their specific points, ask questions back where their objections are ambiguous, " +
      "then call again with the FULL transcript (debater replies under their names, your own turns as speaker 'host'); " +
      "(3) keep going for as many rounds as the debate needs. The 'status' field is 'settled' once every debater has nothing new to add (or the round cap is hit); never synthesize while it is 'continue'. " +
      "If the user specifies the debaters (their personalities, how many, which models) or a round limit, pass them via `debaters` and `max_rounds`; otherwise sensible defaults are used. Keep `debaters` the same across rounds of one debate. " +
      "In your final reply: show how the discussion evolved, the key disagreements and how they resolved, then your final answer.",
    inputSchema: {
      topic: z.string().describe("the user's question, restated"),
      position: z.string().describe("the host's current argument or answer"),
      transcript: z
        .array(z.object({ speaker: z.string(), text: z.string() }))
        .optional()
        .describe("prior rounds in order; debater replies under their names, your turns as 'host'"),
      debaters: z
        .array(debaterSchema)
        .min(1)
        .max(MAX_DEBATERS)
        .optional()
        .describe("the debaters for this debate; omit to use the default single contrarian"),
      max_rounds: z
        .number()
        .int()
        .optional()
        .describe(`safety cap on rounds (default ${DEFAULT_MAX_ROUNDS}, max ${MAX_ROUNDS_CAP})`),
    },
  },
  async ({ topic, position, transcript, debaters, max_rounds }) => {
    const apiKey = resolveApiKey();
    if (!apiKey) {
      return {
        content: [{ type: "text", text: `No Anthropic API key. ${apiKeyHint}.` }],
        isError: true,
      };
    }

    const roster: Debater[] = (debaters ?? DEFAULT_DEBATERS).map((d) => ({
      name: d.name,
      persona: d.persona,
      model: d.model ?? DEFAULT_MODEL,
    }));

    const names = roster.map((d) => d.name);
    if (new Set(names).size !== names.length) {
      return {
        content: [{ type: "text", text: "Debater names must be unique." }],
        isError: true,
      };
    }

    const cap = clamp(max_rounds ?? DEFAULT_MAX_ROUNDS, 1, MAX_ROUNDS_CAP);
    const priorRounds: TranscriptEntry[] = transcript ?? [];
    const nameSet = new Set(names);
    const priorDebaterTurns = priorRounds.filter((e) => nameSet.has(e.speaker)).length;
    const round = Math.floor(priorDebaterTurns / roster.length) + 1;
    const finalRound = round >= cap;

    const responses = await Promise.all(
      roster.map((d) => callDebater(d, apiKey, topic, position, priorRounds, finalRound))
    );

    const answered = responses.filter((r) => "debate" in r);
    const settled =
      finalRound || (answered.length > 0 && answered.every((r) => r.debate === "settled"));

    const instruction = settled
      ? "The debate is settled. Synthesize now: show how the discussion evolved, the key disagreements and their resolution, then your final answer."
      : "The debate continues. Answer the debaters' questions and points directly (you may ask questions back), then call challenge again with the full transcript. Do not synthesize yet.";

    const allFailed = responses.every((r) => "error" in r);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { round, max_rounds: cap, status: settled ? "settled" : "continue", responses, instruction },
            null,
            2
          ),
        },
      ],
      isError: allFailed,
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`kontra mcp server running on stdio (default model ${DEFAULT_MODEL})`);

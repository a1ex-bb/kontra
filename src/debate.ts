import { getProvider } from "./providers.js";

export interface Debater {
  name: string;
  persona: string;
  model: string;
}

export interface TranscriptEntry {
  speaker: string;
  text: string;
}

export type Stance = "agree" | "disagree" | "mixed";
export type DebateSignal = "continue" | "settled";

export type Reply =
  | { agent: string; text: string; stance: Stance; debate: DebateSignal }
  | { agent: string; error: string };

const TIMEOUT_MS = 60_000;
const PROVIDER = "anthropic";
const API_KEY_ENV = "ANTHROPIC_API_KEY";

/** Default model for any debater that does not name its own. Override with KONTRA_MODEL. */
export const DEFAULT_MODEL = process.env.KONTRA_MODEL?.trim() || "claude-sonnet-4-6";

export const DEFAULT_DEBATERS: Debater[] = [
  {
    name: "kontra",
    persona:
      "A ruthless contrarian. Attacks the strongest assumption first. Concise, never hedges.",
    model: DEFAULT_MODEL,
  },
];

export const DEFAULT_MAX_ROUNDS = 6;
export const MAX_ROUNDS_CAP = 12;
export const MAX_DEBATERS = 5;

/** The user's own key, read from the environment. Never accepted through chat. */
export function resolveApiKey(): string | undefined {
  const value = process.env[API_KEY_ENV];
  if (!value || /^\$\{.*\}$/.test(value)) return undefined;
  return value;
}

export const apiKeyHint = `set ${API_KEY_ENV} in your MCP client config`;

function buildSystemPrompt(debater: Debater, finalRound: boolean): string {
  const lines = [
    `You are "${debater.name}", one voice in a structured debate with a host AI. Your persona: ${debater.persona}`,
    "You will be given a topic, the host AI's current position, and possibly a transcript of earlier rounds.",
    "This is a live discussion, not an exchange of monologues. Each round, do whatever the state of the debate calls for:",
    "- ask pointed questions where the position is ambiguous or rests on unstated assumptions, and hold your case until they are answered",
    "- answer any questions the host asked you, directly",
    "- press points that remain unresolved; never restate what is already in the transcript",
    "- explicitly concede what the host has settled. Disagree only where you genuinely disagree.",
    "The debate ends when nothing genuinely new is left: your questions are answered and the remaining agreement or disagreement is fully crystallized.",
  ];
  if (finalRound) {
    lines.push(
      "The round cap has been reached, so this is your final word: no new questions. Give your final stance, the strongest unresolved disagreement, what you concede, and what evidence would change your mind."
    );
  }
  lines.push(
    "Maximum 200 words.",
    "Begin your reply with exactly two header lines, then your argument:",
    '"STANCE: agree", "STANCE: disagree", or "STANCE: mixed"',
    finalRound
      ? '"DEBATE: settled"'
      : '"DEBATE: continue" if open questions or uncrystallized disagreement remain, or "DEBATE: settled" if you have nothing genuinely new to add.'
  );
  return lines.join("\n");
}

function buildUserMessage(
  topic: string,
  position: string,
  transcript: TranscriptEntry[]
): string {
  const parts = [`TOPIC:\n${topic}`, `HOST POSITION:\n${position}`];
  if (transcript.length > 0) {
    parts.push(
      "TRANSCRIPT OF EARLIER ROUNDS:\n" +
        transcript.map((entry) => `${entry.speaker}: ${entry.text}`).join("\n\n")
    );
  }
  return parts.join("\n\n");
}

/** Pull the STANCE and DEBATE header lines off the reply, in any order. */
function parseSignals(text: string): {
  stance: Stance;
  debate: DebateSignal;
  body: string;
} {
  let stance: Stance = "mixed";
  let debate: DebateSignal = "continue";
  const lines = text.split("\n");
  let consumed = 0;
  for (const line of lines) {
    const stanceMatch = line.match(/^\s*stance:\s*(agree|disagree|mixed)\s*$/i);
    const debateMatch = line.match(/^\s*debate:\s*(continue|settled)\s*$/i);
    if (stanceMatch) {
      stance = stanceMatch[1].toLowerCase() as Stance;
    } else if (debateMatch) {
      debate = debateMatch[1].toLowerCase() as DebateSignal;
    } else if (line.trim() !== "") {
      break;
    }
    consumed++;
  }
  return { stance, debate, body: lines.slice(consumed).join("\n").trim() };
}

export async function callDebater(
  debater: Debater,
  apiKey: string,
  topic: string,
  position: string,
  transcript: TranscriptEntry[],
  finalRound: boolean
): Promise<Reply> {
  try {
    const provider = getProvider(PROVIDER);
    const text = await provider.complete({
      model: debater.model,
      system: buildSystemPrompt(debater, finalRound),
      messages: [{ role: "user", content: buildUserMessage(topic, position, transcript) }],
      apiKey,
      timeoutMs: TIMEOUT_MS,
    });
    const { stance, debate, body } = parseSignals(text);
    return {
      agent: debater.name,
      text: body,
      stance,
      debate: finalRound ? "settled" : debate,
    };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? `timed out after ${TIMEOUT_MS / 1000}s`
        : err instanceof Error
          ? err.message
          : String(err);
    return { agent: debater.name, error: `${debater.name} failed: ${message}` };
  }
}

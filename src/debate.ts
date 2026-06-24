import { HttpError, providerDef, providerKeyEnv, resolveKey } from "./providers.js";

export interface Debater {
  name: string;
  persona: string;
  provider: string;
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

/** Turn a raw failure into an actionable, user-facing message. */
function describeError(err: unknown, debater: Debater): string {
  if (err instanceof HttpError) {
    const env = providerKeyEnv(debater.provider);
    if (err.status === 401 || err.status === 403)
      return `${debater.provider} rejected the API key (check ${env})`;
    if (err.status === 404)
      return `${debater.provider} has no model "${debater.model}" (set a valid model)`;
    if (err.status === 429) return `${debater.provider} rate limit reached (try again shortly)`;
    return `${debater.provider} request failed (HTTP ${err.status})`;
  }
  if (err instanceof Error && err.name === "AbortError")
    return `timed out after ${TIMEOUT_MS / 1000}s`;
  return err instanceof Error ? err.message : String(err);
}

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
  topic: string,
  position: string,
  transcript: TranscriptEntry[],
  finalRound: boolean
): Promise<Reply> {
  const { keyEnv, key } = resolveKey(debater.provider);
  if (!key) {
    return { agent: debater.name, error: `${debater.name}: no ${debater.provider} key (set ${keyEnv})` };
  }
  try {
    const text = await providerDef(debater.provider).complete({
      model: debater.model,
      system: buildSystemPrompt(debater, finalRound),
      user: buildUserMessage(topic, position, transcript),
      apiKey: key,
      timeoutMs: TIMEOUT_MS,
    });
    if (!text.trim()) throw new Error("the model returned an empty response");
    const { stance, debate, body } = parseSignals(text);
    return {
      agent: debater.name,
      text: body,
      stance,
      debate: finalRound ? "settled" : debate,
    };
  } catch (err) {
    return { agent: debater.name, error: `${debater.name}: ${describeError(err, debater)}` };
  }
}

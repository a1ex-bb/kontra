import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Debater } from "./debate.js";
import { isProvider, PROVIDER_NAMES, providerDefaultModel } from "./providers.js";

export interface KontraConfig {
  max_rounds: number;
  debaters: Debater[];
}

export const DEFAULT_MAX_ROUNDS = 6;
export const MAX_ROUNDS_CAP = 12;
export const MAX_DEBATERS = 5;

export const DEFAULT_CONFIG: KontraConfig = {
  max_rounds: DEFAULT_MAX_ROUNDS,
  debaters: [
    {
      name: "kontra",
      persona:
        "A ruthless contrarian. Attacks the strongest assumption first. Concise, never hedges.",
      provider: "anthropic",
      model: "claude-opus-4-8",
    },
  ],
};

/** A debater as it arrives from the configure tool: only name and persona are required. */
export interface DebaterInput {
  name: string;
  persona: string;
  provider?: string;
  model?: string;
}

function configPath(): string {
  return process.env.KONTRA_CONFIG?.trim() || join(homedir(), ".kontra", "config.json");
}

function clampRounds(value: number): number {
  return Math.max(1, Math.min(MAX_ROUNDS_CAP, Math.floor(value)));
}

/** Fill defaults and validate a debater. Throws a user-facing message on bad input. */
function toDebater(input: DebaterInput): Debater {
  const name = input.name?.trim();
  const persona = input.persona?.trim();
  if (!name) throw new Error("each debater needs a name");
  if (!persona) throw new Error(`debater "${name}" needs a persona`);
  const provider = (input.provider ?? "anthropic").trim();
  if (!isProvider(provider)) {
    throw new Error(
      `debater "${name}" uses unknown provider "${provider}" (use one of: ${PROVIDER_NAMES.join(", ")})`
    );
  }
  const model = input.model?.trim() || providerDefaultModel(provider);
  return { name, persona, provider, model };
}

function validateDebaters(debaters: Debater[]): void {
  if (debaters.length < 1) throw new Error("need at least one debater");
  if (debaters.length > MAX_DEBATERS) {
    throw new Error(`at most ${MAX_DEBATERS} debaters (got ${debaters.length})`);
  }
  const names = debaters.map((d) => d.name);
  if (new Set(names).size !== names.length) throw new Error("debater names must be unique");
}

/** Coerce arbitrary parsed JSON into a valid config, falling back to defaults per field. */
function normalize(parsed: any): KontraConfig {
  const debaters = Array.isArray(parsed?.debaters) && parsed.debaters.length
    ? parsed.debaters.map(toDebater)
    : DEFAULT_CONFIG.debaters;
  validateDebaters(debaters);
  const max_rounds =
    typeof parsed?.max_rounds === "number" ? clampRounds(parsed.max_rounds) : DEFAULT_MAX_ROUNDS;
  return { max_rounds, debaters };
}

export function loadConfig(): KontraConfig {
  try {
    return normalize(JSON.parse(readFileSync(configPath(), "utf8")));
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

function saveConfig(config: KontraConfig): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(config, null, 2));
  renameSync(tmp, path);
}

/** Apply a partial update on top of the saved config, validate, persist, and return it. */
export function applyConfig(update: {
  debaters?: DebaterInput[];
  max_rounds?: number;
}): KontraConfig {
  const current = loadConfig();
  const debaters = update.debaters ? update.debaters.map(toDebater) : current.debaters;
  validateDebaters(debaters);
  const config: KontraConfig = {
    debaters,
    max_rounds: update.max_rounds != null ? clampRounds(update.max_rounds) : current.max_rounds,
  };
  saveConfig(config);
  return config;
}

export function configLocation(): string {
  return configPath();
}

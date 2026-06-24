# Kontra

The best ideas are forged under challenge. People know this: we argue, we push back, and what survives is sharper. An AI chat skips that step. It thinks on its own and tends to agree with you. Kontra puts the challenge back in. The moment you prompt, one or more AI debaters take the other side and argue it out with your assistant, so the answer you get has already been tested.

It runs as an MCP server. You bring your own API keys.

## How it works

1. You turn on kontra mode and ask a question.
2. Your assistant writes its position and sends it to the debaters.
3. Each debater replies in character with a stance and either "keep going" or "settled".
4. Your assistant answers their points and runs more rounds until everyone is settled.
5. Your assistant replies with a tight summary: the verdict, the crux, what changed, and the bottom line.

The debate runs for as many rounds as it needs. A round limit stops it from running forever.

## Install

### Easiest: one click (Claude Desktop)

No Node, no config files, no terminal.

1. Download `kontra.mcpb` from the [latest release](https://github.com/a1ex-bb/kontra/releases/latest).
2. Open Claude Desktop, go to Settings, then Extensions.
3. Drag `kontra.mcpb` into the window (or double-click the file).
4. Paste your API key into the box when asked, and turn it on.

Claude Desktop bundles everything and stores your key in your operating system's secure storage.

### Other MCP clients (Claude Code, Cursor, and more)

Kontra is a standard MCP server, so it works in any MCP client. You need Node 18 or newer. Add this server entry to the client's MCP config, then restart the client:

```json
{
  "mcpServers": {
    "kontra": {
      "command": "npx",
      "args": ["-y", "kontra-mcp"],
      "env": { "ANTHROPIC_API_KEY": "sk-ant-..." }
    }
  }
}
```

Where each client keeps that config:

| Client | Config |
| --- | --- |
| Claude Code | `.mcp.json` in your project, or run `claude mcp add` |
| Cursor | `.cursor/mcp.json` |
| Claude Desktop (manual) | Settings, then Developer, then Edit Config |
| Windsurf, Cline, and others | that client's MCP settings file |

Some clients (such as VS Code's built-in MCP support) use a `servers` key instead of `mcpServers`. The `command`, `args`, and `env` are the same.

You start with one debater: a ruthless contrarian on Claude Opus 4.8.

## Your API keys

Kontra never takes a key through the chat. It reads keys only from environment variables, set one of two ways:

- One-click install: type the key into the secure form. It is stored by your operating system, not in a file.
- Other clients: put the key in the `env` block of the server entry above.

A few notes:

- You only need a key for the providers your debaters actually use. By default that is just Anthropic (Claude), so you are asked for one key, not three.
- If a key is missing, Kontra tells your assistant which single key to add, and your assistant asks you for it in the chat.
- Do not commit a config file that contains a real key.
- After adding or changing a key, restart the client.

## Use it

Say "kontra mode on" and ask a question. To change the debate, just ask in plain words, and your setup is saved until you change it. You can set the personas, the number of debaters (up to 5), each debater's provider and model, and the round limit (up to 12).

## Examples

Each prompt below is a real one. Open the toggle to see Kontra's actual answer (generated with Claude Opus 4.8). When several debaters are in the room, your assistant weighs their takes and gives you one recommendation.

### Product and engineering

> kontra mode on. Set up three debaters: a paranoid security engineer, a ship-it product manager, and a user-obsessed designer. Should we launch onboarding without the email verification step to cut signup friction?

<details>
<summary>The debate</summary>

**Security engineer:** No. Unverified signups are an open door for fake accounts, credential stuffing, and spam, and the extra "signups" are partly garbage that poisons your metrics. Keep it, but move it off the critical path: let users in, then gate sending, payments, and sharing behind a verified email, with rate limits and disposable-domain blocking.

**Product manager:** Agree, with a guardrail. "No verification ever" is not the only alternative. Let users in instantly and verify lazily, gating high-risk actions behind a one-tap link. If fake-account or spam rates climb, pull verification earlier again.

**Designer:** Defer it, do not drop it. Unverified emails quietly break password resets and billing receipts, and the user blames you, not their typo. Let people in immediately, but keep verification required before anything depends on the address.

</details>

> kontra mode on. I'm about to add a nullable column and backfill it in the same migration to keep it simple. Anything I'm missing?

<details>
<summary>Kontra's take</summary>

Disagree. "One migration" is simpler to write but riskier to run: a backfill on a large table locks rows or runs long, turning a fast schema change into a dangerous transaction. Split it: add the column, then backfill in batches. If the table is small and the backfill is non-locking, one migration is fine.

</details>

### Commercial

> kontra mode on. Debate this as a hard-nosed CFO and a growth-obsessed head of sales, two rounds max: should we give a 500-seat prospect a free 3-month pilot to land the logo?

<details>
<summary>The debate</summary>

**CFO:** No, not free. "Free" anchors the deal at zero and trains procurement to discount, and three months on 500 seats is real cost with no committed conversion. Charge a refundable pilot fee with signed success criteria and an auto-convert clause. Skin in the game predicts adoption.

**Head of sales:** Yes, but never "free." Make it a paid pilot at 30 to 50% off, with an order form contingent on success criteria and an auto-convert clause. Free pilots make buyers undervalue you and stall procurement; a discounted paid pilot proves intent and protects your deal size.

_Both refuse "free" and converge on a paid pilot tied to success criteria._

</details>

> kontra mode on. I'm opening my cold outreach with "I hope this email finds you well." Here's the rest. Improve it.

<details>
<summary>Kontra's take</summary>

No. The phrase says nothing about the recipient or why you are writing; it is filler that pattern-matches to spam, and cold readers triage in two seconds. Lead with a specific, relevant first line that earns the next sentence. It is harmless, just wasted space.

</details>

### Personal

> kontra mode on. I'm going to buy a $1,500 espresso machine because I spend too much on coffee out. Sensible?

<details>
<summary>Kontra's take</summary>

The "save money" framing is the weak point. A $1,500 machine plus beans, a grinder, milk, and your time does not beat home drip if savings is the goal; you are buying a hobby and calling it thrift. It can pay off in about 18 months if you really drink two or more $6 lattes a day. Check your actual cafe spend, and be honest about whether you will still use it in year two, because most machines gather dust by month four.

</details>

> kontra mode on. Set up an optimist and a skeptic. Should I move to a new city for a fresh start?

<details>
<summary>The debate</summary>

**Optimist:** Move, boldly, but do not assume geography heals what is internal: habits, anxiety, and loneliness pack in your suitcase. A new environment genuinely rewires routines and opens opportunity, so go toward something concrete, a job, a community, a real reason. If you are fleeing rather than seeking, move your mindset first.

**Skeptic:** Move for an opportunity, not a "fresh start." Fresh-start thinking assumes your problems are geographic; they usually are not, and you will spend month three realizing you brought yourself along. Name the specific thing that would improve and could not improve where you are. If you can, go. If you cannot, you are fleeing.

</details>

## Providers

Pick any debater's provider. Set the matching key (in the one-click form, or as an env var).

| Provider | API key | Example models |
| --- | --- | --- |
| anthropic | `ANTHROPIC_API_KEY` | claude-opus-4-8 (default), claude-sonnet-4-6 |
| openai | `OPENAI_API_KEY` | gpt-5.5 (default), gpt-5.4-mini |
| google | `GEMINI_API_KEY` | gemini-3.5-flash (default), gemini-2.5-pro |

Any model the provider offers works. If you name one that does not exist, Kontra tells you so you can fix it.

## Tools

- `debate_status`: shows your saved debaters, models, round limit, and which keys are set.
- `configure_debate`: changes and saves the setup.
- `challenge`: runs one round of debate.

Your assistant calls these for you. You just talk to it.

## Where settings are saved

Kontra saves your setup to `~/.kontra/config.json`. Point it somewhere else with the `KONTRA_CONFIG` environment variable.

## Develop

```sh
git clone https://github.com/a1ex-bb/kontra.git
cd kontra
npm install
npm run build      # compile TypeScript to dist/
npm run bundle     # build kontra.mcpb for one-click install
```

Try the tools in a browser with the MCP Inspector. Set the key for whichever providers you want to exercise. Anthropic alone is enough for the default debater; add the others only if you configure debaters on them:

```sh
ANTHROPIC_API_KEY=sk-ant-... npm run inspect
# add OPENAI_API_KEY=... and/or GEMINI_API_KEY=... too if your debaters use them
```

## License

MIT

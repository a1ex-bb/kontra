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

Say "kontra mode on" and ask something:

> kontra mode on. Should we rewrite the service in Rust or stay on Go?

Want to change the setup? Just ask in plain words. Your changes are saved and used for every debate after that:

> Set up three debaters: a security engineer on Claude, a product lead on GPT, and a cost analyst on Gemini. Max 4 rounds.

You can set and save:

| What | Example |
| --- | --- |
| Personalities | "make the second one a blunt CFO" |
| Number of debaters | "add a third debater" (up to 5) |
| Provider and model | "put the analyst on gpt-5.5" |
| Max rounds | "cap it at 3 rounds" (up to 12) |

## Examples

Use Kontra right before you act: ship a plan, send a message, make a call. Ask for the other side first.

Engineering:

> kontra mode on. My plan is to add a 5-minute cache on the product endpoint and invalidate it on write. Poke holes in it before I build it.

> kontra mode on. I think the flaky test is a race condition in the setup hook. Challenge my diagnosis before I spend the afternoon on it.

Sales and marketing:

> kontra mode on. Here is the subject line and first sentence of our re-engagement email. Tear it apart before I send it to 8,000 users.

> kontra mode on. A prospect wants 30% off for a one-year commitment and I want to say yes. Argue the other side.

Product and operations:

> kontra mode on. I want to pull SSO ahead of the dashboard redesign this sprint. Challenge that call.

> kontra mode on. Here are the three action items from our outage postmortem. What did I miss?

It works on personal calls too:

> kontra mode on. Here is the message I am about to send to push back on a deadline. Make the case my manager will make.

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

Try the tools in a browser with the MCP Inspector:

```sh
ANTHROPIC_API_KEY=sk-ant-... npm run inspect
```

## License

MIT

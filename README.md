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

Say "kontra mode on" and ask a question. To change the debate, just ask in plain words. Your setup is saved until you change it.

> kontra mode on. Should we cache the dashboard query, or fix the slow join first?

> Set up two debaters: a skeptical staff engineer and a ship-it product manager.

> Add a third debater on GPT for a different model's take, and cap it at two rounds.

You can set the personas, the number of debaters (up to 5), each debater's provider and model, and the round limit (up to 12). It all persists.

## See the difference

Claude is helpful, so it leans toward helping you do what you came to do. It might raise a caveat, but it still hands you what you asked for and leaves the call to you. Kontra makes it argue the other side first, then commit to a verdict. Two real examples, plain Claude Opus 4.8 versus the same model with Kontra:

**"This third-party API call fails now and then and it keeps erroring my job. Write me a wrapper that retries it 3 times."**

- Opus 4.8 alone: writes a reusable retry decorator, with a note to consider a couple of things.
- With Kontra: "A blind retry is the wrong fix. If that call is not idempotent, retrying it can double-charge or duplicate writes. Add an idempotency key, use exponential backoff with jitter so you do not hammer a struggling service, and cap it with a circuit breaker. First confirm the failure is actually transient, then retry."

**"A customer wants a refund two months in. Our policy is 30 days, so I'm going to decline. Help me write a polite reply."**

- Opus 4.8 alone: writes the polite decline, and suggests offering an alternative.
- With Kontra: "The 30-day policy is a default, not the decision. The real question is whether honoring this refund earns more than it costs: retention, referrals, a bad review avoided, against the refund amount. Unless this is a serial abuser or a real loss, 'it is day 60' is an excuse, not a reason. Decide on value, then write the reply."

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

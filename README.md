# Kontra

Kontra adds a challenger to your AI chat. You take a position, and one or more AI debaters push back. They ask questions, concede good points, and argue until the debate is settled. Then your assistant gives you a short, clear summary and a final answer.

It runs as an MCP server. You bring your own API key.

## How it works

1. You turn on kontra mode and ask a question.
2. Your assistant writes its position and sends it to the debaters.
3. Each debater replies in character with a stance and either "keep going" or "settled".
4. Your assistant answers their points and runs more rounds until everyone is settled.
5. Your assistant replies with a tight summary: the verdict, the crux, what changed, and the bottom line.

The debate runs for as many rounds as it needs. A round limit stops it from running forever.

## Setup

You need Node 18 or newer and at least one API key.

Add Kontra to your MCP client config (for example Claude Desktop or Claude Code):

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

Restart your client. That is it. Out of the box you get one debater (a ruthless contrarian on Claude Opus 4.8).

If you forget the key, Kontra tells your assistant exactly what to add, so you get prompted right in the chat.

Your keys stay in your own config and are never sent through the chat.

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
| Provider and model | "put the analyst on gpt-4o" |
| Max rounds | "cap it at 3 rounds" (up to 12) |

## Providers

Pick any debater's provider. Set the matching key in your config.

| Provider | API key | Example models |
| --- | --- | --- |
| anthropic | `ANTHROPIC_API_KEY` | claude-opus-4-8 (default), claude-sonnet-4-6 |
| openai | `OPENAI_API_KEY` | gpt-4o, gpt-4o-mini |
| google | `GEMINI_API_KEY` | gemini-1.5-pro, gemini-1.5-flash |

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
npm run build
```

Try the tools in a browser with the MCP Inspector:

```sh
ANTHROPIC_API_KEY=sk-ant-... npm run inspect
```

## License

MIT

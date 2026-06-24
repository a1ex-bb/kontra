# Kontra

Kontra adds a challenger to your AI chat. You take a position, and one or more AI debaters push back. They ask questions, concede good points, and argue until the debate is settled. Then your assistant sums up both sides and gives you a final answer.

It runs as an MCP server. You bring your own Anthropic API key.

## How it works

1. You turn on kontra mode and ask a question.
2. Your assistant writes its position and sends it to the debaters.
3. Each debater replies in character with a stance and either "keep going" or "settled".
4. Your assistant answers their points and runs more rounds until everyone is settled.
5. Your assistant shows the debate and gives a final answer.

The debate runs for as many rounds as it needs. A round limit stops it from running forever.

## Setup

You need Node 18 or newer and an Anthropic API key.

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

Restart your client. Your key stays in your own config and is never sent through the chat.

## Use it

Say "kontra mode on" and ask something:

> kontra mode on. Should we rewrite the service in Rust or stay on Go?

Want to shape the debate? Just say so in plain words:

> kontra mode on. Use three debaters: a security engineer, a product lead, and a cost analyst. Max 4 rounds.

You can set:

| What | How |
| --- | --- |
| Personalities | Describe each debater you want |
| Number of debaters | Ask for as many as you need (up to 5) |
| Models | Name an Anthropic model for a debater |
| Max rounds | Set a limit (up to 12) |

Your assistant turns these requests into the right settings. You never touch the tools directly.

## Tools

- `debate_status`: shows the default debaters, models, round limits, and whether your key is set.
- `challenge`: runs one round of debate. Your assistant calls this for you.

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

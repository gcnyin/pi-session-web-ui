# Pi Web UI

A pi extension that opens your conversation in the browser. Type `/web`, chat in real-time.

## Features

- **Real-time streaming** — Messages, tool calls, and thinking blocks stream live via SSE
- **Bi-directional** — Send messages to pi from the browser
- **Session sidebar** — Browse, switch, and create sessions (`Ctrl+B`)
- **Model switching** — Switch models on the fly from the UI
- **Interrupt / stop** — Stop the agent mid-stream
- **Markdown** — Full GFM support with syntax-highlighted code blocks
- **Warm theme** — Dark/light with auto-detection, persisted in `localStorage`

## Install

```bash
# Copy to pi's extension directory
mkdir -p ~/.pi/agent/extensions/session-web-ui
cp -r extensions/session-web-ui/* ~/.pi/agent/extensions/session-web-ui/

# Then restart pi or run /reload
```

## Usage

1. Start pi as usual
2. Type `/web` (or `/web-ui`)
3. Browser opens automatically at `http://127.0.0.1:<port>`

## Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus input |
| `Ctrl+B` | Toggle sidebar |
| `Enter` | Send / interrupt |
| `Shift+Enter` | New line |

## How it works

```
Pi (agent)  ──SSE──►  Browser
            ◄─POST──
```

The extension hooks into pi's lifecycle events (`message_start`, `tool_execution_*`, etc.) and broadcasts them to connected browsers over SSE.

## Security

- Binds to `127.0.0.1` only — not network-accessible
- No auth — localhost only
- Only runs when you type `/web`

## Dev

```bash
pi -e ./extensions/session-web-ui/index.ts
# Then /reload in pi after changes
```

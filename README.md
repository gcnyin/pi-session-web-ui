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
3. Browser opens automatically at the first available address

## Configuration

You can configure the server using environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PI_WEB_PORT` | `9876` | Port to listen on. Set to `0` for a random port. |
| `PI_WEB_HOST` | `0.0.0.0` | Address to bind to. Defaults to all interfaces. Set to `127.0.0.1` to restrict to localhost only. |

When listening on all interfaces (`0.0.0.0`), the server will list all available addresses in the notification, making it easy to access from other devices on the network.

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

- **Default**: Binds to `0.0.0.0` — accessible from the network
- No auth — **do not expose to untrusted networks**
- Set `PI_WEB_HOST=127.0.0.1` to restrict to localhost only
- Only runs when you type `/web`

## Dev

```bash
pi -e ./extensions/session-web-ui/index.ts
# Then /reload in pi after changes
```

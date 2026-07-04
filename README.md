# Pi Web UI

A pi extension that opens your conversation in the browser. Server auto-starts on launch.

## Features

- **Auto-start** — Server starts automatically when pi launches, browser opens immediately
- **Per-session isolation** — Each session gets its own random port and URL
- **Real-time streaming** — Messages, tool calls, and thinking blocks stream live via SSE
- **Bi-directional** — Send messages to pi from the browser
- **Model switching** — Switch models on the fly from the UI
- **Interrupt / stop** — Stop the agent mid-stream
- **Markdown** — Full GFM support with syntax-highlighted code blocks
- **Warm theme** — Dark/light with auto-detection, persisted in `localStorage`
- **LAN accessible** — Defaults to all interfaces, others on your network can access

## Install

```bash
# Copy to pi's extension directory
mkdir -p ~/.pi/agent/extensions/session-web-ui
cp -r extensions/session-web-ui/* ~/.pi/agent/extensions/session-web-ui/

# Then restart pi or run /reload
```

## Usage

1. Start pi as usual — web server starts automatically
2. Browser opens to the LAN address (e.g. `http://192.168.1.100:12345`)
3. URL widget appears above the editor showing all accessible addresses
4. Type `/web` anytime to re-display the URL

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PI_WEB_HOST` | `0.0.0.0` | Address to bind to. Set to `127.0.0.1` for localhost only. |

Each session binds to a random port automatically. The server always binds to all interfaces by default, making it accessible from other devices on your network.

## How it works

```
Session A ──:12345──► Browser A
Session B ──:23456──► Browser B
```

Each session creates its own isolated server on a random port. Session A and B cannot see each other.

## Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus input |
| `Enter` | Send / interrupt |
| `Shift+Enter` | New line |

## Security

- **Default**: Binds to `0.0.0.0` — accessible from the network
- No auth — **do not expose to untrusted networks**
- Set `PI_WEB_HOST=127.0.0.1` to restrict to localhost only
- Runs automatically on every session start

## Dev

```bash
pi -e ./extensions/session-web-ui/index.ts
# Then /reload in pi after changes
```

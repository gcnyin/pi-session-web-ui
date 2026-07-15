# Pi Session Web UI

A pi extension that opens your conversation in the browser. Server auto-starts on session launch, accessible via the `/web` command.

## Features

- **Auto-start** — Server starts automatically when a pi session launches
- **Per-session isolation** — Each session gets its own server on a unique port
- **Real-time streaming** — Messages, tool calls, and thinking blocks stream live via SSE
- **Bi-directional** — Send messages to pi from the browser; steer messages while agent is active
- **Model switching** — Browse available models and switch on the fly from the UI
- **Interrupt / stop** — Abort the agent mid-stream
- **Usage tracking** — Real-time token usage stats (input, output, cache read/write, reasoning tokens)
- **Context window** — Monitor context window usage and max token limits
- **Markdown** — Full GFM support with syntax-highlighted code blocks (JetBrains Mono)
- **Warm theme** — Dark/light with auto-detection, persisted in `localStorage`
- **LAN accessible** — Defaults to all interfaces, others on your network can access
- **SSE event replay** — Late-connecting clients receive queued events so they never miss messages

## Install

```bash
# Copy to pi's extension directory
mkdir -p ~/.pi/agent/extensions/session-web-ui
cp -r extensions/session-web-ui/* ~/.pi/agent/extensions/session-web-ui/

# Then restart pi or run /reload
```

## Usage

1. Start pi as usual — web server starts automatically, URL widget appears above the editor
2. Open the URL in your browser to view and interact with the conversation
3. Type `/web` anytime to re-display the URL

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PI_WEB_HOST` | `0.0.0.0` | Address to bind to. Set to `127.0.0.1` for localhost only. |

Each session binds to a random port automatically. The server binds to all interfaces by default, making it accessible from other devices on your network.

## How it works

```
Session A ──:12345──► Browser A
Session B ──:23456──► Browser B
```

Each session creates its own isolated server on a random port. Session A and B cannot see each other. If no browser clients are connected, SSE events are queued and replayed when a client connects.

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

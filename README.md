# Pi Web Assistant

A pi extension that starts a local web server via the `/web-ui` command, allowing you to view and interact with your pi conversation in a browser in real-time.

Designed with the `frontend-design` skill — bold editorial aesthetics, distinctive typography, and cohesive warm-toned theming.

## Features

- **Real-time chat UI** — All messages, turns, and tool calls stream to the browser as they happen via Server-Sent Events (SSE)
- **Bi-directional** — Send messages to pi directly from the browser via `POST /message`
- **Editorial message design** — Assistant messages appear without bubbles (clean, typographic), user messages as refined accent pills
- **Tool call visibility** — Collapsible cards show tool names, arguments, and results with per-tool color-coded icons and status indicators
- **Thinking blocks** — Reasoning content displayed in collapsible, syntax-highlighted panels
- **Streaming support** — Assistant messages stream in real-time with live cursor
- **Session sidebar** — Browse and switch between past sessions grouped by working directory (`Ctrl+B`)
- **Model switching** — Click the model badge to switch between available models on the fly
- **New session creation** — Create new sessions from the sidebar with a custom working directory
- **Interrupt / stop** — Stop the agent mid-stream via the combined send/stop button
- **Session history** — When you run `/web-ui`, existing conversation history is immediately shown in the browser
- **Markdown rendering** — Full GFM support via bundled `marked.js`

## Design Direction — "Warm Modern"

The UI blends clean modern structure with warm, inviting colors — soft copper/amber accents on a warm neutral base, friendly rounded corners, and a clutter-free header.

### Themes

| Theme | Name | Mood | Palette |
|-------|------|------|---------|
| 🌙 | **Dark** | Warm charcoal, copper accents | `#1a1410` background, `#e09060` accent |
| ☀️ | **Light** | Warm cream, copper accents | `#f8f4ef` background, `#c08050` accent |

### Theme Switching

- **Auto** (default) — Follows your system preference via `prefers-color-scheme`
- **Manual toggle** — Click the Theme button in the header to cycle: `System → Dark → Light`
- **Persistent** — Your choice is saved in `localStorage`

### Typography

Uses **system-local fonts** only — no web font downloads, consistent across all platforms:

| Role | Font Stack |
|------|-----------|
| Body / UI | CJK-first — PingFang SC (macOS), Microsoft YaHei (Windows), Noto Sans CJK SC (Linux), with system-ui fallbacks |
| Code | Cascadia Code / JetBrains Mono / Fira Code / SF Mono / IBM Plex Mono / Menlo — best available monospace per platform |

### Visual Details

- **Noise texture** — Subtle CSS grain overlay adds depth
- **Radial glow** — Warm copper ambient glow behind the conversation area
- **Friendly rounding** — `4px` base radius, warm and approachable
- **Glass input** — Input area with backdrop blur and copper glow on focus
- **Staggered animations** — Messages fade in with a gentle upward motion
- **Tool cards** — Minimal bordered panels with per-tool color-coded icons
- **Connection chip** — Status indicator with colored dot and label (connected / disconnected / reconnecting)

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus the input box (when not already in an input) |
| `Ctrl+B` / `Cmd+B` | Toggle the session sidebar |
| `Enter` | Send message (or interrupt if agent is active) |
| `Shift+Enter` | New line in input |

## Installation

### Quick start (auto-discovery)

```bash
# Copy the extension to pi's auto-discovery directory
mkdir -p ~/.pi/agent/extensions/session-web-ui
cp -r extensions/session-web-ui/* ~/.pi/agent/extensions/session-web-ui/

# Restart pi or run /reload
```

### As a pi package (from git)

```bash
pi install git:github.com/your-username/pi-session-web-ui
```

## Usage

1. Start pi as usual
2. Type `/web-ui` in the editor (or use the shorter alias `/web`)
3. Your browser will automatically open to `http://127.0.0.1:<port>`
4. The web UI shows all messages live as they happen
5. Type messages in the browser input box to interact with pi remotely

## How it works

```
┌─────────┐     SSE (events)     ┌──────────┐
│   Pi    │ ──────────────────►  │ Browser  │
│ (agent) │                     │  (chat)  │
│         │ ◄────────────────── │          │
└─────────┘   POST /message     └──────────┘
```

The extension listens to pi's lifecycle events and broadcasts them to connected browsers:

| Event | Description |
|-------|-------------|
| `session_start` | New session started |
| `agent_start` / `agent_end` | Agent lifecycle |
| `turn_start` / `turn_end` | Turn boundaries |
| `message_start` / `message_update` / `message_end` | Message lifecycle with streaming tokens |
| `tool_execution_start` / `tool_execution_update` / `tool_execution_end` | Tool execution with args and results |

## Security

- The server binds to `127.0.0.1` only (localhost), not accessible from the network
- No authentication — only processes on your machine can access it
- Runs only when you explicitly type `/web-ui`

## Project Structure

```
pi-session-web-ui/
├── package.json                          # pi package manifest
├── README.md
└── extensions/
    └── session-web-ui/
        ├── index.ts                      # Extension entry point (commands + event listeners)
        ├── server.ts                     # HTTP + SSE server implementation
        ├── index.html                    # Browser UI (dual-theme, responsive, animated)
        └── marked.js                     # Bundled markdown parser (GFM)
```

## Development

```bash
# Load the extension for testing
pi -e ./extensions/session-web-ui/index.ts

# After changes, reload in pi
/reload
```

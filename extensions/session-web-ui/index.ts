import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { SessionManager, buildSessionContext } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import { WebServer } from "./server";

let server: WebServer | undefined;

function getListeningPort(ctx: ExtensionCommandContext): number | undefined {
  return server?.port;
}

export default function (pi: ExtensionAPI) {
  let currentModel: { provider: string; name: string; id?: string } | undefined;
  let currentCwd: string | undefined;
  let isStreaming = false;
  let isThinking = false;
  let agentActive = false;
  let sessionId: string | undefined;
  let _modelRegistry: any = undefined;

  // ── Command: /web-ui (and alias /web) ──────────────────────
  pi.registerCommand("web-ui", {
    aliases: ["web"],
    description: "Start web UI for viewing and interacting with the conversation",
    handler: async (_args, ctx) => {
      if (server) {
        const port = getListeningPort(ctx);
        ctx.ui.notify(
          `Web UI already running at http://127.0.0.1:${port}`,
          "info",
        );
        return;
      }

      currentCwd = ctx.cwd;

      // Ensure currentModel is populated: try ctx.model first (available in command context),
      // then fall back to whatever model_select may have set before the server existed
      _modelRegistry = ctx.modelRegistry;

      if (!currentModel && (ctx as any).model) {
        const m = (ctx as any).model;
        currentModel = {
          provider: m.provider ?? m.api?.split("-")[0] ?? "unknown",
          name: m.id ?? m.name ?? "unknown",
          id: m.id ?? m.name ?? "unknown",
        };
      }

      // Load conversation history using pi SDK's proper session context API.
      // getBranch() + buildSessionContext() returns the correctly compacted,
      // current-branch-only message list (the same messages the LLM sees).
      const sessionFile = ctx.sessionManager.getSessionFile();
      let history: Record<string, unknown>[] = [];
      if (sessionFile && existsSync(sessionFile)) {
        try {
          const sm = SessionManager.open(sessionFile);
          const entries = sm.getBranch();
          const leafId = sm.getLeafId();
          const resolved = buildSessionContext(entries, leafId);
          history = resolved.messages as unknown as Record<string, unknown>[];
        } catch (e) {
          console.error("Failed to read session history:", e);
        }
      }

      // Broadcast initial state
      const broadcast = (event: string, data: Record<string, unknown>) => {
        server?.broadcast(event, data);
      };

      server = new WebServer({
        onMessage: async (text: string) => {
          // Forward message to pi
          // If agent is streaming, use steer; otherwise, send directly
          if (agentActive || isStreaming) {
            pi.sendUserMessage(text, { deliverAs: "steer" });
          } else {
            pi.sendUserMessage(text);
          }
        },
        onInterrupt: () => {
          ctx.abort();
          isStreaming = false;
          isThinking = false;
          agentActive = false;
          broadcast("interrupted", { timestamp: Date.now() });
        },
        onModels: async () => {
          try {
            const available = await _modelRegistry?.getAvailable();
            if (!available) return [];
            return available.map((m: any) => ({
              provider: m.provider ?? "unknown",
              id: m.id ?? m.name ?? "unknown",
              name: m.name ?? m.id ?? "unknown",
            }));
          } catch {
            return [];
          }
        },
        onModelSwitch: async (provider: string, modelId: string) => {
          try {
            const model = _modelRegistry?.find(provider, modelId);
            if (!model) return { ok: false, error: "Model not found" };
            const success = await pi.setModel(model);
            if (!success) return { ok: false, error: "No API key for this model" };
            return { ok: true };
          } catch (e: any) {
            return { ok: false, error: e?.message ?? "Failed to switch model" };
          }
        },
        onSessions: async () => {
          try {
            const sessions = await SessionManager.listAll();
            return sessions.map((s) => ({
              path: s.path,
              id: s.id,
              cwd: s.cwd || "",
              name: s.name,
              created: s.created.toISOString(),
              modified: s.modified.toISOString(),
              messageCount: s.messageCount,
              firstMessage: s.firstMessage || "",
            }));
          } catch (e) {
            console.error("Failed to list sessions:", e);
            return [];
          }
        },
        cwd: ctx.cwd,
        history,
        getStatus: () => ({
          connected: true,
          streaming: isStreaming,
          thinking: isThinking,
          agentActive,
          model: currentModel,
          cwd: currentCwd,
          sessionId,
        }),
      });

      const port = await server.start();
      const url = `http://127.0.0.1:${port}`;
      ctx.ui.notify(`Web UI started at ${url}`, "success");

      // Open browser
      const { exec } = await import("node:child_process");
      const { platform } = await import("node:os");
      const os = platform();
      if (os === "darwin") {
        exec(`open "${url}"`);
      } else if (os === "linux") {
        exec(`xdg-open "${url}"`);
      } else if (os === "win32") {
        exec(`start "" "${url}"`);
      }
    },
  });

  // ── Helper: broadcast to all clients ──────────────────────
  function broadcast(event: string, data: Record<string, unknown>) {
    server?.broadcast(event, data);
  }

  // ── Session events ─────────────────────────────────────────
  pi.on("session_start", async (event, ctx) => {
    // Try to get session ID from the session file name
    try {
      const sessionFile = ctx.sessionManager.getSessionFile();
      if (sessionFile) {
        sessionId = sessionFile.split(/[/\\]/).pop()?.replace(/\.jsonl$/, "");
      }
    } catch {}
    broadcast("session_start", {
      reason: event.reason,
      sessionId,
      timestamp: Date.now(),
    });
  });

  pi.on("session_shutdown", async (_event) => {
    broadcast("session_shutdown", { timestamp: Date.now() });
    server?.stop();
    server = undefined;
  });

  // ── Agent events ───────────────────────────────────────────
  pi.on("agent_start", async () => {
    agentActive = true;
    isStreaming = false;
    isThinking = false;
    broadcast("agent_start", { timestamp: Date.now() });
  });

  pi.on("agent_end", async (event) => {
    agentActive = false;
    isStreaming = false;
    isThinking = false;
    broadcast("agent_end", {
      timestamp: Date.now(),
      hasMessages: Array.isArray((event as any).messages),
    });
  });

  // ── Turn events ────────────────────────────────────────────
  pi.on("turn_start", async (event) => {
    broadcast("turn_start", {
      turnIndex: (event as any).turnIndex,
      timestamp: Date.now(),
    });
  });

  pi.on("turn_end", async (event) => {
    broadcast("turn_end", {
      turnIndex: (event as any).turnIndex,
      timestamp: Date.now(),
    });
  });

  // ── Message events ─────────────────────────────────────────
  pi.on("message_start", async (event) => {
    const msg = (event as any).message;
    broadcast("message_start", {
      message: msg,
      timestamp: Date.now(),
    });
  });

  pi.on("message_update", async (event) => {
    const msg = (event as any).message;
    const streamEvent = (event as any).assistantMessageEvent;
    isStreaming = true;

    // Detect thinking delta
    if (streamEvent?.type === "thinking_delta") {
      isThinking = true;
    }

    broadcast("message_update", {
      message: msg,
      delta: streamEvent,
      timestamp: Date.now(),
    });
  });

  pi.on("message_end", async (event) => {
    isStreaming = false;
    isThinking = false;
    broadcast("message_end", {
      message: (event as any).message,
      timestamp: Date.now(),
    });
  });

  // ── Tool execution events ──────────────────────────────────
  pi.on("tool_execution_start", async (event) => {
    const ev = event as any;
    broadcast("tool_execution_start", {
      toolCallId: ev.toolCallId,
      toolName: ev.toolName,
      args: ev.args,
      timestamp: Date.now(),
    });
  });

  pi.on("tool_execution_update", async (event) => {
    const ev = event as any;
    broadcast("tool_execution_update", {
      toolCallId: ev.toolCallId,
      toolName: ev.toolName,
      partialResult: ev.partialResult,
      timestamp: Date.now(),
    });
  });

  pi.on("tool_execution_end", async (event) => {
    const ev = event as any;
    broadcast("tool_execution_end", {
      toolCallId: ev.toolCallId,
      toolName: ev.toolName,
      result: ev.result,
      isError: ev.isError,
      timestamp: Date.now(),
    });
  });

  // ── Model events ───────────────────────────────────────────
  pi.on("model_select", async (event) => {
    const ev = event as any;
    currentModel = {
      provider: ev.model?.provider ?? "unknown",
      name: ev.model?.id ?? "unknown",
      id: ev.model?.id ?? ev.model?.name ?? "unknown",
    };
    broadcast("model_select", {
      model: currentModel,
      previousModel: ev.previousModel,
      source: ev.source,
      timestamp: Date.now(),
    });
  });

  // ── Cleanup on shutdown ────────────────────────────────────
  process.on("exit", () => {
    server?.stop();
  });
}

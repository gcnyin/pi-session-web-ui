import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { SessionManager, buildSessionContext } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import { WebServer } from "./server";

// ── Global state ────────────────────────────────────────────
// Stored on globalThis so it survives extension reloads and
// session switches. The server outlives any single session.
declare global {
  var __piWebServer: WebServer | undefined;
}

function loadSessionHistory(sessionFile: string): Record<string, unknown>[] {
  if (!sessionFile || !existsSync(sessionFile)) return [];
  try {
    const sm = SessionManager.open(sessionFile);
    const entries = sm.getBranch();
    const leafId = sm.getLeafId();
    const resolved = buildSessionContext(entries, leafId);
    return resolved.messages as unknown as Record<string, unknown>[];
  } catch (e) {
    console.error("Failed to read session history:", e);
    return [];
  }
}

export default function (pi: ExtensionAPI) {
  let currentModel: { provider: string; name: string; id?: string } | undefined;
  let currentCwd: string | undefined;
  let isStreaming = false;
  let isThinking = false;
  let agentActive = false;
  let sessionId: string | undefined;
  let sessionFile: string | undefined;
  let _modelRegistry: any = undefined;

  // ── Server lifecycle ──────────────────────────────────────

  function buildServerOptions(cwd: string, history: Record<string, unknown>[]) {
    return {
      onMessage: async (text: string) => {
        if (agentActive || isStreaming) {
          pi.sendUserMessage(text, { deliverAs: "steer" });
        } else {
          pi.sendUserMessage(text);
        }
      },
      onInterrupt: () => {
        // ctx.abort is not available outside the command handler,
        // but pi.abort() works from the extension API
        (pi as any).abort?.();
        isStreaming = false;
        isThinking = false;
        agentActive = false;
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
      onSessionDetail: async (id: string) => {
        try {
          const sessions = await SessionManager.listAll();
          const found = sessions.find((s) => s.id === id);
          if (!found) return null;
          const history = loadSessionHistory(found.path);
          return {
            history,
            cwd: found.cwd || "",
            model: currentModel,
          };
        } catch {
          return null;
        }
      },
      onSwitchSession: async (id: string) => {
        try {
          const sessions = await SessionManager.listAll();
          const found = sessions.find((s) => s.id === id);
          if (!found) return { ok: false, error: "Session not found" };
          // Use /resume to switch — works regardless of command context lifecycle
          pi.sendUserMessage(`/resume ${found.path}`);
          return { ok: true };
        } catch (e: any) {
          return { ok: false, error: e?.message ?? "Switch failed" };
        }
      },
      cwd,
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
    };
  }

  function broadcast(event: string, data: Record<string, unknown>) {
    globalThis.__piWebServer?.broadcast(event, data);
  }

  async function ensureServer(cwd: string, history: Record<string, unknown>[], reason: string) {
    const existing = globalThis.__piWebServer;

    if (!existing) {
      // First time: create and start
      const server = new WebServer(buildServerOptions(cwd, history));
      await server.start();
      globalThis.__piWebServer = server;
      return server;
    }

    if (reason === "reload") {
      // Reload: refresh HTML from disk, update all options
      existing.reloadHtml();
      existing.updateOptions(buildServerOptions(cwd, history));
    } else {
      // Session change (new/resume/fork): just update options
      existing.updateOptions(buildServerOptions(cwd, history));
    }

    return existing;
  }

  // ── Command: /web-ui (and alias /web) ──────────────────────
  pi.registerCommand("web-ui", {
    aliases: ["web"],
    description: "Start web UI for viewing and interacting with the conversation",
    handler: async (_args, ctx) => {
      _modelRegistry = ctx.modelRegistry;
      currentCwd = ctx.cwd;

      if (!currentModel && (ctx as any).model) {
        const m = (ctx as any).model;
        currentModel = { provider: m.provider ?? "unknown", name: m.id ?? m.name ?? "unknown", id: m.id ?? m.name ?? "unknown" };
      }

      sessionFile = ctx.sessionManager.getSessionFile();
      const history = loadSessionHistory(sessionFile || "");

      const server = await ensureServer(ctx.cwd, history, "startup");
      const url = `http://127.0.0.1:${server.port}`;
      ctx.ui.notify(`Web UI at ${url}`, "success");

      // Open browser
      const { exec } = await import("node:child_process");
      const { platform } = await import("node:os");
      const os = platform();
      if (os === "darwin") exec(`open "${url}"`);
      else if (os === "linux") exec(`xdg-open "${url}"`);
      else if (os === "win32") exec(`start "" "${url}"`);
    },
  });

  // ── Session events ─────────────────────────────────────────
  pi.on("session_start", async (event, ctx) => {
    _modelRegistry = ctx.modelRegistry;
    currentCwd = ctx.cwd;

    if (!currentModel && (ctx as any).model) {
      const m = (ctx as any).model;
      currentModel = { provider: m.provider ?? "unknown", name: m.id ?? m.name ?? "unknown", id: m.id ?? m.name ?? "unknown" };
    }

    try {
      sessionFile = ctx.sessionManager.getSessionFile() || undefined;
      if (sessionFile) {
        sessionId = sessionFile.split(/[/\\]/).pop()?.replace(/\.jsonl$/, "");
      }
    } catch {}

    const history = loadSessionHistory(sessionFile || "");
    await ensureServer(ctx.cwd, history, event.reason);
  });

  pi.on("session_shutdown", async (_event) => {
    broadcast("session_shutdown", { timestamp: Date.now() });
    // Server stays alive — it's a singleton
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
    broadcast("agent_end", { timestamp: Date.now(), hasMessages: Array.isArray((event as any).messages) });
  });

  // ── Turn events ────────────────────────────────────────────
  pi.on("turn_start", async (event) => {
    broadcast("turn_start", { turnIndex: (event as any).turnIndex, timestamp: Date.now() });
  });

  pi.on("turn_end", async (event) => {
    broadcast("turn_end", { turnIndex: (event as any).turnIndex, timestamp: Date.now() });
  });

  // ── Message events ─────────────────────────────────────────
  pi.on("message_start", async (event) => {
    broadcast("message_start", { message: (event as any).message, timestamp: Date.now() });
  });

  pi.on("message_update", async (event) => {
    isStreaming = true;
    const streamEvent = (event as any).assistantMessageEvent;
    if (streamEvent?.type === "thinking_delta") isThinking = true;
    broadcast("message_update", { message: (event as any).message, delta: streamEvent, timestamp: Date.now() });
  });

  pi.on("message_end", async (event) => {
    isStreaming = false;
    isThinking = false;
    broadcast("message_end", { message: (event as any).message, timestamp: Date.now() });
  });

  // ── Tool execution events ──────────────────────────────────
  pi.on("tool_execution_start", async (event) => {
    const ev = event as any;
    broadcast("tool_execution_start", { toolCallId: ev.toolCallId, toolName: ev.toolName, args: ev.args, timestamp: Date.now() });
  });

  pi.on("tool_execution_update", async (event) => {
    const ev = event as any;
    broadcast("tool_execution_update", { toolCallId: ev.toolCallId, toolName: ev.toolName, partialResult: ev.partialResult, timestamp: Date.now() });
  });

  pi.on("tool_execution_end", async (event) => {
    const ev = event as any;
    broadcast("tool_execution_end", { toolCallId: ev.toolCallId, toolName: ev.toolName, result: ev.result, isError: ev.isError, timestamp: Date.now() });
  });

  // ── Model events ───────────────────────────────────────────
  pi.on("model_select", async (event) => {
    const ev = event as any;
    currentModel = { provider: ev.model?.provider ?? "unknown", name: ev.model?.id ?? "unknown", id: ev.model?.id ?? ev.model?.name ?? "unknown" };
    broadcast("model_select", { model: currentModel, previousModel: ev.previousModel, source: ev.source, timestamp: Date.now() });
  });

  // ── Cleanup on process exit ────────────────────────────────
  process.on("exit", () => {
    globalThis.__piWebServer?.stop();
  });
}

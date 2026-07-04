import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { SessionManager, buildSessionContext } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import { WebServer } from "./server";

// ── Global state ────────────────────────────────────────────
// Stored on globalThis so it survives extension reloads and
// session switches. Each session has its own server with a random port.
declare global {
  // Map<sessionId, WebServer> — each session gets its own server instance
  var __piWebServers: Map<string, WebServer> | undefined;
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
  let _contextWindow = 0;
  let _maxTokens = 0;

  // ── Usage accumulation state ─────────────────────────────
  const usage = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    reasoning: 0,
    hasReasoning: false, // whether any message reported reasoning tokens
  };
  let contextTokens: number | null = null; // null = unknown (e.g. after compaction)

  function resetUsage() {
    usage.input = 0;
    usage.output = 0;
    usage.cacheRead = 0;
    usage.cacheWrite = 0;
    usage.reasoning = 0;
    usage.hasReasoning = false;
    contextTokens = null;
  }

  function accumulateUsage(msg: any) {
    if (!msg || msg.role !== 'assistant' || !msg.usage) return;
    const u = msg.usage;
    usage.input += u.input ?? 0;
    usage.output += u.output ?? 0;
    usage.cacheRead += u.cacheRead ?? 0;
    usage.cacheWrite += u.cacheWrite ?? 0;
    if (u.reasoning != null) {
      usage.reasoning += u.reasoning;
      usage.hasReasoning = true;
    }
    // Update context tokens from totalTokens (input side represents context size)
    const total = u.totalTokens ?? ((u.input ?? 0) + (u.output ?? 0) + (u.cacheRead ?? 0) + (u.cacheWrite ?? 0));
    if (total > 0) {
      contextTokens = total;
    }
  }

  function getUsageStats() {
    const totalCache = usage.cacheRead + usage.cacheWrite;
    const cacheHitRate = (usage.input + totalCache) > 0
      ? (usage.cacheRead / (usage.input + totalCache)) * 100
      : 0;
    return {
      input: usage.input,
      output: usage.output,
      cacheRead: usage.cacheRead,
      cacheWrite: usage.cacheWrite,
      reasoning: usage.hasReasoning ? usage.reasoning : null,
      cacheHitRate,
    };
  }

  function getContextStats() {
    return {
      tokens: contextTokens,
      window: _contextWindow,
      maxTokens: _maxTokens,
    };
  }

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
        history,
        usage: getUsageStats(),
        context: getContextStats(),
      }),
    };
  }

  function broadcast(event: string, data: Record<string, unknown>) {
    // Broadcast to all servers (all session browsers)
    const servers = globalThis.__piWebServers;
    if (servers) {
      for (const server of servers.values()) {
        server.broadcast(event, data);
      }
    }
  }



  async function ensureServer(cwd: string, history: Record<string, unknown>[], reason: string) {
    const servers = globalThis.__piWebServers ?? new Map<string, WebServer>();
    globalThis.__piWebServers = servers;

    // Use sessionId as the key — each session gets its own server
    if (!sessionId) return undefined;

    const existing = servers.get(sessionId);

    if (!existing) {
      // First time for this session: create and start on a random port
      const server = new WebServer(buildServerOptions(cwd, history));
      server.setSessionId(sessionId);
      await server.start(0); // port 0 = OS picks random port
      servers.set(sessionId, server);
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
    description: "Show web UI URL (server auto-starts on session launch)",
    handler: async (_args, ctx) => {
      const servers = globalThis.__piWebServers;
      const server = servers?.get(sessionId || "");
      
      if (!server) {
        ctx.ui.notify("Web server not ready yet", "error");
        return;
      }
      
      const addresses = server.getAddresses();
      if (addresses.length > 1) {
        ctx.ui.notify(`Web UI at:\n${addresses.join("\n")}`, "success");
      } else {
        ctx.ui.notify(`Web UI at ${addresses[0]}`, "success");
      }
    },
  });

  // ── Session events ─────────────────────────────────────────
  pi.on("session_start", async (event, ctx) => {
    _modelRegistry = ctx.modelRegistry;
    currentCwd = ctx.cwd;
    resetUsage();

    if (!currentModel && (ctx as any).model) {
      const m = (ctx as any).model;
      currentModel = { provider: m.provider ?? "unknown", name: m.id ?? m.name ?? "unknown", id: m.id ?? m.name ?? "unknown" };
      _contextWindow = m.contextWindow ?? 0;
      _maxTokens = m.maxTokens ?? 0;
    }

    try {
      sessionFile = ctx.sessionManager.getSessionFile() || undefined;
      if (sessionFile) {
        sessionId = sessionFile.split(/[/\\]/).pop()?.replace(/\.jsonl$/, "");
      }
    } catch {}

    const history = loadSessionHistory(sessionFile || "");
    const server = await ensureServer(ctx.cwd, history, event.reason);
    
    // Auto-open browser and show URL on first session start
    if (server && event.reason === "startup") {
      const addresses = server.getAddresses();
      const primaryUrl = addresses[0] || `http://127.0.0.1:${server.port}`;
      
      // Show URL widget above editor
      const widgetLines = addresses.map(a => `  ${a}`);
      ctx.ui.setWidget("web-ui", [`Web UI:`, ...widgetLines]);

      // Open browser
      const { exec } = await import("node:child_process");
      const { platform } = await import("node:os");
      const os = platform();
      if (os === "darwin") exec(`open "${primaryUrl}"`);
      else if (os === "linux") exec(`xdg-open "${primaryUrl}"`);
      else if (os === "win32") exec(`start "" "${primaryUrl}"`);
    }

    // Push new session data to all browser clients (handles session switch)
    broadcast("connected", {
      connected: true,
      streaming: isStreaming,
      thinking: isThinking,
      agentActive,
      model: currentModel,
      cwd: currentCwd,
      sessionId,
      usage: getUsageStats(),
      context: getContextStats(),
      history,
    });
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
    const msg = (event as any).message;
    accumulateUsage(msg);
    broadcast("message_end", { message: msg, timestamp: Date.now() });
    broadcast("usage_update", { usage: getUsageStats(), context: getContextStats(), timestamp: Date.now() });
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
    _contextWindow = ev.model?.contextWindow ?? 0;
    _maxTokens = ev.model?.maxTokens ?? 0;
    resetUsage();
    broadcast("model_select", { model: currentModel, previousModel: ev.previousModel, source: ev.source, timestamp: Date.now() });
  });

  // ── Cleanup on process exit ────────────────────────────────
  process.on("exit", () => {
    const servers = globalThis.__piWebServers;
    if (servers) {
      for (const server of servers.values()) {
        server.stop();
      }
    }
  });
}

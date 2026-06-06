import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Status {
  connected: boolean;
  streaming: boolean;
  thinking: boolean;
  agentActive: boolean;
  model?: { provider: string; name: string };
  cwd?: string;
  sessionId?: string;
  history?: Record<string, unknown>[];
}

export interface SessionInfo {
  path: string;
  id: string;
  cwd: string;
  name?: string;
  created: string;
  modified: string;
  messageCount: number;
  firstMessage: string;
}

interface ServerOptions {
  onMessage: (text: string) => void;
  onInterrupt: () => void;
  onModels: () => Promise<{ provider: string; id: string; name: string }[]>;
  onModelSwitch: (provider: string, modelId: string) => Promise<{ ok: boolean; error?: string }>;
  onSessions: () => Promise<SessionInfo[]>;
  onSessionDetail: (id: string) => Promise<{ history: Record<string, unknown>[]; cwd: string; model?: { provider: string; name: string } } | null>;
  onCurrentHistory: () => Record<string, unknown>[];
  onSwitchSession: (sessionId: string) => Promise<{ ok: boolean; error?: string }>;
  cwd: string;
  getStatus: () => Status;
  history?: Record<string, unknown>[];
}

interface SseClient {
  id: number;
  res: ServerResponse;
}

export class WebServer {
  private server;
  private clients = new Set<SseClient>();
  private clientIdCounter = 0;
  private options: ServerOptions;
  private _port = 0;
  private htmlContent: string;
  private closed = false;
  private eventQueue: Array<{ event: string; data: string }> = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  get port() {
    return this._port;
  }

  constructor(options: ServerOptions) {
    this.options = options;
    this.htmlContent = this.loadHtml();

    this.server = createServer((req, res) => {
      try {
        this.handleRequest(req, res);
      } catch (err) {
        console.error("WebServer request error:", err);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end("Internal Server Error");
        }
      }
    });
  }

  private loadHtml(): string {
    const htmlPath = resolve(__dirname, "index.html");
    if (existsSync(htmlPath)) {
      return readFileSync(htmlPath, "utf-8");
    }
    return "<h1>index.html not found</h1>";
  }

  /** Reload HTML from disk (useful after /reload) */
  reloadHtml(): void {
    this.htmlContent = this.loadHtml();
  }

  /** Update session-bound options without restarting the server */
  updateOptions(partial: Partial<ServerOptions>): void {
    Object.assign(this.options, partial);
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const path = url.pathname;

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Static file serving for local assets (.js, .css, etc.)
    if (path.startsWith("/") && path.includes(".") && req.method === "GET") {
      this.serveStatic(path, res);
      return;
    }

    switch (path) {
      case "/":
      case "/index.html":
        this.serveHtml(res);
        break;
      case "/events":
        this.handleSse(req, res);
        break;
      case "/message":
        this.handleMessage(req, res);
        break;
      case "/interrupt":
        this.handleInterrupt(res);
        break;
      case "/status":
        this.handleStatus(res);
        break;
      case "/models":
        this.handleModels(req, res);
        break;
      case "/model":
        this.handleModel(req, res);
        break;
      case "/sessions":
        this.handleSessions(req, res);
        break;
      case "/session/switch":
        this.handleSwitchSession(req, res);
        break;
      default:
        res.writeHead(404);
        res.end("Not Found");
    }
  }

  private serveHtml(res: ServerResponse) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(this.htmlContent);
  }

  private serveStatic(path: string, res: ServerResponse) {
    // Strip leading slash and resolve relative to the extension directory
    const relPath = path.replace(/^\/+/, "");
    const filePath = resolve(__dirname, relPath);

    // Security: only serve files from the extension directory
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    if (!existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    // Determine content type from extension
    const ext = path.split(".").pop()?.toLowerCase() || "";
    const mimeTypes: Record<string, string> = {
      js: "application/javascript",
      css: "text/css",
      html: "text/html",
      json: "application/json",
      svg: "image/svg+xml",
      png: "image/png",
      jpg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      ico: "image/x-icon",
      map: "application/json",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";

    try {
      const content = readFileSync(filePath);
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    } catch {
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  }

  private async handleSse(_req: IncomingMessage, res: ServerResponse) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const url = new URL(_req.url ?? "/", `http://${_req.headers.host ?? "localhost"}`);
    const sessionId = url.searchParams.get("id");

    const client: SseClient = {
      id: ++this.clientIdCounter,
      res,
    };

    this.clients.add(client);

    // Load history: if ?id= is present, fetch that session's detail
    let statusData = this.options.getStatus();
    if (sessionId) {
      try {
        const detail = await this.options.onSessionDetail(sessionId);
        if (detail) {
          statusData = { ...statusData, cwd: detail.cwd, model: detail.model };
          statusData.history = detail.history;
          statusData.sessionId = sessionId;
        }
      } catch { /* fall back to current session */ }
    }
    // Always use fresh history (not cached snapshot)
    if (!statusData.history) {
      statusData.history = this.options.onCurrentHistory();
    }
    this.sendEvent(client, "connected", JSON.stringify(statusData));

    // Flush any queued events
    if (this.eventQueue.length > 0) {
      for (const queued of this.eventQueue) {
        this.sendEvent(client, queued.event, queued.data);
      }
    }

    // Heartbeat every 30s
    const heartbeat = setInterval(() => {
      try {
        res.write(":heartbeat\n\n");
      } catch {
        clearInterval(heartbeat);
        this.clients.delete(client);
      }
    }, 30000);

    _req.on("close", () => {
      clearInterval(heartbeat);
      this.clients.delete(client);
    });
  }

  private sendEvent(client: SseClient, event: string, data: string) {
    try {
      client.res.write(`event: ${event}\ndata: ${data}\n\n`);
    } catch {
      this.clients.delete(client);
    }
  }

  broadcast(event: string, data: Record<string, unknown>) {
    const json = JSON.stringify(data);

    // If no clients, queue events until someone connects
    if (this.clients.size === 0) {
      this.eventQueue.push({ event, data: json });
      // Limit queue size
      if (this.eventQueue.length > 1000) {
        this.eventQueue.shift();
      }
      return;
    }

    for (const client of this.clients) {
      this.sendEvent(client, event, json);
    }
  }

  private handleMessage(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end("Method Not Allowed");
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        const text = parsed.text ?? parsed.message ?? "";
        if (typeof text === "string" && text.trim()) {
          this.options.onMessage(text.trim());
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Empty message" }));
        }
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  }

  private handleInterrupt(res: ServerResponse) {
    this.options.onInterrupt();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  }

  private handleStatus(res: ServerResponse) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(this.options.getStatus()));
  }

  private async handleModels(_req: IncomingMessage, res: ServerResponse) {
    if (_req.method !== "GET") {
      res.writeHead(405);
      res.end("Method Not Allowed");
      return;
    }
    try {
      const models = await this.options.onModels();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ models }));
    } catch (e: any) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e?.message ?? "Failed to list models" }));
    }
  }

  private async handleModel(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end("Method Not Allowed");
      return;
    }
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body);
        const { provider, id } = parsed;
        if (!provider || !id) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "provider and id are required" }));
          return;
        }
        const result = await this.options.onModelSwitch(provider, id);
        if (result.ok) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: result.error }));
        }
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  }

  private async handleSessions(_req: IncomingMessage, res: ServerResponse) {
    if (_req.method !== "GET") {
      res.writeHead(405);
      res.end("Method Not Allowed");
      return;
    }
    try {
      const sessions = await this.options.onSessions();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ sessions }));
    } catch (e: any) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e?.message ?? "Failed to list sessions" }));
    }
  }

  private async handleSwitchSession(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end("Method Not Allowed");
      return;
    }
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { id } = JSON.parse(body);
        if (!id) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Session id required" }));
          return;
        }
        const result = await this.options.onSwitchSession(id);
        res.writeHead(result.ok ? 200 : 400, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  }

  async start(port?: number): Promise<number> {
    const p = port ?? parseInt(process.env.PI_WEB_PORT || "9876", 10);
    return new Promise((resolve, reject) => {
      this.server.listen(p, "127.0.0.1", () => {
        const addr = this.server.address();
        if (addr && typeof addr === "object") {
          this._port = addr.port;
        }
        resolve(this._port);
      });
      this.server.on("error", reject);
    });
  }

  stop() {
    if (this.closed) return;
    this.closed = true;

    for (const client of this.clients) {
      try {
        client.res.end();
      } catch {
        // ignore
      }
    }
    this.clients.clear();

    try {
      this.server.close();
    } catch {
      // ignore
    }
  }
}

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface UsageStats {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  reasoning: number | null;
  cacheHitRate: number;
}

interface ContextStats {
  tokens: number | null;
  window: number;
  maxTokens: number;
}

interface Status {
  connected: boolean;
  streaming: boolean;
  thinking: boolean;
  agentActive: boolean;
  model?: { provider: string; name: string };
  cwd?: string;
  sessionId?: string;
  usage?: UsageStats;
  context?: ContextStats;
  history?: Record<string, unknown>[];
}

interface ServerOptions {
  onMessage: (text: string) => void;
  onInterrupt: () => void;
  onModels: () => Promise<{ provider: string; id: string; name: string }[]>;
  onModelSwitch: (provider: string, modelId: string) => Promise<{ ok: boolean; error?: string }>;
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
  private _sessionId: string | undefined;
  private htmlContent: string;
  private closed = false;
  private eventQueue: Array<{ event: string; data: string }> = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  get port() {
    return this._port;
  }

  get sessionId() {
    return this._sessionId;
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

  /** Set the session ID this server is bound to */
  setSessionId(id: string): void {
    this._sessionId = id;
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

    const client: SseClient = {
      id: ++this.clientIdCounter,
      res,
    };

    this.clients.add(client);

    const statusData = this.options.getStatus();
    this.sendEvent(client, "connected", JSON.stringify(statusData));

    // Replay queued events to the new client so they don't miss
    // any messages that arrived while no clients were connected.
    // The history in "connected" already has completed messages,
    // but streaming/in-progress events need to be replayed.
    for (const queued of this.eventQueue) {
      this.sendEvent(client, queued.event, queued.data);
    }
    this.eventQueue.length = 0;

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



  async start(port?: number, host?: string): Promise<number> {
    const h = host ?? process.env.PI_WEB_HOST ?? "0.0.0.0";
    let p = port ?? 23456;
    const maxRetries = 100; // try up to 100 ports upward

    for (let attempt = 0; attempt < maxRetries; attempt++, p++) {
      try {
        await new Promise<void>((resolve, reject) => {
          this.server.once("error", reject);
          this.server.listen(p, h, () => {
            this.server.removeListener("error", reject);
            resolve();
          });
        });
        const addr = this.server.address();
        if (addr && typeof addr === "object") {
          this._port = addr.port;
        }
        return this._port;
      } catch (err: any) {
        if (err.code !== "EADDRINUSE") throw err;
        // Port in use, try the next one
      }
    }

    throw new Error(
      `Could not find an available port after ${maxRetries} attempts (started at ${port ?? 23456})`
    );
  }

  /**
   * Get all addresses the server is listening on.
   * Returns an array of URLs (e.g., ["http://127.0.0.1:9876", "http://192.168.1.100:9876"])
   */
  getAddresses(): string[] {
    const addr = this.server.address();
    if (!addr || typeof addr === "string") return [];

    const port = addr.port;
    const addresses: string[] = [];
    let localhost = `http://127.0.0.1:${port}`;

    // If listening on a specific address, just return that
    if (addr.address !== "0.0.0.0" && addr.address !== "::") {
      const host = addr.address.includes(":") ? `[${addr.address}]` : addr.address;
      return [`http://${host}:${port}`];
    }

    // Listening on all interfaces — enumerate all non-internal IPv4/IPv6 addresses
    const nets = networkInterfaces();
    for (const [name, interfaces] of Object.entries(nets)) {
      if (!interfaces) continue;
      for (const iface of interfaces) {
        // Skip internal (loopback) and non-IPv4 when listening on 0.0.0.0
        if (iface.internal) continue;
        if (addr.address === "0.0.0.0" && iface.family !== "IPv4") continue;
        if (addr.address === "::" && iface.family !== "IPv6") continue;

        const host = iface.family === "IPv6" ? `[${iface.address}]` : iface.address;
        const url = `http://${host}:${port}`;
        if (!addresses.includes(url)) {
          addresses.push(url);
        }
      }
    }

    // Put localhost at the end — prefer LAN addresses
    // so browser opens the LAN URL and others can access
    addresses.push(localhost);

    return addresses;
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

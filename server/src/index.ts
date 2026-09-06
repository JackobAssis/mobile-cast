import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { handleMessage, handleClose } from "./signaling.js";
import { cleanupExpired } from "./session.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 3000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
const app = express();

app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(","), credentials: true }));
app.use(express.json());
// Confia em proxy (Render/Fly) para X-Forwarded-Proto → wss
app.set("trust proxy", 1);

// Health + session info
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), version: "0.1.0" });
});
app.get("/api/config", (_req, res) => {
  // Usado pelo app para descobrir WSS sem hardcode de IP em prod
  res.json({ wsUrl: "/ws", stun: "stun:stun.l.google.com:19302" });
});

// Serve web build if exists
const webDist = path.resolve(__dirname, "../../web/dist");
app.use(express.static(webDist));

// Fallback para SPA (React Router)
app.get("*", (_req, res) => {
  res.sendFile(path.join(webDist, "index.html"), (err) => {
    if (err) res.status(404).send("Web build not found. Run `npm run build` in /web");
  });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[ws] connected ${ip}`);

  // rate-limit simples por IP (10 criações/min já tratado via session logic)
  ws.on("message", (data) => handleMessage(ws, data.toString()));
  ws.on("close", () => handleClose(ws));
  ws.on("error", (e) => console.error("[ws] error", e));

  // heartbeat server-side: fecha se não responder pong em 60s
  let alive = true;
  ws.on("pong", () => { alive = true; });
  const interval = setInterval(() => {
    if (!alive) {
      ws.terminate();
      clearInterval(interval);
      return;
    }
    alive = false;
    try { ws.ping(); } catch {}
  }, 30000);
  ws.on("close", () => clearInterval(interval));
});

// Cleanup sessões expiradas a cada 60s
setInterval(cleanupExpired, 60_000);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n✅ Mobile Cast signaling listening on http://0.0.0.0:${PORT}`);
  console.log(`   WS endpoint: ws://0.0.0.0:${PORT}/ws`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  const nets = os.networkInterfaces();
  console.log(`\n📡 Network interfaces:`);
  for (const [name, addrs] of Object.entries(nets)) {
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal) {
        console.log(`   - ${name}: http://${a.address}:${PORT}  (use no celular/PC na mesma rede)`);
      }
    }
  }
  console.log(`\n   QR will encode: http://<this-ip>:${PORT}/r/<CODE>\n`);
});

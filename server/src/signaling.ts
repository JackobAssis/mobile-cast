import type { WebSocket } from "ws";
import { ClientMessage } from "./types.js";
import { createSession, getSession, addPeer, removePeer, broadcast, sessions } from "./session.js";

// Mapeia ws -> sessionId para cleanup no close
const wsToSession = new Map<WebSocket, string>();

export function handleMessage(ws: WebSocket, raw: string) {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    ws.send(JSON.stringify({ type: "error", message: "Invalid JSON", code: "BAD_JSON" }));
    return;
  }

  const parsed = ClientMessage.safeParse(json);
  if (!parsed.success) {
    ws.send(JSON.stringify({ type: "error", message: "Invalid message", code: "BAD_MESSAGE", details: parsed.error.flatten() }));
    return;
  }

  const msg = parsed.data;

  switch (msg.type) {
    case "create": {
      const session = createSession();
      addPeer(session, ws, "host");
      wsToSession.set(ws, session.id);
      ws.send(JSON.stringify({ type: "created", sessionId: session.id }));
      console.log(`[signaling] created session ${session.id}`);
      break;
    }
    case "join": {
      const session = getSession(msg.sessionId.toUpperCase());
      if (!session) {
        ws.send(JSON.stringify({ type: "error", message: "Sessão não encontrada", code: "NOT_FOUND" }));
        return;
      }
      if (session.peers.size >= 2) {
        ws.send(JSON.stringify({ type: "error", message: "Sessão cheia", code: "FULL" }));
        return;
      }
      addPeer(session, ws, "viewer");
      wsToSession.set(ws, session.id);
      ws.send(JSON.stringify({ type: "joined", sessionId: session.id }));
      // notifica host que viewer entrou
      broadcast(session, ws, JSON.stringify({ type: "peer-joined", count: session.peers.size }));
      console.log(`[signaling] peer joined ${session.id} (${session.peers.size}/2)`);
      break;
    }
    case "offer":
    case "answer":
    case "ice-candidate": {
      const sessionId = wsToSession.get(ws);
      if (!sessionId) {
        ws.send(JSON.stringify({ type: "error", message: "Not in session", code: "NO_SESSION" }));
        return;
      }
      const session = getSession(sessionId);
      if (!session) return;
      // relay cru para o outro peer
      broadcast(session, ws, raw);
      break;
    }
    case "leave": {
      handleLeave(ws);
      break;
    }
    case "heartbeat": {
      ws.send(JSON.stringify({ type: "pong" }));
      break;
    }
  }
}

export function handleClose(ws: WebSocket) {
  handleLeave(ws);
}

function handleLeave(ws: WebSocket) {
  const sessionId = wsToSession.get(ws);
  if (!sessionId) return;
  const session = getSession(sessionId);
  if (!session) {
    wsToSession.delete(ws);
    return;
  }
  removePeer(session, ws);
  wsToSession.delete(ws);
  // notifica quem ficou
  try {
    broadcast(session, ws, JSON.stringify({ type: "peer-left", count: session.peers.size }));
  } catch {}
  console.log(`[signaling] peer left ${sessionId} (${session.peers.size}/2)`);
  if (session.peers.size === 0) {
    // não remove imediatamente — deixa cleanup decidir (60s)
  }
}

export function handleUpgradeError(ws: WebSocket, err: unknown) {
  console.error("[ws] error", err);
  try { ws.send(JSON.stringify({ type: "error", message: "Internal error" })); } catch {}
}

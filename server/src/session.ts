import type { WebSocket } from "ws";
import { customAlphabet } from "nanoid";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I,O,0,1 para evitar confusão
const nanoid = customAlphabet(alphabet, 6);

export type PeerRole = "host" | "viewer";

export interface Peer {
  ws: WebSocket;
  role: PeerRole;
  joinedAt: number;
}

export interface Session {
  id: string;
  createdAt: number;
  peers: Map<WebSocket, Peer>;
}

export const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS ?? 2 * 60 * 60 * 1000); // 2h
export const MAX_PEERS = 2;

export const sessions = new Map<string, Session>();

export function createSession(): Session {
  let id: string;
  do {
    id = nanoid();
  } while (sessions.has(id));
  const session: Session = { id, createdAt: Date.now(), peers: new Map() };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function removeSession(id: string) {
  sessions.delete(id);
}

export function cleanupExpired() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > SESSION_TTL_MS || s.peers.size === 0 && now - s.createdAt > 60_000) {
      // remove sessões vazias após 60s ou expiradas
      // notifica peers antes
      for (const p of s.peers.values()) {
        try { p.ws.send(JSON.stringify({ type: "session-ended", reason: "expired" })); } catch {}
        try { p.ws.close(); } catch {}
      }
      sessions.delete(id);
      console.log(`[cleanup] removed session ${id}`);
    }
  }
}

export function addPeer(session: Session, ws: WebSocket, role: PeerRole) {
  if (session.peers.size >= MAX_PEERS) throw new Error("SESSION_FULL");
  session.peers.set(ws, { ws, role, joinedAt: Date.now() });
}

export function removePeer(session: Session, ws: WebSocket) {
  session.peers.delete(ws);
  if (session.peers.size === 0) {
    // mantém sessão por 60s para permitir reconexão rápida, cleanup cuida
  }
}

export function broadcast(session: Session, sender: WebSocket, data: string) {
  for (const [ws] of session.peers) {
    if (ws !== sender && ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

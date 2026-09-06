import { z } from "zod";

// Mensagens do protocolo WS
export const CreateMsg = z.object({ type: z.literal("create") });
export const JoinMsg = z.object({ type: z.literal("join"), sessionId: z.string().min(4).max(12) });
export const OfferMsg = z.object({ type: z.literal("offer"), sdp: z.string().min(10) });
export const AnswerMsg = z.object({ type: z.literal("answer"), sdp: z.string().min(10) });
export const IceMsg = z.object({
  type: z.literal("ice-candidate"),
  candidate: z.string(),
  sdpMid: z.string().nullable().optional(),
  sdpMLineIndex: z.number().nullable().optional(),
});
export const LeaveMsg = z.object({ type: z.literal("leave") });
export const HeartbeatMsg = z.object({ type: z.literal("heartbeat") });

export const ClientMessage = z.discriminatedUnion("type", [
  CreateMsg,
  JoinMsg,
  OfferMsg,
  AnswerMsg,
  IceMsg,
  LeaveMsg,
  HeartbeatMsg,
]);

export type ClientMessage = z.infer<typeof ClientMessage>;

export type ServerMessage =
  | { type: "created"; sessionId: string; wsUrl?: string }
  | { type: "joined"; sessionId: string }
  | { type: "peer-joined"; count: number }
  | { type: "peer-left"; count: number }
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "ice-candidate"; candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null }
  | { type: "error"; message: string; code?: string }
  | { type: "pong" }
  | { type: "session-ended"; reason: string };

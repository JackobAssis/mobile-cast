/**
 * Teste E2E do signaling server — sem browser, só WS.
 * Simula: host create → viewer join → offer/answer → ice → leave
 * Roda com: node tests/signaling.test.mjs (servidor precisa estar em :3099 ou :3000)
 */
import WebSocket from "ws";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3099;
const URL = `ws://localhost:${PORT}/ws`;

function once(ws, type) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting ${type}`)), 5000);
    const handler = (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === type) {
          clearTimeout(timer);
          ws.off("message", handler);
          resolve(msg);
        }
        if (msg.type === "error") {
          clearTimeout(timer);
          ws.off("message", handler);
          reject(new Error(`server error: ${msg.message}`));
        }
      } catch {}
    };
    ws.on("message", handler);
  });
}

async function test() {
  console.log(`→ Testing signaling at ${URL}`);

  const host = new WebSocket(URL);
  await new Promise((res, rej) => { host.on("open", res); host.on("error", rej); });
  console.log("✓ host connected");
  host.send(JSON.stringify({ type: "create" }));
  const created = await once(host, "created");
  const sessionId = created.sessionId;
  console.log(`✓ session created: ${sessionId}`);

  // Mensagens de offer/ice devem ser relay para viewer
  const viewer = new WebSocket(URL);
  await new Promise((res, rej) => { viewer.on("open", res); viewer.on("error", rej); });
  console.log("✓ viewer connected");

  // viewer tenta join com código minúsculo (case-insensitive)
  viewer.send(JSON.stringify({ type: "join", sessionId: sessionId.toLowerCase() }));
  const joined = await once(viewer, "joined");
  console.log(`✓ viewer joined: ${joined.sessionId}`);

  // host deve receber peer-joined
  const peerJoined = await once(host, "peer-joined");
  console.log(`✓ host got peer-joined count=${peerJoined.count}`);

  // host envia offer, viewer deve receber
  const fakeOffer = "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n";
  host.send(JSON.stringify({ type: "offer", sdp: fakeOffer }));
  const offerAtViewer = await once(viewer, "offer");
  console.log(`✓ viewer got offer (${offerAtViewer.sdp.length} chars)`);

  // viewer responde answer
  viewer.send(JSON.stringify({ type: "answer", sdp: fakeOffer }));
  const answerAtHost = await once(host, "answer");
  console.log(`✓ host got answer`);

  // ICE relay
  host.send(JSON.stringify({ type: "ice-candidate", candidate: "candidate:1 1 UDP 2122260223 192.168.1.1 12345 typ host" }));
  const iceAtViewer = await once(viewer, "ice-candidate");
  console.log(`✓ viewer got ICE: ${iceAtViewer.candidate.slice(0, 40)}...`);

  // viewer leave → host deve receber peer-left
  viewer.send(JSON.stringify({ type: "leave" }));
  // fecha viewer
  viewer.close();
  const peerLeft = await once(host, "peer-left");
  console.log(`✓ host got peer-left count=${peerLeft.count}`);

  // sessão cheia / não encontrada
  const badViewer = new WebSocket(URL);
  await new Promise((res, rej) => { badViewer.on("open", res); badViewer.on("error", rej); });
  badViewer.send(JSON.stringify({ type: "join", sessionId: "ZZZZZZ" }));
  const err = await once(badViewer, "error");
  console.log(`✓ bad join error: ${err.message} (${err.code})`);
  badViewer.close();

  host.close();
  console.log("\n✅ All signaling tests passed");
}

test().catch((e) => {
  console.error("❌ Test failed:", e);
  process.exit(1);
});

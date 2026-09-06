package com.jackoblab.mobilecast

import android.util.Log
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class SignalingClient(
    private val serverUrl: String,
    private val onCreated: (String) -> Unit,
    private val onJoined: (String) -> Unit = {},
    private val onOffer: (String) -> Unit = {},
    private val onAnswer: (String) -> Unit = {},
    private val onIce: (String, String?, Int?) -> Unit = { _, _, _ -> },
    private val onPeerJoined: () -> Unit = {},
    private val onPeerLeft: () -> Unit = {},
    private val onError: (String) -> Unit = {},
) {
    private var ws: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .pingInterval(25, TimeUnit.SECONDS)
        .build()

    fun connect() {
        val req = Request.Builder().url(serverUrl).build()
        ws = client.newWebSocket(req, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.i("Signaling", "WS open $serverUrl -> creating session")
                webSocket.send(JSONObject().put("type", "create").toString())
            }
            override fun onMessage(webSocket: WebSocket, text: String) {
                handle(text)
            }
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e("Signaling", "WS failure", t)
                onError(t.message ?: "WS error")
            }
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.i("Signaling", "WS closed $code $reason")
            }
        })
    }

    private fun handle(raw: String) {
        try {
            val json = JSONObject(raw)
            when (json.optString("type")) {
                "created" -> onCreated(json.getString("sessionId"))
                "joined" -> onJoined(json.getString("sessionId"))
                "offer" -> onOffer(json.getString("sdp"))
                "answer" -> onAnswer(json.getString("sdp"))
                "ice-candidate" -> onIce(
                    json.getString("candidate"),
                    json.optString("sdpMid").takeIf { it.isNotEmpty() },
                    if (json.has("sdpMLineIndex") && !json.isNull("sdpMLineIndex")) json.optInt("sdpMLineIndex") else null
                )
                "peer-joined" -> {
                    Log.i("Signaling", "peer-joined")
                    onPeerJoined()
                }
                "peer-left" -> {
                    Log.i("Signaling", "peer-left")
                    onPeerLeft()
                }
                "error" -> onError(json.optString("message", "Erro"))
                "pong" -> {}
            }
        } catch (e: Exception) {
            Log.e("Signaling", "handle error $raw", e)
        }
    }

    fun sendOffer(sdp: String) {
        ws?.send(JSONObject().put("type", "offer").put("sdp", sdp).toString())
    }
    fun sendAnswer(sdp: String) {
        ws?.send(JSONObject().put("type", "answer").put("sdp", sdp).toString())
    }
    fun sendIce(candidate: String, sdpMid: String?, sdpMLineIndex: Int?) {
        val j = JSONObject().put("type", "ice-candidate").put("candidate", candidate)
        if (sdpMid != null) j.put("sdpMid", sdpMid)
        if (sdpMLineIndex != null) j.put("sdpMLineIndex", sdpMLineIndex)
        ws?.send(j.toString())
    }

    fun close() {
        try { ws?.close(1000, "bye") } catch (_: Exception) {}
        ws = null
        client.dispatcher.executorService.shutdown()
    }
}

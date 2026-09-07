package com.jackoblab.mobilecast

import android.content.Context
import android.media.projection.MediaProjection
import android.os.Build
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import org.webrtc.*
import java.util.concurrent.Executors

/**
 * Cliente WebRTC completo — Fase 1 (vídeo) + Fase 2 (áudio).
 *
 * Fluxo:
 * 1. initFactory() + EglBase
 * 2. create PeerConnection (STUN Google)
 * 3. cria VideoCapturer via ScreenCapturerAndroid + VideoSource → VideoTrack → addTrack
 * 4. (Fase 2) cria AudioTrack via AudioCapturer → addTrack
 * 5. conecta SignalingClient → cria sessão → espera viewer → cria offer
 * 6. troca SDP/ICE
 *
 * Chamado exclusivamente pelo CastService (ForegroundService que detém MediaProjection).
 */
class WebRtcClient(
    private val context: Context,
    private val mediaProjection: MediaProjection,
    private val serverUrl: String,
    private val preset: QualityPreset = QualityPreset.BALANCED,
    private val onSessionId: (String) -> Unit,
    private val onError: (String) -> Unit = {},
    private val onConnected: () -> Unit = {},
) {
    private var factory: PeerConnectionFactory? = null
    private var eglBase: EglBase? = null
    private var peerConnection: PeerConnection? = null
    private var videoCapturer: VideoCapturer? = null
    private var videoSource: VideoSource? = null
    private var videoTrack: VideoTrack? = null
    private var audioCapturer: AudioCapturer? = null
    private var audioTrack: AudioTrack? = null
    private var signaling: SignalingClient? = null
    private val executor = Executors.newSingleThreadExecutor()

    // ICE candidates que chegaram antes do remoteDescription
    private val pendingIce = mutableListOf<IceCandidate>()

    fun start() {
        executor.execute {
            try {
                initFactory()
                createPeerConnection()
                createVideoTrack()
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    createAudioTrack()
                }
                connectSignaling()
            } catch (e: Exception) {
                Log.e("WebRtcClient", "start failed", e)
                onError(e.message ?: "Falha ao iniciar WebRTC")
            }
        }
    }

    fun stop() {
        executor.execute {
            try { videoCapturer?.stopCapture() } catch (_: Exception) {}
            try { videoCapturer?.dispose() } catch (_: Exception) {}
            try { videoSource?.dispose() } catch (_: Exception) {}
            audioCapturer?.release()
            try { audioTrack?.dispose() } catch (_: Exception) {}
            try { peerConnection?.close() } catch (_: Exception) {}
            try { peerConnection?.dispose() } catch (_: Exception) {}
            try { factory?.dispose() } catch (_: Exception) {}
            try { eglBase?.release() } catch (_: Exception) {}
            signaling?.close()
            pendingIce.clear()
            Log.i("WebRtcClient", "stopped")
        }
        executor.shutdownNow()
    }

    private fun initFactory() {
        eglBase = EglBase.create()
        PeerConnectionFactory.initialize(
            PeerConnectionFactory.InitializationOptions.builder(context)
                .setEnableInternalTracer(true)
                .createInitializationOptions()
        )
        val encoderFactory = DefaultVideoEncoderFactory(eglBase!!.eglBaseContext, true, true)
        val decoderFactory = DefaultVideoDecoderFactory(eglBase!!.eglBaseContext)
        factory = PeerConnectionFactory.builder()
            .setVideoEncoderFactory(encoderFactory)
            .setVideoDecoderFactory(decoderFactory)
            .createPeerConnectionFactory()
        Log.i("WebRtcClient", "Factory initialized")
    }

    private fun createPeerConnection() {
        val iceServers = listOf(
            PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
            PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer(),
        )
        val rtcConfig = PeerConnection.RTCConfiguration(iceServers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
        }

        val observer = object : PeerConnection.Observer {
            override fun onSignalingChange(state: PeerConnection.SignalingState) {
                Log.i("WebRtcClient", "onSignalingChange $state")
            }
            override fun onIceConnectionChange(state: PeerConnection.IceConnectionState) {
                Log.i("WebRtcClient", "onIceConnectionChange $state")
                if (state == PeerConnection.IceConnectionState.CONNECTED ||
                    state == PeerConnection.IceConnectionState.COMPLETED) {
                    onConnected()
                }
            }
            override fun onIceConnectionReceivingChange(receiving: Boolean) {}
            override fun onIceGatheringChange(state: PeerConnection.IceGatheringState) {}
            override fun onIceCandidate(candidate: IceCandidate) {
                Log.i("WebRtcClient", "onIceCandidate ${candidate.sdp}")
                signaling?.sendIce(candidate.sdp, candidate.sdpMid, candidate.sdpMLineIndex)
            }
            override fun onIceCandidatesRemoved(candidates: Array<IceCandidate>) {}
            override fun onAddStream(stream: MediaStream) {}
            override fun onRemoveStream(stream: MediaStream) {}
            override fun onDataChannel(dc: DataChannel) {}
            override fun onRenegotiationNeeded() {}
            override fun onAddTrack(receiver: RtpReceiver, streams: Array<MediaStream>) {}
        }

        peerConnection = factory!!.createPeerConnection(rtcConfig, observer)
            ?: throw IllegalStateException("Failed to create PeerConnection")
        Log.i("WebRtcClient", "PeerConnection created")
    }

    private fun createVideoTrack() {
        val f = factory ?: throw IllegalStateException("Factory not ready")
        val egl = eglBase ?: throw IllegalStateException("EglBase not ready")

        videoSource = f.createVideoSource(false)
        // ScreenCapturerAndroid é o capturer oficial para MediaProjection
        videoCapturer = ScreenCapturerAndroid(mediaProjection, object : MediaProjection.Callback() {
            override fun onStop() {
                Log.i("WebRtcClient", "MediaProjection stopped by system")
                stop()
            }
        })

        // Inicializa capturer com contexto EGL
        videoCapturer!!.initialize(
            SurfaceTextureHelper.create("CaptureThread", egl.eglBaseContext),
            context,
            videoSource!!.capturerObserver
        )

        // Captura com preset Fase 6 — usa preset, mas limita ao tamanho da tela
        val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val metrics = DisplayMetrics()
        @Suppress("DEPRECATION")
        wm.defaultDisplay.getMetrics(metrics)
        val screenW = metrics.widthPixels
        val screenH = metrics.heightPixels
        // se preset for maior que tela, usa tela
        val width = minOf(preset.width, screenW)
        val height = minOf(preset.height, screenH)
        val fps = preset.fps

        try {
            videoCapturer!!.startCapture(width, height, fps)
            Log.i("WebRtcClient", "Video capture started ${width}x$height@$fps preset=${preset.name}")
        } catch (e: Exception) {
            Log.w("WebRtcClient", "startCapture failed, retry 720p@30", e)
            videoCapturer!!.startCapture(1280, 720, 30)
        }

        videoTrack = f.createVideoTrack("video0", videoSource)
        videoTrack!!.setEnabled(true)

        val sender = peerConnection!!.addTrack(videoTrack, listOf("stream0"))
        val params = sender.parameters
        if (params.encodings.isNotEmpty()) {
            params.encodings[0].maxBitrateBps = preset.bitrateBps
            sender.parameters = params
        }
        Log.i("WebRtcClient", "VideoTrack added")
    }

    private fun createAudioTrack() {
        try {
            val f = factory ?: return
            val capturer = AudioCapturer(mediaProjection, f) {
                Log.w("WebRtcClient", "Audio silence prolonged — app may block capture (ALLOW_CAPTURE_BY_NONE)")
            }
            val track = capturer.createTrack()
            if (track != null) {
                audioCapturer = capturer
                audioTrack = track
                peerConnection!!.addTrack(track, listOf("stream0"))
                Log.i("WebRtcClient", "AudioTrack added (MVP stub — v0.2 will use JavaAudioDeviceModule)")
            } else {
                Log.w("WebRtcClient", "AudioTrack unavailable — continuing video-only (expected for blocked apps or no active media)")
                capturer.release()
            }
        } catch (e: Exception) {
            Log.e("WebRtcClient", "Audio track failed", e)
        }
    }

    private fun connectSignaling() {
        signaling = SignalingClient(
            serverUrl = serverUrl,
            onCreated = { sessionId ->
                Log.i("WebRtcClient", "Session created $sessionId")
                onSessionId(sessionId)
                // Não cria offer ainda — espera peer-joined para evitar glare
            },
            onPeerJoined = {
                Log.i("WebRtcClient", "Peer joined — creating offer")
                createOffer()
            },
            onAnswer = { sdp ->
                Log.i("WebRtcClient", "Received answer")
                val desc = SessionDescription(SessionDescription.Type.ANSWER, sdp)
                peerConnection?.setRemoteDescription(object : SdpObserverAdapter() {
                    override fun onSetSuccess() {
                        Log.i("WebRtcClient", "setRemoteDescription answer success")
                        drainPendingIce()
                    }
                }, desc)
            },
            onIce = { candidate, sdpMid, sdpMLineIndex ->
                val ice = IceCandidate(sdpMid, sdpMLineIndex ?: 0, candidate)
                if (peerConnection?.remoteDescription == null) {
                    pendingIce.add(ice)
                } else {
                    peerConnection?.addIceCandidate(ice)
                }
            },
            onError = { msg ->
                Log.e("WebRtcClient", "Signaling error $msg")
                onError(msg)
            }
        )
        signaling!!.connect()
    }

    private fun createOffer() {
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "false"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "false"))
        }
        peerConnection?.createOffer(object : SdpObserverAdapter() {
            override fun onCreateSuccess(desc: SessionDescription) {
                Log.i("WebRtcClient", "Offer created")
                peerConnection?.setLocalDescription(object : SdpObserverAdapter() {
                    override fun onSetSuccess() {
                        Log.i("WebRtcClient", "setLocalDescription offer success")
                        signaling?.sendOffer(desc.description)
                    }
                }, desc)
            }
            override fun onCreateFailure(error: String) {
                Log.e("WebRtcClient", "createOffer failed $error")
                onError("Falha ao criar oferta: $error")
            }
        }, constraints)
    }

    private fun drainPendingIce() {
        for (ice in pendingIce) peerConnection?.addIceCandidate(ice)
        pendingIce.clear()
    }

    private open class SdpObserverAdapter : SdpObserver {
        override fun onCreateSuccess(desc: SessionDescription) {}
        override fun onSetSuccess() {}
        override fun onCreateFailure(error: String) { Log.e("WebRtcClient", "SDP create failed $error") }
        override fun onSetFailure(error: String) { Log.e("WebRtcClient", "SDP set failed $error") }
    }
}

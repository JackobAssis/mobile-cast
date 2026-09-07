package com.jackoblab.mobilecast

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioPlaybackCaptureConfiguration
import android.media.AudioRecord
import android.media.projection.MediaProjection
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import org.webrtc.AudioSource
import org.webrtc.AudioTrack
import org.webrtc.MediaConstraints
import org.webrtc.PeerConnectionFactory
import java.nio.ByteBuffer
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

/**
 * Captura áudio interno via AudioPlaybackCapture (API 29+) e alimenta um AudioTrack WebRTC.
 *
 * Estado atual (MVP v0.1):
 * - Usa AudioRecord com AudioPlaybackCaptureConfiguration (USAGE_MEDIA/GAME/UNKNOWN).
 * - Cria AudioSource/AudioTrack via PeerConnectionFactory; o PCM lido de AudioRecord
 *   mantém o pipeline vivo. Em devices com implementação completa de JavaAudioDeviceModule,
 *   o áudio é capturado; em outros, pode haver silêncio se o AudioSource não estiver
 *   bridgeado ao nativo — neste caso, retorna null e o caller segue em video-only.
 * - Próxima evolução (v0.2): substituir por JavaAudioDeviceModule com custom
 *   AudioRecordFactory que injeta o config de AudioPlaybackCapture diretamente no
 *   ADM nativo, garantindo 100% de entrega PCM ao WebRTC.
 *
 * Limitações documentadas em docs/technical-feasibility.md e docs/audio-capture.md:
 * - Requer Android 10+ (Q)
 * - App origem pode bloquear com ALLOW_CAPTURE_BY_NONE
 * - Retorna silêncio ou STATE_UNINITIALIZED se bloqueado — caller deve tratar como "indisponível"
 */
@RequiresApi(Build.VERSION_CODES.Q)
class AudioCapturer(
    private val mediaProjection: MediaProjection,
    private val factory: PeerConnectionFactory,
    private val onSilenceDetected: (() -> Unit)? = null
) {
    private var audioRecord: AudioRecord? = null
    private var audioSource: AudioSource? = null
    private var audioTrack: AudioTrack? = null
    private val executor = Executors.newSingleThreadExecutor()
    @Volatile private var running = false
    private val silentReads = AtomicInteger(0)
    private val totalReads = AtomicInteger(0)

    /**
     * Tenta criar AudioTrack. Retorna null se áudio indisponível/bloqueado.
     * Caller deve exibir "⚠ indisponível" e continuar só com vídeo.
     */
    fun createTrack(): AudioTrack? {
        try {
            val config = AudioPlaybackCaptureConfiguration.Builder(mediaProjection)
                .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                .addMatchingUsage(AudioAttributes.USAGE_GAME)
                .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
                .build()

            val format = AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(48000)
                .setChannelMask(AudioFormat.CHANNEL_IN_STEREO)
                .build()

            // Buffer mínimo * 2 para evitar underrun
            val minBuf = AudioRecord.getMinBufferSize(48000, AudioFormat.CHANNEL_IN_STEREO, AudioFormat.ENCODING_PCM_16BIT)
            val bufferSize = if (minBuf > 0) minBuf * 2 else 8192

            audioRecord = AudioRecord.Builder()
                .setAudioFormat(format)
                .setAudioPlaybackCaptureConfig(config)
                .setBufferSizeInBytes(bufferSize)
                .build()

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                Log.w("AudioCapturer", "AudioRecord not initialized — audio blocked or unsupported")
                audioRecord?.release()
                audioRecord = null
                return null
            }

            val constraints = MediaConstraints()
            audioSource = factory.createAudioSource(constraints)
            audioTrack = factory.createAudioTrack("audio0", audioSource)

            // Inicia gravação e thread de pump que também detecta silêncio prolongado
            // (indica app com ALLOW_CAPTURE_BY_NONE ou ausência de playback)
            audioRecord?.startRecording()
            if (audioRecord?.recordingState != AudioRecord.RECORDSTATE_RECORDING) {
                Log.w("AudioCapturer", "AudioRecord not recording — blocked or no active playback")
                audioRecord?.release()
                audioRecord = null
                try { audioSource?.dispose() } catch (_: Exception) {}
                return null
            }
            running = true
            executor.execute { pumpLoop(bufferSize) }

            Log.i("AudioCapturer", "AudioTrack created, recording started (buffer=$bufferSize) — MVP stub, v0.2 migrará para JavaAudioDeviceModule")
            return audioTrack

        } catch (e: Exception) {
            Log.e("AudioCapturer", "Failed to create audio track", e)
            release()
            return null
        }
    }

    private fun pumpLoop(bufferSize: Int) {
        val buf = ByteBuffer.allocateDirect(bufferSize)
        val tmp = ByteArray(bufferSize)
        while (running) {
            try {
                val read = audioRecord?.read(tmp, 0, tmp.size) ?: -1
                if (read > 0) {
                    totalReads.incrementAndGet()
                    // Detecção de silêncio: se buffer todo zerado por N leituras seguidas,
                    // provavelmente é bloqueio (ALLOW_CAPTURE_BY_NONE) ou ausência de playback.
                    var isSilent = true
                    for (i in 0 until minOf(read, 1024)) {
                        if (tmp[i] != 0.toByte()) { isSilent = false; break }
                    }
                    if (isSilent) {
                        if (silentReads.incrementAndGet() == 100) {
                            Log.w("AudioCapturer", "Prolonged silence detected (~3s) — audio may be blocked or no media playing")
                            try { onSilenceDetected?.invoke() } catch (_: Exception) {}
                        }
                    } else {
                        silentReads.set(0)
                    }
                    buf.clear()
                    buf.put(tmp, 0, read)
                } else if (read < 0) {
                    Log.w("AudioCapturer", "AudioRecord read error: $read")
                    Thread.sleep(100)
                } else {
                    // read == 0 → sem dados ainda
                    Thread.sleep(10)
                }
            } catch (e: Exception) {
                Log.e("AudioCapturer", "pump error", e)
                break
            }
        }
    }

    fun isAvailable(): Boolean = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q

    fun release() {
        running = false
        try { audioRecord?.stop() } catch (_: Exception) {}
        try { audioRecord?.release() } catch (_: Exception) {}
        audioRecord = null
        // audioSource/track são dispose no WebRtcClient.stop()
        executor.shutdownNow()
    }
}

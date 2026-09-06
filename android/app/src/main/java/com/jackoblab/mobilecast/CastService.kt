package com.jackoblab.mobilecast

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.IBinder
import android.app.Service
import androidx.core.app.NotificationCompat
import android.util.Log

class CastService : Service() {

    private var mediaProjection: MediaProjection? = null
    private var mediaProjectionCallback: MediaProjection.Callback? = null
    private var webRtcClient: WebRtcClient? = null
    private var currentSessionId: String? = null

    companion object {
        const val CHANNEL_ID = "mobile_cast_channel"
        const val NOTIF_ID = 1001
        const val ACTION_SESSION = "com.jackoblab.mobilecast.SESSION"
        const val EXTRA_SESSION_ID = "sessionId"
        const val EXTRA_SERVER_HTTP = "serverHttp"
    }

    override fun onCreate() {
        super.onCreate()
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Stop action
        if (intent?.action == "STOP") {
            stopSelf()
            return START_NOT_STICKY
        }

        val resultCode = intent?.getIntExtra("resultCode", -1) ?: -1
        val data = intent?.getParcelableExtra<Intent>("data")
        val serverWs = intent?.getStringExtra("serverUrl") ?: "ws://192.168.1.10:3000/ws"
        val serverHttp = intent?.getStringExtra("serverHttp") ?: serverWs
            .replace("wss://", "https://").replace("ws://", "http://").replace("/ws", "")
        val qualityName = intent?.getStringExtra("qualityPreset") ?: QualityPreset.BALANCED.name
        val preset = QualityPreset.fromName(qualityName)

        if (resultCode == -1 || data == null) {
            Log.e("CastService", "Missing resultCode/data")
            stopSelf()
            return START_NOT_STICKY
        }

        val projectionManager = getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        mediaProjection = projectionManager.getMediaProjection(resultCode, data)

        mediaProjectionCallback = object : MediaProjection.Callback() {
            override fun onStop() {
                Log.i("CastService", "MediaProjection stopped")
                stopSelf()
            }
        }
        mediaProjection?.registerCallback(mediaProjectionCallback!!, null)

        startForeground(NOTIF_ID, buildNotification("Iniciando transmissão..."))

        // Inicia WebRTC com preset Fase 6
        webRtcClient = WebRtcClient(
            context = this,
            mediaProjection = mediaProjection!!,
            serverUrl = serverWs,
            preset = preset,
            onSessionId = { sessionId ->
                currentSessionId = sessionId
                // Atualiza notificação
                val nm = getSystemService(NotificationManager::class.java)
                nm.notify(NOTIF_ID, buildNotification("Código: $sessionId"))
                // Broadcast para MainActivity
                sendBroadcast(Intent(ACTION_SESSION).apply {
                    `package` = packageName
                    putExtra(EXTRA_SESSION_ID, sessionId)
                    putExtra(EXTRA_SERVER_HTTP, serverHttp)
                })
                Log.i("CastService", "Broadcast session $sessionId")
            },
            onError = { msg ->
                Log.e("CastService", "WebRTC error $msg")
                sendBroadcast(Intent(ACTION_SESSION).apply {
                    `package` = packageName
                    putExtra("error", msg)
                })
            },
            onConnected = {
                val nm = getSystemService(NotificationManager::class.java)
                nm.notify(NOTIF_ID, buildNotification("● Conectado — ${currentSessionId ?: ""}"))
            }
        )
        webRtcClient?.start()

        Log.i("CastService", "Started, ws=$serverWs http=$serverHttp preset=$preset")
        return START_STICKY
    }

    override fun onDestroy() {
        webRtcClient?.stop()
        webRtcClient = null
        try { mediaProjectionCallback?.let { mediaProjection?.unregisterCallback(it) } } catch (_: Exception) {}
        try { mediaProjection?.stop() } catch (_: Exception) {}
        mediaProjection = null
        // Notifica UI que parou
        sendBroadcast(Intent(ACTION_SESSION).apply {
            `package` = packageName
            putExtra("stopped", true)
        })
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "Mobile Cast", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Transmissão de tela ativa"
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun buildNotification(text: String): Notification {
        val openIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val stopIntent = PendingIntent.getService(
            this, 1, Intent(this, CastService::class.java).apply { action = "STOP" },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Mobile Cast — Transmitindo")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setOngoing(true)
            .setContentIntent(openIntent)
            .addAction(android.R.drawable.ic_media_pause, "Parar", stopIntent)
            .build()
    }
}

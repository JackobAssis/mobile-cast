package com.jackoblab.mobilecast

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.jackoblab.mobilecast.databinding.ActivityMainBinding
import android.graphics.Bitmap
import android.widget.ArrayAdapter

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var projectionManager: MediaProjectionManager
    private lateinit var prefs: SharedPreferences

    private var currentSessionId: String? = null
    private var currentServerHttp: String? = null

    private val captureLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            startCastService(result.resultCode, result.data!!)
        } else {
            Toast.makeText(this, "Captura negada", Toast.LENGTH_SHORT).show()
        }
    }

    private val notifPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) launchCapture() else Toast.makeText(this, "Permissão de notificação necessária para transmissão", Toast.LENGTH_LONG).show()
    }

    private val sessionReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when {
                intent?.hasExtra("error") == true -> {
                    Toast.makeText(this@MainActivity, intent.getStringExtra("error"), Toast.LENGTH_LONG).show()
                }
                intent?.getBooleanExtra("stopped", false) == true -> updateUiIdle()
                intent?.hasExtra(CastService.EXTRA_SESSION_ID) == true -> {
                    val sid = intent.getStringExtra(CastService.EXTRA_SESSION_ID)!!
                    val http = intent.getStringExtra(CastService.EXTRA_SERVER_HTTP) ?: prefs.getString("server_http", "http://192.168.1.10:3000")!!
                    currentSessionId = sid
                    currentServerHttp = http
                    showSession(sid, http)
                    binding.tvStatus.text = getString(R.string.transmitting) + " • $sid"
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = getSharedPreferences("mobile_cast", MODE_PRIVATE)
        projectionManager = getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager

        // Áudio check
        binding.tvAudio.text = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getString(R.string.audio_available)
        } else {
            getString(R.string.audio_unavailable) + " (requer Android 10+)"
        }

        // Qualidade presets — Fase 6
        val presets = QualityPreset.values()
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, presets.map { it.label })
        binding.spQuality.adapter = adapter
        val savedPreset = prefs.getString("quality_preset", QualityPreset.BALANCED.name)!!
        binding.spQuality.setSelection(presets.indexOfFirst { it.name == savedPreset }.coerceAtLeast(0))
        binding.spQuality.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: android.widget.AdapterView<*>?, v: View?, pos: Int, id: Long) {
                prefs.edit().putString("quality_preset", presets[pos].name).apply()
            }
            override fun onNothingSelected(p: android.widget.AdapterView<*>?) {}
        }

        // Server URL prefs
        val defaultWs = prefs.getString("server_ws", "ws://192.168.1.10:3000/ws")!!
        val defaultHttp = prefs.getString("server_http", "http://192.168.1.10:3000")!!
        binding.tvServerUrl.text = defaultHttp
        // Long press para editar (simples dialog)
        binding.tvServerUrl.setOnLongClickListener {
            showServerDialog()
            true
        }

        binding.btnTransmit.setOnClickListener {
            if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                notifPermissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
            } else {
                launchCapture()
            }
        }

        binding.btnStop.setOnClickListener {
            stopService(Intent(this, CastService::class.java))
            updateUiIdle()
        }

        // QR click → compartilhar
        binding.ivQr.setOnClickListener {
            currentSessionId?.let { sid ->
                val url = "${currentServerHttp ?: defaultHttp}/r/$sid"
                val send = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, url)
                }
                startActivity(Intent.createChooser(send, "Compartilhar sessão"))
            }
        }
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter(CastService.ACTION_SESSION)
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(sessionReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(sessionReceiver, filter)
        }
    }

    override fun onPause() {
        super.onPause()
        try { unregisterReceiver(sessionReceiver) } catch (_: Exception) {}
    }

    private fun launchCapture() {
        val intent = projectionManager.createScreenCaptureIntent()
        captureLauncher.launch(intent)
    }

    private fun startCastService(resultCode: Int, data: Intent) {
        val ws = prefs.getString("server_ws", "ws://192.168.1.10:3000/ws")!!
        val http = prefs.getString("server_http", "http://192.168.1.10:3000")!!
        val quality = prefs.getString("quality_preset", QualityPreset.BALANCED.name)!!
        val intent = Intent(this, CastService::class.java).apply {
            putExtra("resultCode", resultCode)
            putExtra("data", data)
            putExtra("serverUrl", ws)
            putExtra("serverHttp", http)
            putExtra("qualityPreset", quality)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(intent) else startService(intent)
        binding.btnTransmit.visibility = View.GONE
        binding.btnStop.visibility = View.VISIBLE
        binding.tvStatus.text = "● Iniciando..."
    }

    private fun updateUiIdle() {
        binding.btnTransmit.visibility = View.VISIBLE
        binding.btnStop.visibility = View.GONE
        binding.tvStatus.text = getString(R.string.idle)
        binding.tvSession.text = "Código: —"
        binding.ivQr.visibility = View.GONE
        currentSessionId = null
    }

    private fun showSession(sessionId: String, serverHttpUrl: String) {
        binding.tvSession.text = "Código: $sessionId"
        val qrText = "$serverHttpUrl/r/$sessionId"
        binding.ivQr.setImageBitmap(generateQr(qrText))
        binding.ivQr.visibility = View.VISIBLE
        binding.tvServerUrl.text = qrText
        binding.tvStatus.text = getString(R.string.transmitting)
        binding.btnTransmit.visibility = View.GONE
        binding.btnStop.visibility = View.VISIBLE
    }

    private fun showServerDialog() {
        val input = android.widget.EditText(this).apply {
            setText(prefs.getString("server_http", "http://192.168.1.10:3000"))
            hint = "http://192.168.1.X:3000"
        }
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Servidor (HTTP)")
            .setMessage("Digite o IP do PC na mesma rede. WS será derivado automaticamente.")
            .setView(input)
            .setPositiveButton("Salvar") { _, _ ->
                val http = input.text.toString().trim().trimEnd('/')
                val ws = http.replace("https://", "wss://").replace("http://", "ws://") + "/ws"
                prefs.edit().putString("server_http", http).putString("server_ws", ws).apply()
                binding.tvServerUrl.text = http
                Toast.makeText(this, "Salvo: $ws", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun generateQr(text: String, size: Int = 512): Bitmap {
        val writer = QRCodeWriter()
        val matrix = writer.encode(text, BarcodeFormat.QR_CODE, size, size)
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
        for (x in 0 until size) for (y in 0 until size) {
            bmp.setPixel(x, y, if (matrix.get(x, y)) 0xFF000000.toInt() else 0xFFFFFFFF.toInt())
        }
        return bmp
    }
}

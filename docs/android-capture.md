# Captura de Tela — Android (MediaProjection)

> API oficial `android.media.projection` — sem root, sem hack.

## Fluxo

1. `MediaProjectionManager.createScreenCaptureIntent()` → dialog sistema
2. `onActivityResult(resultCode, data)` → passa para `CastService`
3. `CastService`: `getMediaProjection(resultCode, data)` → `registerCallback` → `startForeground(mediaProjection)`
4. `WebRtcClient`: `ScreenCapturerAndroid(mediaProjection, callback)` → `initialize()` com `EglBase` → `startCapture(width,height,fps)` via preset `QualityPreset`

## Requisitos

- `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PROJECTION` no `AndroidManifest.xml:4`
- Android 10+ exige `ForegroundService` com `foregroundServiceType="mediaProjection"`
- Android 14+ (`targetSdk 34`) crasha sem `startForeground` + notificação `ongoing`

## Limitações (não esconder)

- `FLAG_SECURE` (bancos, Netflix DRM) → `VirtualDisplay` renderiza preto — esperado
- Bloqueio de tela / troca de app não para captura — `VirtualDisplay` continua
- Fabricantes custom ROM (Xiaomi/MIUI) podem pedir permissão extra de "sobrepor"
- `onStop()` do `MediaProjection.Callback` deve `stopSelf()` imediatamente

## Referência

https://developer.android.com/media/grow/media-projection

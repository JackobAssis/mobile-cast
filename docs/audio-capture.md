# Captura de Áudio — Android (AudioPlaybackCapture)

> API `AudioPlaybackCaptureConfiguration` — Android 10+ (API 29), sem `RECORD_AUDIO`.

## Fluxo

```kotlin
val config = AudioPlaybackCaptureConfiguration.Builder(mediaProjection)
  .addMatchingUsage(USAGE_MEDIA).addMatchingUsage(USAGE_GAME).build()
val record = AudioRecord.Builder()
  .setAudioFormat(AudioFormat.Builder().setEncoding(PCM_16BIT).setSampleRate(48000).setChannelMask(STEREO).build())
  .setAudioPlaybackCaptureConfig(config).build()
```

`AudioCapturer.kt:1` cria `AudioTrack` WebRTC a partir do `AudioRecord` e mantém thread `pumpLoop`.

## Compatibilidade

| Android | Suporte | Nota |
|---------|---------|------|
| 8-9 | ❌ | Sem API, vídeo apenas |
| 10+ | ✅ | Maioria dos jogos `USAGE_GAME` capturável |

## Bloqueios (origem decide)

- `ALLOW_CAPTURE_BY_ALL` → capturável (maioria dos jogos Unity/Unreal)
- `ALLOW_CAPTURE_BY_SYSTEM` / `NONE` → silêncio ou `STATE_UNINITIALIZED` (ex: Spotify, players DRM)

UI deve mostrar `⚠ indisponível neste app/dispositivo` e continuar só vídeo — `WebRtcClient.kt:189` já faz fallback.

## Referência

https://developer.android.com/media/guides/audio-playback-capture

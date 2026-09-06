package com.jackoblab.mobilecast

/**
 * Presets de qualidade — Fase 6
 * Cada preset define resolução alvo, FPS e bitrate máximo.
 * UI no MainActivity permite escolher antes de transmitir.
 */
enum class QualityPreset(
    val label: String,
    val width: Int,
    val height: Int,
    val fps: Int,
    val bitrateBps: Int
) {
    ECONOMY("Economia — 720p@30", 1280, 720, 30, 1_500_000),
    BALANCED("Equilibrado — 1080p@30", 1920, 1080, 30, 2_500_000),
    QUALITY("Qualidade — 1080p@60", 1920, 1080, 60, 4_000_000),
    GAMING("Gaming — 1080p@60 (baixa latência)", 1920, 1080, 60, 4_500_000);

    companion object {
        fun fromName(name: String): QualityPreset =
            values().find { it.name == name } ?: BALANCED
    }
}

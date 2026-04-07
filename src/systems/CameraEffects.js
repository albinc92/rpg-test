/**
 * CameraEffects.js
 * Overworld camera effects — idle sway (breathing) and script-triggered shake.
 * 
 * Outputs offset values that get added to the final camera position in RenderSystem.
 * Inspired by BattleCamera's idle drift and shake systems but tuned for exploration.
 */

class CameraEffects {
    constructor() {
        // --- Output values (read by RenderSystem) ---
        this.swayX = 0;
        this.swayY = 0;
        this.shakeX = 0;
        this.shakeY = 0;

        // --- Idle sway (handheld camera drift) ---
        // BattleCamera uses amplitudeX=4, amplitudeY=2 at zoom 1.6x, giving ~6.4/3.2 screen-px.
        // At overworld zoom 1.0x we need larger world-space values for the same visible effect.
        this.sway = {
            enabled: true,
            time: 0,
            amplitudeX: 6,         // World-space pixels of lateral sway
            amplitudeY: 3,         // World-space pixels of vertical sway
            frequencyX: 0.25,      // Hz (same as BattleCamera)
            frequencyY: 0.4,       // Hz (same as BattleCamera)
        };

        // --- Screen shake ---
        this.shake = {
            intensity: 0,          // Current shake strength (pixels)
            decay: 6.0,            // How fast shake fades (per second, exponential)
            timer: 0,              // Continuous timer for noise
            frequencyHz: 30,       // Shake oscillation speed
            maxIntensity: 0,       // Peak intensity of current shake (for reference)
        };

        // --- Enabled flag (disabled during battles, menus, etc.) ---
        this.enabled = true;
    }

    // ─── Public API ─────────────────────────────────────────────────────────

    /**
     * Trigger a camera shake effect.
     * @param {number} intensity - Shake strength in pixels (e.g. 3 = subtle, 8 = medium, 15 = strong, 25 = earthquake)
     * @param {number} [duration] - Optional duration in seconds. If provided, decay is calculated to reach ~0 by that time.
     *                              If omitted, uses default exponential decay.
     */
    triggerShake(intensity = 8, duration = null) {
        this.shake.intensity = Math.max(this.shake.intensity, intensity);
        this.shake.maxIntensity = this.shake.intensity;
        
        if (duration && duration > 0) {
            // Calculate decay rate so intensity drops to ~1% over the given duration
            // e^(-decay * duration) = 0.01  →  decay = -ln(0.01) / duration ≈ 4.6 / duration
            this.shake.decay = 4.6 / duration;
        } else {
            this.shake.decay = 6.0; // Default: fades in roughly ~0.75s
        }
    }

    /**
     * Stop all shake immediately
     */
    stopShake() {
        this.shake.intensity = 0;
        this.shakeX = 0;
        this.shakeY = 0;
    }

    /**
     * Configure sway parameters
     * @param {object} config - { enabled, amplitudeX, amplitudeY, frequencyX, frequencyY }
     */
    configureSway(config = {}) {
        if (config.enabled !== undefined) this.sway.enabled = config.enabled;
        if (config.amplitudeX !== undefined) this.sway.amplitudeX = config.amplitudeX;
        if (config.amplitudeY !== undefined) this.sway.amplitudeY = config.amplitudeY;
        if (config.frequencyX !== undefined) this.sway.frequencyX = config.frequencyX;
        if (config.frequencyY !== undefined) this.sway.frequencyY = config.frequencyY;
    }

    // ─── Update (called every frame) ────────────────────────────────────────

    update(deltaTime) {
        if (!this.enabled) {
            this.swayX = 0;
            this.swayY = 0;
            this.shakeX = 0;
            this.shakeY = 0;
            return;
        }

        this._updateSway(deltaTime);
        this._updateShake(deltaTime);
    }

    // ─── Internals ──────────────────────────────────────────────────────────

    _updateSway(deltaTime) {
        if (!this.sway.enabled) {
            this.swayX = 0;
            this.swayY = 0;
            return;
        }

        this.sway.time += deltaTime;
        const t = this.sway.time;

        // Lissajous-style drift using sin waves at different frequencies
        // Add a secondary harmonic for more organic feel
        this.swayX = this.sway.amplitudeX * Math.sin(2 * Math.PI * this.sway.frequencyX * t)
                    + this.sway.amplitudeX * 0.3 * Math.sin(2 * Math.PI * this.sway.frequencyX * 1.7 * t);
        
        this.swayY = this.sway.amplitudeY * Math.sin(2 * Math.PI * this.sway.frequencyY * t)
                    + this.sway.amplitudeY * 0.3 * Math.cos(2 * Math.PI * this.sway.frequencyY * 1.3 * t);
    }

    _updateShake(deltaTime) {
        if (this.shake.intensity <= 0.1) {
            this.shake.intensity = 0;
            this.shakeX = 0;
            this.shakeY = 0;
            return;
        }

        // Advance timer
        this.shake.timer += deltaTime;
        const t = this.shake.timer;
        const freq = this.shake.frequencyHz;

        // Multi-frequency noise-like shake (same approach as BattleCamera)
        this.shakeX = this.shake.intensity * (
            Math.sin(2 * Math.PI * freq * t) * 0.6 +
            Math.sin(2 * Math.PI * freq * 1.7 * t + 1.3) * 0.3 +
            Math.cos(2 * Math.PI * freq * 2.3 * t + 0.7) * 0.1
        );
        this.shakeY = this.shake.intensity * (
            Math.cos(2 * Math.PI * freq * t + 0.5) * 0.6 +
            Math.cos(2 * Math.PI * freq * 1.3 * t + 2.1) * 0.3 +
            Math.sin(2 * Math.PI * freq * 2.7 * t + 1.8) * 0.1
        );

        // Exponential decay
        this.shake.intensity *= Math.exp(-this.shake.decay * deltaTime);
    }

    // ─── Debug ──────────────────────────────────────────────────────────────

    /**
     * Get debug info for the F1 overlay
     */
    getDebugInfo() {
        return {
            swayEnabled: this.sway.enabled,
            swayX: this.swayX.toFixed(2),
            swayY: this.swayY.toFixed(2),
            shakeIntensity: this.shake.intensity.toFixed(2),
            shakeX: this.shakeX.toFixed(2),
            shakeY: this.shakeY.toFixed(2),
        };
    }
}

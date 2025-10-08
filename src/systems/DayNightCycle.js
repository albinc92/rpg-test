/**
 * DayNightCycle - Manages day/night lighting cycle with shader-based rendering
 * 
 * Features:
 * - 24-hour cycle with smooth transitions
 * - WebGL shader for realistic lighting (desaturation, brightness, color temperature)
 * - Per-map enable/disable (for indoor/cave maps)
 * - Adjustable timescale for debugging
 * - Different lighting phases (dawn, day, dusk, night)
 * - Automatic fallback to 2D overlay if WebGL unavailable
 */
class DayNightCycle {
    constructor(canvas) {
        // Time of day (0-24 hours, where 0 = midnight, 12 = noon)
        this.timeOfDay = 12; // Start at noon
        
        // Time progression speed (1.0 = real-time, higher = faster)
        // Default: 1 game hour = 2 real minutes (30x speed)
        this.timeScale = 30.0;
        
        // Enable/disable cycle progression
        this.enabled = true;
        
        // Initialize shader for realistic lighting (will fallback if WebGL unavailable)
        this.shader = canvas ? new DayNightShader(canvas) : null;
        this.useShader = this.shader && this.shader.initialized;
        
        if (this.useShader) {
            console.log('🌓 Day/Night cycle using WebGL shader for realistic lighting');
        } else {
            console.log('🌓 Day/Night cycle using 2D overlay (WebGL unavailable)');
        }
        
        // Lighting phases with colors (RGBA)
        this.phases = {
            night: {
                start: 0,
                end: 5,
                color: { r: 20, g: 20, b: 60, a: 0.6 }  // Dark blue overlay
            },
            dawn: {
                start: 5,
                end: 8,
                color: { r: 255, g: 150, b: 80, a: 0.3 } // Orange/pink (3 hours)
            },
            day: {
                start: 8,
                end: 17,
                color: { r: 255, g: 255, b: 255, a: 0 }  // No overlay (bright)
            },
            dusk: {
                start: 17,
                end: 20,
                color: { r: 255, g: 100, b: 50, a: 0.3 }  // Orange/red (3 hours)
            },
            night2: {
                start: 20,
                end: 24,
                color: { r: 20, g: 20, b: 60, a: 0.6 }   // Dark blue overlay - SAME AS NIGHT
            }
        };
        
        console.log('[DayNightCycle] Initialized');
    }
    
    /**
     * Update time progression
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        if (!this.enabled) return;
        
        // Progress time (deltaTime is in seconds, convert to hours)
        // 1 game hour = 3600 game seconds
        // At timeScale 30: 1 real second = 30 game seconds = 1/120 game hour
        const hoursPerSecond = this.timeScale / 3600;
        this.timeOfDay += hoursPerSecond * deltaTime;
        
        // Wrap around 24 hours
        if (this.timeOfDay >= 24) {
            this.timeOfDay -= 24;
        }
    }
    
    /**
     * Get current lighting color based on time of day
     * @returns {Object} RGBA color object
     */
    getCurrentLighting() {
        const time = this.timeOfDay;
        
        // Find which phase we're in
        for (const [phaseName, phase] of Object.entries(this.phases)) {
            if (time >= phase.start && time < phase.end) {
                // Check if we need to interpolate with next phase
                const nextPhase = this.getNextPhase(phaseName);
                if (nextPhase) {
                    // Calculate interpolation factor (0 = start of phase, 1 = end of phase)
                    const phaseProgress = (time - phase.start) / (phase.end - phase.start);
                    
                    // Smooth interpolation using smoothstep
                    const t = this.smoothstep(phaseProgress);
                    
                    // Interpolate between current and next phase colors
                    return this.interpolateColors(phase.color, nextPhase.color, t);
                }
                
                return phase.color;
            }
        }
        
        // Fallback to night if something goes wrong
        return this.phases.night.color;
    }
    
    /**
     * Get the next phase after the given phase
     */
    getNextPhase(currentPhaseName) {
        const phaseOrder = ['night', 'dawn', 'day', 'dusk', 'nightfall'];
        const currentIndex = phaseOrder.indexOf(currentPhaseName);
        
        if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
            return this.phases.night; // Wrap to night
        }
        
        return this.phases[phaseOrder[currentIndex + 1]];
    }
    
    /**
     * Interpolate between two colors
     */
    interpolateColors(color1, color2, t) {
        return {
            r: Math.round(color1.r + (color2.r - color1.r) * t),
            g: Math.round(color1.g + (color2.g - color1.g) * t),
            b: Math.round(color1.b + (color2.b - color1.b) * t),
            a: color1.a + (color2.a - color1.a) * t
        };
    }
    
    /**
     * Smoothstep function for smooth interpolation
     */
    smoothstep(t) {
        return t * t * (3 - 2 * t);
    }
    
    /**
     * Render day/night overlay on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {Object} weatherState - Optional weather state for cloud darkening
     */
    render(ctx, width, height, weatherState = null) {
        // Use Canvas 2D filters for GPU-accelerated lighting
        // This applies effects without touching pixels or coordinates
        if (this.useShader && this.shader) {
            this.shader.updateFromTimeOfDay(this.timeOfDay);
            this.renderWithFilters(ctx, width, height, weatherState);
        } else {
            // Fallback: Use simple 2D overlay
            this.renderOverlay(ctx, width, height);
        }
    }
    
    /**
     * Render using layered approach: darkening + blue tint
     * Smooth continuous transitions across all time periods
     */
    renderWithFilters(ctx, width, height, weatherState = null) {
        this.shader.updateFromTimeOfDay(this.timeOfDay);
        
        const time = this.timeOfDay;
        
        // Calculate weather darkening factor
        let weatherDarkening = 0;
        if (weatherState) {
            if (weatherState.precipitation === 'rain-light' || weatherState.precipitation === 'snow-light') {
                weatherDarkening = 0.15;
            } else if (weatherState.precipitation === 'rain-medium' || weatherState.precipitation === 'snow-medium') {
                weatherDarkening = 0.3;
            } else if (weatherState.precipitation === 'rain-heavy' || weatherState.precipitation === 'snow-heavy') {
                weatherDarkening = 0.5;
            }
        }
        
        // Calculate lighting values with smooth interpolation
        let darknessR, darknessG, darknessB;
        let tintR, tintG, tintB, tintAlpha;
        
        // Night (0-5): Dark with subtle blue tint (reduced intensity)
        if (time >= 0 && time < 5) {
            const t = time / 5;
            darknessR = 120;  // Was 60, now much lighter
            darknessG = 130;  // Was 70, now much lighter
            darknessB = 160;  // Was 100, now lighter
            tintR = 50;       // Was 0, now slightly warm
            tintG = 80;       // Was 50, lighter
            tintB = 150;      // Keep blue tint
            tintAlpha = 0.2 - t * 0.03;  // Was 0.4, now much subtler
        }
        // Dawn (5-8): Gentle transition from night to day with warm colors (3 hours like dusk)
        else if (time >= 5 && time < 8) {
            const t = (time - 5) / 3;
            // Smooth transition from night darkness (120/130/160) to day brightness (255/255/255)
            darknessR = Math.floor(120 + t * 135);  // 120 -> 255
            darknessG = Math.floor(130 + t * 125);  // 130 -> 255
            darknessB = Math.floor(160 + t * 95);   // 160 -> 255
            // Smooth transition from blue to warm orange/pink
            tintR = Math.floor(50 + t * 205);       // 50 -> 255 (warm dawn)
            tintG = Math.floor(80 + t * 100);       // 80 -> 180
            tintB = Math.floor(150 - t * 30);       // 150 -> 120 (keep some blue)
            tintAlpha = 0.17 - t * 0.12;            // 0.17 -> 0.05 (fade out gently)
        }
        // Day (8-17): Full brightness, but apply weather darkening if raining/snowing
        else if (time >= 8 && time < 17) {
            if (weatherDarkening > 0) {
                // Apply cloud darkening during daytime
                darknessR = Math.floor(255 - weatherDarkening * 120);  // Darken based on weather
                darknessG = Math.floor(255 - weatherDarkening * 120);
                darknessB = Math.floor(255 - weatherDarkening * 100);  // Slightly less blue reduction
                tintR = 180;
                tintG = 190;
                tintB = 200;  // Slight cool/gray tint for clouds
                tintAlpha = weatherDarkening * 0.3;  // Subtle cloud color
            } else {
                return; // No overlay during clear daylight
            }
        }
        // Dusk (17-20): Transition from day to complete darkness by 8 PM
        else if (time >= 17 && time < 20) {
            const t = (time - 17) / 3; // 0 (5 PM) to 1 (8 PM)
            // Smooth darkening from bright day to complete night
            darknessR = Math.floor(255 - t * 135);  // 255 -> 120
            darknessG = Math.floor(255 - t * 125);  // 255 -> 130
            darknessB = Math.floor(255 - t * 95);   // 255 -> 160
            // Transition from warm sunset to cool night
            tintR = Math.floor(255 - t * 205);      // 255 -> 50
            tintG = Math.floor(180 - t * 100);      // 180 -> 80
            tintB = Math.floor(120 + t * 30);       // 120 -> 150
            tintAlpha = 0.05 + t * 0.15;            // 0.05 -> 0.2
        }
        // Night (20-24): Complete darkness - NO MORE TRANSITIONS
        else if (time >= 20) {
            // DARKEST settings - stays constant from 8 PM onwards
            darknessR = 120;
            darknessG = 130;
            darknessB = 160;
            tintR = 50;
            tintG = 80;
            tintB = 150;
            tintAlpha = 0.2;
        }
        
        // Additional weather darkening (applied on top of time-of-day)
        if (weatherDarkening > 0 && time >= 7 && time < 17) {
            // During day, weather provides the main darkening
        } else if (weatherDarkening > 0) {
            // During non-day hours, darken even more with weather
            const extraDark = Math.floor(weatherDarkening * 50);
            darknessR = Math.max(40, darknessR - extraDark);
            darknessG = Math.max(40, darknessG - extraDark);
            darknessB = Math.max(40, darknessB - extraDark);
        }
        
        // Apply darkening layer (multiply blend)
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgb(${darknessR}, ${darknessG}, ${darknessB})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        
        // Apply color tint layer (screen blend for glow effect)
        if (tintAlpha > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = `rgba(${tintR}, ${tintG}, ${tintB}, ${tintAlpha})`;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }
    }
    
    /**
     * Fallback render using 2D overlay (when shader unavailable)
     */
    renderOverlay(ctx, width, height) {
        const lighting = this.getCurrentLighting();
        
        // Only render if there's an overlay (alpha > 0)
        if (lighting.a > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(${lighting.r}, ${lighting.g}, ${lighting.b}, ${lighting.a})`;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }
    }
    
    /**
     * Resize handler (call when canvas size changes)
     */
    resize(width, height) {
        if (this.shader) {
            this.shader.resize(width, height);
        }
    }
    
    /**
     * Get shader debug info
     */
    getShaderInfo() {
        if (this.shader && this.useShader) {
            return this.shader.getDebugInfo();
        }
        return { mode: '2D overlay' };
    }
    
    /**
     * Set time of day (0-24)
     */
    setTime(hours) {
        this.timeOfDay = Math.max(0, Math.min(24, hours));
    }
    
    /**
     * Set time scale (speed multiplier)
     */
    setTimeScale(scale) {
        this.timeScale = Math.max(0, scale);
    }
    
    /**
     * Get formatted time string (HH:MM)
     */
    getTimeString() {
        const hours = Math.floor(this.timeOfDay);
        const minutes = Math.floor((this.timeOfDay % 1) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    /**
     * Get current phase name
     */
    getCurrentPhase() {
        const time = this.timeOfDay;
        
        for (const [phaseName, phase] of Object.entries(this.phases)) {
            if (time >= phase.start && time < phase.end) {
                // Return "night" for both night periods (0-5 and 20-24)
                return phaseName === 'night2' ? 'night' : phaseName;
            }
        }
        
        return 'night';
    }
    
    /**
     * Toggle cycle on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        console.log(`[DayNightCycle] ${this.enabled ? 'Enabled' : 'Disabled'}`);
        return this.enabled;
    }
}

// Export
window.DayNightCycle = DayNightCycle;

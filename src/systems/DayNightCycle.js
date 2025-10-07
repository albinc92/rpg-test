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
                end: 7,
                color: { r: 255, g: 150, b: 80, a: 0.3 } // Orange/pink
            },
            day: {
                start: 7,
                end: 17,
                color: { r: 255, g: 255, b: 255, a: 0 }  // No overlay (bright)
            },
            dusk: {
                start: 17,
                end: 19,
                color: { r: 255, g: 100, b: 50, a: 0.3 }  // Orange/red
            },
            nightfall: {
                start: 19,
                end: 24,
                color: { r: 20, g: 20, b: 60, a: 0.6 }   // Dark blue overlay
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
        
        // Night (0-5): Dark with strong blue tint
        if (time >= 0 && time < 5) {
            const t = time / 5;
            darknessR = 60;
            darknessG = 70;
            darknessB = 100;
            tintR = 0;
            tintG = 50;
            tintB = 150;
            tintAlpha = 0.4 - t * 0.05;
        }
        // Dawn (5-7): Transition from blue to warm orange/pink
        else if (time >= 5 && time < 7) {
            const t = (time - 5) / 2;
            // Smooth transition from night darkness to day brightness
            darknessR = Math.floor(60 + t * 140);   // 60 -> 200
            darknessG = Math.floor(70 + t * 130);   // 70 -> 200
            darknessB = Math.floor(100 + t * 100);  // 100 -> 200
            // Smooth transition from blue to orange
            tintR = Math.floor(0 + t * 200);        // 0 -> 200
            tintG = Math.floor(50 + t * 80);        // 50 -> 130
            tintB = Math.floor(150 - t * 120);      // 150 -> 30
            tintAlpha = 0.35 - t * 0.25;            // 0.35 -> 0.1
        }
        // Day (7-17): Full brightness, but apply weather darkening if raining/snowing
        else if (time >= 7 && time < 17) {
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
        // Dusk (17-19): Warm orange/red glow with slight darkening
        else if (time >= 17 && time < 19) {
            const t = (time - 17) / 2;
            // Slight darkening begins
            darknessR = Math.floor(255 - t * 35);   // 255 -> 220
            darknessG = Math.floor(255 - t * 55);   // 255 -> 200
            darknessB = Math.floor(255 - t * 95);   // 255 -> 160
            // Warm sunset colors
            tintR = 200;
            tintG = Math.floor(100 - t * 20);       // 100 -> 80
            tintB = Math.floor(30 - t * 10);        // 30 -> 20
            tintAlpha = 0.1 + t * 0.2;              // 0.1 -> 0.3
        }
        // Nightfall (19-24): Transition from warm to cool blue with darkening
        else if (time >= 19) {
            const t = (time - 19) / 5;
            // Progressive darkening to night
            darknessR = Math.floor(220 - t * 160);  // 220 -> 60
            darknessG = Math.floor(200 - t * 130);  // 200 -> 70
            darknessB = Math.floor(160 - t * 60);   // 160 -> 100
            // Transition from warm to cool blue
            tintR = Math.floor(200 - t * 200);      // 200 -> 0
            tintG = Math.floor(80 - t * 30);        // 80 -> 50
            tintB = Math.floor(20 + t * 130);       // 20 -> 150
            tintAlpha = 0.3 + t * 0.1;              // 0.3 -> 0.4
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
                return phaseName;
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

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
        // Default: 1 game hour = 1 real minute (60x speed)
        // Full game day = 24 real minutes
        this.timeScale = 60.0;
        
        // Enable/disable cycle progression
        this.enabled = true;
        
        // Initialize shader for realistic lighting WITH LIGHT MASK SUPPORT
        this.shader = canvas ? new DayNightShader(canvas) : null;
        
        if (!this.shader || !this.shader.initialized) {
            console.error('❌ WebGL not available - day/night cycle will not work');
        } else {
            console.log('✅ Day/Night cycle using WebGL shader with light mask support');
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
     * Get shader parameters for the current time and weather
     * Used by WebGLRenderer for post-processing
     */
    getShaderParams(weatherState = null) {
        const params = {
            brightness: 1.0,
            saturation: 1.0,
            temperature: 0.0,
            tint: [0, 0, 0, 0],
            darknessColor: [1, 1, 1]
        };
        
        const timeOfDay = this.timeOfDay;
        
        let weatherDarkening = 0;
        let weatherDesaturation = 0;
        if (weatherState && weatherState.precipitation) {
            if (weatherState.precipitation === 'rain-light' || weatherState.precipitation === 'snow-light') {
                weatherDarkening = 0.15;
                weatherDesaturation = 0.2;
            } else if (weatherState.precipitation === 'rain-medium' || weatherState.precipitation === 'snow-medium') {
                weatherDarkening = 0.3;
                weatherDesaturation = 0.35;
            } else if (weatherState.precipitation === 'rain-heavy' || weatherState.precipitation === 'snow-heavy') {
                weatherDarkening = 0.5;
                weatherDesaturation = 0.5;
            }
        }
        
        if ((timeOfDay >= 20 && timeOfDay < 24) || (timeOfDay >= 0 && timeOfDay < 5)) {
            // Lighter night - you can actually see now
            params.brightness = 0.55;
            params.saturation = 0.6;
            params.temperature = -0.5;
        }
        else if (timeOfDay >= 5 && timeOfDay < 8) {
            const t = (timeOfDay - 5) / 3;
            params.brightness = (0.55 + (t * 0.40)) * (1 - weatherDarkening);
            params.saturation = (0.6 + (t * 0.4)) * (1 - weatherDesaturation);
            params.temperature = -0.5 + (t * 0.6);
        }
        else if (timeOfDay >= 8 && timeOfDay < 17) {
            const noonFactor = 1.0 - Math.abs((timeOfDay - 12) / 5) * 0.15;
            params.brightness = (0.95 + (noonFactor * 0.05)) * (1 - weatherDarkening);
            params.saturation = 1.0 * (1 - weatherDesaturation);
            params.temperature = 0.1;
        }
        else if (timeOfDay >= 17 && timeOfDay < 20) {
            const t = (timeOfDay - 17) / 3;
            params.brightness = (0.90 - (t * 0.35)) * (1 - weatherDarkening);
            params.saturation = (1.0 - (t * 0.4)) * (1 - weatherDesaturation);
            params.temperature = 0.6 - (t * 1.1);
        }
        
        // Calculate darkness color (legacy support, but useful for tinting)
        const darkness = this.calculateDarknessColor(weatherState);
        params.darknessColor = darkness;
        
        return params;
    }

    /**
     * Render day/night overlay on canvas with light mask support
     * WebGL-ONLY rendering with light mask integration
     */
    render(ctx, width, height, weatherState = null, lightMask = null) {
        if (!this.shader || !this.shader.initialized) {
            return; // Skip if WebGL not available
        }
        
        // Performance optimization: Skip shader during peak noon (10-14) with no weather
        // The shader barely changes the image during these times
        const time = this.timeOfDay;
        const hasWeather = weatherState && weatherState.precipitation;
        if (!hasWeather && time >= 10 && time < 14) {
            return; // Skip shader - it's bright noon, minimal effect
        }
        
        this.shader.updateFromTimeOfDay(this.timeOfDay, weatherState);
        const darknessColor = this.calculateDarknessColor(weatherState);
        this.shader.apply(ctx, lightMask, darknessColor);
    }
    
    /**
     * Calculate darkness color multiplier for WebGL shader
     */
    calculateDarknessColor(weatherState = null) {
        const time = this.timeOfDay;
        
        let weatherDarkening = 0;
        if (weatherState && weatherState.precipitation) {
            if (weatherState.precipitation.includes('light')) {
                weatherDarkening = 0.15;
            } else if (weatherState.precipitation.includes('medium')) {
                weatherDarkening = 0.3;
            } else if (weatherState.precipitation.includes('heavy')) {
                weatherDarkening = 0.5;
            }
        }
        
        let r, g, b;
        
        if ((time >= 0 && time < 5) || (time >= 20 && time < 24)) {
            // Lighter night - still atmospheric but you can see
            r = 0.65; g = 0.68; b = 0.80;
        }
        else if (time >= 5 && time < 8) {
            const t = (time - 5) / 3;
            r = 0.65 + t * 0.35;
            g = 0.68 + t * 0.32;
            b = 0.80 + t * 0.20;
        }
        else if (time >= 8 && time < 17) {
            if (weatherDarkening > 0) {
                r = 1.0 - weatherDarkening * 0.47;
                g = 1.0 - weatherDarkening * 0.47;
                b = 1.0 - weatherDarkening * 0.39;
            } else {
                return [1.0, 1.0, 1.0];
            }
        }
        else if (time >= 17 && time < 20) {
            const t = (time - 17) / 3;
            r = 1.0 - t * 0.35;
            g = 1.0 - t * 0.32;
            b = 1.0 - t * 0.20;
        }
        
        if (weatherDarkening > 0 && (time < 8 || time >= 17)) {
            const extra = weatherDarkening * 0.2;
            r = Math.max(0.16, r - extra);
            g = Math.max(0.16, g - extra);
            b = Math.max(0.16, b - extra);
        }
        
        return [r, g, b];
    }
    
    /**
     * Render using layered approach: darkening + blue tint with light mask
     * Smooth continuous transitions across all time periods
     */
    renderWithFilters(ctx, width, height, weatherState = null, lightMask = null) {
        this.shader.updateFromTimeOfDay(this.timeOfDay, weatherState);
        
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
        
        // If we have a light mask, modulate darkness by light intensity per pixel
        if (lightMask) {
            // Get the light mask pixel data (grayscale: white=lit, black=dark)
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = width;
            maskCanvas.height = height;
            const maskCtx = maskCanvas.getContext('2d');
            maskCtx.imageSmoothingEnabled = true;
            maskCtx.imageSmoothingQuality = 'high';
            maskCtx.drawImage(lightMask, 0, 0);
            const maskData = maskCtx.getImageData(0, 0, width, height);
            
            // Create darkness overlay with per-pixel alpha based on light mask
            const darknessCanvas = document.createElement('canvas');
            darknessCanvas.width = width;
            darknessCanvas.height = height;
            const darknessCtx = darknessCanvas.getContext('2d');
            darknessCtx.imageSmoothingEnabled = true;
            darknessCtx.imageSmoothingQuality = 'high';
            const darknessData = darknessCtx.createImageData(width, height);
            
            // For each pixel: darkness alpha = inverted light brightness
            // White (255) in mask = 0% darkness, Black (0) in mask = 100% darkness
            for (let i = 0; i < maskData.data.length; i += 4) {
                const lightIntensity = maskData.data[i] / 255; // 0=dark, 1=lit
                const darknessAlpha = 1 - lightIntensity; // Invert: 1=dark, 0=lit
                
                darknessData.data[i] = darknessR;
                darknessData.data[i + 1] = darknessG;
                darknessData.data[i + 2] = darknessB;
                darknessData.data[i + 3] = darknessAlpha * 255;
            }
            
            darknessCtx.putImageData(darknessData, 0, 0);
            
            // Apply the per-pixel modulated darkness
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            ctx.drawImage(darknessCanvas, 0, 0);
            
            // Apply tint if needed
            if (tintAlpha > 0) {
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = `rgba(${tintR}, ${tintG}, ${tintB}, ${tintAlpha})`;
                ctx.fillRect(0, 0, width, height);
            }
            ctx.restore();
        } else {
            // No light mask - apply darkness normally
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
    }
    
    /**
     * Fallback render using 2D overlay (when shader unavailable) with light mask
     */
    renderOverlay(ctx, width, height, lightMask = null) {
        const lighting = this.getCurrentLighting();
        
        // Only render if there's an overlay (alpha > 0)
        if (lighting.a > 0) {
            if (lightMask) {
                // Create temp canvas for overlay
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.imageSmoothingEnabled = true;
                tempCtx.imageSmoothingQuality = 'high';
                
                // Draw overlay to temp
                tempCtx.fillStyle = `rgba(${lighting.r}, ${lighting.g}, ${lighting.b}, ${lighting.a})`;
                tempCtx.fillRect(0, 0, width, height);
                
                // Cut out lit areas using mask (destination-out removes where mask is white)
                tempCtx.globalCompositeOperation = 'destination-out';
                tempCtx.drawImage(lightMask, 0, 0);
                
                // Draw masked overlay to main canvas
                ctx.save();
                ctx.drawImage(tempCanvas, 0, 0);
                ctx.restore();
            } else {
                // No mask - simple overlay
                ctx.save();
                ctx.fillStyle = `rgba(${lighting.r}, ${lighting.g}, ${lighting.b}, ${lighting.a})`;
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
            }
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
    
    /**
     * Get sun position (0-1 range for x, y)
     * Returns null if sun is not visible
     */
    getSunPosition() {
        const time = this.timeOfDay;
        
        // Sun visible from 6 AM to 6 PM (18:00)
        if (time < 6 || time > 18) return null;
        
        // Calculate sun progress (0.0 at 6 AM, 1.0 at 6 PM)
        const progress = (time - 6) / 12;
        
        // Sun moves from right to left (1.0 to 0.0) to match shadow logic (East=Right)
        // 6 AM = Right (1.0), 6 PM = Left (0.0) - Full 180 degree arc
        const x = 1.0 - progress;
        
        // Sun arc height (y position)
        // Starts low (0.8), goes high (-0.2), ends low (0.8)
        const arcHeight = Math.sin(progress * Math.PI);
        const y = 0.8 - (arcHeight * 1.0); // 0.8 (horizon) to -0.2 (zenith)
        
        // Calculate flare intensity based on specific time windows
        // Window 1: 8 AM - 10 AM (Morning)
        // Window 2: 2 PM - 4 PM (Afternoon)
        let intensity = 0;
        
        if (time >= 8 && time <= 10) {
            // Fade in 8-9, fade out 9-10 (Sine wave peak at 9)
            intensity = Math.sin(((time - 8) / 2) * Math.PI);
        } else if (time >= 14 && time <= 16) {
            // Fade in 14-15, fade out 15-16 (Sine wave peak at 15)
            intensity = Math.sin(((time - 14) / 2) * Math.PI);
        }
        
        return { x, y, intensity };
    }
}

// Export
window.DayNightCycle = DayNightCycle;


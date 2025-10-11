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
        
        // Initialize shader for realistic lighting
        this.shader = canvas ? new DayNightShader(canvas) : null;
        
        if (!this.shader || !this.shader.initialized) {
            console.error('❌ WebGL not available - day/night cycle requires WebGL with light mask support');
            console.error('Please use a browser that supports WebGL (Chrome, Firefox, Edge, Safari)');
        } else {
            console.log('✅ Day/Night cycle using WebGL shader with light mask integration');
        }
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
     * Calculate darkness color multiplier based on time of day
     * Returns RGB values in 0-1 range for WebGL shader
     * @param {Object} weatherState - Optional weather state for cloud darkening
     * @returns {Array} [r, g, b] darkness multiplier (0-1 range)
     */
    calculateDarknessColor(weatherState = null) {
        const time = this.timeOfDay;
        
        // Calculate weather darkening factor
        let weatherDarkening = 0;
        if (weatherState && weatherState.precipitation) {
            if (weatherState.precipitation === 'rain-light' || weatherState.precipitation === 'snow-light') {
                weatherDarkening = 0.15;
            } else if (weatherState.precipitation === 'rain-medium' || weatherState.precipitation === 'snow-medium') {
                weatherDarkening = 0.3;
            } else if (weatherState.precipitation === 'rain-heavy' || weatherState.precipitation === 'snow-heavy') {
                weatherDarkening = 0.5;
            }
        }
        
        let r, g, b;
        
        // Night (0-5 and 20-24): Dark with blue tint
        if ((time >= 0 && time < 5) || (time >= 20 && time < 24)) {
            r = 0.47; // 120/255
            g = 0.51; // 130/255
            b = 0.63; // 160/255
        }
        // Dawn (5-8): Transition from night to day
        else if (time >= 5 && time < 8) {
            const t = (time - 5) / 3;
            r = 0.47 + t * 0.53; // 0.47 -> 1.0
            g = 0.51 + t * 0.49; // 0.51 -> 1.0
            b = 0.63 + t * 0.37; // 0.63 -> 1.0
        }
        // Day (8-17): Full brightness (unless weather)
        else if (time >= 8 && time < 17) {
            if (weatherDarkening > 0) {
                r = 1.0 - weatherDarkening * 0.47;
                g = 1.0 - weatherDarkening * 0.47;
                b = 1.0 - weatherDarkening * 0.39;
            } else {
                return [1.0, 1.0, 1.0]; // No darkening during day
            }
        }
        // Dusk (17-20): Transition from day to night
        else if (time >= 17 && time < 20) {
            const t = (time - 17) / 3;
            r = 1.0 - t * 0.53; // 1.0 -> 0.47
            g = 1.0 - t * 0.49; // 1.0 -> 0.51
            b = 1.0 - t * 0.37; // 1.0 -> 0.63
        }
        
        // Apply additional weather darkening for non-day hours
        if (weatherDarkening > 0 && (time < 8 || time >= 17)) {
            const extraDark = weatherDarkening * 0.2;
            r = Math.max(0.16, r - extraDark);
            g = Math.max(0.16, g - extraDark);
            b = Math.max(0.16, b - extraDark);
        }
        
        return [r, g, b];
    }
    
    /**
     * Render day/night overlay on canvas with light mask support
     * WebGL rendering with proper light source integration
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {Object} weatherState - Optional weather state for cloud darkening
     * @param {HTMLCanvasElement} lightMask - Optional light mask (white = lit, black = dark)
     */
    render(ctx, width, height, weatherState = null, lightMask = null) {
        // Check if shader is available
        if (!this.shader || !this.shader.initialized) {
            // Skip rendering if WebGL not available
            return;
        }
        
        // WebGL rendering - calculate darkness color for shader
        this.shader.updateFromTimeOfDay(this.timeOfDay, weatherState);
        
        // Calculate darkness multiplier based on time of day
        const darknessColor = this.calculateDarknessColor(weatherState);
        
        // Apply shader with light mask integration
        this.shader.apply(ctx, lightMask, darknessColor);
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
        if (this.shader) {
            return this.shader.getDebugInfo();
        }
        return { mode: 'ERROR - No shader' };
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
        
        if ((time >= 0 && time < 5) || (time >= 20 && time < 24)) {
            return 'night';
        } else if (time >= 5 && time < 8) {
            return 'dawn';
        } else if (time >= 8 && time < 17) {
            return 'day';
        } else if (time >= 17 && time < 20) {
            return 'dusk';
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

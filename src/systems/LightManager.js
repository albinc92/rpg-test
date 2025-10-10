/**
 * LightManager - Manages light sources for maps
 * Handles rendering, flicker animation, and light instance management
 */
class LightManager {
    constructor(game) {
        this.game = game;
        this.lights = []; // Light instances for current map
        this.lightRegistry = new LightRegistry();
        
        // Preview sprite for editor (only visible in editor mode)
        this.previewSprite = new Image();
        this.previewSprite.src = 'assets/editor/light.svg';
        this.previewSpriteLoaded = false;
        
        this.previewSprite.onload = () => {
            this.previewSpriteLoaded = true;
            console.log('[LightManager] ✅ Preview sprite loaded');
        };
        
        this.previewSprite.onerror = () => {
            console.warn('[LightManager] ⚠️ Preview sprite not found at assets/editor/light.svg');
        };
        
        console.log('[LightManager] Initialized');
    }
    
    /**
     * Load lights from data array
     */
    loadLights(lightsData) {
        this.lights = [];
        
        if (!lightsData || !Array.isArray(lightsData)) {
            console.log(`[LightManager] No lights to load`);
            return;
        }
        
        lightsData.forEach(lightData => {
            const light = {
                id: lightData.id,
                templateName: lightData.templateName,
                x: lightData.x,
                y: lightData.y,
                radius: lightData.radius,
                color: { ...lightData.color },
                flicker: { ...lightData.flicker },
                // Runtime state
                _flickerOffset: Math.random() * Math.PI * 2,
                _currentIntensity: 1.0
            };
            
            this.lights.push(light);
        });
        
        console.log(`[LightManager] ✅ Loaded ${this.lights.length} lights`);
    }
    
    /**
     * Clear all lights
     */
    clearLights() {
        this.lights = [];
        console.log(`[LightManager] Cleared all lights`);
    }
    
    /**
     * Add a light to the current map
     */
    addLight(light) {
        this.lights.push(light);
        console.log(`[LightManager] Added light: ${light.id}`);
    }
    
    /**
     * Remove a light by id
     */
    removeLight(lightId) {
        const index = this.lights.findIndex(l => l.id === lightId);
        if (index !== -1) {
            this.lights.splice(index, 1);
            console.log(`[LightManager] Removed light: ${lightId}`);
            return true;
        }
        return false;
    }
    
    /**
     * Get a light by id
     */
    getLightById(lightId) {
        return this.lights.find(l => l.id === lightId);
    }
    
    /**
     * Update light properties
     */
    updateLight(lightId, properties) {
        const light = this.getLightById(lightId);
        if (!light) return false;
        
        Object.assign(light, properties);
        console.log(`[LightManager] Updated light: ${lightId}`);
        return true;
    }
    
    /**
     * Update flicker animation
     */
    update(deltaTime) {
        const time = performance.now() / 1000; // Convert to seconds
        
        this.lights.forEach(light => {
            if (light.flicker.enabled && light.flicker.intensity > 0) {
                // Calculate flicker using sine wave with noise
                const flickerSpeed = light.flicker.speed * 10; // Scale speed
                const flickerWave = Math.sin(time * flickerSpeed + light._flickerOffset);
                const flickerNoise = Math.sin(time * flickerSpeed * 3.7 + light._flickerOffset * 2) * 0.3;
                
                // Combine waves and apply intensity
                const flicker = (flickerWave + flickerNoise) * light.flicker.intensity;
                
                // Current intensity: 1.0 ± flicker
                light._currentIntensity = 1.0 + flicker;
                
                // Clamp to reasonable range
                light._currentIntensity = Math.max(0.3, Math.min(1.3, light._currentIntensity));
            } else {
                light._currentIntensity = 1.0;
            }
        });
    }
    
    /**
     * Render lights (called before day/night overlay)
     * Uses additive blending for realistic light accumulation
     */
    render(ctx, cameraX, cameraY) {
        if (this.lights.length === 0) return;
        
        // Save context state
        ctx.save();
        
        // Use 'lighter' blend mode for additive light blending
        ctx.globalCompositeOperation = 'lighter';
        
        this.lights.forEach(light => {
            this.renderLight(ctx, light, cameraX, cameraY);
        });
        
        // Restore context state
        ctx.restore();
    }
    
    /**
     * Render a single light source
     */
    renderLight(ctx, light, cameraX, cameraY) {
        // Convert world coordinates to screen coordinates
        const screenX = light.x - cameraX;
        const screenY = light.y - cameraY;
        
        // Calculate effective radius and alpha based on flicker
        const effectiveRadius = light.radius * light._currentIntensity;
        const effectiveAlpha = light.color.a * light._currentIntensity;
        
        // Create radial gradient from center to edge
        const gradient = ctx.createRadialGradient(
            screenX, screenY, 0,                    // Inner circle (center)
            screenX, screenY, effectiveRadius       // Outer circle (edge)
        );
        
        // Inner glow (brightest at center)
        gradient.addColorStop(0, `rgba(${light.color.r}, ${light.color.g}, ${light.color.b}, ${effectiveAlpha})`);
        
        // Mid-range falloff
        gradient.addColorStop(0.5, `rgba(${light.color.r}, ${light.color.g}, ${light.color.b}, ${effectiveAlpha * 0.5})`);
        
        // Edge (completely transparent)
        gradient.addColorStop(1, `rgba(${light.color.r}, ${light.color.g}, ${light.color.b}, 0)`);
        
        // Draw the light
        ctx.fillStyle = gradient;
        ctx.fillRect(
            screenX - effectiveRadius,
            screenY - effectiveRadius,
            effectiveRadius * 2,
            effectiveRadius * 2
        );
    }
    
    /**
     * Render editor preview sprites (only in editor mode)
     */
    renderEditorPreviews(ctx, cameraX, cameraY, showPreviews = true) {
        if (!showPreviews || !this.previewSpriteLoaded) return;
        
        ctx.save();
        
        this.lights.forEach(light => {
            const screenX = light.x - cameraX;
            const screenY = light.y - cameraY;
            
            // Draw preview sprite centered on light position
            const spriteSize = 32; // Fixed size for editor preview
            ctx.drawImage(
                this.previewSprite,
                screenX - spriteSize / 2,
                screenY - spriteSize / 2,
                spriteSize,
                spriteSize
            );
            
            // Draw light name below sprite
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.lineWidth = 3;
            ctx.strokeText(light.templateName, screenX, screenY + 24);
            ctx.fillText(light.templateName, screenX, screenY + 24);
        });
        
        ctx.restore();
    }
    
    /**
     * Check if a point is inside a light (for selection in editor)
     */
    isPointInLight(x, y, light, threshold = 20) {
        const dx = x - light.x;
        const dy = y - light.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= threshold;
    }
    
    /**
     * Find light at position (for editor selection)
     */
    findLightAtPosition(x, y) {
        // Search in reverse order (top to bottom in render order)
        for (let i = this.lights.length - 1; i >= 0; i--) {
            if (this.isPointInLight(x, y, this.lights[i])) {
                return this.lights[i];
            }
        }
        return null;
    }
    
    /**
     * Export lights for current map (for saving)
     */
    exportLights() {
        return this.lights.map(light => ({
            id: light.id,
            templateName: light.templateName,
            x: light.x,
            y: light.y,
            radius: light.radius,
            color: { ...light.color },
            flicker: { ...light.flicker }
        }));
    }
    
    /**
     * Clear all lights
     */
    clear() {
        this.lights = [];
    }
}

// Export
window.LightManager = LightManager;

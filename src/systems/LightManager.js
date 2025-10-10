/**
 * LightManager - Manages light sources for maps
 * Handles rendering, flicker animation, and light instance management
 */
class LightManager {
    constructor(game) {
        this.game = game;
        this.lights = []; // Light instances for current map
        this.lightRegistry = new LightRegistry();
        
        // Load templates from JSON
        this.lightRegistry.loadTemplates();
        
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
     * Render lights (called AFTER day/night overlay to dispel darkness)
     * Uses 'screen' or 'lighter' blend mode to brighten darkened areas
     */
    render(ctx, cameraX, cameraY) {
        if (this.lights.length === 0) return;
        
        // Save context state
        ctx.save();
        
        // Use 'screen' blend mode - brightens underlying pixels (perfect for dispelling darkness)
        // 'screen' is like projecting light onto a dark screen - dark areas become brighter
        // Formula: 1 - (1 - backdrop) * (1 - source)
        ctx.globalCompositeOperation = 'screen';
        
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
        // COMMON BEHAVIOR: Scale storage coordinates to world coordinates (same as GameObject.getScaledX/Y)
        // Lights store coordinates in unscaled format, just like all other game objects
        const game = this.game;
        const resolutionScale = game?.resolutionScale || 1.0;
        const mapScale = game?.currentMap?.scale || 1.0;
        const totalScale = mapScale * resolutionScale;
        
        // Scale the stored coordinates to world coordinates
        const worldX = light.x * totalScale;
        const worldY = light.y * totalScale;
        
        // Convert world coordinates to screen coordinates
        const screenX = worldX - cameraX;
        const screenY = worldY - cameraY;
        
        // Calculate effective radius and alpha based on flicker
        const effectiveRadius = light.radius * light._currentIntensity;
        const effectiveAlpha = light.color.a * light._currentIntensity;
        
        // Create radial gradient from center to edge
        // Using 'screen' blend mode, brighter colors = more dispelling of darkness
        const gradient = ctx.createRadialGradient(
            screenX, screenY, 0,                    // Inner circle (center)
            screenX, screenY, effectiveRadius       // Outer circle (edge)
        );
        
        // Brighten the colors for better darkness dispelling with 'screen' blend mode
        // Screen blend works best with bright colors (closer to 255)
        const brightR = Math.min(255, light.color.r * 1.5);
        const brightG = Math.min(255, light.color.g * 1.5);
        const brightB = Math.min(255, light.color.b * 1.5);
        
        // Inner glow (brightest at center) - increased brightness for darkness dispelling
        gradient.addColorStop(0, `rgba(${brightR}, ${brightG}, ${brightB}, ${effectiveAlpha})`);
        
        // Mid-range falloff - still quite bright
        gradient.addColorStop(0.4, `rgba(${brightR}, ${brightG}, ${brightB}, ${effectiveAlpha * 0.7})`);
        
        // Outer falloff
        gradient.addColorStop(0.7, `rgba(${brightR}, ${brightG}, ${brightB}, ${effectiveAlpha * 0.3})`);
        
        // Edge (completely transparent)
        gradient.addColorStop(1, `rgba(${brightR}, ${brightG}, ${brightB}, 0)`);
        
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
     * NOTE: Camera transform is ALREADY applied by RenderSystem, so we render at world coordinates
     */
    renderEditorPreviews(ctx, cameraX, cameraY, showPreviews = true) {
        if (!showPreviews || !this.previewSpriteLoaded) return;
        
        ctx.save();
        
        this.lights.forEach(light => {
            // COMMON BEHAVIOR: Scale storage coordinates to world coordinates (same as GameObject)
            const game = this.game;
            const resolutionScale = game?.resolutionScale || 1.0;
            const mapScale = game?.currentMap?.scale || 1.0;
            const totalScale = mapScale * resolutionScale;
            
            const worldX = light.x * totalScale;
            const worldY = light.y * totalScale;
            
            // Camera transform is ALREADY applied, so use world coordinates directly
            // (RenderSystem calls ctx.translate(-camera.x, -camera.y) before this)
            
            // Draw preview sprite centered on light position
            const spriteSize = 32; // Fixed size for editor preview
            ctx.drawImage(
                this.previewSprite,
                worldX - spriteSize / 2,
                worldY - spriteSize / 2,
                spriteSize,
                spriteSize
            );
            
            // Draw light name below sprite
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.lineWidth = 3;
            ctx.strokeText(light.templateName, worldX, worldY + 24);
            ctx.fillText(light.templateName, worldX, worldY + 24);
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

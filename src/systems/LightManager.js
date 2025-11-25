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
        
        // Light mask system - used to dispel darkness
        this.lightMaskCanvas = null;
        this.lightMaskCtx = null;
        this.maskNeedsUpdate = true;
        
        console.log('[LightManager] ✅ Initialized with light mask system');
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
                altitude: lightData.altitude || 0, // Load altitude
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
        this.maskNeedsUpdate = true; // Mark mask for regeneration
        console.log(`[LightManager] Added light: ${light.id}`);
    }
    
    /**
     * Remove a light by id
     */
    removeLight(lightId) {
        const index = this.lights.findIndex(l => l.id === lightId);
        if (index !== -1) {
            this.lights.splice(index, 1);
            this.maskNeedsUpdate = true; // Mark mask for regeneration
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
        this.maskNeedsUpdate = true; // Mark mask for regeneration
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
     * Initialize or resize light mask canvas
     */
    initializeLightMask(width, height) {
        if (!this.lightMaskCanvas || 
            this.lightMaskCanvas.width !== width || 
            this.lightMaskCanvas.height !== height) {
            
            this.lightMaskCanvas = document.createElement('canvas');
            this.lightMaskCanvas.width = width;
            this.lightMaskCanvas.height = height;
            this.lightMaskCtx = this.lightMaskCanvas.getContext('2d');
            this.maskNeedsUpdate = true;
            
            console.log(`[LightManager] ✅ Light mask initialized: ${width}x${height}`);
        }
    }
    
    /**
     * Generate light mask from all light sources
     * The mask is grayscale: white = fully lit (no darkness), black = fully dark
     */
    generateLightMask(cameraX, cameraY, width, height) {
        if (!this.lightMaskCtx) return;
        
        const ctx = this.lightMaskCtx;
        
        // Clear to black (fully dark by default)
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);
        
        // Use 'lighter' blend mode so overlapping lights accumulate brightness
        ctx.globalCompositeOperation = 'lighter';
        
        // Render each light as a white radial gradient (mask intensity)
        let lightsRendered = 0;
        this.lights.forEach(light => {
            this.renderLightMask(ctx, light, cameraX, cameraY);
            lightsRendered++;
        });
        
        // Reset blend mode
        ctx.globalCompositeOperation = 'source-over';
        
        console.log(`[LightManager] Generated mask with ${lightsRendered} lights at camera(${cameraX.toFixed(0)}, ${cameraY.toFixed(0)})`);
        
        this.maskNeedsUpdate = false;
    }
    
    /**
     * Render a single light to the mask (as white gradient)
     */
    renderLightMask(ctx, light, cameraX, cameraY) {
        const game = this.game;
        const resolutionScale = game?.resolutionScale || 1.0;
        const mapScale = game?.currentMap?.scale || 1.0;
        const totalScale = mapScale * resolutionScale;
        
        // Scale the stored coordinates to world coordinates
        const worldX = light.x * totalScale;
        const worldY = light.y * totalScale;
        
        // Apply altitude offset if present (scaled by resolution)
        // This ensures lights on floating objects (like spirits) are rendered at the correct height
        const altitudeOffset = (light.altitude || 0) * resolutionScale;
        
        // Convert world coordinates to screen coordinates
        const screenX = worldX - cameraX;
        const screenY = worldY - cameraY - altitudeOffset;
        
        // Calculate effective radius based on flicker
        const effectiveRadius = light.radius * light._currentIntensity;
        
        // Create radial gradient (white = light, transparent = no light)
        const gradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, effectiveRadius
        );
        
        // White at center (full light intensity)
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
        
        // Draw the light mask
        ctx.fillStyle = gradient;
        ctx.fillRect(
            screenX - effectiveRadius,
            screenY - effectiveRadius,
            effectiveRadius * 2,
            effectiveRadius * 2
        );
    }
    
    /**
     * Get the current light mask canvas
     * Used by DayNightCycle to apply darkness only where there's no light
     */
    getLightMask(cameraX, cameraY, width, height) {
        // Initialize mask if needed
        this.initializeLightMask(width, height);
        
        // Regenerate mask if lights changed or not yet generated
        if (this.maskNeedsUpdate) {
            console.log(`[LightManager] Regenerating light mask (${this.lights.length} lights)`);
            this.generateLightMask(cameraX, cameraY, width, height);
            
            // DEBUG: Check if mask is all white (would explain no darkness)
            const imageData = this.lightMaskCtx.getImageData(width/2, height/2, 1, 1);
            const centerPixel = imageData.data;
            console.log(`[LightManager] Mask center pixel: R=${centerPixel[0]} G=${centerPixel[1]} B=${centerPixel[2]} A=${centerPixel[3]}`);
            
            // Check a corner (should be black if lights are small)
            const cornerData = this.lightMaskCtx.getImageData(10, 10, 1, 1);
            const cornerPixel = cornerData.data;
            console.log(`[LightManager] Mask corner pixel: R=${cornerPixel[0]} G=${cornerPixel[1]} B=${cornerPixel[2]} A=${cornerPixel[3]}`);
        }
        
        return this.lightMaskCanvas;
    }
    
    /**
     * Render lights (now renders colored light glows on top of masked darkness)
     * This adds the colored light effect after darkness has been properly masked
     */
    render(ctx, cameraX, cameraY) {
        if (this.lights.length === 0) return;
        
        // Save context state
        ctx.save();
        
        // Use 'screen' blend mode to add colored light glow on top
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
        
        // Apply altitude offset if present (scaled by resolution)
        const altitudeOffset = (light.altitude || 0) * resolutionScale;
        
        // Convert world coordinates to screen coordinates
        const screenX = worldX - cameraX;
        const screenY = worldY - cameraY - altitudeOffset;
        
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
            
            // Apply altitude offset if present
            const altitudeOffset = (light.altitude || 0) * resolutionScale;
            
            // Camera transform is ALREADY applied, so use world coordinates directly
            // (RenderSystem calls ctx.translate(-camera.x, -camera.y) before this)
            
            // Draw preview sprite centered on light position
            const spriteSize = 32; // Fixed size for editor preview
            ctx.drawImage(
                this.previewSprite,
                worldX - spriteSize / 2,
                worldY - spriteSize / 2 - altitudeOffset,
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
        // COMMON BEHAVIOR: Scale storage coordinates to world coordinates
        const game = this.game;
        const resolutionScale = game?.resolutionScale || 1.0;
        const mapScale = game?.currentMap?.scale || 1.0;
        const totalScale = mapScale * resolutionScale;
        
        // Convert light's stored coordinates to world coordinates
        const lightWorldX = light.x * totalScale;
        const lightWorldY = light.y * totalScale;
        
        // Compare world coordinates (x, y are already scaled world coordinates from mouse)
        const dx = x - lightWorldX;
        const dy = y - lightWorldY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= threshold;
    }
    
    /**
     * Find light at position (for editor selection)
     * @param {number} x - World X coordinate (scaled)
     * @param {number} y - World Y coordinate (scaled)
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
     * Remove a light by ID
     */
    removeLight(lightId) {
        const index = this.lights.findIndex(light => light.id === lightId);
        if (index !== -1) {
            this.lights.splice(index, 1);
            console.log('[LightManager] Removed light:', lightId);
            return true;
        }
        return false;
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
            altitude: light.altitude || 0, // Export altitude
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
        this.maskNeedsUpdate = true;
    }
    
    /**
     * Force light mask regeneration (call after camera moves or zoom changes)
     */
    invalidateMask() {
        this.maskNeedsUpdate = true;
    }
}

// Export
window.LightManager = LightManager;

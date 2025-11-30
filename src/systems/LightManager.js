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
        // Keep dynamic lights (like player lantern) when reloading
        const dynamicLights = this.lights.filter(l => l.id === 'player_lantern');
        this.lights = [...dynamicLights];
        
        if (!lightsData || !Array.isArray(lightsData)) {
            console.log(`[LightManager] No lights to load`);
            return;
        }
        
        lightsData.forEach(lightData => {
            // Skip if this is a dynamic light that shouldn't be loaded from file
            if (lightData.id === 'player_lantern') return;
            
            const light = {
                id: lightData.id,
                templateName: lightData.templateName,
                x: lightData.x,
                y: lightData.y,
                altitude: lightData.altitude || 0, // Load altitude
                radius: lightData.radius,
                color: { ...lightData.color },
                flicker: { ...lightData.flicker },
                castsShadows: lightData.castsShadows !== undefined ? lightData.castsShadows : true, // Default to true
                // Runtime state
                _flickerOffset: Math.random() * Math.PI * 2,
                _currentIntensity: 1.0
            };
            
            this.lights.push(light);
        });
        
        this.maskNeedsUpdate = true;
        console.log(`[LightManager] ✅ Loaded ${this.lights.length} lights`);
    }
    
    /**
     * Clear all lights
     */
    clearLights() {
        this.lights = [];
        this.maskNeedsUpdate = true;
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
     * Update flicker animation for all lights
     */
    update(deltaTime) {
        const time = performance.now() / 1000; // Current time in seconds
        
        this.lights.forEach(light => {
            const flicker = light.flicker;
            
            // If flicker is disabled or not configured, use full intensity
            if (!flicker || !flicker.enabled) {
                light._currentIntensity = 1.0;
                return;
            }
            
            // Initialize flicker offset if not set (for phase variation between lights)
            if (light._flickerOffset === undefined) {
                light._flickerOffset = Math.random() * Math.PI * 2;
            }
            
            const intensity = flicker.intensity || 0.2;
            const speed = flicker.speed || 0.1;
            const style = flicker.style || 'smooth';
            const phase = light._flickerOffset;
            
            let flickerValue = 0;
            
            switch (style) {
                case 'smooth':
                    // Gentle sine wave pulsing (like a candle)
                    flickerValue = Math.sin(time * speed * 10 + phase) * 0.5 + 0.5;
                    break;
                    
                case 'harsh':
                    // Random noise (like a fire/torch)
                    // Use seeded random based on time for consistency
                    const noiseTime = Math.floor(time * speed * 20);
                    if (light._lastNoiseTime !== noiseTime) {
                        light._lastNoiseTime = noiseTime;
                        light._noiseValue = Math.random();
                    }
                    flickerValue = light._noiseValue || Math.random();
                    break;
                    
                case 'strobe':
                    // On/off flashing
                    flickerValue = Math.sin(time * speed * 15 + phase) > 0 ? 1 : 0;
                    break;
                    
                case 'flicker':
                    // Mostly stable with occasional random dips (failing light bulb)
                    const flickerChance = Math.sin(time * speed * 5 + phase);
                    if (flickerChance > 0.7) {
                        flickerValue = Math.random() * 0.5; // Random dip
                    } else {
                        flickerValue = 1; // Stable
                    }
                    break;
                    
                case 'pulse':
                    // Slow, deep pulsing
                    flickerValue = (Math.sin(time * speed * 3 + phase) + 1) * 0.5;
                    break;
                    
                default:
                    flickerValue = 0.5;
            }
            
            // Apply intensity - flickerValue is 0-1, we want to reduce intensity by up to 'intensity' amount
            light._currentIntensity = 1.0 - (intensity * (1 - flickerValue));
            
            // Also calculate current radius for rendering
            light._currentRadius = light.radius * light._currentIntensity;
        });
        
        // Mark mask as needing update if any lights are flickering
        const hasFlicker = this.lights.some(l => l.flicker?.enabled);
        if (hasFlicker) {
            this.maskNeedsUpdate = true;
        }
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
     * @param {number} cameraX - Camera X position
     * @param {number} cameraY - Camera Y position
     * @param {number} width - Mask width
     * @param {number} height - Mask height
     * @param {object} webglRenderer - Optional WebGL renderer for perspective settings
     */
    generateLightMask(cameraX, cameraY, width, height, webglRenderer = null) {
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
            this.renderLightMask(ctx, light, cameraX, cameraY, width, height, webglRenderer);
            lightsRendered++;
        });
        
        // Reset blend mode
        ctx.globalCompositeOperation = 'source-over';
        
        // console.log(`[LightManager] Generated mask with ${lightsRendered} lights at camera(${cameraX.toFixed(0)}, ${cameraY.toFixed(0)})`);
        
        this.maskNeedsUpdate = false;
    }
    
    /**
     * Render a single light to the mask (as colored gradient)
     */
    renderLightMask(ctx, light, cameraX, cameraY, width, height, webglRenderer = null) {
        const game = this.game;
        const resolutionScale = game?.resolutionScale || 1.0;
        const mapScale = game?.currentMap?.scale || 1.0;
        const totalScale = mapScale * resolutionScale;
        
        // Scale the stored coordinates to world coordinates
        const worldX = light.x * totalScale;
        const worldY = light.y * totalScale;
        
        // Use animated radius if available, otherwise base radius
        let effectiveRadius = light._currentRadius || light.radius;
        
        // Apply altitude offset if present (scaled by resolution)
        const altitudeOffset = (light.altitude || 0) * resolutionScale;
        
        let screenX, screenY;
        let perspectiveScale = 1.0;
        
        // Apply billboard perspective transformation if available (for Fake 3D mode)
        if (webglRenderer && webglRenderer.transformWorldToScreen) {
            const transformed = webglRenderer.transformWorldToScreen(
                worldX, 
                worldY - altitudeOffset, 
                cameraX, 
                cameraY
            );
            screenX = transformed.screenX;
            screenY = transformed.screenY;
            perspectiveScale = transformed.scale;
            
            // Scale the radius by perspective
            effectiveRadius = effectiveRadius * perspectiveScale;
        } else {
            // Fallback: simple screen coordinate calculation (2D mode)
            screenX = worldX - cameraX;
            screenY = worldY - cameraY - altitudeOffset;
        }
        
        // Create radial gradient
        const gradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, effectiveRadius
        );
        
        // Use light color
        const r = light.color.r;
        const g = light.color.g;
        const b = light.color.b;
        const a = light.color.a; // Intensity
        
        // Center: Full color
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`);
        // Logarithmic-ish falloff for elongated fading
        gradient.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${a * 0.7})`); // Bright core
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${a * 0.3})`); // Mid drop
        gradient.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, ${a * 0.1})`); // Long tail
        // Edge: Transparent
        gradient.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0)`);
        
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
    getLightMask(cameraX, cameraY, width, height, webglRenderer = null) {
        // Initialize mask if needed
        this.initializeLightMask(width, height);
        
        // Check if camera moved (perspective mode needs regeneration on camera movement)
        const cameraMoved = this._lastCameraX !== cameraX || this._lastCameraY !== cameraY;
        this._lastCameraX = cameraX;
        this._lastCameraY = cameraY;
        
        // Check if perspective mode is active
        const perspectiveParams = webglRenderer?.getPerspectiveParams?.() || { enabled: false };
        const perspectiveActive = perspectiveParams.enabled && perspectiveParams.strength > 0;
        
        // Regenerate mask if:
        // - Lights changed (maskNeedsUpdate)
        // - Camera moved AND perspective is active (positions change with camera in perspective mode)
        if (this.maskNeedsUpdate || (cameraMoved && perspectiveActive)) {
            // console.log(`[LightManager] Regenerating light mask (${this.lights.length} lights)`);
            this.generateLightMask(cameraX, cameraY, width, height, webglRenderer);
        }
        
        return this.lightMaskCanvas;
    }
    
    /**
     * Render lights (DEPRECATED: Now handled via shader mask)
     */
    render(ctx, cameraX, cameraY) {
        // No-op: Rendering is now consolidated into the light mask shader
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
     * Excludes dynamic lights like player lantern
     */
    exportLights() {
        return this.lights
            .filter(light => light.id !== 'player_lantern') // Exclude player's dynamic light
            .map(light => ({
                id: light.id,
                templateName: light.templateName,
                x: light.x,
                y: light.y,
                altitude: light.altitude || 0, // Export altitude
                radius: light.radius,
                color: { ...light.color },
                flicker: { ...light.flicker },
                castsShadows: light.castsShadows !== undefined ? light.castsShadows : true
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

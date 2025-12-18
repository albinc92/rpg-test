/**
 * PerspectiveSystem - Fake 3D/isometric perspective like Diablo 2
 * Creates depth illusion through:
 * 1. Depth-based scaling (objects further "north" appear smaller)
 * 2. Parallax scrolling for background layers
 * 3. Y-position adjustments for ground plane perspective
 */
class PerspectiveSystem {
    constructor() {
        // Perspective settings
        this.enabled = true;
        
        // Depth scaling configuration
        // Objects at horizon (top) will be this % of their normal size
        this.horizonScale = 0.65; // 65% size at horizon
        // Objects at bottom of screen are 100% (or slightly larger for dramatic effect)
        this.foregroundScale = 1.0;
        
        // Horizon line position (0 = top of map, 1 = bottom)
        // Objects above this line get maximum scaling reduction
        this.horizonLinePercent = 0.15; // 15% from top
        
        // Perspective strength (0 = no effect, 1 = full effect)
        this.perspectiveStrength = 0.35;
        
        // Parallax layers for background depth
        this.parallaxLayers = [
            { id: 'far', speedMultiplier: 0.3, image: null, y: 0 },
            { id: 'mid', speedMultiplier: 0.6, image: null, y: 0 },
            // 'near' layer is the main map at 1.0
        ];
        
        // Y offset for ground plane tilt effect
        // Positive = objects shift down as they get closer
        this.groundTiltFactor = 0.0; // Subtle tilt
        
        // Store map dimensions for calculations
        this.mapWidth = 0;
        this.mapHeight = 0;
    }
    
    /**
     * Enable/disable the perspective system
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    /**
     * Configure perspective parameters
     */
    configure(options = {}) {
        if (options.horizonScale !== undefined) {
            this.horizonScale = Math.max(0.3, Math.min(1.0, options.horizonScale));
        }
        if (options.foregroundScale !== undefined) {
            this.foregroundScale = Math.max(0.8, Math.min(1.5, options.foregroundScale));
        }
        if (options.horizonLinePercent !== undefined) {
            this.horizonLinePercent = Math.max(0, Math.min(0.5, options.horizonLinePercent));
        }
        if (options.perspectiveStrength !== undefined) {
            this.perspectiveStrength = Math.max(0, Math.min(1.0, options.perspectiveStrength));
        }
        if (options.groundTiltFactor !== undefined) {
            this.groundTiltFactor = Math.max(0, Math.min(0.3, options.groundTiltFactor));
        }
    }
    
    /**
     * Set parallax background images
     * @param {string} layerId - 'far' or 'mid'
     * @param {HTMLImageElement} image - The background image
     */
    setParallaxLayer(layerId, image) {
        const layer = this.parallaxLayers.find(l => l.id === layerId);
        if (layer) {
            layer.image = image;
            console.log(`[PerspectiveSystem] Set parallax layer '${layerId}'`);
        }
    }
    
    /**
     * Update map dimensions for perspective calculations
     */
    setMapDimensions(width, height) {
        this.mapWidth = width;
        this.mapHeight = height;
    }
    
    /**
     * Calculate depth scale factor for an object based on SCREEN Y position
     * @param {number} screenY - Object's Y position on screen
     * @param {number} screenHeight - Height of the viewport
     * @returns {number} Scale multiplier (0.65 to 1.0 typically)
     */
    getDepthScale(screenY, screenHeight) {
        if (!this.enabled || !screenHeight) return 1.0;
        
        // Normalize Y position (0 = top, 1 = bottom)
        const normalizedY = screenY / screenHeight;
        
        // Calculate depth factor (0 at horizon, 1 at bottom)
        // Objects above horizon line get clamped to horizon scale
        let depthFactor;
        if (normalizedY <= this.horizonLinePercent) {
            depthFactor = 0;
        } else {
            // Lerp from horizon to bottom
            depthFactor = (normalizedY - this.horizonLinePercent) / (1 - this.horizonLinePercent);
        }
        
        // Clamp depth factor
        depthFactor = Math.max(0, Math.min(1, depthFactor));
        
        // Interpolate between horizon and foreground scale
        const baseScale = this.horizonScale + (this.foregroundScale - this.horizonScale) * depthFactor;
        
        // Apply perspective strength (blend with 1.0 for subtle effect)
        return 1.0 + (baseScale - 1.0) * this.perspectiveStrength;
    }
    
    /**
     * Calculate Y offset for ground tilt effect
     * Objects closer (lower Y) get pushed down slightly
     * @param {number} screenY - Object's Y position on screen
     * @param {number} screenHeight - Height of the viewport
     * @returns {number} Y offset in pixels
     */
    getGroundTiltOffset(screenY, screenHeight) {
        if (!this.enabled || !screenHeight || this.groundTiltFactor === 0) return 0;
        
        const normalizedY = screenY / screenHeight;
        // More offset for closer objects (higher normalizedY = closer = more offset)
        return normalizedY * this.groundTiltFactor * 50;
    }
    
    /**
     * Get parallax offset for camera position
     * @param {number} cameraX - Camera X position
     * @param {number} cameraY - Camera Y position  
     * @param {string} layerId - 'far' or 'mid'
     * @returns {{x: number, y: number}} Parallax offset
     */
    getParallaxOffset(cameraX, cameraY, layerId) {
        const layer = this.parallaxLayers.find(l => l.id === layerId);
        if (!layer) return { x: 0, y: 0 };
        
        return {
            x: cameraX * layer.speedMultiplier,
            y: cameraY * layer.speedMultiplier
        };
    }
    
    /**
     * Render parallax background layers
     * Call this BEFORE rendering the main map
     */
    renderParallaxBackgrounds(ctx, cameraX, cameraY, canvasWidth, canvasHeight, webglRenderer = null) {
        if (!this.enabled) return;
        
        this.parallaxLayers.forEach(layer => {
            if (!layer.image || !layer.image.complete) return;
            
            const offset = this.getParallaxOffset(cameraX, cameraY, layer.id);
            
            // Calculate position (tile the image if needed)
            const imgWidth = layer.image.width;
            const imgHeight = layer.image.height;
            
            // Calculate starting position for tiling
            const startX = -(offset.x % imgWidth);
            const startY = -(offset.y % imgHeight);
            
            if (webglRenderer && webglRenderer.initialized) {
                // WebGL rendering
                const imageUrl = `parallax_${layer.id}`;
                
                // Tile the image across the visible area
                for (let x = startX; x < canvasWidth; x += imgWidth) {
                    for (let y = startY; y < canvasHeight; y += imgHeight) {
                        webglRenderer.drawSprite(x + cameraX, y + cameraY, imgWidth, imgHeight, layer.image, imageUrl);
                    }
                }
            } else {
                // Canvas2D fallback
                ctx.save();
                for (let x = startX; x < canvasWidth; x += imgWidth) {
                    for (let y = startY; y < canvasHeight; y += imgHeight) {
                        ctx.drawImage(layer.image, x, y);
                    }
                }
                ctx.restore();
            }
        });
    }
    
    /**
     * Update the WebGL renderer with current perspective settings
     * @param {WebGLRenderer} renderer - The WebGL renderer instance
     * @param {Object} game - The game instance (optional, to check editor state)
     */
    updateRenderer(renderer, game = null) {
        if (!renderer || !renderer.initialized) return;
        
        // Disable perspective in editor mode - too many coordinate issues
        if (game?.editorManager?.isActive) {
            renderer.setPerspective(0.0);
            return;
        }
        
        if (this.enabled) {
            // Pass perspective strength to renderer
            // We use a simplified strength factor for the shader
            // 0.0 = none, 0.5 = moderate, 1.0 = strong
            renderer.setPerspective(this.perspectiveStrength);
        } else {
            renderer.setPerspective(0.0);
        }
    }
    
    /**
     * Debug render - show perspective grid and horizon line
     */
    renderDebug(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
        if (!this.enabled) return;
        
        ctx.save();
        
        // Draw horizon line (relative to screen)
        const horizonY = this.horizonLinePercent * canvasHeight;
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(canvasWidth, horizonY);
        ctx.stroke();
        
        // Draw perspective grid lines
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        const gridLines = 10;
        for (let i = 0; i <= gridLines; i++) {
            const y = (i / gridLines) * canvasHeight;
            // Calculate scale based on shader logic for visualization
            // depth = (y/height) normalized to 0..1 (top to bottom? no shader uses clip space)
            // Shader: depth = (gl_Position.y + 1.0) * 0.5. Top is 1.0, Bottom is 0.0.
            // Screen Y: 0 is Top, Height is Bottom.
            // So normalizedY = 1.0 - (y / height).
            
            const normalizedY = 1.0 - (y / canvasHeight);
            const w = 1.0 + (normalizedY * this.perspectiveStrength);
            const scale = 1.0 / w;
            
            // Draw horizontal line
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
            
            // Label with scale value
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '10px monospace';
            ctx.fillText(`${(scale * 100).toFixed(0)}%`, 5, y - 2);
        }
        
        ctx.restore();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerspectiveSystem;
}

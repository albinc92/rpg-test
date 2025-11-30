/**
 * RenderSystem - Handles all rendering logic
 * Responsible for: camera, layers, sprite rendering, UI
 */
class RenderSystem {
    constructor(canvas, ctx, webglCanvas = null) {
        // Canvas2D (foreground layer)
        this.canvas = canvas;
        this.ctx = ctx;
        
        // WebGL canvas (background layer) - separate canvas element
        this.webglCanvas = webglCanvas;
        this.useWebGL = true; // Toggle to enable/disable WebGL
        this.webglRenderer = null;
        
        if (this.useWebGL && this.webglCanvas) {
            try {
                // Create WebGLRenderer with temporary dimensions
                // The correct logical dimensions will be set via resize() call after construction
                console.log(`[RenderSystem] Initializing WebGL renderer...`);
                this.webglRenderer = new WebGLRenderer(this.webglCanvas, 1920, 1080);
                
                if (this.webglRenderer.initialized) {
                    console.log('✅ WebGL rendering enabled on separate canvas');
                } else {
                    console.warn('⚠️ WebGL init failed, falling back to Canvas2D');
                    this.useWebGL = false;
                }
            } catch (error) {
                console.error('❌ WebGL error, using Canvas2D:', error);
                this.useWebGL = false;
            }
        } else {
            console.log('ℹ️ WebGL disabled or canvas not available, using Canvas2D only');
        }
        
        // Camera system
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            smoothing: 0.1,
            zoom: 1.0,  // Zoom level (1.0 = 100%, 0.5 = 50%, 2.0 = 200%)
            minZoom: 0.25,
            maxZoom: 3.0,
            snapToTarget: false  // Set to true to instantly snap to target (no smoothing)
        };
    }
    
    /**
     * Update camera position to follow target
     */
    updateCamera(targetX, targetY, canvasWidth, canvasHeight, mapWidth, mapHeight, adjacentMaps = {}) {
        // Store old camera position to detect changes
        const oldCameraX = this.camera.x;
        const oldCameraY = this.camera.y;
        
        // Set camera target to center on player
        this.camera.targetX = targetX - canvasWidth / 2;
        this.camera.targetY = targetY - canvasHeight / 2;
        
        // If map is smaller than viewport, center the map
        if (mapWidth <= canvasWidth) {
            this.camera.targetX = -(canvasWidth - mapWidth) / 2;
        } else {
            // Clamp camera target to map bounds (prevent showing void)
            // UNLESS there is an adjacent map in that direction
            let minX = 0;
            let maxX = mapWidth - canvasWidth;
            
            if (adjacentMaps.west) minX = -Infinity; // Allow scrolling left
            if (adjacentMaps.east) maxX = Infinity;  // Allow scrolling right
            
            this.camera.targetX = Math.max(minX, Math.min(this.camera.targetX, maxX));
        }
        
        if (mapHeight <= canvasHeight) {
            this.camera.targetY = -(canvasHeight - mapHeight) / 2;
        } else {
            // Clamp camera target to map bounds (prevent showing void)
            // UNLESS there is an adjacent map in that direction
            let minY = 0;
            let maxY = mapHeight - canvasHeight;
            
            if (adjacentMaps.north) minY = -Infinity; // Allow scrolling up
            if (adjacentMaps.south) maxY = Infinity;  // Allow scrolling down
            
            this.camera.targetY = Math.max(minY, Math.min(this.camera.targetY, maxY));
        }
        
        // Smooth camera movement (or snap instantly if flag is set)
        if (this.camera.snapToTarget) {
            this.camera.x = this.camera.targetX;
            this.camera.y = this.camera.targetY;
            this.camera.snapToTarget = false; // Reset flag after snapping
        } else {
            this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.smoothing;
            this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.smoothing;
        }
        
        // Safety check for NaN
        if (isNaN(this.camera.x)) {
            console.error('[RenderSystem] ❌ Camera X is NaN! Resetting to 0');
            this.camera.x = 0;
        }
        if (isNaN(this.camera.y)) {
            console.error('[RenderSystem] ❌ Camera Y is NaN! Resetting to 0');
            this.camera.y = 0;
        }
        
        // IMPORTANT: Also clamp the actual camera position after smoothing
        // This ensures the camera never goes outside map bounds, even during smooth movement
        if (mapWidth <= canvasWidth) {
            this.camera.x = -(canvasWidth - mapWidth) / 2;
        } else {
            let minX = 0;
            let maxX = mapWidth - canvasWidth;
            
            if (adjacentMaps.west) minX = -Infinity;
            if (adjacentMaps.east) maxX = Infinity;
            
            this.camera.x = Math.max(minX, Math.min(this.camera.x, maxX));
        }
        
        if (mapHeight <= canvasHeight) {
            this.camera.y = -(canvasHeight - mapHeight) / 2;
        } else {
            let minY = 0;
            let maxY = mapHeight - canvasHeight;
            
            if (adjacentMaps.north) minY = -Infinity;
            if (adjacentMaps.south) maxY = Infinity;
            
            this.camera.y = Math.max(minY, Math.min(this.camera.y, maxY));
        }
        
        // Invalidate light mask if camera moved at all
        const cameraMoved = Math.abs(this.camera.x - oldCameraX) > 0.1 || 
                           Math.abs(this.camera.y - oldCameraY) > 0.1;
        if (cameraMoved && this.lightManager) {
            this.lightManager.invalidateMask();
        }
    }
    
    /**
     * Set light manager reference (for mask invalidation)
     */
    setLightManager(lightManager) {
        this.lightManager = lightManager;
    }
    
    /**
     * Render the game world
     */
    renderWorld(map, objects, npcs, player, game, adjacentMapsData = {}) {
        // Initialize WebGL frame (if using WebGL)
        if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
            // Update perspective settings
            if (game.perspectiveSystem) {
                game.perspectiveSystem.updateRenderer(this.webglRenderer);
            }
            
            this.webglRenderer.beginFrame([0, 0, 0, 0]); // Clear to transparent
            // Pass canvas dimensions for zoom-around-center support
            this.webglRenderer.setCamera(
                this.camera.x, 
                this.camera.y, 
                this.camera.zoom,
                game.CANVAS_WIDTH,
                game.CANVAS_HEIGHT
            );
        }
        
        // Set camera transform for Canvas2D
        this.ctx.save();
        
        // Apply zoom (scale around canvas center for editor)
        const zoom = this.camera.zoom || 1.0;
        if (zoom !== 1.0) {
            // Get logical canvas dimensions
            const canvasWidth = game.CANVAS_WIDTH;
            const canvasHeight = game.CANVAS_HEIGHT;
            
            // Scale around center point
            this.ctx.translate(canvasWidth / 2, canvasHeight / 2);
            this.ctx.scale(zoom, zoom);
            this.ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        }
        
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // Render Adjacent Maps (Backgrounds only)
        this.renderAdjacentBackgrounds(adjacentMapsData, map, game);
        
        // Collect objects from adjacent maps with offsets applied
        const { objects: adjacentObjects, restore: restoreAdjacentObjects } = this.collectAdjacentObjects(adjacentMapsData, map, game);

        // Render all objects with simple depth sorting (no layers)
        this.renderMapAndObjects(map, objects, npcs, player, game, adjacentObjects);
        
        // Restore adjacent objects to their original positions
        restoreAdjacentObjects();

        // Render vector zones if debug mode is enabled (but NOT if editor is active - editor renders them itself)
        const editorIsActive = game.editorManager && game.editorManager.isActive;
        if (game.settings && game.settings.showDebugInfo && !editorIsActive) {
            this.renderVectorZones(game);
        }
        
        // Render weather effects in world space (BEFORE restoring camera transform)
        if (game?.currentMap?.weather && game?.weatherSystem) {
            game.weatherSystem.render();
        }
        
        // Restore camera transform TEMPORARILY for light rendering
        this.ctx.restore();
        
        // Get logical canvas dimensions
        const canvasWidth = game.CANVAS_WIDTH;
        const canvasHeight = game.CANVAS_HEIGHT;
        
        // Get light mask from light manager (if lights exist)
        let lightMask = null;
        if (game?.lightManager && game.lightManager.lights.length > 0) {
            lightMask = game.lightManager.getLightMask(this.camera.x, this.camera.y, canvasWidth, canvasHeight, this.webglRenderer);
        }
        
        // TODO: Render day/night cycle overlay with light mask on WEBGL, not Canvas2D
        // DISABLED: Canvas2D day/night overlay causes placed objects to appear dark and trail
        // The shader needs to be implemented properly on the WebGL canvas instead
        /*
        if (game?.currentMap?.dayNightCycle && game?.dayNightCycle) {
            const weatherState = game?.currentMap?.weather || null;
            console.log(`[RenderSystem] Rendering day/night with mask: ${lightMask ? 'YES' : 'NO'}`);
            game.dayNightCycle.render(this.ctx, canvasWidth, canvasHeight, weatherState, lightMask);
        }
        */
        
        // Render colored light glows on top (optional visual enhancement)
        // This adds the colored light effect after darkness has been properly masked
        if (game?.lightManager && game.lightManager.lights.length > 0) {
            game.lightManager.render(this.ctx, this.camera.x, this.camera.y);
        }
        
        // Re-apply camera transform for editor previews
        this.ctx.save();
        const editorZoom = this.camera.zoom || 1.0;
        if (editorZoom !== 1.0) {
            this.ctx.translate(canvasWidth / 2, canvasHeight / 2);
            this.ctx.scale(editorZoom, editorZoom);
            this.ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        }
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Render light editor previews (only in editor mode)
        if (game?.editorManager?.isActive && game?.lightManager) {
            const showPreviews = game.editorManager.showLightPreviews !== false; // Default true
            game.lightManager.renderEditorPreviews(this.ctx, this.camera.x, this.camera.y, showPreviews, this.webglRenderer);
        }
        
        // Render object placement preview to WebGL (before endFrame)
        // NOTE: Selection boxes are rendered during sprite pass for proper billboard transformation
        if (game?.editorManager?.isActive && this.useWebGL && this.webglRenderer?.initialized) {
            game.editorManager.renderPreviewToWebGL(this.webglRenderer, this.camera.x, this.camera.y);
        }
        
        // Restore camera transform for real
        this.ctx.restore();
        
        // Finalize WebGL frame (if using WebGL)
        if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
            // Update day/night shader params
            if (game?.dayNightCycle) {
                // Check if current map has day/night cycle enabled
                const isDayNightEnabled = game.currentMap && game.currentMap.dayNightCycle;
                
                if (isDayNightEnabled) {
                    const params = game.dayNightCycle.getShaderParams();
                    
                    // Validate params to prevent black screen (NaN protection)
                    if (!params.darknessColor || !Array.isArray(params.darknessColor) || params.darknessColor.some(c => isNaN(c))) {
                        // console.warn('[RenderSystem] Invalid darkness color detected, resetting to white', params.darknessColor);
                        params.darknessColor = [1.0, 1.0, 1.0];
                    }
                    
                    // Force minimum brightness/darkness to prevent total black screen
                    // Even at night, we should see something
                    params.brightness = Math.max(0.2, isNaN(params.brightness) ? 1.0 : params.brightness);
                    
                    // Ensure darkness color isn't pitch black
                    if (params.darknessColor) {
                        params.darknessColor[0] = Math.max(0.1, params.darknessColor[0]);
                        params.darknessColor[1] = Math.max(0.1, params.darknessColor[1]);
                        params.darknessColor[2] = Math.max(0.1, params.darknessColor[2]);
                    }

                    if (isNaN(params.saturation)) params.saturation = 1.0;
                    if (isNaN(params.temperature)) params.temperature = 0.0;
                    
                    this.webglRenderer.setDayNightParams(params);
                } else {
                    // Reset to neutral (Day) if disabled for this map
                    this.webglRenderer.setDayNightParams({
                        brightness: 1.0,
                        contrast: 1.0,
                        saturation: 1.0,
                        temperature: 0.0,
                        darknessColor: [1.0, 1.0, 1.0]
                    });
                }
            }
            
            // Update light mask
            let lightMask = null;
            if (game?.lightManager) {
                // Use logical canvas dimensions for light mask generation
                const canvasWidth = game.CANVAS_WIDTH || 800; // Fallback if undefined
                const canvasHeight = game.CANVAS_HEIGHT || 600;
                
                if (game.lightManager.getLightMask) {
                    lightMask = game.lightManager.getLightMask(this.camera.x, this.camera.y, canvasWidth, canvasHeight, this.webglRenderer);
                }
            }

            if (lightMask && lightMask.width > 0 && lightMask.height > 0) {
                const texture = this.webglRenderer.updateTexture('__light_mask__', lightMask);
                this.webglRenderer.setLightMask(texture);
            } else {
                this.webglRenderer.setLightMask(null);
            }
            
            this.webglRenderer.endFrame();

            // Draw lens flare on top of everything (Screen Space)
            // Only if sun is visible and weather is clear
            if (game?.dayNightCycle) {
                const weather = game.currentMap?.weather;
                // Check if weather allows sun (not raining/snowing)
                // Assuming 'none', 'sunny' or null/undefined means clear weather
                let isClearWeather = !weather || weather === 'none' || weather === 'sunny';
                
                // Handle object-based weather definition (e.g. { precipitation: 'none' })
                if (typeof weather === 'object' && weather !== null) {
                    const precip = weather.precipitation;
                    isClearWeather = !precip || precip === 'none';
                }
                
                // Always try to get sun position if dayNightCycle exists
                const sunPos = game.dayNightCycle.getSunPosition();
                
                // Check time windows for lens flare (8-10am and 2-4pm)
                const time = game.dayNightCycle.timeOfDay;
                
                // Calculate fade factor based on time windows to prevent popping
                // Window 1: 8-10am (peak at 9am)
                // Window 2: 2-4pm (peak at 3pm/15:00)
                let timeFade = 0;
                
                if (time >= 8 && time < 10) {
                    // Fade in 8-9, fade out 9-10. Triangle wave: 0 -> 1 -> 0
                    timeFade = 1 - Math.abs((time - 8) - 1);
                } else if (time >= 14.5 && time < 16.5) {
                    // Fade in 14:30-15:30, fade out 15:30-16:30. Triangle wave
                    timeFade = 1 - Math.abs((time - 14.5) - 1);
                }
                
                if (isClearWeather && timeFade > 0 && sunPos) {
                    // Reset camera to identity for screen-space rendering
                    this.webglRenderer.setCamera(0, 0);
                    
                    // Use calculated intensity combined with time fade
                    const baseIntensity = Math.max(sunPos.intensity, 0.0); 
                    const finalIntensity = baseIntensity * timeFade;
                    
                    if (finalIntensity > 0.01) {
                        this.webglRenderer.drawLensFlare(sunPos.x, sunPos.y, finalIntensity);
                    }
                }
            }
        }
    }
    
    /**
     * Render map background and all objects with simple depth sorting
     */
    renderMapAndObjects(map, objects, npcs, player, game, adjacentObjects = []) {
        // Render map background (with scale applied)
        if (map && map.image && map.image.complete) {
            // Use GLOBAL GAME SCALE if available
            const mapScale = game.GAME_SCALE || map.scale || 1.0;
            const resolutionScale = game?.resolutionScale || 1.0;
            const scaledWidth = map.width * mapScale * resolutionScale;
            const scaledHeight = map.height * mapScale * resolutionScale;
            
            // Use WebGL if available for better performance
            if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
                const imageUrl = map.image.src || `map_bg_${game.currentMapId}`;
                this.webglRenderer.drawSprite(0, 0, scaledWidth, scaledHeight, map.image, imageUrl);
            } else {
                this.ctx.drawImage(map.image, 0, 0, scaledWidth, scaledHeight);
            }
        }
        
        // Render paint layer (if editor has painted textures on this map)
        if (game?.editorManager) {
            const paintLayer = game.editorManager.getPaintLayer(game.currentMapId);
            if (paintLayer) {
                // Use WebGL if available for better performance
                if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
                    // Use consistent cache key for paint layers (same key whether current or adjacent)
                    const imageUrl = `paint_layer_${game.currentMapId}`;
                    const mapScale = game.GAME_SCALE || map.scale || 1.0;
                    const resolutionScale = game?.resolutionScale || 1.0;
                    const scaledWidth = map.width * mapScale * resolutionScale;
                    const scaledHeight = map.height * mapScale * resolutionScale;
                    this.webglRenderer.drawSprite(0, 0, scaledWidth, scaledHeight, paintLayer, imageUrl);
                } else {
                    this.ctx.save();
                    this.ctx.globalAlpha = 1.0;
                    this.ctx.drawImage(paintLayer, 0, 0);
                    this.ctx.restore();
                }
            }
            
            // Render collision layer (if editor has painted collision areas)
            // Only show when debug mode (F1) OR editor is active with collision boxes enabled
            const showCollisions = (game.settings && game.settings.showDebugInfo) || 
                                  (game.editorManager.isActive && game.editorManager.showCollisionBoxes);
            
            const collisionLayer = game.editorManager.getCollisionLayer(game.currentMapId);
            if (collisionLayer && showCollisions) {
                // Use baked image if available for performance
                const imageSource = (collisionLayer._imageReady && collisionLayer._bakedImage) ? collisionLayer._bakedImage : collisionLayer;
                
                // Use WebGL if available
                if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
                    const imageUrl = `collision_layer_${game.currentMapId}`;
                    this.webglRenderer.drawSprite(0, 0, collisionLayer.width, collisionLayer.height, imageSource, imageUrl, 0.3);
                    console.log('[RenderSystem] Collision layer rendered (WebGL)');
                } else {
                    // Canvas2D fallback with outline effect
                    this.ctx.save();
                    
                    // First, draw the semi-transparent red fill
                    this.ctx.globalAlpha = 0.3;
                    this.ctx.globalCompositeOperation = 'source-over';
                    this.ctx.drawImage(imageSource, 0, 0);
                    
                    // Then draw a border by using canvas filters/effects
                    // Create outline by drawing collision layer with stroke effect
                    this.ctx.globalAlpha = 1.0;
                    
                    // Create a temp canvas for the outline
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = imageSource.width;
                    tempCanvas.height = imageSource.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    // Copy collision layer to temp
                    tempCtx.drawImage(imageSource, 0, 0);
                    
                    // Create outline by subtracting a slightly eroded version
                    tempCtx.globalCompositeOperation = 'destination-out';
                    tempCtx.drawImage(imageSource, -2, 0);
                    tempCtx.drawImage(imageSource, 2, 0);
                    tempCtx.drawImage(imageSource, 0, -2);
                    tempCtx.drawImage(imageSource, 0, 2);
                    
                    // Draw the outline (what's left after erosion)
                    this.ctx.drawImage(tempCanvas, 0, 0);
                    
                    this.ctx.restore();
                    console.log('[RenderSystem] Collision layer rendered (Canvas2D)');
                }
            } else if (collisionLayer) {
                // console.log('[RenderSystem] Collision layer exists but showCollisions is false');
            }

            // Render spawn layer (if editor has painted spawn zones)
            // Only show when debug mode (F1) OR editor is active with spawn zones enabled
            const showSpawnZones = (game.settings && game.settings.showDebugInfo) || 
                                  (game.editorManager.isActive && game.editorManager.showSpawnZones);
            
            const spawnLayer = game.editorManager.getSpawnLayer(game.currentMapId);
            if (spawnLayer && showSpawnZones) {
                // Use baked image if available for performance
                const imageSource = (spawnLayer._imageReady && spawnLayer._bakedImage) ? spawnLayer._bakedImage : spawnLayer;
                
                // Use WebGL if available
                if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
                    const imageUrl = `spawn_layer_${game.currentMapId}`;
                    this.webglRenderer.drawSprite(0, 0, spawnLayer.width, spawnLayer.height, imageSource, imageUrl, 0.3);
                } else {
                    // Canvas2D fallback with outline effect
                    this.ctx.save();
                    
                    // First, draw the semi-transparent blue fill
                    this.ctx.globalAlpha = 0.3;
                    this.ctx.globalCompositeOperation = 'source-over';
                    this.ctx.drawImage(imageSource, 0, 0);
                    
                    // Then draw a border by using canvas filters/effects
                    this.ctx.globalAlpha = 1.0;
                    
                    // Create a temp canvas for the outline
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = imageSource.width;
                    tempCanvas.height = imageSource.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    // Copy spawn layer to temp
                    tempCtx.drawImage(imageSource, 0, 0);
                    
                    // Create outline by subtracting a slightly eroded version
                    tempCtx.globalCompositeOperation = 'destination-out';
                    tempCtx.drawImage(imageSource, -2, 0);
                    tempCtx.drawImage(imageSource, 2, 0);
                    tempCtx.drawImage(imageSource, 0, -2);
                    tempCtx.drawImage(imageSource, 0, 2);
                    
                    // Draw the outline
                    this.ctx.drawImage(tempCanvas, 0, 0);
                    
                    this.ctx.restore();
                }
            }
        }
        
        // SHADOW PASS: Render shadows for ALL objects
        // This ensures all shadows are rendered in a single pass to prevent accumulation
        if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
            const allShadowObjects = [...objects, ...npcs, ...adjacentObjects];
            if (player) allShadowObjects.push(player);
            
            if (allShadowObjects.length > 0) {
                this.webglRenderer.beginShadowPass();

                // Render shadows for all objects in the shadow list
                // No depth sorting needed for shadows as they are flattened and MAX blended
                allShadowObjects.forEach(obj => {
                    // Force render to only draw shadow (GameObject checks renderingShadows flag)
                    obj.render(this.ctx, game, this.webglRenderer);
                });

                this.webglRenderer.endShadowPass();
            }
        }

        // Begin sprite pass - sprites render upright (Pin-Up Projection)
        // Their position is transformed by perspective, but their shape stays rectangular
        if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
            this.webglRenderer.beginSpritePass();
        }

        // Collect and sort all renderable objects
        const renderables = [];
        const getDepth = (obj, game) => {
            // Use collision circle center for depth sorting (intentional design choice)
            if (obj.getCollisionCircle) {
                const collisionCircle = obj.getCollisionCircle(game);
                return collisionCircle.centerY;
            }
            // Fallback to sprite center
            const finalScale = obj.getFinalScale ? obj.getFinalScale(game) : 1.0;
            const baseHeight = obj.spriteHeight || obj.fallbackHeight || 0;
            const renderedHeight = baseHeight * finalScale;
            const scaledY = obj.getScaledY ? obj.getScaledY(game) : obj.y;
            return scaledY + (renderedHeight / 2);
        };
        
        npcs.forEach(npc => {
            renderables.push({ obj: npc, depth: getDepth(npc, game) });
        });
        
        if (player) {
            renderables.push({ obj: player, depth: getDepth(player, game) });
        }
        
        objects.forEach(obj => {
            renderables.push({ obj: obj, depth: getDepth(obj, game) });
        });
        
        // Add adjacent objects
        adjacentObjects.forEach(obj => {
            renderables.push({ obj: obj, depth: getDepth(obj, game) });
        });
        
        renderables.sort((a, b) => a.depth - b.depth);
        
        renderables.forEach(({ obj }) => {
            obj.render(this.ctx, game, this.webglRenderer);
        });

        // Render selection boxes INSIDE sprite pass (after objects, so they appear on top)
        // This ensures they get the same billboard transformation as game objects
        if (game?.editorManager?.isActive && this.webglRenderer?.initialized) {
            game.editorManager.renderSelectionToWebGL(this.webglRenderer, this.camera.x, this.camera.y);
        }

        // End sprite pass - return to normal perspective mode
        if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
            this.webglRenderer.endSpritePass();
        }
        
        // Render debug collision boxes if enabled
        const showCollision = (game.settings && game.settings.showDebugInfo) || 
                             (game.editorManager && game.editorManager.isActive && game.editorManager.showCollisionBoxes);
        if (showCollision) {
            this.renderDebugCollisionBoxes(renderables, game);
        }
    }
    
    /**
     * Render collision boxes for debugging with perspective transformation
     * Applies the same trapezoid skew as the game world
     */
    renderDebugCollisionBoxes(renderables, game) {
        const webglRenderer = this.webglRenderer;
        if (!webglRenderer) return;
        
        // Colors in RGBA 0-1 range (NOT premultiplied for stencil approach)
        const fillColor = [1.0, 0.0, 0.0, 0.2];      // Red fill with low alpha
        const strokeColor = [1.0, 0.0, 0.0, 0.8];    // Red stroke
        
        renderables.forEach(({ obj }) => {
            if (obj.hasCollision === false) return;
            
            const shape = obj.collisionShape || 'rectangle';
            
            if (shape === 'circle') {
                const circle = obj.getCollisionCircle(game);
                if (!circle) return;
                
                // Create circle points in world coordinates
                const points = [];
                const segments = 32;
                for (let i = 0; i < segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    points.push({
                        x: circle.centerX + Math.cos(angle) * circle.radiusX,
                        y: circle.centerY + Math.sin(angle) * circle.radiusY
                    });
                }
                
                // Use WebGL with stencil buffer - no overlap artifacts!
                webglRenderer.drawPolygon(points, fillColor, strokeColor, 2);
            } else {
                const bounds = obj.getCollisionBounds(game);
                if (!bounds) return;
                
                // Get the 4 corners in world space
                const corners = [
                    { x: bounds.x, y: bounds.y },
                    { x: bounds.x + bounds.width, y: bounds.y },
                    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
                    { x: bounds.x, y: bounds.y + bounds.height }
                ];
                
                // Use WebGL with stencil buffer - handles perspective automatically!
                webglRenderer.drawPolygon(corners, fillColor, strokeColor, 2);
            }
        });
    }
    
    /**
     * Convert world coordinates to screen coordinates with perspective
     * This applies the same transformation as the WebGL shader
     * Returns null if the point is invalid (behind camera/extreme values)
     */
    worldToScreen(worldX, worldY, screenWidth, screenHeight, perspectiveStrength) {
        const zoom = this.camera.zoom || 1.0;
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        
        // Match WebGL view matrix transformation exactly:
        // tx = centerX - centerX * zoom - cameraX * zoom
        // ty = centerY - centerY * zoom - cameraY * zoom
        // screenPos = worldPos * zoom + t
        const tx = centerX - centerX * zoom - this.camera.x * zoom;
        const ty = centerY - centerY * zoom - this.camera.y * zoom;
        
        let screenX = worldX * zoom + tx;
        let screenY = worldY * zoom + ty;
        
        // Now apply perspective transformation (same math as WebGL shader)
        if (perspectiveStrength > 0) {
            // Convert to clip space (-1 to 1)
            const clipX = (screenX / screenWidth) * 2 - 1;
            const clipY = 1 - (screenY / screenHeight) * 2;  // Flip Y for clip space
            
            // Calculate depth: 0 at bottom, 1 at top (matches shader)
            const depth = (clipY + 1.0) * 0.5;
            
            // Calculate perspective divisor (same as shader)
            const w = 1.0 + (depth * perspectiveStrength);
            
            // Check for invalid w (would cause extreme distortion)
            if (w <= 0.01) {
                return { x: screenX, y: screenY, invalid: true };
            }
            
            // Apply perspective divide
            const perspClipX = clipX / w;
            const perspClipY = clipY / w;
            
            // Convert back to screen coordinates
            screenX = (perspClipX + 1) * 0.5 * screenWidth;
            screenY = (1 - perspClipY) * 0.5 * screenHeight;
        }
        
        return { x: screenX, y: screenY, invalid: false };
    }
    
    /**
     * Render vector zones (collision and spawn) for debugging
     * Uses Canvas2D with perspective transformation
     */
    renderVectorZones(game) {
        const mapData = game.mapManager.maps[game.currentMapId];
        if (!mapData || !mapData.zones) return;
        
        const webglRenderer = this.webglRenderer;
        if (!webglRenderer) return;
        
        // Calculate scale factor to convert stored unscaled coordinates to world coordinates
        const resolutionScale = game.resolutionScale || 1.0;
        const mapScale = mapData.scale || 1.0;
        const totalScale = mapScale * resolutionScale;

        for (const zone of mapData.zones) {
            let fillColor, strokeColor;
            
            if (zone.type === 'collision') {
                // RGBA in 0-1 range (NOT premultiplied)
                fillColor = [1.0, 0.0, 0.0, 0.3];      // Red fill
                strokeColor = [1.0, 0.0, 0.0, 0.8];    // Red stroke
            } else if (zone.type === 'spawn') {
                fillColor = [0.0, 0.4, 1.0, 0.3];      // Blue fill
                strokeColor = [0.0, 0.4, 1.0, 0.8];    // Blue stroke
            } else {
                continue;
            }

            if (zone.points && zone.points.length > 2) {
                // Convert zone points to world coordinates
                const worldPoints = zone.points.map(p => ({
                    x: p.x * totalScale,
                    y: p.y * totalScale
                }));
                
                // Use WebGL with stencil buffer - handles perspective, no artifacts!
                webglRenderer.drawPolygon(worldPoints, fillColor, strokeColor, 2);
            }
        }
    }

    /**
     * Clear the canvas
     */
    clear(width, height) {
        this.ctx.clearRect(0, 0, width, height);
    }
    
    /**
     * Get camera position
     */
    getCameraPosition() {
        return { x: this.camera.x, y: this.camera.y };
    }

    /**
     * Render adjacent maps (backgrounds only)
     */
    renderAdjacentBackgrounds(adjacentMaps, currentMap, game) {
        if (!adjacentMaps || Object.keys(adjacentMaps).length === 0) return;

        const resolutionScale = game.resolutionScale || 1.0;
        const currentMapScale = game.GAME_SCALE || currentMap.scale || 1.0;
        const currentWidth = currentMap.width * currentMapScale * resolutionScale;
        const currentHeight = currentMap.height * currentMapScale * resolutionScale;

        // Helper to render a map background and paint layer at offset
        // mapId is the string key (e.g., "0-0") since mapData doesn't have an id property
        const renderMapBackground = (mapId, mapData, offsetX, offsetY) => {
            if (!mapData || !mapData.image) return;
            
            const mapScale = game.GAME_SCALE || mapData.scale || 1.0;
            const width = mapData.width * mapScale * resolutionScale;
            const height = mapData.height * mapScale * resolutionScale;
            
            // Render Background
            if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
                const imageUrl = mapData.image.src || `map_${mapId}_bg`;
                this.webglRenderer.drawSprite(
                    offsetX, offsetY, 
                    width, height,
                    mapData.image,
                    imageUrl
                );
            } else {
                this.ctx.drawImage(mapData.image, offsetX, offsetY, width, height);
            }
            
            // Render Paint Layer for adjacent map (if exists and has content)
            if (game?.editorManager) {
                // Check if paint layer exists without creating a new empty one
                const paintLayer = game.editorManager.paintLayers[mapId];
                if (paintLayer) {
                    if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
                        const imageUrl = `paint_layer_${mapId}`;
                        this.webglRenderer.drawSprite(offsetX, offsetY, width, height, paintLayer, imageUrl);
                    } else {
                        this.ctx.drawImage(paintLayer, offsetX, offsetY, width, height);
                    }
                }
            }
        };

        // Get the adjacent map IDs from the current map's adjacentMaps config
        const adjacentIds = currentMap.adjacentMaps || {};

        // Render North
        if (adjacentMaps.north && adjacentIds.north) {
            const mapData = adjacentMaps.north;
            const mapScale = game.GAME_SCALE || mapData.scale || 1.0;
            const height = mapData.height * mapScale * resolutionScale;
            renderMapBackground(adjacentIds.north, mapData, 0, -height);
        }

        // Render South
        if (adjacentMaps.south && adjacentIds.south) {
            renderMapBackground(adjacentIds.south, adjacentMaps.south, 0, currentHeight);
        }

        // Render West
        if (adjacentMaps.west && adjacentIds.west) {
            const mapData = adjacentMaps.west;
            const mapScale = game.GAME_SCALE || mapData.scale || 1.0;
            const width = mapData.width * mapScale * resolutionScale;
            renderMapBackground(adjacentIds.west, mapData, -width, 0);
        }

        // Render East
        if (adjacentMaps.east && adjacentIds.east) {
            renderMapBackground(adjacentIds.east, adjacentMaps.east, currentWidth, 0);
        }
    }

    /**
     * Collect objects from adjacent maps and apply offsets
     * Returns { objects: [], restore: function }
     */
    collectAdjacentObjects(adjacentMaps, currentMap, game) {
        if (!adjacentMaps || Object.keys(adjacentMaps).length === 0) return { objects: [], restore: () => {} };

        const resolutionScale = game.resolutionScale || 1.0;
        const currentMapScale = game.GAME_SCALE || currentMap.scale || 1.0;
        const currentWidth = currentMap.width * currentMapScale * resolutionScale;
        const currentHeight = currentMap.height * currentMapScale * resolutionScale;
        const totalScale = currentMapScale * resolutionScale;

        const collectedObjects = [];
        const modifiedObjects = []; // Track objects we modified to restore them later

        const processMap = (mapId, mapData, offsetX, offsetY) => {
            if (!game.objectManager || !game.objectManager.objects[mapId]) return;
            
            const objects = game.objectManager.objects[mapId];
            const unscaledOffsetX = offsetX / totalScale;
            const unscaledOffsetY = offsetY / totalScale;

            objects.forEach(obj => {
                // Store original position
                modifiedObjects.push({
                    obj: obj,
                    originalX: obj.x,
                    originalY: obj.y
                });

                // Apply offset
                obj.x += unscaledOffsetX;
                obj.y += unscaledOffsetY;
                
                collectedObjects.push(obj);
            });
        };

        // North
        if (adjacentMaps.north) {
            const mapData = adjacentMaps.north;
            const height = mapData.height * totalScale;
            processMap(currentMap.adjacentMaps.north, mapData, 0, -height);
        }

        // South
        if (adjacentMaps.south) {
            processMap(currentMap.adjacentMaps.south, adjacentMaps.south, 0, currentHeight);
        }

        // West
        if (adjacentMaps.west) {
            const mapData = adjacentMaps.west;
            const width = mapData.width * totalScale;
            processMap(currentMap.adjacentMaps.west, mapData, -width, 0);
        }

        // East
        if (adjacentMaps.east) {
            processMap(currentMap.adjacentMaps.east, adjacentMaps.east, currentWidth, 0);
        }

        return {
            objects: collectedObjects,
            restore: () => {
                modifiedObjects.forEach(item => {
                    item.obj.x = item.originalX;
                    item.obj.y = item.originalY;
                });
            }
        };
    }
}

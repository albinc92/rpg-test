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
    updateCamera(targetX, targetY, canvasWidth, canvasHeight, mapWidth, mapHeight) {
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
            this.camera.targetX = Math.max(0, Math.min(this.camera.targetX, mapWidth - canvasWidth));
        }
        
        if (mapHeight <= canvasHeight) {
            this.camera.targetY = -(canvasHeight - mapHeight) / 2;
        } else {
            // Clamp camera target to map bounds (prevent showing void)
            this.camera.targetY = Math.max(0, Math.min(this.camera.targetY, mapHeight - canvasHeight));
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
        
        // IMPORTANT: Also clamp the actual camera position after smoothing
        // This ensures the camera never goes outside map bounds, even during smooth movement
        if (mapWidth <= canvasWidth) {
            this.camera.x = -(canvasWidth - mapWidth) / 2;
        } else {
            this.camera.x = Math.max(0, Math.min(this.camera.x, mapWidth - canvasWidth));
        }
        
        if (mapHeight <= canvasHeight) {
            this.camera.y = -(canvasHeight - mapHeight) / 2;
        } else {
            this.camera.y = Math.max(0, Math.min(this.camera.y, mapHeight - canvasHeight));
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
    renderWorld(map, objects, npcs, player, game) {
        // Initialize WebGL frame (if using WebGL)
        if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
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
        
        // Check if layer system is available and has layers
        const hasLayers = game?.layerManager && game.layerManager.hasLayers(game.currentMapId);
        
        if (hasLayers) {
            // Render with layer system
            this.renderWithLayers(map, objects, npcs, player, game);
        } else {
            // Fallback: Render without layers (legacy)
            this.renderLegacy(map, objects, npcs, player, game);
        }
        
        // Collect and sort all renderable objects by y position (for depth sorting)
        const renderables = [];
        
        // Helper function to get render depth based on collision box center
        // This ensures accurate depth sorting for both ground-based and floating objects
        const getDepth = (obj, game) => {
            // Get collision circle which returns the true center of the collision box
            // This accounts for collision offsets and expansion, not just sprite center
            const collisionCircle = obj.getCollisionCircle(game);
            return collisionCircle.centerY;
        };
        
        // Add NPCs
        npcs.forEach(npc => {
            renderables.push({ obj: npc, depth: getDepth(npc, game) });
        });
        
        // Add player
        if (player) {
            renderables.push({ obj: player, depth: getDepth(player, game) });
        }
        
        // Add interactive objects
        objects.forEach(obj => {
            renderables.push({ obj: obj, depth: getDepth(obj, game) });
        });
        
        // Sort by depth position for proper rendering (lower depth = render first = behind)
        renderables.sort((a, b) => a.depth - b.depth);
        
        // Render all objects in sorted order
        renderables.forEach(({ obj }) => {
            obj.render(this.ctx, game, this.webglRenderer);
        });
        
        // Render debug collision boxes if debug mode OR editor collision mode is enabled
        const showCollision = (game.settings && game.settings.showDebugInfo) || 
                             (game.editorManager && game.editorManager.isActive && game.editorManager.showCollisionBoxes);
        if (showCollision) {
            this.renderDebugCollisionBoxes(renderables, game);
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
            lightMask = game.lightManager.getLightMask(this.camera.x, this.camera.y, canvasWidth, canvasHeight);
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
            game.lightManager.renderEditorPreviews(this.ctx, this.camera.x, this.camera.y, showPreviews);
        }
        
        // Render object placement preview to WebGL (before endFrame)
        if (game?.editorManager?.isActive && this.useWebGL && this.webglRenderer?.initialized) {
            game.editorManager.renderPreviewToWebGL(this.webglRenderer, this.camera.x, this.camera.y);
        }
        
        // Restore camera transform for real
        this.ctx.restore();
        
        // Finalize WebGL frame (if using WebGL)
        if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
            this.webglRenderer.endFrame();
        }
    }
    
    /**
     * Render world with layer system
     */
    renderWithLayers(map, objects, npcs, player, game) {
        const layers = game.layerManager.getLayers(game.currentMapId);
        const activeLayerId = game.layerManager.activeLayerId;
        const isEditorActive = game.editorManager && game.editorManager.isActive;
        const showAllMode = isEditorActive && game.editorManager.layerPanel && game.editorManager.layerPanel.isShowAllMode();
        
        // Determine which layers to render - always show all visible layers
        // In edit mode, non-active layers will be dimmed
        const layersToRender = layers.filter(layer => layer.visible);
        
        // Render each layer from bottom to top
        layersToRender.forEach(layer => {
            this.ctx.save();
            
            // Apply dimming for non-active layers in edit mode
            const isActiveLayer = layer.id === activeLayerId;
            const shouldDim = isEditorActive && !showAllMode && !isActiveLayer;
            
            if (shouldDim) {
                this.ctx.globalAlpha = 0.4; // Dim non-active layers
            } else {
                this.ctx.globalAlpha = layer.opacity;
            }
            
            const mapScale = map.scale || 1.0;
            const resolutionScale = game?.resolutionScale || 1.0;
            const scaledWidth = map.width * mapScale * resolutionScale;
            const scaledHeight = map.height * mapScale * resolutionScale;
            
            // 1. Render layer background
            if (layer.backgroundImage && layer.backgroundImage.complete) {
                // Use WebGL or Canvas2D based on availability
                if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
                    // WebGL path - batched GPU rendering
                    const imageUrl = layer.backgroundImage.src || `layer_${layer.id}_bg`;
                    this.webglRenderer.drawSprite(
                        0, 0, 
                        scaledWidth, scaledHeight,
                        layer.backgroundImage,
                        imageUrl
                    );
                } else {
                    // Canvas2D fallback
                    this.ctx.drawImage(layer.backgroundImage, 0, 0, scaledWidth, scaledHeight);
                }
            }
            
            // 2. Render paint canvas (prefer baked image for performance)
            // Paint layer should always be UNDER objects on the same layer
            if (layer.paintImageReady && layer.paintImage) {
                // Use WebGL if available for better performance
                if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
                    const imageUrl = `paint_layer_${layer.id}`;
                    this.webglRenderer.drawSprite(0, 0, scaledWidth, scaledHeight, layer.paintImage, imageUrl);
                } else {
                    this.ctx.drawImage(layer.paintImage, 0, 0);
                }
            } else if (layer.paintCanvas) {
                // Paint canvas is being actively edited
                // MUST render to WebGL canvas (background layer) so it stays UNDER sprites
                if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
                    // Use a temporary cache key for the live paint canvas
                    const imageUrl = `paint_canvas_${layer.id}`;
                    this.webglRenderer.drawSprite(0, 0, scaledWidth, scaledHeight, layer.paintCanvas, imageUrl);
                } else {
                    // Canvas2D fallback
                    this.ctx.drawImage(layer.paintCanvas, 0, 0);
                }
            }
            
            this.ctx.restore();
            
            // 3. Render objects on this layer (filtered by layerId)
            const layerObjects = objects.filter(obj => obj.layerId === layer.id);
            this.renderLayerObjects(layerObjects, npcs, player, game, layer, shouldDim);
        });
        
        // Render objects without layerId (legacy objects) - always on top
        const unassignedObjects = objects.filter(obj => !obj.layerId);
        if (unassignedObjects.length > 0) {
            this.renderLayerObjects(unassignedObjects, npcs, player, game, null, false);
        }
        
        // Render collision layer (if editor has painted collision areas)
        // Only show when debug mode (F1) OR editor is active with collision boxes enabled
        if (game?.editorManager) {
            const showCollisions = (game.settings && game.settings.showDebugInfo) || 
                                  (game.editorManager.isActive && game.editorManager.showCollisionBoxes);
            
            const collisionLayer = game.editorManager.getCollisionLayer(game.currentMapId);
            if (collisionLayer && showCollisions) {
                // Use baked image if available for performance
                const imageSource = (collisionLayer._imageReady && collisionLayer._bakedImage) ? collisionLayer._bakedImage : collisionLayer;
                
                // Use WebGL if available
                if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
                    // Flush any pending draws first so we can draw collision with custom alpha
                    this.webglRenderer.flush();
                    
                    const imageUrl = `collision_layer_${game.currentMapId}`;
                    const texture = this.webglRenderer.textures.get(imageUrl) || this.webglRenderer.loadTexture(imageSource, imageUrl);
                    
                    // Manually draw with alpha by flushing immediately
                    this.webglRenderer.currentTexture = texture;
                    this.webglRenderer.batchVertices.push(0, 0, collisionLayer.width, 0, collisionLayer.width, collisionLayer.height, 0, collisionLayer.height);
                    this.webglRenderer.batchTexCoords.push(0, 0, 1, 0, 1, 1, 0, 1);
                    this.webglRenderer.currentBatchSize = 1;
                    this.webglRenderer.flushWithAlpha(0.3);
                } else {
                    // Canvas2D fallback
                    this.ctx.save();
                    this.ctx.globalAlpha = 0.3;
                    this.ctx.drawImage(imageSource, 0, 0);
                    this.ctx.restore();
                }
            }
            
            // Render spawn zones if enabled (F1 debug mode OR editor)
            const showSpawnZones = (game.settings && game.settings.showDebugInfo) ||
                                   (game.editorManager.isActive && game.editorManager.showSpawnZones);
            const spawnLayer = game.editorManager.getSpawnLayer(game.currentMapId);
            if (spawnLayer && showSpawnZones) {
                // Use baked image if available for performance
                const imageSource = (spawnLayer._imageReady && spawnLayer._bakedImage) ? spawnLayer._bakedImage : spawnLayer;
                
                // Use WebGL if available
                if (this.useWebGL && this.webglRenderer && this.webglRenderer.initialized) {
                    // Flush any pending draws first so we can draw spawn with custom alpha
                    this.webglRenderer.flush();
                    
                    const imageUrl = `spawn_layer_${game.currentMapId}`;
                    const texture = this.webglRenderer.textures.get(imageUrl) || this.webglRenderer.loadTexture(imageSource, imageUrl);
                    
                    // Manually draw with alpha by flushing immediately
                    this.webglRenderer.currentTexture = texture;
                    this.webglRenderer.batchVertices.push(0, 0, spawnLayer.width, 0, spawnLayer.width, spawnLayer.height, 0, spawnLayer.height);
                    this.webglRenderer.batchTexCoords.push(0, 0, 1, 0, 1, 1, 0, 1);
                    this.webglRenderer.currentBatchSize = 1;
                    this.webglRenderer.flushWithAlpha(0.5);
                } else {
                    // Canvas2D fallback
                    this.ctx.save();
                    this.ctx.globalAlpha = 0.5;
                    this.ctx.drawImage(imageSource, 0, 0);
                    this.ctx.restore();
                }
            }
        }
    }
    
    /**
     * Render objects on a specific layer with depth sorting
     */
    renderLayerObjects(layerObjects, npcs, player, game, layer, shouldDim) {
        const renderables = [];
        
        // Helper function to get render depth
        const getDepth = (obj, game) => {
            const finalScale = obj.getFinalScale(game);
            const baseHeight = obj.spriteHeight || obj.fallbackHeight || 0;
            const renderedHeight = baseHeight * finalScale;
            const scaledY = obj.getScaledY(game);
            return scaledY + (renderedHeight / 2);
        };
        
        // Add layer objects
        layerObjects.forEach(obj => {
            renderables.push({ obj: obj, depth: getDepth(obj, game) });
        });
        
        // Add NPCs and player on top layer only (or if no layer specified - legacy)
        const isTopLayer = !layer || (layer && layer.zIndex === Math.max(...game.layerManager.getLayers(game.currentMapId).map(l => l.zIndex)));
        
        if (isTopLayer) {
            npcs.forEach(npc => {
                renderables.push({ obj: npc, depth: getDepth(npc, game) });
            });
            
            if (player) {
                renderables.push({ obj: player, depth: getDepth(player, game) });
            }
        }
        
        // Sort by depth
        renderables.sort((a, b) => a.depth - b.depth);
        
        // SHADOW PASS: Render all shadows to off-screen buffer (prevents stacking)
        if (this.webglRenderer && this.webglRenderer.initialized) {
            this.webglRenderer.beginShadowPass();
            // Objects will check webglRenderer.renderingShadows flag and only render shadows
        }
        
        // Render with dimming if needed
        this.ctx.save();
        if (shouldDim) {
            this.ctx.globalAlpha = 0.4;
        }
        
        renderables.forEach(({ obj }) => {
            obj.render(this.ctx, game, this.webglRenderer);
        });
        
        // END SHADOW PASS: Composite shadows to main buffer
        if (this.webglRenderer && this.webglRenderer.initialized && this.webglRenderer.renderingShadows) {
            this.webglRenderer.endShadowPass();
        }
        
        this.ctx.restore();
    }
    
    /**
     * Legacy rendering without layers
     */
    renderLegacy(map, objects, npcs, player, game) {
        // Render map background (with scale applied)
        if (map && map.image && map.image.complete) {
            const mapScale = map.scale || 1.0;
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
                    const imageUrl = `paint_legacy_${game.currentMapId}`;
                    const mapScale = map.scale || 1.0;
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
                console.log('[RenderSystem] Collision layer exists but showCollisions is false');
            }
        }
        
        // Collect and sort all renderable objects
        const renderables = [];
        const getDepth = (obj, game) => {
            const finalScale = obj.getFinalScale(game);
            const baseHeight = obj.spriteHeight || obj.fallbackHeight || 0;
            const renderedHeight = baseHeight * finalScale;
            const scaledY = obj.getScaledY(game);
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
        
        renderables.sort((a, b) => a.depth - b.depth);
        
        renderables.forEach(({ obj }) => {
            obj.render(this.ctx, game, this.webglRenderer);
        });
        
        // Render debug collision boxes if enabled
        const showCollision = (game.settings && game.settings.showDebugInfo) || 
                             (game.editorManager && game.editorManager.isActive && game.editorManager.showCollisionBoxes);
        if (showCollision) {
            this.renderDebugCollisionBoxes(renderables, game);
        }
    }
    
    /**
     * Render collision boxes for debugging (now pixel-perfect with sprite scaling)
     */
    renderDebugCollisionBoxes(renderables, game) {
        this.ctx.save();
        
        // Draw collision boxes for all objects
        renderables.forEach(({ obj }) => {
            // Skip objects with hasCollision explicitly set to false
            if (obj.hasCollision === false) return;
            
            const shape = obj.collisionShape || 'rectangle';
            
            // Draw circular collision box
            if (shape === 'circle') {
                const circle = obj.getCollisionCircle(game);
                
                // Draw collision ellipse/circle with red outline
                this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.ellipse(
                    circle.centerX,
                    circle.centerY,
                    circle.radiusX,
                    circle.radiusY,
                    0, 0, Math.PI * 2
                );
                this.ctx.stroke();
                
                // Fill with semi-transparent red
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                this.ctx.fill();
            } else {
                // Draw rectangular collision box
                const bounds = obj.getCollisionBounds(game);
                
                // Draw collision box with red outline
                this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(
                    bounds.x,
                    bounds.y,
                    bounds.width,
                    bounds.height
                );
                
                // Fill with semi-transparent red
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                this.ctx.fillRect(
                    bounds.x,
                    bounds.y,
                    bounds.width,
                    bounds.height
                );
            }
            
            // Draw a small circle at the object's actual position (center point)
            const scaledX = obj.getScaledX(game);
            const scaledY = obj.getScaledY(game);
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(scaledX, scaledY, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.restore();
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
}

/**
 * RenderSystem - Handles all rendering logic
 * Responsible for: camera, layers, sprite rendering, UI
 */
class RenderSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Camera system
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            smoothing: 0.1,
            zoom: 1.0,  // Zoom level (1.0 = 100%, 0.5 = 50%, 2.0 = 200%)
            minZoom: 0.25,
            maxZoom: 3.0
        };
    }
    
    /**
     * Update camera position to follow target
     */
    updateCamera(targetX, targetY, canvasWidth, canvasHeight, mapWidth, mapHeight) {
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
        
        // Smooth camera movement
        this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.smoothing;
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.smoothing;
        
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
    }
    
    /**
     * Render the game world
     */
    renderWorld(map, objects, npcs, player, game) {
        // Set camera transform
        this.ctx.save();
        
        // Apply zoom (scale around canvas center for editor)
        const zoom = this.camera.zoom || 1.0;
        if (zoom !== 1.0) {
            // Get canvas dimensions
            const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
            const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
            
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
        
        // Helper function to get render depth (bottom of sprite = feet position)
        const getDepth = (obj, game) => {
            const finalScale = obj.getFinalScale(game);
            const baseHeight = obj.spriteHeight || obj.fallbackHeight || 0;
            const renderedHeight = baseHeight * finalScale;
            // Return bottom of sprite using scaled position (y is center, so add half height)
            const scaledY = obj.getScaledY(game);
            return scaledY + (renderedHeight / 2);
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
            obj.render(this.ctx, game);
        });
        
        // Render debug collision boxes if debug mode OR editor collision mode is enabled
        const showCollision = (game.settings && game.settings.showDebugInfo) || 
                             (game.editorManager && game.editorManager.isActive && game.editorManager.showCollisionBoxes);
        if (showCollision) {
            this.renderDebugCollisionBoxes(renderables, game);
        }
        
        // Restore camera transform
        this.ctx.restore();
        
        // Get actual canvas dimensions (not scaled by devicePixelRatio)
        const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Render weather effects in screen space (completely independent of camera/world)
        if (game?.currentMap?.weather && game?.weatherSystem) {
            this.ctx.save();
            // Reset transform but keep devicePixelRatio scaling
            const dpr = window.devicePixelRatio || 1;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            game.weatherSystem.render(canvasWidth, canvasHeight);
            this.ctx.restore();
        }
        
        // Render day/night cycle overlay if enabled for this map
        if (game?.currentMap?.dayNightCycle && game?.dayNightCycle) {
            game.dayNightCycle.render(this.ctx, canvasWidth, canvasHeight);
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
            
            // 1. Render layer background
            if (layer.backgroundImage && layer.backgroundImage.complete) {
                const mapScale = map.scale || 1.0;
                const resolutionScale = game?.resolutionScale || 1.0;
                const scaledWidth = map.width * mapScale * resolutionScale;
                const scaledHeight = map.height * mapScale * resolutionScale;
                this.ctx.drawImage(layer.backgroundImage, 0, 0, scaledWidth, scaledHeight);
            }
            
            // 2. Render paint canvas (prefer baked image for performance)
            if (layer.paintImageReady && layer.paintImage) {
                this.ctx.drawImage(layer.paintImage, 0, 0);
            } else if (layer.paintCanvas) {
                this.ctx.drawImage(layer.paintCanvas, 0, 0);
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
                
                this.ctx.save();
                this.ctx.globalAlpha = 0.3;
                this.ctx.drawImage(imageSource, 0, 0);
                this.ctx.restore();
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
        
        // Render with dimming if needed
        this.ctx.save();
        if (shouldDim) {
            this.ctx.globalAlpha = 0.4;
        }
        
        renderables.forEach(({ obj }) => {
            obj.render(this.ctx, game);
        });
        
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
            this.ctx.drawImage(map.image, 0, 0, scaledWidth, scaledHeight);
        }
        
        // Render paint layer (if editor has painted textures on this map)
        if (game?.editorManager) {
            const paintLayer = game.editorManager.getPaintLayer(game.currentMapId);
            if (paintLayer) {
                this.ctx.save();
                this.ctx.globalAlpha = 1.0;
                this.ctx.drawImage(paintLayer, 0, 0);
                this.ctx.restore();
            }
            
            // Render collision layer (if editor has painted collision areas)
            // Only show when debug mode (F1) OR editor is active with collision boxes enabled
            const showCollisions = (game.settings && game.settings.showDebugInfo) || 
                                  (game.editorManager.isActive && game.editorManager.showCollisionBoxes);
            
            const collisionLayer = game.editorManager.getCollisionLayer(game.currentMapId);
            if (collisionLayer && showCollisions) {
                // Use baked image if available for performance
                const imageSource = (collisionLayer._imageReady && collisionLayer._bakedImage) ? collisionLayer._bakedImage : collisionLayer;
                
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
                console.log('[RenderSystem] Collision layer rendered');
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
            obj.render(this.ctx, game);
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
            if (!obj.hasCollision) return;
            
            // Get collision bounds with proper scaling
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

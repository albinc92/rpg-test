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
            smoothing: 0.1
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
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Render map background (with scale applied)
        if (map && map.image && map.image.complete) {
            const mapScale = map.scale || 1.0;
            const scaledWidth = map.width * mapScale;
            const scaledHeight = map.height * mapScale;
            this.ctx.drawImage(map.image, 0, 0, scaledWidth, scaledHeight);
        }
        
        // Collect and sort all renderable objects by y position (for depth sorting)
        const renderables = [];
        
        // Helper function to get render depth (bottom of sprite = feet position)
        const getDepth = (obj, game) => {
            const finalScale = obj.getFinalScale(game);
            const mapScale = game?.currentMap?.scale || 1.0;
            const baseHeight = obj.spriteHeight || obj.fallbackHeight || 0;
            const renderedHeight = baseHeight * finalScale * mapScale;
            // Return bottom of sprite (y is center, so add half height)
            return obj.y + (renderedHeight / 2);
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
        
        // Render debug collision boxes if debug mode is enabled
        if (game.settings && game.settings.showDebugInfo) {
            this.renderDebugCollisionBoxes(renderables, game);
        }
        
        // Restore camera transform
        this.ctx.restore();
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
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(obj.x, obj.y, 3, 0, Math.PI * 2);
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

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
        
        // Add NPCs
        npcs.forEach(npc => {
            renderables.push({ obj: npc, y: npc.y + (npc.spriteHeight || 0) });
        });
        
        // Add player
        if (player) {
            renderables.push({ obj: player, y: player.y + (player.spriteHeight || 0) });
        }
        
        // Add interactive objects
        objects.forEach(obj => {
            renderables.push({ obj: obj, y: obj.y + (obj.spriteHeight || 0) });
        });
        
        // Sort by y position for proper depth
        renderables.sort((a, b) => a.y - b.y);
        
        // Render all objects in sorted order
        renderables.forEach(({ obj }) => {
            obj.render(this.ctx, game);
        });
        
        // Restore camera transform
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

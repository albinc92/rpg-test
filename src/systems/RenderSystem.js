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
        
        // Clamp camera to map bounds
        this.camera.targetX = Math.max(0, Math.min(this.camera.targetX, mapWidth - canvasWidth));
        this.camera.targetY = Math.max(0, Math.min(this.camera.targetY, mapHeight - canvasHeight));
        
        // Smooth camera movement
        this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.smoothing;
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.smoothing;
    }
    
    /**
     * Render the game world
     */
    renderWorld(map, objects, npcs, player) {
        // Set camera transform
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Render map background
        if (map && map.image && map.image.complete) {
            this.ctx.drawImage(map.image, 0, 0);
        }
        
        // Collect and sort all renderable objects by y position (for depth sorting)
        const renderables = [];
        
        // Add NPCs
        npcs.forEach(npc => {
            renderables.push({ obj: npc, y: npc.y + npc.spriteHeight });
        });
        
        // Add player
        if (player) {
            renderables.push({ obj: player, y: player.y + player.spriteHeight });
        }
        
        // Add interactive objects
        objects.forEach(obj => {
            renderables.push({ obj: obj, y: obj.y + obj.spriteHeight });
        });
        
        // Sort by y position for proper depth
        renderables.sort((a, b) => a.y - b.y);
        
        // Render all objects in sorted order
        renderables.forEach(({ obj }) => {
            obj.render(this.ctx);
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

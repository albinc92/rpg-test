/**
 * PerformanceMonitor - Tracks FPS and debug info
 *        // Draw semi-transparent background panel (top-left position, below editor toolbar if active)
        const topOffset = 80; // Position below editor toolbar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, topOffset, panelWidth, panelHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, topOffset, panelWidth, panelHeight);
        
        // Text styling
        ctx.fillStyle = '#00ff00';
        ctx.font = '14px Courier New, monospace';
        ctx.textAlign = 'left';
        
        let y = topOffset + padding;r: FPS tracking, performance metrics, debug display
 */
class PerformanceMonitor {
    constructor() {
        this.fps = 60;
        this.frameCount = 0;
        this.lastSecond = 0;
        this.minFPS = Infinity;
        this.maxFPS = 0;
        this.gracePeriod = 2; // Skip first 2 seconds
        
        this.enabled = true;
    }
    
    /**
     * Update FPS counter
     */
    update(deltaTime) {
        if (!this.enabled) return;
        
        const currentSecond = Math.floor(performance.now() / 1000);
        
        if (currentSecond !== this.lastSecond) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastSecond = currentSecond;
            
            // Track min/max FPS after grace period
            if (this.gracePeriod <= 0) {
                // Initialize min/max on first valid reading
                if (this.minFPS === Infinity) {
                    this.minFPS = this.fps;
                    this.maxFPS = this.fps;
                } else {
                    this.minFPS = Math.min(this.minFPS, this.fps);
                    this.maxFPS = Math.max(this.maxFPS, this.fps);
                }
            } else {
                this.gracePeriod--;
            }
        }
        
        this.frameCount++;
    }
    
    /**
     * Render debug info
     */
    render(ctx, canvasWidth, canvasHeight, currentState, currentMapId) {
        if (!this.enabled) return;
        
        const panelWidth = 260;
        const panelHeight = 226; // Increased for day/night controls + shader info
        const padding = 12;
        const lineHeight = 16;
        
        // Semi-transparent background with border
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, canvasHeight - panelHeight - 10, panelWidth, panelHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, canvasHeight - panelHeight - 10, panelWidth, panelHeight);
        
        // Text styling
        ctx.fillStyle = '#00ff00';
        ctx.font = '14px Courier New, monospace';
        ctx.textAlign = 'left';
        
        let y = canvasHeight - panelHeight + padding;
        
        // FPS info
        ctx.fillText(`FPS: ${this.fps}`, 20, y);
        y += lineHeight;
        
        // Display min/max (show "--" if not yet initialized)
        const minDisplay = this.minFPS === Infinity ? '--' : this.minFPS;
        const maxDisplay = this.maxFPS === 0 ? '--' : this.maxFPS;
        ctx.fillText(`Min: ${minDisplay}  Max: ${maxDisplay}`, 20, y);
        y += lineHeight;
        
        // Game state info
        ctx.fillText(`State: ${currentState}`, 20, y);
        y += lineHeight;
        ctx.fillText(`Map: ${currentMapId}`, 20, y);
        y += lineHeight;
        
        // Player position
        if (game.player) {
            const playerX = Math.round(game.player.x);
            const playerY = Math.round(game.player.y);
            ctx.fillText(`Player: (${playerX}, ${playerY})`, 20, y);
            y += lineHeight;
        }
        
        // Collision boxes indicator
        ctx.fillStyle = '#ff0000';
        ctx.fillText('■ Collision boxes visible', 20, y);
        y += lineHeight;
        
        // Day/Night cycle info (if available)
        if (game?.dayNightCycle && game?.currentMap?.dayNightCycle) {
            y += 4; // Extra spacing
            ctx.fillStyle = '#00ffff';
            ctx.fillText('─── Day/Night Cycle ───', 20, y);
            y += lineHeight;
            
            ctx.fillStyle = '#00ff00';
            const timeStr = game.dayNightCycle.getTimeString();
            const phase = game.dayNightCycle.getCurrentPhase();
            ctx.fillText(`Time: ${timeStr} (${phase})`, 20, y);
            y += lineHeight;
            
            const timeScale = game.dayNightCycle.timeScale;
            ctx.fillText(`Speed: ${timeScale.toFixed(1)}x`, 20, y);
            y += lineHeight;
            
            // Show shader info (WebGL-only now)
            if (game.dayNightCycle.shader && game.dayNightCycle.shader.initialized) {
                const shaderInfo = game.dayNightCycle.shader.getDebugInfo();
                ctx.fillStyle = '#00ff00';
                ctx.fillText(`WebGL Shader: B:${shaderInfo.brightness} S:${shaderInfo.saturation} T:${shaderInfo.temperature}`, 20, y);
                y += lineHeight;
            } else {
                ctx.fillStyle = '#ff0000';
                ctx.fillText('❌ WebGL shader failed to initialize', 20, y);
                y += lineHeight;
            }
            
            // Quick time buttons hint
            ctx.fillStyle = '#666666';
            ctx.font = '11px Courier New, monospace';
            ctx.fillText('Shift+F6: Dawn  Shift+F7: Noon  Shift+F8: Dusk  Shift+F9: Night', 20, y);
            y += 14;
            ctx.fillText('F6: Speed +10x  F7: Speed -10x', 20, y);
            y += lineHeight;
        }
        
        // F1 hint in dimmer color
        ctx.fillStyle = '#666666';
        ctx.font = '12px Courier New, monospace';
        ctx.fillText('Press F1 to toggle debug info', 20, y);
    }
    
    /**
     * Toggle debug display
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    /**
     * Reset FPS tracking
     */
    reset() {
        this.minFPS = Infinity;
        this.maxFPS = 0;
        this.gracePeriod = 2;
        this.frameCount = 0;
    }
    
    /**
     * Get current metrics
     */
    getMetrics() {
        return {
            fps: this.fps,
            minFPS: this.minFPS === Infinity ? null : this.minFPS,
            maxFPS: this.maxFPS === 0 ? null : this.maxFPS
        };
    }
}

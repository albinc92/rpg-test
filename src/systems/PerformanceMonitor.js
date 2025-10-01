/**
 * PerformanceMonitor - Tracks FPS and debug info
 * Responsible for: FPS tracking, performance metrics, debug display
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
        const panelHeight = 128; // Increased height for collision box indicator
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
        
        // Collision boxes indicator
        ctx.fillStyle = '#ff0000';
        ctx.fillText('■ Collision boxes visible', 20, y);
        y += lineHeight + 4;
        
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

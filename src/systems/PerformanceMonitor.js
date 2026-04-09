/**
 * PerformanceMonitor - Tracks FPS and debug info
 * FPS tracking, performance metrics, debug display
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
    render(ctx, canvasWidth, canvasHeight, currentState, currentMapId, settings) {
        if (!this.enabled) return;
        
        // If neither is enabled, don't render anything
        if (!settings?.showFPS && !settings?.showDebugInfo) return;

        const ds = window.ds;

        // Get UI scale from settings (or default to 1.0)
        const uiScale = (settings?.uiScale || 100) / 100;
        
        // Scale helper
        const s = (px) => Math.round(px * uiScale);

        // Color and font tokens from DesignSystem
        const c = ds?.colors;
        const dbg = c?.debug;
        const bgColor = c ? c.alpha(c.background.overlay, 0.5) : 'rgba(0, 0, 0, 0.5)';
        const bgColorStrong = c ? c.alpha(c.background.overlay, 0.8) : 'rgba(0, 0, 0, 0.8)';
        const borderColor = dbg ? c.alpha(dbg.text, 0.3) : 'rgba(0, 255, 0, 0.3)';
        const textColor = dbg?.text || '#00ff00';
        const infoColor = dbg?.info || '#00ffff';
        const warnColor = dbg?.warn || '#ffaa00';
        const dimColor = dbg?.dim || '#666666';
        const highlightColor = dbg?.highlight || '#ff0000';
        const monoFont = ds ? ds.typography.families.mono : "'Consolas', monospace";

        // If ONLY FPS is enabled (and not full debug info)
        if (settings.showFPS && !settings.showDebugInfo) {
            ctx.save();
            ctx.fillStyle = bgColor;
            ctx.fillRect(canvasWidth - s(80), canvasHeight - s(35), s(70), s(25));
            
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(canvasWidth - s(80), canvasHeight - s(35), s(70), s(25));
            
            ctx.fillStyle = textColor;
            ctx.font = `bold ${s(14)}px ${monoFont}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`FPS: ${this.fps}`, canvasWidth - s(45), canvasHeight - s(22.5));
            ctx.restore();
            return;
        }

        // Full Debug Info Panel (includes FPS)
        const panelWidth = s(320);
        const lineHeight = s(16);
        const padding = s(12);
        
        // Calculate total content height
        let contentLines = 6; // FPS, Min/Max, State, Map, Player, Collision
        if (window.game?.dayNightCycle && window.game?.currentMap?.dayNightCycle) {
            contentLines += 6; // Title, Time, Speed, Shader, hint1, hint2
        }
        if (window.game?.biomeWeatherSystem?._initialized) {
            contentLines += 6; // Title, Region, Biome, Channels, Channels2, Reroll timer
            if (window.game._weatherDebugActive) {
                contentLines += 1; // active override label
            }
            contentLines += 1; // F4 hint
        }
        contentLines += 1; // F1 hint
        
        const panelHeight = (contentLines * lineHeight) + (padding * 2) + s(10);
        
        // Semi-transparent background with border
        ctx.fillStyle = bgColorStrong;
        ctx.fillRect(s(10), canvasHeight - panelHeight - s(10), panelWidth, panelHeight);
        
        // Border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(s(10), canvasHeight - panelHeight - s(10), panelWidth, panelHeight);
        
        // Text styling
        ctx.fillStyle = textColor;
        ctx.font = `${s(14)}px ${monoFont}`;
        ctx.textAlign = 'left';
        
        let y = canvasHeight - panelHeight + padding;
        
        // FPS info
        ctx.fillText(`FPS: ${this.fps}`, s(20), y);
        y += lineHeight;
        
        // Display min/max (show "--" if not yet initialized)
        const minDisplay = this.minFPS === Infinity ? '--' : this.minFPS;
        const maxDisplay = this.maxFPS === 0 ? '--' : this.maxFPS;
        ctx.fillText(`Min: ${minDisplay}  Max: ${maxDisplay}`, s(20), y);
        y += lineHeight;
        
        // Game state info
        ctx.fillText(`State: ${currentState}`, s(20), y);
        y += lineHeight;
        ctx.fillText(`Map: ${currentMapId}`, s(20), y);
        y += lineHeight;
        
        // Player position
        if (window.game && window.game.player) {
            const playerX = Math.round(window.game.player.x);
            const playerY = Math.round(window.game.player.y);
            ctx.fillText(`Player: (${playerX}, ${playerY})`, s(20), y);
            y += lineHeight;
        }
        
        // Collision boxes indicator
        ctx.fillStyle = highlightColor;
        ctx.fillText('■ Collision boxes visible', s(20), y);
        y += lineHeight;
        
        // Day/Night cycle info (if available)
        if (window.game?.dayNightCycle && window.game?.currentMap?.dayNightCycle) {
            y += s(4); // Extra spacing
            ctx.fillStyle = infoColor;
            ctx.fillText('─── Day/Night Cycle ───', s(20), y);
            y += lineHeight;
            
            ctx.fillStyle = textColor;
            const timeStr = window.game.dayNightCycle.getTimeString();
            const phase = window.game.dayNightCycle.getCurrentPhase();
            ctx.fillText(`Time: ${timeStr} (${phase})`, s(20), y);
            y += lineHeight;
            
            const timeScale = window.game.dayNightCycle.timeScale;
            ctx.fillText(`Speed: ${timeScale.toFixed(1)}x`, s(20), y);
            y += lineHeight;
            
            // Show shader info (WebGL-only now)
            if (window.game.dayNightCycle.shader && window.game.dayNightCycle.shader.initialized) {
                const shaderInfo = window.game.dayNightCycle.shader.getDebugInfo();
                ctx.fillStyle = textColor;
                ctx.fillText(`WebGL Shader: B:${shaderInfo.brightness} S:${shaderInfo.saturation} T:${shaderInfo.temperature}`, s(20), y);
                y += lineHeight;
            } else {
                ctx.fillStyle = highlightColor;
                ctx.fillText('❌ WebGL shader failed to initialize', s(20), y);
                y += lineHeight;
            }
            
            // Quick time buttons hint
            ctx.fillStyle = dimColor;
            ctx.font = `${s(11)}px ${monoFont}`;
            ctx.fillText('Shift+F6: Dawn  Shift+F7: Noon  Shift+F8: Dusk  Shift+F9: Night', s(20), y);
            y += s(14);
            ctx.fillText('F6: Speed +10x  F7: Speed -10x', s(20), y);
            y += lineHeight;
        }
        
        // Dynamic Weather info (if BiomeWeatherSystem is active)
        if (window.game?.biomeWeatherSystem?._initialized) {
            const bws = window.game.biomeWeatherSystem;
            const mapId = currentMapId;
            
            y += s(4); // Extra spacing
            ctx.fillStyle = warnColor;
            ctx.font = `${s(14)}px ${monoFont}`;
            ctx.fillText('─── Dynamic Weather ───', s(20), y);
            y += lineHeight;
            
            const region = bws.cellRegion.get(mapId) || '—';
            const biome = bws.cellBiome.get(mapId) || '—';
            
            ctx.fillStyle = textColor;
            ctx.fillText(`Region: ${region}`, s(20), y);
            y += lineHeight;
            ctx.fillText(`Biome: ${biome}`, s(20), y);
            y += lineHeight;
            
            // Weather channels — show actual applied values, not just biome values
            const ch = window.game._weatherDebugActive
                ? (window.game.weatherSystem?.weatherChannels || bws.getWeatherForCell(mapId))
                : bws.getWeatherForCell(mapId);
            ctx.fillText(`Rain:${ch.rain.toFixed(2)} Snow:${ch.snow.toFixed(2)} Wind:${ch.wind.toFixed(2)}`, s(20), y);
            y += lineHeight;
            ctx.fillText(`Fog:${ch.fog.toFixed(2)}  Cloud:${ch.cloud.toFixed(2)}`, s(20), y);
            y += lineHeight;
            
            // Reroll timer
            const remaining = Math.max(0, bws.nextRollInterval - bws.timeSinceLastRoll);
            const mins = Math.floor(remaining / 60);
            const secs = Math.floor(remaining % 60);
            ctx.fillStyle = c ? c.text.muted : '#888888';
            ctx.fillText(`Next reroll: ${mins}m ${secs.toString().padStart(2, '0')}s`, s(20), y);
            y += lineHeight;
            
            // Show active weather override
            if (window.game._weatherDebugActive) {
                const presets = window.game._weatherDebugPresets;
                const idx = window.game._weatherDebugIndex;
                const name = presets?.[idx]?.name || '?';
                ctx.fillStyle = highlightColor;
                ctx.fillText(`⚠ Override: ${name} [${idx + 1}/${presets.length}]`, s(20), y);
                y += lineHeight;
            }
            
            // Weather debug hints
            ctx.fillStyle = dimColor;
            ctx.font = `${s(11)}px ${monoFont}`;
            ctx.fillText('F4: Cycle weather  Shift+F4: Reroll  Ctrl+F4: Clear', s(20), y);
            y += lineHeight;
        }
        
        // F1 hint in dimmer color
        ctx.fillStyle = dimColor;
        ctx.font = `${s(12)}px ${monoFont}`;
        ctx.fillText('Press F1 to toggle debug info', s(20), y);
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

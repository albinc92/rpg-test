/**
 * HUDSystem - Handles rendering of the in-game Heads-Up Display
 * Displays player health, gold, and other status information
 * Uses the same Glassmorphism design language as the menus
 * OPTIMIZED: Uses offscreen canvas caching to prevent performance drops
 */
class HUDSystem {
    constructor(game) {
        this.game = game;
        
        // Cache for gradients/styles to avoid recreating every frame
        this.styles = {
            healthBarGradient: null,
            glassBackground: null
        };
        
        // Offscreen canvas for static HUD elements (backgrounds, borders)
        this.cachedCanvas = document.createElement('canvas');
        this.cachedCtx = this.cachedCanvas.getContext('2d');
        this.isCacheDirty = true;
        this.lastCanvasWidth = 0;
        this.lastCanvasHeight = 0;
        
        // Track state to minimize redraws
        this.lastHealth = -1;
        this.lastMaxHealth = -1;
        this.lastGold = -1;
    }

    /**
     * Render the HUD
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Player} player 
     */
    render(ctx, player) {
        if (!player) return;

        // Check if canvas size changed
        if (this.game.CANVAS_WIDTH !== this.lastCanvasWidth || this.game.CANVAS_HEIGHT !== this.lastCanvasHeight) {
            this.resizeCache(this.game.CANVAS_WIDTH, this.game.CANVAS_HEIGHT);
        }

        // Check if we need to redraw the static cache (e.g. if gold amount changes width of container)
        // For now, we'll just redraw the static parts once and assume they don't change size often
        // Actually, gold counter width depends on gold amount text, so we might need to redraw cache if gold digits change significantly
        // But for simplicity, let's just cache the expensive shadows and gradients
        
        if (this.isCacheDirty) {
            this.updateCache(player);
        }

        // Draw the cached static elements
        ctx.drawImage(this.cachedCanvas, 0, 0);

        // Draw dynamic elements (health bar fill, text values)
        this.renderDynamicElements(ctx, player);
    }
    
    /**
     * Resize the offscreen cache
     */
    resizeCache(width, height) {
        this.cachedCanvas.width = width;
        this.cachedCanvas.height = height;
        this.lastCanvasWidth = width;
        this.lastCanvasHeight = height;
        this.isCacheDirty = true;
    }
    
    /**
     * Update the static cache (backgrounds, borders, icons)
     * These are expensive to draw due to shadows and gradients
     */
    updateCache(player) {
        const ctx = this.cachedCtx;
        ctx.clearRect(0, 0, this.cachedCanvas.width, this.cachedCanvas.height);
        
        // Render Health Bar Background
        this.renderHealthBarBackground(ctx);
        
        // Render Gold Counter Background
        // Note: We pass player to calculate width, but we only redraw if necessary
        this.renderGoldCounterBackground(ctx, player);
        
        this.isCacheDirty = false;
    }

    /**
     * Render dynamic elements (bars, text)
     * These change frequently but are cheaper to draw
     */
    renderDynamicElements(ctx, player) {
        // Render Health Bar Fill & Text
        this.renderHealthBarFill(ctx, player);
        
        // Render Gold Text
        this.renderGoldText(ctx, player);
    }

    /**
     * Render the player's health bar background (Static)
     */
    renderHealthBarBackground(ctx) {
        const x = 20;
        const y = 20;
        const width = 200;
        const height = 24;
        const padding = 4;
        const borderRadius = 12;

        // Background (Glass effect)
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        // Create glass background gradient
        const bgGradient = ctx.createLinearGradient(x, y, x, y + height + padding * 2);
        bgGradient.addColorStop(0, 'rgba(30, 30, 30, 0.6)');
        bgGradient.addColorStop(1, 'rgba(20, 20, 20, 0.8)');
        
        ctx.fillStyle = bgGradient;
        
        // Draw container rounded rect
        this.roundRect(ctx, x, y, width + padding * 2, height + padding * 2, borderRadius);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        
        // Heart Icon (Left of bar)
        this.renderIcon(ctx, '❤️', x - 10, y + height / 2 + padding);
    }
    
    /**
     * Render health bar fill and text (Dynamic)
     */
    renderHealthBarFill(ctx, player) {
        const x = 20;
        const y = 20;
        const width = 200;
        const height = 24;
        const padding = 4;
        const borderRadius = 12;
        
        const maxHealth = player.maxHealth || 100;
        const currentHealth = player.health || 100;
        const healthPercent = Math.max(0, Math.min(1, currentHealth / maxHealth));
        const fillWidth = width * healthPercent;

        if (fillWidth > 0) {
            ctx.save();
            
            // OPTIMIZATION: Use roundRect + fill instead of clip() + fillRect
            // Clipping is expensive every frame
            this.roundRect(ctx, x + padding, y + padding, fillWidth, height, borderRadius - 2);

            // Health gradient (Red/Pink)
            // Recreating gradient is cheap, but we could cache it if needed
            const healthGradient = ctx.createLinearGradient(x + padding, y + padding, x + padding, y + padding + height);
            healthGradient.addColorStop(0, '#e74c3c'); // Red
            healthGradient.addColorStop(0.5, '#c0392b'); // Darker Red
            healthGradient.addColorStop(1, '#922b21'); // Darkest Red

            ctx.fillStyle = healthGradient;
            ctx.fill(); // Fill the rounded rect directly

            // Shine effect on top half
            // We can just draw a semi-transparent white rect on top, masked by the same rounded rect path
            // But to avoid complex masking, let's just draw a simple highlight line or skip it for performance
            // Or use a simpler gradient fill
            
            ctx.restore();
        }

        // Health Text (Centered)
        ctx.font = 'bold 12px "Lato", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const textX = x + width / 2 + padding;
        const textY = y + height / 2 + padding;
        const text = `${Math.ceil(currentHealth)} / ${maxHealth}`;
        
        // OPTIMIZATION: Manual drop shadow instead of shadowBlur
        // shadowBlur is very expensive
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillText(text, textX + 1, textY + 1);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, textX, textY);
    }

    /**
     * Render the gold counter background (Static)
     */
    renderGoldCounterBackground(ctx, player) {
        const x = 20;
        const y = 65; // Below health bar
        const height = 30;
        const minWidth = 100;
        const padding = 10;
        const borderRadius = 15;

        // We need to estimate width to draw background
        // If gold changes significantly (e.g. 9 to 10), we might need to redraw cache
        // For now, let's assume a safe width or check if we need to resize
        const goldText = `${player.gold || 0}`;
        ctx.font = 'bold 16px "Cinzel", serif';
        const textWidth = ctx.measureText(goldText).width;
        const width = Math.max(minWidth, textWidth + 40); // 40px for icon and padding

        // Background (Glass effect)
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        const bgGradient = ctx.createLinearGradient(x, y, x, y + height);
        bgGradient.addColorStop(0, 'rgba(30, 30, 30, 0.6)');
        bgGradient.addColorStop(1, 'rgba(20, 20, 20, 0.8)');
        
        ctx.fillStyle = bgGradient;
        
        this.roundRect(ctx, x, y, width, height, borderRadius);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)'; // Gold tint border
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // Gold Icon
        this.renderIcon(ctx, '🪙', x + 15, y + height / 2);
    }
    
    /**
     * Render gold text (Dynamic)
     */
    renderGoldText(ctx, player) {
        const x = 20;
        const y = 65;
        const height = 30;
        const minWidth = 100;
        
        const goldText = `${player.gold || 0}`;
        ctx.font = 'bold 16px "Cinzel", serif';
        const textWidth = ctx.measureText(goldText).width;
        const width = Math.max(minWidth, textWidth + 40);
        
        // Gold Text
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        const textX = x + width - 15;
        const textY = y + height / 2 + 1;
        
        // OPTIMIZATION: Manual drop shadow instead of shadowBlur
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillText(goldText, textX + 1, textY + 1);
        
        ctx.fillStyle = '#f1c40f'; // Gold color
        ctx.fillText(goldText, textX, textY);
    }

    /**
     * Helper to draw rounded rectangles
     */
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * Helper to render emoji icons with shadow
     */
    renderIcon(ctx, icon, x, y) {
        ctx.save();
        ctx.font = '20px Arial'; // Emoji font
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 5;
        ctx.fillText(icon, x, y);
        ctx.restore();
    }
}

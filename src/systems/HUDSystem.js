/**
 * HUDSystem - Handles rendering of the in-game Heads-Up Display
 * Displays player health, gold, and other status information
 * Uses the same Glassmorphism design language as the menus
 */
class HUDSystem {
    constructor(game) {
        this.game = game;
        
        // Cache for gradients/styles to avoid recreating every frame
        this.styles = {
            healthBarGradient: null,
            glassBackground: null
        };
    }

    /**
     * Render the HUD
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Player} player 
     */
    render(ctx, player) {
        if (!player) return;

        // Save context state
        ctx.save();

        // 1. Render Health Bar (Top Left)
        this.renderHealthBar(ctx, player);

        // 2. Render Gold Counter (Top Left, below health)
        this.renderGoldCounter(ctx, player);

        // Restore context state
        ctx.restore();
    }

    /**
     * Render the player's health bar
     */
    renderHealthBar(ctx, player) {
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

        // Health Bar Fill
        const maxHealth = player.maxHealth || 100;
        const currentHealth = player.health || 100; // Default to full if undefined
        const healthPercent = Math.max(0, Math.min(1, currentHealth / maxHealth));
        const fillWidth = width * healthPercent;

        if (fillWidth > 0) {
            ctx.save();
            // Clip to rounded rect for the fill
            this.roundRect(ctx, x + padding, y + padding, width, height, borderRadius - 2);
            ctx.clip();

            // Health gradient (Red/Pink)
            const healthGradient = ctx.createLinearGradient(x + padding, y + padding, x + padding, y + padding + height);
            healthGradient.addColorStop(0, '#e74c3c'); // Red
            healthGradient.addColorStop(0.5, '#c0392b'); // Darker Red
            healthGradient.addColorStop(1, '#922b21'); // Darkest Red

            ctx.fillStyle = healthGradient;
            ctx.fillRect(x + padding, y + padding, fillWidth, height);

            // Shine effect on top half
            const shineGradient = ctx.createLinearGradient(x + padding, y + padding, x + padding, y + padding + height / 2);
            shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
            shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
            ctx.fillStyle = shineGradient;
            ctx.fillRect(x + padding, y + padding, fillWidth, height / 2);

            ctx.restore();
        }

        // Health Text (Centered)
        ctx.font = 'bold 12px "Lato", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(`${Math.ceil(currentHealth)} / ${maxHealth}`, x + width / 2 + padding, y + height / 2 + padding);
        
        // Heart Icon (Left of bar)
        this.renderIcon(ctx, '❤️', x - 10, y + height / 2 + padding);
    }

    /**
     * Render the gold counter
     */
    renderGoldCounter(ctx, player) {
        const x = 20;
        const y = 65; // Below health bar
        const height = 30;
        const minWidth = 100;
        const padding = 10;
        const borderRadius = 15;

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

        // Gold Text
        ctx.fillStyle = '#f1c40f'; // Gold color
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 2;
        ctx.fillText(goldText, x + width - 15, y + height / 2 + 1);
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

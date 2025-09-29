/**
 * Base GameObject class - shared behavior for all game objects (sprites, collision, rendering)
 */
class GameObject {
    constructor(options = {}) {
        // Position and movement
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Visual properties
        this.direction = options.direction || 'left'; // 'left' or 'right'
        this.width = options.width || 64;
        this.height = options.height || 64;
        this.scale = options.scale || 1.0;
        
        // Sprite handling
        this.spriteSrc = options.spriteSrc || null;
        this.sprite = null;
        this.spriteLoaded = false;
        
        // Shadow and visual effects
        this.altitude = options.altitude || 0;
        this.castsShadow = options.castsShadow !== false; // Default true
        
        // Load sprite if provided
        if (this.spriteSrc) {
            this.loadSprite(this.spriteSrc);
        }
    }
    
    /**
     * Load sprite from source path
     */
    loadSprite(src) {
        this.sprite = new Image();
        this.sprite.onload = () => {
            this.spriteLoaded = true;
            // Update dimensions based on sprite if not explicitly set
            if (!this.width || !this.height) {
                this.width = this.sprite.width * this.scale;
                this.height = this.sprite.height * this.scale;
            }
        };
        this.sprite.onerror = () => {
            console.error(`Failed to load sprite: ${src}`);
        };
        this.sprite.src = src;
    }
    
    /**
     * Update object state (to be overridden by subclasses)
     */
    update(deltaTime, game) {
        // Base update logic - can be extended by subclasses
    }
    
    /**
     * Render the object
     */
    render(ctx, game) {
        if (!this.spriteLoaded || !this.sprite) return;
        
        const mapScale = game.currentMap?.scale || 1.0;
        const scaledWidth = this.width * mapScale;
        const scaledHeight = this.height * mapScale;
        
        // Calculate altitude offset
        const altitudeOffset = this.altitude * mapScale;
        
        // Draw shadow first (if object casts shadows)
        if (this.castsShadow) {
            this.renderShadow(ctx, game, scaledWidth, scaledHeight, altitudeOffset);
        }
        
        // Draw sprite
        this.renderSprite(ctx, game, scaledWidth, scaledHeight, altitudeOffset);
    }
    
    /**
     * Render object's shadow
     */
    renderShadow(ctx, game, width, height, altitudeOffset) {
        game.drawShadow(this.x, this.y, width, height, altitudeOffset);
    }
    
    /**
     * Render object's sprite with direction support
     */
    renderSprite(ctx, game, width, height, altitudeOffset) {
        const screenX = this.x - width / 2;
        const screenY = this.y - height / 2 - altitudeOffset;
        
        ctx.save();
        
        if (this.direction === 'right') {
            // Flip sprite horizontally for right-facing (sprites naturally face left)
            ctx.translate(this.x, this.y - altitudeOffset);
            ctx.scale(-1, 1);
            ctx.drawImage(this.sprite, -width / 2, -height / 2, width, height);
        } else {
            // Default left-facing (no flip needed)
            ctx.drawImage(this.sprite, screenX, screenY, width, height);
        }
        
        ctx.restore();
    }
    
    /**
     * Get bounding box for collision detection
     */
    getBounds() {
        return {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y - this.height / 2,
            bottom: this.y + this.height / 2
        };
    }
    
    /**
     * Check if this object intersects with another
     */
    intersects(other) {
        const thisBounds = this.getBounds();
        const otherBounds = other.getBounds();
        
        return !(thisBounds.right < otherBounds.left ||
                thisBounds.left > otherBounds.right ||
                thisBounds.bottom < otherBounds.top ||
                thisBounds.top > otherBounds.bottom);
    }
    
    /**
     * Calculate distance to another object
     */
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Set position
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    
    /**
     * Move by offset
     */
    move(dx, dy) {
        this.x += dx;
        this.y += dy;
    }
    
    /**
     * Set direction and update sprite orientation
     */
    setDirection(direction) {
        if (direction === 'left' || direction === 'right') {
            this.direction = direction;
        }
    }
}
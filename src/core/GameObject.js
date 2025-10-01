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
        this.scale = options.scale || 1.0;
        
        // Sprite dimensions (will be set when sprite loads)
        this.spriteWidth = 0;
        this.spriteHeight = 0;
        
        // Fallback dimensions if sprite fails to load
        this.fallbackWidth = options.width || 64;
        this.fallbackHeight = options.height || 64;
        
        // Sprite handling
        this.spriteSrc = options.spriteSrc || null;
        this.sprite = null;
        this.spriteLoaded = false;
        
        // Shadow and visual effects
        this.altitude = options.altitude || 0;
        this.castsShadow = options.castsShadow !== false; // Default true
        
        // Collision properties
        this.hasCollision = options.hasCollision !== false; // Default true
        this.collisionPercent = options.collisionPercent || 0.8; // How much of the sprite is solid (0.0 to 1.0)
        this.collisionOffsetY = options.collisionOffsetY || 0; // Vertical offset for collision box
        this.blocksMovement = options.blocksMovement !== false; // Default true - whether this object blocks other objects
        this.canBeBlocked = options.canBeBlocked !== false; // Default true - whether this object can be blocked by others
        
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
            // Store actual sprite dimensions
            this.spriteWidth = this.sprite.width;
            this.spriteHeight = this.sprite.height;
        };
        this.sprite.onerror = () => {
            console.error(`Failed to load sprite: ${src}`);
            // Use fallback dimensions if sprite fails to load
            this.spriteWidth = this.fallbackWidth;
            this.spriteHeight = this.fallbackHeight;
        };
        this.sprite.src = src;
    }
    
    /**
     * Get actual rendered width based on sprite and scale
     */
    getWidth() {
        return (this.spriteWidth || this.fallbackWidth) * this.scale;
    }
    
    /**
     * Get actual rendered height based on sprite and scale
     */
    getHeight() {
        return (this.spriteHeight || this.fallbackHeight) * this.scale;
    }
    
    /**
     * Get final render scale (object scale × resolution scale)
     * This combines per-object artistic scale with screen-size adaptation
     */
    getFinalScale(game) {
        const resolutionScale = game?.resolutionScale || 1.0;
        return this.scale * resolutionScale;
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
        
        // Calculate final scale: object scale × resolution scale × map scale
        const finalScale = this.getFinalScale(game);
        const mapScale = game.currentMap?.scale || 1.0;
        const baseWidth = this.spriteWidth || this.fallbackWidth;
        const baseHeight = this.spriteHeight || this.fallbackHeight;
        const scaledWidth = baseWidth * finalScale * mapScale;
        const scaledHeight = baseHeight * finalScale * mapScale;
        
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
     * Get bounding box for collision detection (full sprite bounds)
     */
    getBounds() {
        const width = this.getWidth();
        const height = this.getHeight();
        return {
            left: this.x - width / 2,
            right: this.x + width / 2,
            top: this.y - height / 2,
            bottom: this.y + height / 2
        };
    }
    
    /**
     * Get collision box (reduced bounds based on collisionPercent)
     */
    getCollisionBounds() {
        const width = this.getWidth();
        const height = this.getHeight();
        const collisionWidth = width * this.collisionPercent;
        const collisionHeight = height * this.collisionPercent;
        const offsetY = this.collisionOffsetY;
        
        return {
            left: this.x - collisionWidth / 2,
            right: this.x + collisionWidth / 2,
            top: this.y - collisionHeight / 2 + offsetY,
            bottom: this.y + collisionHeight / 2 + offsetY
        };
    }
    
    /**
     * Check if this object intersects with another (using full bounds)
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
     * Check if this object's collision box intersects with another's collision box
     */
    collidesWith(other) {
        if (!this.hasCollision || !other.hasCollision) return false;
        
        const thisBounds = this.getCollisionBounds();
        const otherBounds = other.getCollisionBounds();
        
        return !(thisBounds.right < otherBounds.left ||
                thisBounds.left > otherBounds.right ||
                thisBounds.bottom < otherBounds.top ||
                thisBounds.top > otherBounds.bottom);
    }
    
    /**
     * Check if this object would collide with another at a specific position
     */
    wouldCollideAt(x, y, other) {
        if (!this.hasCollision || !other.hasCollision) return false;
        if (!this.canBeBlocked || !other.blocksMovement) return false;
        
        // Temporarily store current position
        const originalX = this.x;
        const originalY = this.y;
        
        // Set test position
        this.x = x;
        this.y = y;
        
        // Check collision
        const collision = this.collidesWith(other);
        
        // Restore original position
        this.x = originalX;
        this.y = originalY;
        
        return collision;
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
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
        this.reverseFacing = options.reverseFacing || false; // Flip sprite horizontally
        
        // Sprite dimensions (will be set when sprite loads, or from options)
        this.spriteWidth = options.spriteWidth || 0;
        this.spriteHeight = options.spriteHeight || 0;
        
        // Fallback dimensions if sprite fails to load
        this.fallbackWidth = options.width || options.spriteWidth || 64;
        this.fallbackHeight = options.height || options.spriteHeight || 64;
        
        // Sprite handling
        this.spriteSrc = options.spriteSrc || null;
        this.sprite = null;
        this.spriteLoaded = false;
        
        // Shadow and visual effects
        this.altitude = options.altitude || 0;
        this.castsShadow = options.castsShadow !== false; // Default true
        
        // Collision properties
        this.hasCollision = options.hasCollision !== false; // Default true
        
        // Collision size - 1:1 with sprite by default
        this.collisionPercent = options.collisionPercent !== undefined ? options.collisionPercent : 1.0; // 1:1 with sprite size
        this.collisionWidthPercent = options.collisionWidthPercent; // Optional: override width percent specifically
        this.collisionHeightPercent = options.collisionHeightPercent; // Optional: override height percent specifically
        
        // Collision box expansion/contraction (as percentage of sprite size, applied after percent scaling)
        this.collisionExpandTopPercent = options.collisionExpandTopPercent || 0;    // Expand upward (negative = shrink)
        this.collisionExpandBottomPercent = options.collisionExpandBottomPercent || 0; // Expand downward (negative = shrink)
        this.collisionExpandLeftPercent = options.collisionExpandLeftPercent || 0;   // Expand left (negative = shrink)
        this.collisionExpandRightPercent = options.collisionExpandRightPercent || 0;  // Expand right (negative = shrink)
        
        // Collision position offsets (as percentage of sprite size, moves entire collision box)
        this.collisionOffsetXPercent = options.collisionOffsetXPercent || 0; // Horizontal offset for collision box
        this.collisionOffsetYPercent = options.collisionOffsetYPercent || 0; // Vertical offset for collision box
        
        // Collision shape - 'rectangle' or 'circle' (ellipse if width != height)
        this.collisionShape = options.collisionShape || 'circle'; // Default to circle for more natural collision
        
        // Collision behavior
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
        console.log(`[GameObject] 🔄 Loading sprite: ${src} (pre-set dimensions: ${this.spriteWidth}x${this.spriteHeight})`);
        this.sprite = new Image();
        this.sprite.onload = () => {
            this.spriteLoaded = true;
            // Store actual sprite dimensions (only if not already set)
            const hadDimensions = this.spriteWidth && this.spriteHeight;
            if (!this.spriteWidth) this.spriteWidth = this.sprite.width;
            if (!this.spriteHeight) this.spriteHeight = this.sprite.height;
            console.log(`[GameObject] ✅ Sprite loaded successfully: ${src}`);
            console.log(`[GameObject] 📐 Dimensions: ${this.spriteWidth}x${this.spriteHeight} (pre-set: ${hadDimensions}, actual: ${this.sprite.width}x${this.sprite.height})`);
        };
        this.sprite.onerror = (error) => {
            console.error(`[GameObject] ❌ Failed to load sprite: ${src}`, error);
            console.error(`[GameObject] 💡 Check if file exists at: ${window.location.origin}/${src}`);
            // Use fallback dimensions if sprite fails to load
            if (!this.spriteWidth) this.spriteWidth = this.fallbackWidth;
            if (!this.spriteHeight) this.spriteHeight = this.fallbackHeight;
        };
        this.sprite.src = src;
        console.log(`[GameObject] 📡 Sprite src set to: ${this.sprite.src}`);
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
     * Get scaled X position for rendering (applies map scale and resolution scale to position)
     */
    getScaledX(game) {
        const resolutionScale = game?.resolutionScale || 1.0;
        const mapScale = game?.currentMap?.scale || 1.0;
        return this.x * mapScale * resolutionScale;
    }
    
    /**
     * Get scaled Y position for rendering (applies map scale and resolution scale to position)
     */
    getScaledY(game) {
        const resolutionScale = game?.resolutionScale || 1.0;
        const mapScale = game?.currentMap?.scale || 1.0;
        return this.y * mapScale * resolutionScale;
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
    render(ctx, game, webglRenderer = null) {
        if (!this.spriteLoaded || !this.sprite) return;
        
        // Calculate final scale: object scale × resolution scale (NO mapScale for objects)
        const finalScale = this.getFinalScale(game);
        const resolutionScale = game?.resolutionScale || 1.0;
        const baseWidth = this.spriteWidth || this.fallbackWidth;
        const baseHeight = this.spriteHeight || this.fallbackHeight;
        const scaledWidth = baseWidth * finalScale;
        const scaledHeight = baseHeight * finalScale;
        
        // Calculate altitude offset (scaled with resolution only)
        const altitudeOffset = this.altitude * resolutionScale;
        
        // Draw shadow first (if object casts shadows AND map has day/night cycle)
        const hasDayNightCycle = game?.currentMap?.dayNightCycle && game?.dayNightCycle;
        if (this.castsShadow && hasDayNightCycle) {
            this.renderShadow(ctx, game, scaledWidth, scaledHeight, altitudeOffset, webglRenderer);
        } else if (!this.castsShadow && this._loggedNoShadow !== true) {
            console.log('[GameObject] No shadow for:', this.id, 'castsShadow:', this.castsShadow);
            this._loggedNoShadow = true; // Only log once per object
        }
        
        // Draw sprite - use WebGL if available, otherwise Canvas2D
        this.renderSprite(ctx, game, scaledWidth, scaledHeight, altitudeOffset, webglRenderer);
    }
    
    /**
     * Render object's shadow
     */
    renderShadow(ctx, game, width, height, altitudeOffset, webglRenderer = null) {
        const scaledX = this.getScaledX(game);
        const scaledY = this.getScaledY(game);
        
        // Use WebGL if available
        if (webglRenderer && webglRenderer.initialized) {
            // Get shadow properties from game engine
            const shadowProps = game.getShadowProperties();
            
            // Calculate shadow opacity with altitude fade
            const altitudeFade = Math.max(0, 1 - (altitudeOffset / 300));
            const finalOpacity = shadowProps.opacity * altitudeFade;
            
            if (finalOpacity <= 0.01) return; // Don't draw invisible shadows
            
            // Get cached sprite silhouette
            const silhouette = game.getSpriteCache(this.sprite, width, height);
            const imageUrl = `shadow_${this.sprite.src}_${Math.round(width)}_${Math.round(height)}`;
            
            // Calculate shadow position (base of sprite)
            const shadowX = scaledX;
            const shadowY = scaledY + (height / 2) + altitudeOffset;
            
            // Draw shadow with WebGL
            webglRenderer.drawShadow(
                shadowX,
                shadowY,
                width,
                height,
                silhouette,
                imageUrl,
                finalOpacity,
                shadowProps.skewX,
                shadowProps.scaleY
            );
        } else {
            // Fallback to Canvas2D
            game.drawShadow(scaledX, scaledY, width, height, altitudeOffset, this.sprite);
        }
    }
    
    /**
     * Render object's sprite with direction support
     */
    renderSprite(ctx, game, width, height, altitudeOffset, webglRenderer = null) {
        const scaledX = this.getScaledX(game);
        const scaledY = this.getScaledY(game);
        const screenX = scaledX - width / 2;
        const screenY = scaledY - height / 2 - altitudeOffset;
        
        // Determine if we should flip horizontally
        // reverseFacing takes priority and forces a flip
        const shouldFlip = this.reverseFacing === true || this.direction === 'right';
        
        // Use WebGL if available
        if (webglRenderer && webglRenderer.initialized) {
            const imageUrl = this.sprite.src || `sprite_${this.id}`;
            webglRenderer.drawSprite(
                screenX, 
                screenY, 
                width, 
                height, 
                this.sprite, 
                imageUrl,
                1.0,        // alpha
                shouldFlip, // flipX
                false       // flipY
            );
        } else {
            // Fallback to Canvas2D
            console.error('[GameObject] CANVAS2D FALLBACK for:', this.id, 'webglRenderer exists?', !!webglRenderer, 'initialized?', webglRenderer?.initialized);
            ctx.save();
            
            if (shouldFlip) {
                // Flip sprite horizontally
                ctx.translate(scaledX, scaledY - altitudeOffset);
                ctx.scale(-1, 1);
                ctx.drawImage(this.sprite, -width / 2, -height / 2, width, height);
            } else {
                // Default rendering (no flip)
                ctx.drawImage(this.sprite, screenX, screenY, width, height);
            }
            
            ctx.restore();
        }
    }
    
    /**
     * Get the actual rendered width (applies scaling: object × resolution)
     * This is what the player actually SEES on screen
     */
    getActualWidth(game) {
        const finalScale = this.getFinalScale(game);
        const baseWidth = this.spriteWidth || this.fallbackWidth;
        return baseWidth * finalScale;
    }
    
    /**
     * Get the actual rendered height (applies scaling: object × resolution)
     * This is what the player actually SEES on screen
     */
    getActualHeight(game) {
        const finalScale = this.getFinalScale(game);
        const baseHeight = this.spriteHeight || this.fallbackHeight;
        return baseHeight * finalScale;
    }
    
    /**
     * Get bounding box for collision detection (full sprite bounds)
     * Now uses actual rendered size to match what player sees
     */
    getBounds(game) {
        const width = this.getActualWidth(game);
        const height = this.getActualHeight(game);
        const scaledX = this.getScaledX(game);
        const scaledY = this.getScaledY(game);
        return {
            x: scaledX - width / 2,
            y: scaledY - height / 2,
            width: width,
            height: height,
            left: scaledX - width / 2,
            right: scaledX + width / 2,
            top: scaledY - height / 2,
            bottom: scaledY + height / 2
        };
    }
    
    /**
     * Get collision box - EXACTLY matches sprite rendering, then applies collision modifications
     * 
     * Steps:
     * 1. Calculate EXACT rendered sprite size (same as render() method)
     * 2. Apply collision percent to shrink/expand the box
     * 3. Apply expansion values (in pixels, all 4 directions)
     * 4. Apply offset to reposition the entire box
     */
    getCollisionBounds(game) {
        // STEP 1: Calculate EXACT rendered size (COPY FROM RENDER METHOD)
        const finalScale = this.getFinalScale(game);
        const baseWidth = this.spriteWidth || this.fallbackWidth;
        const baseHeight = this.spriteHeight || this.fallbackHeight;
        const renderedWidth = baseWidth * finalScale;
        const renderedHeight = baseHeight * finalScale;
        
        // STEP 2: Apply collision percents (shrink/expand from rendered size)
        const widthPercent = this.collisionWidthPercent !== undefined 
            ? this.collisionWidthPercent 
            : this.collisionPercent;
        const heightPercent = this.collisionHeightPercent !== undefined 
            ? this.collisionHeightPercent 
            : this.collisionPercent;
            
        let collisionWidth = renderedWidth * widthPercent;
        let collisionHeight = renderedHeight * heightPercent;
        
        // STEP 3: Apply expansion values in all 4 directions (as percentage of rendered size)
        // Expansion increases the size while also shifting the box position
        const expandLeft = renderedWidth * (this.collisionExpandLeftPercent || 0);
        const expandRight = renderedWidth * (this.collisionExpandRightPercent || 0);
        const expandTop = renderedHeight * (this.collisionExpandTopPercent || 0);
        const expandBottom = renderedHeight * (this.collisionExpandBottomPercent || 0);
        
        collisionWidth += expandLeft + expandRight;
        collisionHeight += expandTop + expandBottom;
        
        // Get scaled position for collision
        const scaledX = this.getScaledX(game);
        const scaledY = this.getScaledY(game);
        
        // Calculate base position (centered on sprite)
        let collisionX = scaledX - collisionWidth / 2;
        let collisionY = scaledY - collisionHeight / 2;
        
        // Adjust for asymmetric expansion (if one side expanded more than the other)
        // Positive expandRight moves box right, positive expandLeft moves box left
        collisionX += (expandRight - expandLeft) / 2;
        // Positive expandBottom moves box down, positive expandTop moves box up
        collisionY += (expandBottom - expandTop) / 2;
        
        // STEP 4: Apply offsets (as percentage of rendered size, moves entire collision box)
        collisionX += renderedWidth * (this.collisionOffsetXPercent || 0);
        collisionY += renderedHeight * (this.collisionOffsetYPercent || 0);
        
        // Return collision bounds
        return {
            x: collisionX,
            y: collisionY,
            width: collisionWidth,
            height: collisionHeight,
            left: collisionX,
            right: collisionX + collisionWidth,
            top: collisionY,
            bottom: collisionY + collisionHeight
        };
    }
    
    /**
     * Get circular collision bounds (center + radius)
     * Returns center point and radius for circular collision detection
     * If collision expand percentages differ, creates ellipse (radiusX != radiusY)
     */
    getCollisionCircle(game) {
        const bounds = this.getCollisionBounds(game);
        
        return {
            centerX: bounds.x + bounds.width / 2,
            centerY: bounds.y + bounds.height / 2,
            radiusX: bounds.width / 2,
            radiusY: bounds.height / 2,
            radius: Math.max(bounds.width, bounds.height) / 2 // Use larger dimension for simple circle-circle tests
        };
    }
    
    /**
     * Check if this object intersects with another (using full bounds)
     */
    intersects(other, game) {
        const thisBounds = this.getBounds(game);
        const otherBounds = other.getBounds(game);
        
        return !(thisBounds.right < otherBounds.left ||
                thisBounds.left > otherBounds.right ||
                thisBounds.bottom < otherBounds.top ||
                thisBounds.top > otherBounds.bottom);
    }
    
    /**
     * Check if this object's collision box intersects with another's collision box
     * Now uses CollisionSystem to support circular/elliptical collision shapes
     */
    collidesWith(other, game) {
        if (!this.hasCollision || !other.hasCollision) return false;
        
        // Use CollisionSystem for proper shape-aware collision detection
        if (game && game.collisionSystem) {
            return game.collisionSystem.checkCollision(this, other, game);
        }
        
        // Fallback to rectangle collision if no collision system available
        const thisBounds = this.getCollisionBounds(game);
        const otherBounds = other.getCollisionBounds(game);
        
        return !(thisBounds.right < otherBounds.left ||
                thisBounds.left > otherBounds.right ||
                thisBounds.bottom < otherBounds.top ||
                thisBounds.top > otherBounds.bottom);
    }
    
    /**
     * Check if this object would collide with another at a specific position
     * Now uses CollisionSystem to support circular/elliptical collision shapes
     */
    wouldCollideAt(x, y, other, game) {
        if (!this.hasCollision || !other.hasCollision) return false;
        if (!this.canBeBlocked || !other.blocksMovement) return false;
        
        // Temporarily store current position
        const originalX = this.x;
        const originalY = this.y;
        
        // Set test position
        this.x = x;
        this.y = y;
        
        // Check collision using CollisionSystem (supports circular shapes)
        const collision = this.collidesWith(other, game);
        
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
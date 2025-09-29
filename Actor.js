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
     * Update actor state (to be overridden by subclasses)
     */
    update(deltaTime, game) {
        // Base update logic - can be extended by subclasses
    }
    
    /**
     * Render the actor
     */
    render(ctx, game) {
        if (!this.spriteLoaded || !this.sprite) return;
        
        const mapScale = game.currentMap?.scale || 1.0;
        const scaledWidth = this.width * mapScale;
        const scaledHeight = this.height * mapScale;
        
        // Calculate altitude offset
        const altitudeOffset = this.altitude * mapScale;
        
        // Draw shadow first (if actor casts shadows)
        if (this.castsShadow) {
            this.renderShadow(ctx, game, scaledWidth, scaledHeight, altitudeOffset);
        }
        
        // Draw sprite
        this.renderSprite(ctx, game, scaledWidth, scaledHeight, altitudeOffset);
    }
    
    /**
     * Render actor's shadow
     */
    renderShadow(ctx, game, width, height, altitudeOffset) {
        game.drawShadow(this.x, this.y, width, height, altitudeOffset);
    }
    
    /**
     * Render actor's sprite with direction support
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
     * Check if this actor intersects with another
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
     * Calculate distance to another actor
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

/**
 * Actor class - extends GameObject for entities that can move and act
 * (Players, NPCs, enemies, etc.)
 */
class Actor extends GameObject {
    constructor(options = {}) {
        super(options);
        
        // Movement properties
        this.maxSpeed = options.maxSpeed || 200;
        this.acceleration = options.acceleration || 800;
        this.friction = options.friction || 0.8;
        
        // Actor-specific properties
        this.health = options.health || 100;
        this.maxHealth = options.maxHealth || 100;
        this.isMoving = false;
        
        // AI/Behavior properties
        this.behaviorType = options.behaviorType || 'static'; // 'static', 'roaming', 'following', etc.
        this.movementSpeed = options.movementSpeed || 1.0;
    }
    
    /**
     * Update actor with movement and AI
     */
    update(deltaTime, game) {
        super.update(deltaTime, game);
        
        // Update movement state
        this.isMoving = Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1;
        
        // Apply behavior (to be overridden by subclasses)
        this.updateBehavior(deltaTime, game);
        
        // Apply physics
        this.updatePhysics(deltaTime, game);
    }
    
    /**
     * Update behavior (to be overridden by subclasses)
     */
    updateBehavior(deltaTime, game) {
        // Base behavior - static by default
    }
    
    /**
     * Apply physics and movement
     */
    updatePhysics(deltaTime, game) {
        // Apply velocity to position
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        
        // Apply friction
        const frictionFactor = Math.pow(this.friction, deltaTime * 60);
        this.velocityX *= frictionFactor;
        this.velocityY *= frictionFactor;
        
        // Clamp velocity to max speed
        const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (currentSpeed > this.maxSpeed) {
            const speedRatio = this.maxSpeed / currentSpeed;
            this.velocityX *= speedRatio;
            this.velocityY *= speedRatio;
        }
    }
    
    /**
     * Apply movement input
     */
    applyMovement(inputX, inputY, deltaTime) {
        const accelerationPerSecond = this.acceleration * deltaTime;
        
        // Normalize diagonal input
        if (inputX !== 0 && inputY !== 0) {
            inputX *= 0.707;
            inputY *= 0.707;
        }
        
        // Apply acceleration
        this.velocityX += inputX * accelerationPerSecond;
        this.velocityY += inputY * accelerationPerSecond;
        
        // Update direction based on movement
        if (inputX > 0) {
            this.setDirection('right');
        } else if (inputX < 0) {
            this.setDirection('left');
        }
    }
    
    /**
     * Take damage
     */
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        return this.health <= 0; // Returns true if actor is dead
    }
    
    /**
     * Heal
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
    
    /**
     * Check if actor is alive
     */
    isAlive() {
        return this.health > 0;
    }
}
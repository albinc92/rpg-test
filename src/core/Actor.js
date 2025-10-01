/**
 * Actor class - extends GameObject for entities that can move and act
 * (Players, NPCs, enemies, etc.)
 */
class Actor extends GameObject {
    constructor(options = {}) {
        super({
            hasCollision: true,
            blocksMovement: true,
            canBeBlocked: true,
            collisionPercent: 0.4, // Actors typically use lower body for collision (40%)
            collisionOffsetY: 10, // Collision box towards bottom of sprite (feet area)
            ...options
        });
        
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
        
        // Calculate new position
        const newX = this.x + this.velocityX * deltaTime;
        const newY = this.y + this.velocityY * deltaTime;
        
        // Check collisions if game instance is available and actor can be blocked
        if (game && this.canBeBlocked && (this.velocityX !== 0 || this.velocityY !== 0)) {
            const collision = game.checkActorCollisions(newX, newY, this);
            if (!collision.collides) {
                // Move to new position if no collision
                this.x = newX;
                this.y = newY;
            } else {
                // Try sliding along walls by testing X and Y movement separately
                const collisionX = game.checkActorCollisions(newX, this.y, this);
                if (!collisionX.collides) {
                    this.x = newX; // Can move horizontally
                } else {
                    this.velocityX = 0; // Stop horizontal movement
                }
                
                const collisionY = game.checkActorCollisions(this.x, newY, this);
                if (!collisionY.collides) {
                    this.y = newY; // Can move vertically
                } else {
                    this.velocityY = 0; // Stop vertical movement
                }
            }
        } else {
            // No collision checking - move freely
            this.x = newX;
            this.y = newY;
        }
    }
    
    /**
     * Apply movement input
     */
    applyMovement(inputX, inputY, deltaTime, speedMultiplier = 1.0) {
        const accelerationPerSecond = this.acceleration * deltaTime * speedMultiplier;
        
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
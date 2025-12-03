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
            const collision = game.checkActorCollisions(newX, newY, this, game);
            if (!collision.collides) {
                // Move to new position if no collision
                this.x = newX;
                this.y = newY;
            } else {
                // Diagonal blocked - try sliding along walls by testing X and Y movement separately
                let moved = false;
                
                // Try horizontal movement first
                if (this.velocityX !== 0) {
                    const collisionX = game.checkActorCollisions(newX, this.y, this, game);
                    if (!collisionX.collides) {
                        this.x = newX; // Can slide horizontally
                        moved = true;
                    } else {
                        this.velocityX = 0; // Stop horizontal movement
                    }
                }
                
                // Try vertical movement (even if horizontal succeeded)
                if (this.velocityY !== 0) {
                    const collisionY = game.checkActorCollisions(this.x, newY, this, game);
                    if (!collisionY.collides) {
                        this.y = newY; // Can slide vertically
                        moved = true;
                    } else {
                        this.velocityY = 0; // Stop vertical movement
                    }
                }
                
                // If we couldn't move at all, we're truly stuck - zero out velocity
                if (!moved) {
                    this.velocityX = 0;
                    this.velocityY = 0;
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
        
        // Normalize diagonal input so diagonal movement isn't faster
        // but also doesn't feel slower (same acceleration magnitude)
        const inputLength = Math.sqrt(inputX * inputX + inputY * inputY);
        if (inputLength > 0) {
            inputX /= inputLength;
            inputY /= inputLength;
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
    
}
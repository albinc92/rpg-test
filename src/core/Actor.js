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
    
    /**
     * Render emote bubble overlay (for script `emote` command)
     * Shows emote icons above this actor. Works for NPC, Player, or any Actor.
     */
    renderEmoteOverlay(ctx, game, webglRenderer = null) {
        if (!this._emote || !this._emoteTimer || this._emoteTimer <= 0) return;
        
        const camera = game.camera;
        if (!camera) return;
        
        const canvasWidth = game.CANVAS_WIDTH || ctx.canvas.width;
        const canvasHeight = game.CANVAS_HEIGHT || ctx.canvas.height;
        const worldScale = game.resolutionScale || 1;
        const zoom = camera.zoom || 1;
        
        // Get world position
        const worldX = this.x * worldScale;
        const worldY = this.y * worldScale;
        const finalScale = this.getFinalScale ? this.getFinalScale(game) : (this.scale || 1);
        const spriteHeight = (this.spriteHeight || this.fallbackHeight || 64) * finalScale;
        
        // Calculate screen position (top of sprite)
        const fxOffX = game.cameraEffects ? (game.cameraEffects.swayX + game.cameraEffects.shakeX) : 0;
        const fxOffY = game.cameraEffects ? (game.cameraEffects.swayY + game.cameraEffects.shakeY) : 0;
        const screenX = (worldX - camera.x - fxOffX) * zoom + canvasWidth / 2 * (1 - zoom);
        const screenY = (worldY - spriteHeight / 2 - camera.y - fxOffY) * zoom + canvasHeight / 2 * (1 - zoom);
        
        // Animate: pop in and float up slightly
        const progress = 1 - (this._emoteTimer / 2.0); // 0→1 over 2s
        const popScale = progress < 0.15 ? (progress / 0.15) : 1;
        const fadeOut = this._emoteTimer < 0.3 ? (this._emoteTimer / 0.3) : 1;
        const floatY = -10 * progress;
        
        const bx = screenX;
        const by = screenY - 40 + floatY;
        const size = 28 * popScale;
        
        if (size <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = fadeOut;
        
        // Draw emote bubble background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.ellipse(bx, by, size * 0.6, size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Draw emote symbol
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.round(size * 0.7)}px Arial`;
        
        const emoteSymbols = {
            '!': { text: '!', color: '#ff3333' },
            '?': { text: '?', color: '#3399ff' },
            'heart': { text: '♥', color: '#ff4488' },
            'sweat': { text: '💧', color: '#4488ff' },
            'anger': { text: '💢', color: '#ff2222' },
            'music': { text: '♪', color: '#9944ff' },
            'zzz': { text: 'z', color: '#8888aa' },
            'star': { text: '★', color: '#ffcc00' },
            'dots': { text: '...', color: '#666666' },
        };
        
        const emote = emoteSymbols[this._emote] || { text: this._emote, color: '#333333' };
        ctx.fillStyle = emote.color;
        ctx.fillText(emote.text, bx, by);
        
        ctx.restore();
    }
    
}
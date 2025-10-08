/**
 * Player class - extends Actor for player-controlled character
 */
class Player extends Actor {
    constructor(options = {}) {
        super({
            scale: 1.0,
            maxSpeed: 800,
            acceleration: 2500,
            friction: 0.8,
            spriteSrc: 'assets/npc/main-0.png',
            collisionShape: 'circle',
            collisionExpandTopPercent: -0.8,
            collisionExpandRightPercent: -0.1,
            collisionExpandLeftPercent: -0.1,
            ...options
        });
        
        // Player-specific properties
        this.gold = options.gold || 100;
        
        // Input state
        this.inputX = 0;
        this.inputY = 0;
        this.isRunning = false;
        
        // Footstep audio
        this.footstepTimer = 0;
        this.footstepInterval = 0.4; // Base interval between footsteps (seconds)
        this.wasRunningLastFrame = false;
        
        // Track previous position for actual movement detection
        this.prevX = options.x || 0;
        this.prevY = options.y || 0;
        this.wasMovingLastFrame = false; // Track if player was moving in previous frame
    }
    
    /**
     * Update player behavior
     */
    updateBehavior(deltaTime, game) {
        // Apply speed multiplier to acceleration based on running state
        const speedMultiplier = this.isRunning ? 1.8 : 1.0;
        
        // Player movement is handled by input, not AI
        this.applyMovement(this.inputX, this.inputY, deltaTime, speedMultiplier);
        
        // Handle footstep audio
        this.updateFootsteps(deltaTime, game);
    }
    
    /**
     * Update footstep audio based on movement
     */
    updateFootsteps(deltaTime, game) {
        // Check if player actually moved (compare with previous position)
        const deltaX = this.x - this.prevX;
        const deltaY = this.y - this.prevY;
        const actualMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Calculate movement speed (pixels per second)
        const movementSpeed = actualMovement / deltaTime;
        const isMoving = movementSpeed > 20; // Minimum speed threshold (pixels/second)
        
        // Update previous position for next frame
        this.prevX = this.x;
        this.prevY = this.y;
        
        if (isMoving) {
            // Detect run state change - reset timer immediately to adjust pace
            if (this.isRunning !== this.wasRunningLastFrame) {
                const speedMultiplier = this.isRunning ? 0.65 : 1.0;
                this.footstepInterval = 0.4 * speedMultiplier;
                this.footstepTimer = this.footstepInterval * 0.5; // Half interval for smoother transition
            }
            
            // Only decrement timer if player was already moving last frame
            // This prevents rapid-fire footsteps when transitioning to stopped
            if (this.wasMovingLastFrame) {
                this.footstepTimer -= deltaTime;
                
                if (this.footstepTimer <= 0) {
                    // Play footstep sound
                    game.audioManager?.playEffect('footstep-0.mp3', 0.3);
                    
                    // Set next footstep interval based on speed
                    const speedMultiplier = this.isRunning ? 0.65 : 1.0; // Faster footsteps when running
                    this.footstepInterval = 0.4 * speedMultiplier;
                    this.footstepTimer = this.footstepInterval;
                }
            } else {
                // Just started moving, initialize timer without playing sound
                const speedMultiplier = this.isRunning ? 0.65 : 1.0;
                this.footstepInterval = 0.4 * speedMultiplier;
                this.footstepTimer = this.footstepInterval;
            }
            this.wasMovingLastFrame = true;
            this.wasRunningLastFrame = this.isRunning;
        } else {
            // Reset footstep timer when not moving
            this.footstepTimer = 0;
            this.wasMovingLastFrame = false;
            this.wasRunningLastFrame = false;
        }
    }
    
    /**
     * Set input state (expects object format)
     */
    setInput(input) {
        this.inputX = input.moveX || 0;
        this.inputY = input.moveY || 0;
        this.isRunning = input.isRunning || false;
    }
    
    /**
     * Set player position
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
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
     * Add gold
     */
    addGold(amount) {
        this.gold += amount;
    }
    
    /**
     * Spend gold
     */
    spendGold(amount) {
        if (this.gold >= amount) {
            this.gold -= amount;
            return true;
        }
        return false;
    }
    

    
    /**
     * Get save data
     */
    getSaveData() {
        return {
            x: this.x,
            y: this.y,
            direction: this.direction,
            gold: this.gold
        };
    }
    
    /**
     * Load from save data
     */
    loadSaveData(data) {
        this.x = data.x || this.x;
        this.y = data.y || this.y;
        this.direction = data.direction || this.direction;
        this.gold = data.gold || this.gold;
    }
}
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
        this.footstepInterval = 0.5; // Base interval between footsteps (seconds)
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
        // Check if player is moving
        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        const isMoving = speed > 10; // Minimum speed threshold
        
        if (isMoving) {
            // Update footstep timer
            this.footstepTimer -= deltaTime;
            
            if (this.footstepTimer <= 0) {
                // Play footstep sound
                game.audioManager?.playEffect('footstep-0.mp3', 0.3);
                
                // Set next footstep interval based on speed
                const speedMultiplier = this.isRunning ? 0.7 : 1.0; // Faster footsteps when running
                this.footstepInterval = 0.5 * speedMultiplier;
                this.footstepTimer = this.footstepInterval;
            }
        } else {
            // Reset footstep timer when not moving
            this.footstepTimer = 0;
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
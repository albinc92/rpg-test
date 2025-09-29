/**
 * Player class - extends Actor for player-controlled character
 */
class Player extends Actor {
    constructor(options = {}) {
        super({
            width: 64,
            height: 64,
            maxSpeed: 300,
            acceleration: 800,
            friction: 0.8,
            health: 100,
            spriteSrc: 'assets/npc/main-0.png',
            collisionPercent: 0.25, // Player collision is bottom 25% of sprite (feet area)
            collisionOffsetY: 15, // Collision box at bottom of sprite
            ...options
        });
        
        // Player-specific properties
        this.gold = options.gold || 100;
        this.level = options.level || 1;
        this.experience = options.experience || 0;
        
        // Input state
        this.inputX = 0;
        this.inputY = 0;
        this.isRunning = false;
    }
    
    /**
     * Update player behavior
     */
    updateBehavior(deltaTime, game) {
        // Player movement is handled by input, not AI
        this.applyMovement(this.inputX, this.inputY, deltaTime);
        
        // Adjust speed based on running state
        const speedMultiplier = this.isRunning ? 1.5 : 1.0;
        this.velocityX *= speedMultiplier;
        this.velocityY *= speedMultiplier;
    }
    
    /**
     * Set input state
     */
    setInput(inputX, inputY, isRunning = false) {
        this.inputX = inputX;
        this.inputY = inputY;
        this.isRunning = isRunning;
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
     * Add experience
     */
    addExperience(amount) {
        this.experience += amount;
        // Check for level up (simple formula)
        const requiredExp = this.level * 100;
        if (this.experience >= requiredExp) {
            this.levelUp();
        }
    }
    
    /**
     * Level up
     */
    levelUp() {
        this.level++;
        this.experience = 0;
        this.maxHealth += 20;
        this.health = this.maxHealth; // Full heal on level up
        console.log(`Level up! Now level ${this.level}`);
    }
    
    /**
     * Get save data
     */
    getSaveData() {
        return {
            x: this.x,
            y: this.y,
            direction: this.direction,
            gold: this.gold,
            level: this.level,
            experience: this.experience,
            health: this.health,
            maxHealth: this.maxHealth
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
        this.level = data.level || this.level;
        this.experience = data.experience || this.experience;
        this.health = data.health || this.health;
        this.maxHealth = data.maxHealth || this.maxHealth;
    }
}
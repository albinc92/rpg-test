/**
 * NPC class - extends Actor for non-player characters
 */
class NPC extends Actor {
    constructor(options = {}) {
        super({
            width: 64,
            height: 64,
            maxSpeed: 100,
            behaviorType: 'static',
            ...options
        });
        
        // NPC-specific properties
        this.id = options.id || `npc_${Date.now()}`;
        this.name = options.name || 'Unknown NPC';
        this.type = options.type || 'dialogue'; // 'dialogue', 'merchant', 'guard', etc.
        this.mapId = options.mapId || null;
        
        // Dialogue system
        this.messages = options.messages || [];
        this.currentMessageIndex = 0;
        
        // Interaction
        this.interactionRadius = options.interactionRadius || 80;
        this.canInteract = options.canInteract !== false;
        
        // NPC state
        this.mood = options.mood || 'neutral'; // 'friendly', 'neutral', 'hostile', etc.
        this.faction = options.faction || null;
    }
    
    /**
     * Update NPC behavior
     */
    updateBehavior(deltaTime, game) {
        switch (this.behaviorType) {
            case 'static':
                // No movement
                break;
            case 'roaming':
                this.updateRoaming(deltaTime, game);
                break;
            case 'following':
                this.updateFollowing(deltaTime, game);
                break;
        }
    }
    
    /**
     * Update roaming behavior
     */
    updateRoaming(deltaTime, game) {
        // Simple roaming AI - change direction occasionally
        if (Math.random() < 0.02) { // 2% chance per frame
            const directions = [-1, 0, 1];
            const newDirX = directions[Math.floor(Math.random() * directions.length)];
            const newDirY = directions[Math.floor(Math.random() * directions.length)];
            
            this.applyMovement(newDirX * this.movementSpeed, newDirY * this.movementSpeed, deltaTime);
        }
    }
    
    /**
     * Update following behavior
     */
    updateFollowing(deltaTime, game) {
        if (game.player) {
            const dx = game.player.x - this.x;
            const dy = game.player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Follow if far enough away
            if (distance > 100) {
                const moveX = (dx / distance) * this.movementSpeed;
                const moveY = (dy / distance) * this.movementSpeed;
                this.applyMovement(moveX, moveY, deltaTime);
            }
        }
    }
    
    /**
     * Check if player can interact with this NPC
     */
    canPlayerInteract(player) {
        if (!this.canInteract) return false;
        return this.distanceTo(player) <= this.interactionRadius;
    }
    
    /**
     * Get current dialogue message
     */
    getCurrentMessage() {
        if (this.messages.length === 0) return null;
        return this.messages[this.currentMessageIndex] || null;
    }
    
    /**
     * Advance to next dialogue message
     */
    nextMessage() {
        if (this.currentMessageIndex < this.messages.length - 1) {
            this.currentMessageIndex++;
            return this.getCurrentMessage();
        }
        return null; // End of dialogue
    }
    
    /**
     * Reset dialogue to beginning
     */
    resetDialogue() {
        this.currentMessageIndex = 0;
    }
    
    /**
     * Handle interaction with player
     */
    interact(player, game) {
        switch (this.type) {
            case 'dialogue':
                return this.handleDialogue(player, game);
            case 'merchant':
                return this.handleMerchant(player, game);
            case 'guard':
                return this.handleGuard(player, game);
            case 'quest':
                return this.handleQuest(player, game);
            default:
                return this.handleDialogue(player, game); // Default to dialogue
        }
    }
    
    /**
     * Handle dialogue interaction
     */
    handleDialogue(player, game) {
        const message = this.getCurrentMessage();
        if (message) {
            return {
                type: 'dialogue',
                message: message,
                hasMore: this.currentMessageIndex < this.messages.length - 1
            };
        }
        return { type: 'none' };
    }
    
    /**
     * Handle merchant interaction
     */
    handleMerchant(player, game) {
        return {
            type: 'merchant',
            npc: this,
            message: this.getCurrentMessage() || "Welcome to my shop!"
        };
    }
    
    /**
     * Handle guard interaction
     */
    handleGuard(player, game) {
        const message = this.getCurrentMessage() || "Halt! State your business.";
        return {
            type: 'dialogue',
            message: message,
            hasMore: this.currentMessageIndex < this.messages.length - 1
        };
    }
    
    /**
     * Handle quest interaction
     */
    handleQuest(player, game) {
        const message = this.getCurrentMessage() || "I have a task for you...";
        return {
            type: 'quest',
            message: message,
            npc: this,
            hasMore: this.currentMessageIndex < this.messages.length - 1
        };
    }
    
    /**
     * Get NPC state for saving
     */
    getState() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            direction: this.direction,
            currentMessageIndex: this.currentMessageIndex,
            mood: this.mood,
            faction: this.faction
        };
    }
    
    /**
     * Load NPC state
     */
    loadState(state) {
        this.x = state.x || this.x;
        this.y = state.y || this.y;
        this.direction = state.direction || this.direction;
        this.currentMessageIndex = state.currentMessageIndex || 0;
        this.mood = state.mood || this.mood;
        this.faction = state.faction || this.faction;
    }
}
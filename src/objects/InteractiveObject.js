/**
 * InteractiveObject class - extends GameObject for interactive environmental objects
 * Base class for chests, portals, signs, etc.
 */
class InteractiveObject extends GameObject {
    constructor(options = {}) {
        super({
            width: 64,
            height: 64,
            hasCollision: true,
            blocksMovement: true,
            canBeBlocked: false, // Interactive objects don't get blocked by others
            collisionPercent: 0.6, // Most interactive objects use 60% of their sprite for collision
            ...options
        });
        
        // Interactive properties
        this.id = options.id || `interactive_${Date.now()}`;
        this.name = options.name || 'Interactive Object';
        this.type = options.type || 'generic';
        this.mapId = options.mapId || null;
        
        // Interaction
        this.interactionRadius = options.interactionRadius || 80;
        this.canInteract = options.canInteract !== false;
        this.requiresKey = options.requiresKey || false;
        this.keyId = options.keyId || null;
        
        // State tracking
        this.isActivated = false;
        this.usageCount = 0;
        this.maxUsages = options.maxUsages || -1; // -1 = unlimited
    }
    
    /**
     * Update interactive object
     */
    update(deltaTime, game) {
        super.update(deltaTime, game);
        // Override in subclasses for specific update behavior
    }
    
    /**
     * Check if player can interact with this object
     */
    canPlayerInteract(player) {
        if (!this.canInteract) return false;
        if (this.maxUsages > 0 && this.usageCount >= this.maxUsages) return false;
        if (this.requiresKey && !this.hasRequiredKey(player)) return false;
        return this.distanceTo(player) <= this.interactionRadius;
    }
    
    /**
     * Check if player has required key
     */
    hasRequiredKey(player) {
        if (!this.requiresKey) return true;
        return player.inventory && player.inventory.hasItem(this.keyId);
    }
    
    /**
     * Handle interaction with player - to be overridden by subclasses
     */
    interact(player, game) {
        if (!this.canPlayerInteract(player)) {
            return { type: 'none' };
        }
        
        this.usageCount++;
        this.isActivated = true;
        
        return {
            type: 'generic',
            message: 'You interact with the object.'
        };
    }
    
    /**
     * Get object state for saving
     */
    getState() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            direction: this.direction,
            isActivated: this.isActivated,
            usageCount: this.usageCount
        };
    }
    
    /**
     * Load object state
     */
    loadState(state) {
        this.x = state.x || this.x;
        this.y = state.y || this.y;
        this.direction = state.direction || this.direction;
        this.isActivated = state.isActivated || false;
        this.usageCount = state.usageCount || 0;
    }
}
/**
 * Bush class - extends StaticObject for bush/shrub sprites
 * Handles bush-specific behaviors like rustling and potential hiding spots
 */
class Bush extends StaticObject {
    constructor(options = {}) {
        super({
            type: 'bush',
            name: options.name || 'Bush',
            scale: options.scale || 0.45,
            
            // Bush-specific defaults
            hasCollision: options.hasCollision !== false, // Bushes typically have soft collision
            blocksMovement: options.blocksMovement !== false, // But don't fully block like trees
            castsShadow: false, // Bushes don't cast shadows
            
            // Visual effects - bushes sway more vigorously than trees
            animationType: 'sway',
            animationSpeed: options.animationSpeed || 0.0012,
            animationIntensity: options.animationIntensity || 3.5,
            
            // Environmental properties
            providesShade: false, // Bushes are too low to provide meaningful shade
            makesSound: false,
            soundRadius: 40,
            
            ...options
        });
        
        // Bush-specific properties
        this.bushType = options.bushType || 'generic'; // 'berry', 'flowering', 'thorny', 'generic'
        this.density = options.density || 'medium'; // 'sparse', 'medium', 'dense'
        this.height = options.height || 'low'; // 'low', 'medium'
        
        // Interactive properties
        this.canHideIn = options.canHideIn !== false; // Dense bushes can hide the player
        this.hasBerries = options.hasBerries || false;
        this.berryCount = options.berryCount || 0;
        this.canSearchForItems = options.canSearchForItems || false;
        this.hasBeenSearched = false;
    }
    
    /**
     * Override update to add bush-specific behaviors
     */
    update(deltaTime, game) {
        super.update(deltaTime, game);
        
        // Bushes respond more dramatically to wind than trees
        if (game.weather && game.weather.type === 'windy') {
            this.animationSpeed = 0.003;
            this.animationIntensity = 8.0;
        }
        
        // Regenerate berries over time (if applicable)
        if (this.hasBerries && this.berryCount === 0 && game.gameTime % 60000 < deltaTime) {
            this.berryCount = Math.floor(Math.random() * 3) + 1; // 1-3 berries
            this.hasBeenSearched = false;
        }
    }
    
    /**
     * Check if player is hiding in this bush
     */
    isPlayerHiding(player) {
        if (!this.canHideIn || this.density === 'sparse') return false;
        
        const distance = this.distanceTo(player);
        const hideRadius = this.getWidth() * 0.6; // Player must be very close
        
        return distance < hideRadius;
    }
    
    /**
     * Handle bush interaction (picking berries, searching, etc.)
     */
    interact(player, game) {
        if (!this.canInteract) {
            return { type: 'none' };
        }
        
        // Picking berries
        if (this.hasBerries && this.berryCount > 0) {
            const berriesCollected = this.berryCount;
            this.berryCount = 0;
            
            // Play sound effect
            if (game.audioManager) {
                game.audioManager.playEffect('coin.mp3'); // Reuse coin sound for now
            }
            
            return {
                type: 'collect',
                item: 'berries',
                quantity: berriesCollected,
                message: `You collected ${berriesCollected} berries from the bush!`
            };
        }
        
        // Searching for items
        if (this.canSearchForItems && !this.hasBeenSearched) {
            this.hasBeenSearched = true;
            
            // Random chance to find something
            const findChance = Math.random();
            if (findChance < 0.3) { // 30% chance
                return {
                    type: 'dialogue',
                    message: 'You search the bush but find nothing of interest.'
                };
            } else {
                // Could add items to player inventory here
                return {
                    type: 'dialogue',
                    message: 'You find something hidden in the bush!'
                };
            }
        }
        
        // Default examination
        let message = `A ${this.density} ${this.bushType} bush.`;
        
        if (this.hasBerries) {
            if (this.berryCount > 0) {
                message += ` It has ${this.berryCount} ripe berries.`;
            } else {
                message += ' The berries have all been picked.';
            }
        }
        
        if (this.canHideIn) {
            message += ' You could probably hide in it.';
        }
        
        if (this.hasBeenSearched) {
            message += ' You already searched this bush.';
        }
        
        return {
            type: 'dialogue',
            message: message
        };
    }
    
    /**
     * Get environmental effects - bushes can provide stealth bonus
     */
    getEnvironmentalEffects(player) {
        const effects = super.getEnvironmentalEffects(player);
        
        // Add stealth bonus if player is hiding
        if (this.isPlayerHiding(player)) {
            const stealthBonus = this.density === 'dense' ? 0.8 : 0.5;
            effects.push({ 
                type: 'stealth', 
                bonus: stealthBonus,
                source: 'hiding_in_bush'
            });
        }
        
        return effects;
    }
    
    /**
     * Get bush state for saving
     */
    getState() {
        return {
            ...super.getState(),
            berryCount: this.berryCount,
            hasBeenSearched: this.hasBeenSearched
        };
    }
    
    /**
     * Load bush state
     */
    loadState(state) {
        super.loadState(state);
        this.berryCount = state.berryCount !== undefined ? state.berryCount : this.berryCount;
        this.hasBeenSearched = state.hasBeenSearched || false;
    }
}

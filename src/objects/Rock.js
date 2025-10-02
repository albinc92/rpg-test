/**
 * Rock class - extends StaticObject for rock/boulder sprites
 * Handles rock-specific behaviors like solid collision and potential climbing
 */
class Rock extends StaticObject {
    constructor(options = {}) {
        super({
            type: 'rock',
            name: options.name || 'Rock',
            scale: options.scale || 0.6,
            
            // Rock-specific defaults
            hasCollision: true,
            blocksMovement: true, // Rocks are solid obstacles
            castsShadow: false, // Rocks don't cast shadows (for now)
            
            // Visual effects - rocks don't animate by default
            animationType: 'none',
            animationSpeed: 0,
            animationIntensity: 0,
            
            // Environmental properties
            providesShade: false, // Most rocks are too small for shade
            makesSound: false,
            
            ...options
        });
        
        // Rock-specific properties
        this.rockType = options.rockType || 'boulder'; // 'boulder', 'pebble', 'cliff', 'crystal'
        this.size = options.size || 'medium'; // 'small', 'medium', 'large', 'huge'
        this.material = options.material || 'stone'; // 'stone', 'granite', 'marble', 'crystal', 'obsidian'
        
        // Interactive properties
        this.canClimb = options.canClimb || false; // Some rocks can be climbed
        this.canBeMined = options.canBeMined || false; // Can the player mine resources from it?
        this.mineableResource = options.mineableResource || null; // 'iron_ore', 'gold_ore', etc.
        this.resourceAmount = options.resourceAmount || 0;
        this.hasBeenMined = false;
        
        // Physical properties
        this.canBePushed = options.canBePushed || false; // Small rocks can be pushed
        this.pushWeight = options.pushWeight || 100; // How hard it is to push
    }
    
    /**
     * Override update for rock-specific behaviors
     */
    update(deltaTime, game) {
        super.update(deltaTime, game);
        
        // Rocks are mostly static, but crystal rocks could pulse
        if (this.material === 'crystal' && this.animationType === 'none') {
            this.animationType = 'pulse';
            this.animationSpeed = 0.0005;
            this.animationIntensity = 0.3;
        }
    }
    
    /**
     * Handle rock interaction (examining, mining, climbing)
     */
    interact(player, game) {
        if (!this.canInteract) {
            return { type: 'none' };
        }
        
        // Mining interaction
        if (this.canBeMined && !this.hasBeenMined && this.resourceAmount > 0) {
            // Check if player has mining tool (could add this check)
            // const hasTool = player.inventory.hasItem('pickaxe');
            
            this.hasBeenMined = true;
            const resource = this.mineableResource || 'stone';
            const amount = this.resourceAmount;
            
            // Play mining sound
            if (game.audioManager) {
                game.audioManager.playEffect('coin.mp3'); // Reuse for now
            }
            
            return {
                type: 'mine',
                resource: resource,
                quantity: amount,
                message: `You mined ${amount} ${resource} from the ${this.material} rock!`
            };
        }
        
        if (this.hasBeenMined) {
            return {
                type: 'dialogue',
                message: 'This rock has already been mined.'
            };
        }
        
        // Climbing interaction
        if (this.canClimb) {
            return {
                type: 'dialogue',
                message: `This ${this.size} rock looks climbable, but you need climbing gear.`
            };
        }
        
        // Pushing interaction
        if (this.canBePushed) {
            return {
                type: 'dialogue',
                message: `This ${this.size} rock looks like it could be pushed with some effort.`
            };
        }
        
        // Default examination
        let message = `A ${this.size} ${this.material} ${this.rockType}.`;
        
        if (this.canBeMined && !this.hasBeenMined) {
            message += ` You could mine it for ${this.mineableResource}.`;
        }
        
        return {
            type: 'dialogue',
            message: message
        };
    }
    
    /**
     * Check if player can push this rock
     */
    canPlayerPush(player) {
        if (!this.canBePushed) return false;
        
        // Could check player strength stat here
        // const playerStrength = player.stats?.strength || 10;
        // return playerStrength >= this.pushWeight / 10;
        
        return true;
    }
    
    /**
     * Attempt to push the rock in a direction
     */
    push(direction, force = 1.0) {
        if (!this.canBePushed) return false;
        
        const pushSpeed = force / this.pushWeight * 50;
        
        switch (direction) {
            case 'up':
                this.y -= pushSpeed;
                break;
            case 'down':
                this.y += pushSpeed;
                break;
            case 'left':
                this.x -= pushSpeed;
                break;
            case 'right':
                this.x += pushSpeed;
                break;
        }
        
        return true;
    }
    
    /**
     * Get environmental effects - large rocks can provide cover
     */
    getEnvironmentalEffects(player) {
        const effects = super.getEnvironmentalEffects(player);
        
        // Large rocks provide cover
        if ((this.size === 'large' || this.size === 'huge') && this.distanceTo(player) < this.getWidth()) {
            effects.push({ 
                type: 'cover', 
                value: 0.7,
                source: 'rock_cover'
            });
        }
        
        return effects;
    }
    
    /**
     * Get rock state for saving
     */
    getState() {
        return {
            ...super.getState(),
            hasBeenMined: this.hasBeenMined,
            resourceAmount: this.resourceAmount,
            x: this.x,
            y: this.y
        };
    }
    
    /**
     * Load rock state
     */
    loadState(state) {
        super.loadState(state);
        this.hasBeenMined = state.hasBeenMined || false;
        this.resourceAmount = state.resourceAmount !== undefined ? state.resourceAmount : this.resourceAmount;
        if (state.x !== undefined) this.x = state.x;
        if (state.y !== undefined) this.y = state.y;
    }
}

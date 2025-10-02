/**
 * Tree class - extends StaticObject for tree sprites
 * Handles tree-specific behaviors like swaying, shade, and collision
 */
class Tree extends StaticObject {
    constructor(options = {}) {
        super({
            type: 'tree',
            name: options.name || 'Tree',
            scale: options.scale || 1.0,
            
            // Tree-specific defaults
            hasCollision: true,
            blocksMovement: true,
            castsShadow: false, // Trees don't cast shadows
            
            // Visual effects - trees sway gently in the wind
            animationType: 'sway',
            animationSpeed: options.animationSpeed || 0.0008,
            animationIntensity: options.animationIntensity || 2.5,
            
            // Environmental properties
            providesShade: true,
            makesSound: false, // Could be true for rustling leaves
            soundRadius: 80,
            
            ...options
        });
        
        // Tree-specific properties
        this.treeType = options.treeType || 'deciduous'; // 'deciduous', 'conifer', 'palm', etc.
        this.foliageDensity = options.foliageDensity || 1.0; // Affects shade intensity
        this.height = options.height || 'tall'; // 'short', 'medium', 'tall'
        
        // Seasonal properties (could be expanded for seasons)
        this.hasLeaves = options.hasLeaves !== false;
        this.seasonalColor = options.seasonalColor || null; // For autumn colors, etc.
    }
    
    /**
     * Override update to add tree-specific behaviors
     */
    update(deltaTime, game) {
        super.update(deltaTime, game);
        
        // Trees could respond to weather or time of day
        // For example, sway more in windy conditions
        if (game.weather && game.weather.type === 'windy') {
            this.animationSpeed = 0.002;
            this.animationIntensity = 5.0;
        }
    }
    
    /**
     * Trees provide shade based on foliage density
     */
    getEnvironmentalEffects(player) {
        const effects = super.getEnvironmentalEffects(player);
        
        // Override shade intensity based on foliage density
        const shadeEffect = effects.find(e => e.type === 'shade');
        if (shadeEffect && this.hasLeaves) {
            shadeEffect.intensity = 0.5 + (this.foliageDensity * 0.3);
        }
        
        return effects;
    }
    
    /**
     * Get interaction message for examining the tree
     */
    interact(player, game) {
        if (this.canInteract) {
            let message = `A ${this.height} ${this.treeType} tree.`;
            
            if (this.hasLeaves) {
                message += ' Its leaves rustle gently in the breeze.';
            }
            
            if (this.providesShade) {
                message += ' It provides nice shade.';
            }
            
            return {
                type: 'dialogue',
                message: message
            };
        }
        
        return { type: 'none' };
    }
    
    /**
     * Check if a bird or squirrel could be in this tree
     */
    canHostWildlife() {
        return this.hasLeaves && this.height !== 'short';
    }
    
    /**
     * Get the tree's visual appearance state
     */
    getAppearanceState() {
        return {
            type: this.treeType,
            height: this.height,
            hasLeaves: this.hasLeaves,
            foliageDensity: this.foliageDensity,
            seasonalColor: this.seasonalColor
        };
    }
}

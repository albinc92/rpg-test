/**
 * StaticObject class - extends GameObject for non-moving environmental objects
 * (Trees, bushes, rocks, decorations, etc.)
 */
class StaticObject extends GameObject {
    constructor(options = {}) {
        super(options);
        
        // Static object properties
        this.id = options.id || `static_${Date.now()}`;
        this.name = options.name || 'Static Object';
        this.type = options.type || 'decoration'; // 'decoration', 'obstacle', 'interactive'
        
        // Interactive properties
        this.canInteract = options.canInteract || false;
        this.interactionRadius = options.interactionRadius || 60;
        this.interactionMessage = options.interactionMessage || "You examine the object.";
        
        // Visual effects
        this.animationType = options.animationType || 'none'; // 'none', 'sway', 'pulse', 'rotate'
        this.animationSpeed = options.animationSpeed || 0.001;
        this.animationIntensity = options.animationIntensity || 1.0;
        
        // Environmental properties
        this.providesShade = options.providesShade || false;
        this.makesSound = options.makesSound || false;
        this.soundRadius = options.soundRadius || 100;
    }
    
    /**
     * Update static object (mainly for animations)
     */
    update(deltaTime, game) {
        super.update(deltaTime, game);
        
        // Update animations if any
        if (this.animationType !== 'none') {
            this.updateAnimation(deltaTime, game);
        }
    }
    
    /**
     * Update animation effects
     */
    updateAnimation(deltaTime, game) {
        switch (this.animationType) {
            case 'sway':
                this.updateSwayAnimation(game);
                break;
            case 'pulse':
                this.updatePulseAnimation(game);
                break;
            case 'rotate':
                this.updateRotateAnimation(game);
                break;
        }
    }
    
    /**
     * Update swaying animation (for trees, grass, etc.)
     */
    updateSwayAnimation(game) {
        // Swaying will be handled in rendering
        this.swayOffset = Math.sin(game.gameTime * this.animationSpeed) * this.animationIntensity;
    }
    
    /**
     * Update pulsing animation
     */
    updatePulseAnimation(game) {
        this.pulseScale = 1.0 + (Math.sin(game.gameTime * this.animationSpeed) * 0.1 * this.animationIntensity);
    }
    
    /**
     * Update rotation animation
     */
    updateRotateAnimation(game) {
        this.rotation = (this.rotation || 0) + (this.animationSpeed * this.animationIntensity);
    }
    

    
    /**
     * Render sprite with animation support
     */
    renderSprite(ctx, game, width, height, altitudeOffset) {
        const screenX = this.x - width / 2;
        const screenY = this.y - height / 2 - altitudeOffset;
        
        ctx.save();
        
        // Apply rotation if needed
        if (this.animationType === 'rotate' && this.rotation) {
            ctx.translate(this.x, this.y - altitudeOffset);
            ctx.rotate(this.rotation);
            ctx.drawImage(this.sprite, -width / 2, -height / 2, width, height);
        }
        // Apply swaying if needed
        else if (this.animationType === 'sway' && this.swayOffset) {
            ctx.translate(this.x + this.swayOffset, this.y - altitudeOffset);
            ctx.drawImage(this.sprite, -width / 2, -height / 2, width, height);
        }
        // Normal rendering
        else {
            if (this.direction === 'right') {
                ctx.translate(this.x, this.y - altitudeOffset);
                ctx.scale(-1, 1);
                ctx.drawImage(this.sprite, -width / 2, -height / 2, width, height);
            } else {
                ctx.drawImage(this.sprite, screenX, screenY, width, height);
            }
        }
        
        ctx.restore();
    }
    

    
    /**
     * Check if object blocks movement
     */
    blocksMovement() {
        return this.hasCollision && this.type === 'obstacle';
    }
    
    /**
     * Check if player can interact with this object
     */
    canPlayerInteract(player) {
        if (!this.canInteract) return false;
        return this.distanceTo(player) <= this.interactionRadius;
    }
    
    /**
     * Handle interaction
     */
    interact(player, game) {
        if (this.canInteract) {
            return {
                type: 'dialogue',
                message: this.interactionMessage
            };
        }
        return { type: 'none' };
    }
    
    /**
     * Check if object provides environmental effects
     */
    getEnvironmentalEffects(player) {
        const effects = [];
        
        if (this.providesShade && this.distanceTo(player) <= this.getWidth()) {
            effects.push({ type: 'shade', intensity: 0.7 });
        }
        
        if (this.makesSound && this.distanceTo(player) <= this.soundRadius) {
            const distance = this.distanceTo(player);
            const volume = Math.max(0, 1 - (distance / this.soundRadius));
            effects.push({ type: 'ambient_sound', volume: volume });
        }
        
        return effects;
    }
    
    /**
     * Get static object state for saving
     */
    getState() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            direction: this.direction,
            type: this.type
        };
    }
    
    /**
     * Load static object state
     */
    loadState(state) {
        this.x = state.x || this.x;
        this.y = state.y || this.y;
        this.direction = state.direction || this.direction;
        this.type = state.type || this.type;
    }
}
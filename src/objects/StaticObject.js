/**
 * StaticObject class - extends GameObject for non-moving environmental objects
 * (Trees, bushes, rocks, decorations, etc.)
 */
class StaticObject extends GameObject {
    constructor(options = {}) {
        super(options);
        
        // Static object properties
        this.id = options.id || `static_${crypto.randomUUID()}`;
        this.name = options.name || 'Static Object';
        this.objectCategory = options.objectCategory || 'decoration'; // 'tree', 'bush', 'rock', 'clutter', 'decoration', 'structure', 'flora'
        this.type = options.type || 'decoration'; // 'decoration', 'obstacle', 'interactive' (for legacy compatibility)
        
        // Interactive properties
        this.canInteract = options.canInteract || false;
        this.interactionRadius = options.interactionRadius || 60;
        this.interactionMessage = options.interactionMessage || "You examine the object.";
        
        // Visual effects
        this.animationType = options.animationType || 'none'; // 'none', 'sway', 'pulse', 'rotate'
        this.animationSpeed = options.animationSpeed || 0.001;
        this.animationIntensity = options.animationIntensity || 1.0;
        
        // Behavior flags
        this.swaysInWind = options.swaysInWind || false; // Trees, grass
        
        // Auto-enable sway animation if swaysInWind is true
        if (this.swaysInWind && this.animationType === 'none') {
            this.animationType = 'sway';
            this.animationSpeed = 0.001;
            this.animationIntensity = 1.0;
        }
        
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
        // Get wind strength from weather system
        let windStrength = 0;
        let hasWind = false;
        if (game?.weatherSystem && this.swaysInWind) {
            windStrength = game.weatherSystem.windStrength || 0;
            hasWind = windStrength > 0;
        }
        
        // Base sway from animation settings (gentle idle sway)
        const baseFrequency = this.animationSpeed;
        const baseSway = Math.sin(game.gameTime * baseFrequency) * this.animationIntensity * 0.5;
        
        if (hasWind) {
            // Enhanced sway from wind
            const windMultiplier = 5.0; // Strong visible effect
            
            // Primary wind wave (affects all objects)
            const windWave = Math.sin(game.gameTime * 0.002) * windStrength * windMultiplier;
            
            // Per-object variation (based on position for natural look)
            const objectPhase = (this.x + this.y) * 0.01; // Unique phase per object
            const objectVariation = Math.sin(game.gameTime * 0.003 + objectPhase) * windStrength * windMultiplier * 0.7;
            
            // Combine: base idle + wind wave + individual variation
            this.swayOffset = baseSway + windWave + objectVariation;
        } else {
            // No wind - just gentle idle sway
            this.swayOffset = baseSway;
        }
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
    renderSprite(ctx, game, width, height, altitudeOffset, webglRenderer = null) {
        const scaledX = this.getScaledX(game);
        const scaledY = this.getScaledY(game);
        const screenX = scaledX - width / 2;
        const screenY = scaledY - height / 2 - altitudeOffset;
        
        // Determine if we should flip horizontally
        const shouldFlip = this.reverseFacing === true || this.direction === 'right';
        
        // Use WebGL for all static objects
        if (webglRenderer && webglRenderer.initialized) {
            const imageUrl = this.sprite.src || `sprite_${this.id}`;
            webglRenderer.drawSprite(
                screenX, 
                screenY, 
                width, 
                height, 
                this.sprite, 
                imageUrl,
                1.0,        // alpha
                shouldFlip, // flipX
                false       // flipY
            );
            return;
        }
        
        // Fallback to Canvas2D when WebGL unavailable
        ctx.save();
        if (shouldFlip) {
            ctx.translate(scaledX, scaledY - altitudeOffset);
            ctx.scale(-1, 1);
            ctx.drawImage(this.sprite, -width / 2, -height / 2, width, height);
        } else {
            ctx.drawImage(this.sprite, screenX, screenY, width, height);
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
window.StaticObject = StaticObject;
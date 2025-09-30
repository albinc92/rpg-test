/**
 * Portal class - extends InteractiveObject for map transitions
 */
class Portal extends InteractiveObject {
    constructor(options = {}) {
        super({
            type: 'portal',
            name: 'Portal',
            scale: options.scale || 1.0,
            interactionRadius: 100,
            blocksMovement: false, // Portals don't block movement - you walk through them
            hasCollision: false, // Portals use distance-based detection instead of collision
            ...options
        });
        
        // Portal-specific properties
        this.targetMap = options.targetMap || '0-0';
        this.spawnPoint = options.spawnPoint || 'default';
        this.portalType = options.portalType || 'magic'; // 'magic', 'door', 'cave', etc.
        this.isActive = options.isActive !== false; // Default active
        this.requiresActivation = options.requiresActivation || false;
        
        // Visual effects
        this.glowIntensity = 0;
        this.glowDirection = 1;
        this.particleTimer = 0;
        this.particles = [];
    }
    
    /**
     * Update portal effects
     */
    update(deltaTime, game) {
        super.update(deltaTime, game);
        
        if (this.isActive) {
            // Update glow effect
            this.glowIntensity += this.glowDirection * deltaTime * 2;
            if (this.glowIntensity >= 1) {
                this.glowIntensity = 1;
                this.glowDirection = -1;
            } else if (this.glowIntensity <= 0.3) {
                this.glowIntensity = 0.3;
                this.glowDirection = 1;
            }
            
            // Update particles (if portal type supports them)
            if (this.portalType === 'magic') {
                this.updateParticles(deltaTime);
            }
        }
    }
    
    /**
     * Update portal particles
     */
    updateParticles(deltaTime) {
        this.particleTimer += deltaTime;
        
        // Spawn new particles
        if (this.particleTimer > 0.1) {
            this.particleTimer = 0;
            if (this.particles.length < 10) {
                this.particles.push({
                    x: this.x + (Math.random() - 0.5) * this.width,
                    y: this.y + (Math.random() - 0.5) * this.height,
                    vx: (Math.random() - 0.5) * 50,
                    vy: (Math.random() - 0.5) * 50,
                    life: 1.0,
                    maxLife: 1.0
                });
            }
        }
        
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            particle.life -= deltaTime;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * Check if player can use portal
     */
    canPlayerInteract(player) {
        if (!this.isActive) return false;
        return super.canPlayerInteract(player);
    }
    
    /**
     * Handle portal interaction
     */
    interact(player, game) {
        if (!this.isActive) {
            return {
                type: 'dialogue',
                message: 'This portal appears to be inactive.'
            };
        }
        
        if (this.requiresActivation && !this.isActivated) {
            return {
                type: 'dialogue',
                message: 'This portal needs to be activated first.'
            };
        }
        
        if (!this.canPlayerInteract(player)) {
            return { type: 'none' };
        }
        
        // Play portal sound
        if (game.audioManager) {
            game.audioManager.playEffect('coin.mp3');
        }
        
        return {
            type: 'portal',
            targetMap: this.targetMap,
            spawnPoint: this.spawnPoint,
            message: `Traveling to ${this.name}...`
        };
    }
    
    /**
     * Activate the portal
     */
    activate() {
        this.isActivated = true;
        this.isActive = true;
    }
    
    /**
     * Deactivate the portal
     */
    deactivate() {
        this.isActive = false;
    }
    
    /**
     * Custom rendering for portal effects
     */
    render(ctx, game) {
        // Draw base sprite
        super.render(ctx, game);
        
        if (this.isActive) {
            // Draw glow effect
            this.renderGlow(ctx, game);
            
            // Draw particles for magic portals
            if (this.portalType === 'magic') {
                this.renderParticles(ctx, game);
            }
        }
    }
    
    /**
     * Render portal glow effect
     */
    renderGlow(ctx, game) {
        const mapScale = game.currentMap?.scale || 1.0;
        const glowRadius = 40 * mapScale * this.glowIntensity;
        
        ctx.save();
        ctx.globalAlpha = 0.3 * this.glowIntensity;
        
        // Create radial gradient
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, glowRadius
        );
        
        // Different colors based on portal type
        switch (this.portalType) {
            case 'magic':
                gradient.addColorStop(0, '#9966FF');
                gradient.addColorStop(1, 'transparent');
                break;
            case 'fire':
                gradient.addColorStop(0, '#FF6600');
                gradient.addColorStop(1, 'transparent');
                break;
            case 'ice':
                gradient.addColorStop(0, '#66CCFF');
                gradient.addColorStop(1, 'transparent');
                break;
            default:
                gradient.addColorStop(0, '#FFFFFF');
                gradient.addColorStop(1, 'transparent');
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    /**
     * Render portal particles
     */
    renderParticles(ctx, game) {
        ctx.save();
        
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            ctx.globalAlpha = alpha * 0.8;
            ctx.fillStyle = '#9966FF';
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
    }
    
    /**
     * Get portal state for saving
     */
    getState() {
        return {
            ...super.getState(),
            targetMap: this.targetMap,
            spawnPoint: this.spawnPoint,
            isActive: this.isActive,
            requiresActivation: this.requiresActivation
        };
    }
    
    /**
     * Load portal state
     */
    loadState(state) {
        super.loadState(state);
        this.targetMap = state.targetMap || this.targetMap;
        this.spawnPoint = state.spawnPoint || this.spawnPoint;
        this.isActive = state.isActive !== undefined ? state.isActive : this.isActive;
        this.requiresActivation = state.requiresActivation || this.requiresActivation;
    }
}
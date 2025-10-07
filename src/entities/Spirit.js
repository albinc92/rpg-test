/**
 * Spirit class - extends Actor for ethereal/floating entities
 */
class Spirit extends Actor {
    constructor(game, x, y, mapId, options = {}) {
        super({
            x: x,
            y: y,
            scale: options.scale || 0.8,
            maxSpeed: (options.moveSpeed || 1.5) * 50, // Convert moveSpeed to maxSpeed
            behaviorType: 'roaming',
            altitude: 40, // Default floating altitude
            blocksMovement: false, // Spirits are ethereal and don't block movement
            canBeBlocked: false, // Spirits can phase through objects
            collisionPercent: 0.3, // Smaller collision area for spirits
            spriteSrc: options.spriteSrc,
            spriteWidth: options.spriteWidth,
            spriteHeight: options.spriteHeight,
            collisionShape: options.collisionShape || 'circle',
            ...options
        });
        
        // Spirit identity
        this.game = game;
        this.id = options.id || `spirit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.name = options.name || 'Unknown Spirit';
        this.spiritId = options.spiritId; // Template ID from spirits.json
        this.mapId = mapId;
        
        // Stats
        this.stats = options.stats || {
            hp: 50,
            attack: 10,
            defense: 10,
            speed: 15
        };
        this.currentHp = this.stats.hp;
        
        // Description
        this.description = options.description || '';
        
        // Movement
        this.movePattern = options.movePattern || 'wander';
        
        // Spirit-specific visual properties
        this.baseAlpha = options.baseAlpha || 0.8;
        this.pulseSpeed = options.pulseSpeed || 0.003;
        this.glowEffect = options.glowEffect !== false;
        
        // Floating animation
        this.floatingSpeed = options.floatingSpeed || 0.002;
        this.floatingRange = options.floatingRange || 15;
        
        // Spawn effect
        this.spawnEffect = {
            active: options.spawnEffect !== false, // Spawn effect enabled by default
            duration: 2000, // 2 seconds
            startTime: Date.now()
        };
        
        // Ethereal properties
        this.phasesThroughWalls = options.phasesThroughWalls !== false;
        this.roamingRadius = options.roamingRadius || 200;
        this.originalX = this.x;
        this.originalY = this.y;
    }
    
    /**
     * Update spirit behavior with floating animation
     */
    updateBehavior(deltaTime, game) {
        super.updateBehavior(deltaTime, game);
        
        // Update spawn effect
        if (this.spawnEffect.active) {
            const elapsed = Date.now() - this.spawnEffect.startTime;
            if (elapsed > this.spawnEffect.duration) {
                this.spawnEffect.active = false;
            }
        }
        
        // Roaming behavior with return-to-center tendency
        if (this.behaviorType === 'roaming') {
            this.updateSpiritRoaming(deltaTime);
        }
    }
    
    /**
     * Spirit-specific roaming that stays near spawn point
     */
    updateSpiritRoaming(deltaTime) {
        // Calculate distance from original position
        const dx = this.x - this.originalX;
        const dy = this.y - this.originalY;
        const distanceFromOrigin = Math.sqrt(dx * dx + dy * dy);
        
        // If too far from origin, move back
        if (distanceFromOrigin > this.roamingRadius) {
            const returnForce = 0.3;
            const moveX = -(dx / distanceFromOrigin) * returnForce;
            const moveY = -(dy / distanceFromOrigin) * returnForce;
            this.applyMovement(moveX, moveY, deltaTime);
        } else {
            // Random roaming within radius
            if (Math.random() < 0.01) { // 1% chance per frame
                const angle = Math.random() * Math.PI * 2;
                const force = 0.2;
                const moveX = Math.cos(angle) * force;
                const moveY = Math.sin(angle) * force;
                this.applyMovement(moveX, moveY, deltaTime);
            }
        }
    }
    
    /**
     * Render spirit with ethereal effects
     */
    render(ctx, game) {
        if (!this.spriteLoaded || !this.sprite) return;
        
        const mapScale = game.currentMap?.scale || 1.0;
        const scaledWidth = this.getWidth() * mapScale;
        const scaledHeight = this.getHeight() * mapScale;
        
        // Calculate floating altitude with animation
        let currentAltitude = this.altitude * mapScale;
        if (this.floatingSpeed && this.floatingRange) {
            const floatingOffset = Math.sin(game.gameTime * this.floatingSpeed) * (this.floatingRange * mapScale);
            currentAltitude += floatingOffset;
        }
        
        // Calculate pulsing alpha for ethereal effect
        const basePulse = Math.sin(game.gameTime * this.pulseSpeed) * 0.2;
        const spiritAlpha = Math.max(0.3, Math.min(1.0, this.baseAlpha + basePulse));
        
        // Draw shadow (very faint for spirits)
        if (this.castsShadow) {
            ctx.save();
            ctx.globalAlpha = 0.15; // Very faint shadow
            game.drawShadow(this.x, this.y, scaledWidth, scaledHeight, currentAltitude);
            ctx.restore();
        }
        
        // Draw sprite with ethereal effects
        ctx.save();
        ctx.globalAlpha = spiritAlpha;
        
        // Apply glow effect
        if (this.glowEffect) {
            ctx.shadowColor = '#87CEEB'; // Sky blue glow
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        
        // Render sprite at floating position
        const screenX = this.x - scaledWidth / 2;
        const screenY = this.y - scaledHeight / 2 - currentAltitude;
        
        if (this.direction === 'right') {
            ctx.translate(this.x, this.y - currentAltitude);
            ctx.scale(-1, 1);
            ctx.drawImage(this.sprite, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
        } else {
            ctx.drawImage(this.sprite, screenX, screenY, scaledWidth, scaledHeight);
        }
        
        ctx.restore();
        
        // Draw spawn effect if active
        if (this.spawnEffect.active) {
            this.renderSpawnEffect(ctx, game);
        }
    }
    
    /**
     * Render spawn effect
     */
    renderSpawnEffect(ctx, game) {
        const elapsed = Date.now() - this.spawnEffect.startTime;
        const progress = elapsed / this.spawnEffect.duration;
        const effectAlpha = 1.0 - progress;
        
        if (effectAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = effectAlpha * 0.5;
            ctx.strokeStyle = '#87CEEB';
            ctx.lineWidth = 3;
            
            // Draw expanding circle
            const radius = progress * 50;
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.restore();
        }
    }
    
    /**
     * Override physics to allow phasing through walls
     */
    updatePhysics(deltaTime, game) {
        if (this.phasesThroughWalls) {
            // Apply movement without collision detection
            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;
            
            // Apply friction
            const frictionFactor = Math.pow(this.friction, deltaTime * 60);
            this.velocityX *= frictionFactor;
            this.velocityY *= frictionFactor;
        } else {
            // Use normal physics with collision
            super.updatePhysics(deltaTime, game);
        }
    }
}
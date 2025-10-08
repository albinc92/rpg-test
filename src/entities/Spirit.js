/**
 * Spirit class - extends Actor for ethereal/floating entities
 */
class Spirit extends Actor {
    constructor(game, x, y, mapId, options = {}) {
        const moveSpeed = options.moveSpeed || 1.5;
        super({
            x: x,
            y: y,
            scale: options.scale || 0.8, // Use scale just like other GameObjects
            maxSpeed: moveSpeed * 50, // Convert template moveSpeed to maxSpeed for physics
            movementSpeed: moveSpeed * 0.8, // Use for AI input (slightly slower for ethereal feel)
            behaviorType: 'roaming',
            altitude: 0, // No altitude offset - floating is visual only
            blocksMovement: options.hasCollision !== false, // Block movement if collision enabled
            canBeBlocked: true, // Spirits should collide with objects
            collisionPercent: 0.3, // Smaller collision area for spirits
            spriteSrc: options.spriteSrc,
            // Don't pre-set spriteWidth/spriteHeight - let GameObject auto-detect from image
            // spriteWidth and spriteHeight will be set automatically when sprite loads
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
        
        // Floating/hovering animation (optional)
        this.isFloating = options.isFloating !== undefined ? options.isFloating : false; // Default: no floating
        this.floatingSpeed = options.floatingSpeed || 0.002;
        this.floatingRange = options.floatingRange || 15;
        
        console.log(`[Spirit] ${options.name || 'Unknown'} constructor: isFloating=${this.isFloating}, speed=${this.floatingSpeed}, range=${this.floatingRange}, from options=${options.isFloating}`);
        
        // Spawn effect
        this.spawnEffect = {
            active: options.spawnEffect !== false, // Spawn effect enabled by default
            duration: 2000, // 2 seconds
            startTime: Date.now()
        };
        
        // Ethereal properties
        this.phasesThroughWalls = options.phasesThroughWalls === true; // Default: false (spirits use collision)
        this.roamingRadius = options.roamingRadius || 200;
        this.originalX = this.x;
        this.originalY = this.y;
        
        // Spawn zone boundaries (set by SpawnManager after spawning)
        this.spawnZoneBounds = null; // Will be { minX, maxX, minY, maxY } in scaled coordinates
        
        // Roaming state
        this.roamingDirection = { x: 0, y: 0 };
        this.roamingTimer = 0;
        this.roamingDuration = 0;
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
     * Uses timer-based movement for smooth, continuous ethereal floating
     * Respects spawn zone boundaries if set
     */
    updateSpiritRoaming(deltaTime) {
        // Get scaled position for boundary checking
        const mapScale = this.game?.currentMap?.scale || 1.0;
        const resolutionScale = this.game?.resolutionScale || 1.0;
        const combinedScale = mapScale * resolutionScale;
        const scaledX = this.x * combinedScale;
        const scaledY = this.y * combinedScale;
        
        // Check if outside spawn zone boundaries
        const outsideSpawnZone = this.spawnZoneBounds && (
            scaledX < this.spawnZoneBounds.minX ||
            scaledX > this.spawnZoneBounds.maxX ||
            scaledY < this.spawnZoneBounds.minY ||
            scaledY > this.spawnZoneBounds.maxY
        );
        
        // If outside spawn zone, move back towards center
        if (outsideSpawnZone) {
            const centerX = (this.spawnZoneBounds.minX + this.spawnZoneBounds.maxX) / 2;
            const centerY = (this.spawnZoneBounds.minY + this.spawnZoneBounds.maxY) / 2;
            
            const dx = centerX - scaledX;
            const dy = centerY - scaledY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const dirX = dx / distance;
                const dirY = dy / distance;
                this.applyMovement(dirX * this.movementSpeed * 1.5, dirY * this.movementSpeed * 1.5, deltaTime);
            }
            
            // Reset roaming timer when returning
            this.roamingTimer = 0;
            return;
        }
        
        // Fallback: Check distance from original spawn point
        const dx = this.x - this.originalX;
        const dy = this.y - this.originalY;
        const distanceFromOrigin = Math.sqrt(dx * dx + dy * dy);
        
        // Update roaming timer
        this.roamingTimer -= deltaTime;
        
        // If too far from origin (fallback when no spawn zone bounds), force return
        if (distanceFromOrigin > this.roamingRadius) {
            const dirX = -(dx / distanceFromOrigin);
            const dirY = -(dy / distanceFromOrigin);
            this.applyMovement(dirX * this.movementSpeed * 1.5, dirY * this.movementSpeed * 1.5, deltaTime);
            
            // Reset roaming timer when returning
            this.roamingTimer = 0;
        } 
        // Pick new random direction when timer expires
        else if (this.roamingTimer <= 0) {
            // Move for 1-3 seconds in one direction
            this.roamingDuration = 1.0 + Math.random() * 2.0;
            this.roamingTimer = this.roamingDuration;
            
            // Pick random direction
            const angle = Math.random() * Math.PI * 2;
            this.roamingDirection.x = Math.cos(angle);
            this.roamingDirection.y = Math.sin(angle);
            
            // Occasionally pause (20% chance)
            if (Math.random() < 0.2) {
                this.roamingDirection.x = 0;
                this.roamingDirection.y = 0;
                this.roamingTimer = 0.5 + Math.random() * 1.0; // Pause for 0.5-1.5 seconds
            }
        }
        
        // Apply current roaming direction
        if (this.roamingDirection.x !== 0 || this.roamingDirection.y !== 0) {
            this.applyMovement(
                this.roamingDirection.x * this.movementSpeed, 
                this.roamingDirection.y * this.movementSpeed, 
                deltaTime
            );
        }
    }
    
    /**
     * Render spirit with ethereal effects
     */
    render(ctx, game) {
        // Debug: Log render calls (only log once per spirit when loaded)
        if (this.spriteLoaded && !this._renderLogged) {
            console.log(`[Spirit] Rendering ${this.name} - spriteLoaded: ${this.spriteLoaded}, auto-detected dimensions: ${this.spriteWidth}x${this.spriteHeight}, scale: ${this.scale}`);
            this._renderLogged = true;
        }
        
        if (!this.sprite) {
            // No sprite object at all - can't render
            if (!this._renderWarningLogged) {
                console.warn(`[Spirit] ${this.name} (${this.id}) has no sprite object - spriteSrc: ${this.spriteSrc}`);
                this._renderWarningLogged = true;
            }
            return;
        }
        
        // If sprite is loading but not ready yet, render a placeholder
        if (!this.spriteLoaded) {
            this.renderPlaceholder(ctx, game);
            return;
        }
        
        // Use same scaling approach as GameObject
        const finalScale = this.getFinalScale(game);
        const resolutionScale = game?.resolutionScale || 1.0;
        const baseWidth = this.spriteWidth || this.fallbackWidth || 0;
        const baseHeight = this.spriteHeight || this.fallbackHeight || 0;
        const scaledWidth = baseWidth * finalScale;
        const scaledHeight = baseHeight * finalScale;
        
        // Get scaled position (like GameObject does)
        const scaledX = this.getScaledX(game);
        const scaledY = this.getScaledY(game);
        
        // Calculate floating animation (vertical bobbing effect) - only if floating is enabled
        let floatingOffset = 0;
        let baseAltitude = 0;
        if (this.isFloating && this.floatingSpeed && this.floatingRange && game.gameTime !== undefined) {
            // Base altitude to lift sprite off ground (using sprite height as reference)
            baseAltitude = scaledHeight * 0.5; // Lift by 50% of sprite height (increased from 30%)
            // Bobbing animation on top of base altitude
            floatingOffset = Math.sin(game.gameTime * this.floatingSpeed) * (this.floatingRange * resolutionScale);
            
            // Debug log once
            if (!this._floatingLogged) {
                console.log(`[Spirit] ${this.name} floating: altitude=${baseAltitude.toFixed(2)}, bobbing=${floatingOffset.toFixed(2)}, range=${this.floatingRange}, speed=${this.floatingSpeed}`);
                this._floatingLogged = true;
            }
        } else if (!this._floatingCheckLogged) {
            console.log(`[Spirit] ${this.name} NOT floating: isFloating=${this.isFloating}, speed=${this.floatingSpeed}, range=${this.floatingRange}, gameTime=${game.gameTime !== undefined}`);
            this._floatingCheckLogged = true;
        }
        
        // Calculate pulsing alpha for ethereal effect
        const basePulse = game.gameTime !== undefined ? Math.sin(game.gameTime * this.pulseSpeed) * 0.2 : 0;
        let spiritAlpha = Math.max(0.3, Math.min(1.0, this.baseAlpha + basePulse));
        
        // Apply fade-in effect during spawn
        if (this.spawnEffect.active) {
            const elapsed = Date.now() - this.spawnEffect.startTime;
            const fadeInDuration = this.spawnEffect.duration * 0.5; // Fade in during first half of spawn effect
            const fadeProgress = Math.min(1.0, elapsed / fadeInDuration);
            spiritAlpha *= fadeProgress; // Multiply alpha by fade progress (0 to 1)
        }
        
        // Draw shadow (very faint for spirits) at ground position
        if (this.castsShadow) {
            ctx.save();
            ctx.globalAlpha = 0.15; // Very faint shadow
            // Shadow stays at ground level, not affected by floating
            game.drawShadow(scaledX, scaledY, scaledWidth, scaledHeight, 0);
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
        
        // Render sprite centered at scaled position with floating animation
        const screenX = scaledX - scaledWidth / 2;
        const screenY = scaledY - scaledHeight / 2 - baseAltitude - floatingOffset;
        
        // Debug: Log draw call once
        if (!this._drawLogged) {
            console.log(`[Spirit] Drawing ${this.name} at screen(${Math.round(screenX)}, ${Math.round(screenY)}) from scaled(${Math.round(scaledX)}, ${Math.round(scaledY)}) size: ${Math.round(scaledWidth)}x${Math.round(scaledHeight)}`);
            this._drawLogged = true;
        }
        
        if (this.direction === 'right') {
            ctx.translate(scaledX, scaledY - baseAltitude - floatingOffset);
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
     * Render placeholder while sprite is loading
     */
    renderPlaceholder(ctx, game) {
        const mapScale = game.currentMap?.scale || 1.0;
        const size = 32 * this.scale * mapScale; // Default spirit size
        
        ctx.save();
        
        // Pulsing ethereal circle
        let pulseAlpha = game.gameTime !== undefined ? 0.3 + Math.sin(game.gameTime * 0.005) * 0.2 : 0.5;
        
        // Apply fade-in effect during spawn
        if (this.spawnEffect.active) {
            const elapsed = Date.now() - this.spawnEffect.startTime;
            const fadeInDuration = this.spawnEffect.duration * 0.5;
            const fadeProgress = Math.min(1.0, elapsed / fadeInDuration);
            pulseAlpha *= fadeProgress;
        }
        
        ctx.globalAlpha = pulseAlpha;
        ctx.fillStyle = '#87CEEB'; // Sky blue
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        
        // Draw circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw name above (for debugging)
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', this.x, this.y - size);
        
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
            // Use scaled coordinates (same as sprite rendering)
            const scaledX = this.getScaledX(game);
            const scaledY = this.getScaledY(game);
            
            ctx.save();
            ctx.globalAlpha = effectAlpha * 0.5;
            ctx.strokeStyle = '#87CEEB';
            ctx.lineWidth = 3;
            
            // Draw expanding circle at the correct scaled position
            const radius = progress * 50;
            ctx.beginPath();
            ctx.arc(scaledX, scaledY, radius, 0, Math.PI * 2);
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

    /**
     * Update this spirit instance from a template (when template is edited in editor)
     * @param {Object} template - Updated template data
     */
    updateFromTemplate(template) {
        console.log(`[Spirit] 🔄 Updating ${this.name} (${this.id}) from template`);
        
        // Update visual properties
        this.name = template.name;
        this.description = template.description;
        this.scale = template.scale || 0.8;
        
        // Update sprite if it changed
        if (template.spriteSrc !== this.spriteSrc) {
            this.spriteSrc = template.spriteSrc;
            this.loadSprite(template.spriteSrc);
        }
        
        // Update collision
        this.hasCollision = template.hasCollision !== false; // Default true
        this.blocksMovement = this.hasCollision; // Block movement if collision enabled
        this.collisionShape = template.collisionShape || 'circle';
        this.collisionPercent = template.collisionPercent || 0.3;
        this.collisionExpandTopPercent = template.collisionExpandTopPercent || 0;
        this.collisionExpandBottomPercent = template.collisionExpandBottomPercent || 0;
        this.collisionExpandLeftPercent = template.collisionExpandLeftPercent || 0;
        this.collisionExpandRightPercent = template.collisionExpandRightPercent || 0;
        
        // Update floating/hovering
        this.isFloating = template.isFloating || false;
        this.floatingSpeed = template.floatingSpeed || 0.002;
        this.floatingRange = template.floatingRange || 15;
        
        // Update stats (deep copy to avoid reference issues)
        const oldMaxHp = this.stats.hp;
        this.stats = {
            hp: template.stats.hp,
            attack: template.stats.attack,
            defense: template.stats.defense,
            speed: template.stats.speed
        };
        
        // Update current HP proportionally if max HP changed
        const hpRatio = this.currentHp / (oldMaxHp || 1);
        this.currentHp = Math.max(1, Math.floor(template.stats.hp * hpRatio));
        
        // Update movement
        const moveSpeed = template.moveSpeed || 1.5;
        this.maxSpeed = moveSpeed * 50;
        this.movementSpeed = moveSpeed * 0.8;
        this.movePattern = template.movePattern || 'wander';
        
        // Trigger visual update effect
        this.spawnEffect = {
            active: true,
            duration: 1000, // 1 second flash
            startTime: Date.now()
        };
        
        console.log(`[Spirit] ✅ Updated ${this.name} - scale: ${this.scale}, moveSpeed: ${moveSpeed}, stats: ${JSON.stringify(this.stats)}, HP: ${this.currentHp}/${this.stats.hp}`);
    }
}
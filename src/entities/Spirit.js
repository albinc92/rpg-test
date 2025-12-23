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
            blocksMovement: false, // Spirits don't block movement - player walks through to trigger battle
            canBeBlocked: false, // Spirits should phase through objects
            collisionPercent: 0.5, // Larger collision area for easier battle triggering
            spriteSrc: options.spriteSrc,
            // Don't pre-set spriteWidth/spriteHeight - let GameObject auto-detect from image
            // spriteWidth and spriteHeight will be set automatically when sprite loads
            collisionShape: options.collisionShape || 'circle',
            ...options
        });
        
        // Spirit identity
        this.game = game;
        this.id = options.id || `spirit_${crypto.randomUUID()}`;
        this.name = options.name || 'Unknown Spirit';
        this.spiritId = options.spiritId; // Template ID from spirits.json
        this.mapId = mapId;
        this.type = 'spirit'; // Entity type - used by interaction system to skip dialogue
        
        // Stats (legacy support)
        this.stats = options.stats || {
            hp: 50,
            attack: 10,
            defense: 10,
            speed: 15
        };
        this.currentHp = this.stats.hp;
        
        // Battle stats (new system)
        this.level = options.level || 5;
        this.type1 = options.type1 || options.element || 'fire';
        this.type2 = options.type2 || null;
        this.baseStats = options.baseStats || options.stats || {
            hp: 80, mp: 40, attack: 18, defense: 15,
            magicAttack: 18, magicDefense: 12, speed: 20
        };
        this.expYield = options.expYield || Math.floor(this.level * 10);
        this.goldYield = options.goldYield || Math.floor(this.level * 5);
        this.abilities = options.abilities || null; // Will use defaults if null
        
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
        const resolutionScale = this.game?.resolutionScale || 1.0;
        const scaledX = this.x * resolutionScale;
        const scaledY = this.y * resolutionScale;
        
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
    render(ctx, game, webglRenderer) {
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
        
        // Render sprite centered at scaled position with floating animation
        const screenX = scaledX - scaledWidth / 2;
        const screenY = scaledY - scaledHeight / 2 - baseAltitude - floatingOffset;
        
        // Debug: Log draw call once
        if (!this._drawLogged) {
            console.log(`[Spirit] Drawing ${this.name} at screen(${Math.round(screenX)}, ${Math.round(screenY)}) from scaled(${Math.round(scaledX)}, ${Math.round(scaledY)}) size: ${Math.round(scaledWidth)}x${Math.round(scaledHeight)}`);
            this._drawLogged = true;
        }
        
        // Determine if we should flip horizontally
        const shouldFlip = this.direction === 'right';
        
        // SHADOW PASS: If in shadow rendering mode, only render shadows
        if (webglRenderer && webglRenderer.renderingShadows) {
            if (this.castsShadow) {
                this.renderShadow(ctx, game, scaledWidth, scaledHeight, 0, webglRenderer);
            }
            return; // Skip sprite rendering during shadow pass
        }
        
        // SPRITE PASS: Render sprite normally (shadows already composited)
        // Use WebGL for rendering (same as StaticObject)
        if (webglRenderer && webglRenderer.initialized) {
            // Draw sprite
            const imageUrl = this.sprite.src || `sprite_${this.id}`;
            webglRenderer.drawSprite(
                screenX, 
                screenY, 
                scaledWidth, 
                scaledHeight, 
                this.sprite, 
                imageUrl,
                1.0,        // alpha (WebGL doesn't support per-sprite alpha yet)
                shouldFlip, // flipX
                false       // flipY
            );
            
            // Draw spawn effect on top (using Canvas2D overlay)
            if (this.spawnEffect.active) {
                this.renderSpawnEffect(ctx, game);
            }
            return;
        }
        
        // Fallback to Canvas2D when WebGL unavailable
        
        ctx.save();
        ctx.globalAlpha = spiritAlpha;
        
        // Apply glow effect
        if (this.glowEffect) {
            ctx.shadowColor = '#87CEEB'; // Sky blue glow
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        
        if (shouldFlip) {
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
        const size = 32 * this.scale; // Default spirit size
        
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
     * Render spawn effect - glittering stars
     */
    renderSpawnEffect(ctx, game) {
        const elapsed = Date.now() - this.spawnEffect.startTime;
        const progress = elapsed / this.spawnEffect.duration;
        const effectAlpha = 1.0 - progress;
        
        if (effectAlpha > 0) {
            const scaledX = this.getScaledX(game);
            const scaledY = this.getScaledY(game);
            
            // Account for floating offset in fake 3D mode
            const resolutionScale = game?.resolutionScale || 1.0;
            const finalScale = this.scale * resolutionScale;
            const baseHeight = this.spriteHeight || this.fallbackHeight || 64;
            const scaledHeight = baseHeight * finalScale;
            
            let floatingOffset = 0;
            let baseAltitude = 0;
            if (this.isFloating && this.floatingSpeed && this.floatingRange && game.gameTime !== undefined) {
                baseAltitude = scaledHeight * 0.5;
                floatingOffset = Math.sin(game.gameTime * this.floatingSpeed) * (this.floatingRange * resolutionScale);
            }
            
            // Center effect on sprite position (accounting for floating)
            const effectY = scaledY - baseAltitude - floatingOffset;
            
            ctx.save();
            
            // Glittering stars effect
            const starCount = 12;
            const maxRadius = 60;
            
            for (let i = 0; i < starCount; i++) {
                // Each star has its own timing offset for twinkling
                const starPhase = (i / starCount) * Math.PI * 2;
                const twinkle = Math.sin(elapsed * 0.01 + starPhase * 3) * 0.5 + 0.5;
                
                // Stars spiral outward and fade
                const angle = starPhase + progress * Math.PI;
                const radius = progress * maxRadius * (0.5 + (i % 3) * 0.25);
                
                const starX = scaledX + Math.cos(angle) * radius;
                const starY = effectY + Math.sin(angle) * radius - progress * 20; // Float upward
                
                // Star size varies with twinkle
                const starSize = 2 + twinkle * 3;
                
                // Draw 4-point star
                ctx.globalAlpha = effectAlpha * twinkle * 0.9;
                ctx.fillStyle = '#FFFFFF';
                
                ctx.beginPath();
                // Vertical line
                ctx.moveTo(starX, starY - starSize);
                ctx.lineTo(starX, starY + starSize);
                ctx.moveTo(starX - starSize, starY);
                ctx.lineTo(starX + starSize, starY);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#FFFFFF';
                ctx.stroke();
                
                // Center glow
                ctx.globalAlpha = effectAlpha * twinkle * 0.6;
                ctx.beginPath();
                ctx.arc(starX, starY, starSize * 0.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Colored sparkle (alternating colors)
                const colors = ['#87CEEB', '#FFD700', '#FF69B4', '#98FB98'];
                ctx.globalAlpha = effectAlpha * twinkle * 0.4;
                ctx.fillStyle = colors[i % colors.length];
                ctx.beginPath();
                ctx.arc(starX, starY, starSize * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
            
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
        this.hasCollision = template.hasCollision !== false; // Default true for battle trigger detection
        this.blocksMovement = false; // Spirits never block movement - player walks through to trigger battle
        this.collisionShape = template.collisionShape || 'circle';
        this.collisionPercent = template.collisionPercent || 0.5; // Larger for easier battle triggering
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
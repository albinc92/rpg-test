/**
 * NPC class - extends Actor for non-player characters
 */
class NPC extends Actor {
    constructor(options = {}) {
        super({
            scale: options.scale || 1.0,
            maxSpeed: 100,
            behaviorType: 'static',
            ...options
        });
        
        // NPC-specific properties
        this.id = options.id || `npc_${crypto.randomUUID()}`;
        this.name = options.name || 'Unknown NPC';
        this.npcType = options.npcType || options.type || 'dialogue'; // 'dialogue', 'merchant', 'guard', etc.
        this.mapId = options.mapId || null;
        
        // Dialogue system (legacy simple messages)
        this.messages = options.messages || [];
        this.currentMessageIndex = 0;
        
        // Script system (new)
        this.script = options.script || null;
        this.scriptPath = options.scriptPath || null; // Path to external script file
        
        // Interaction
        this.interactionRadius = options.interactionRadius || 80;
        this.canInteract = options.canInteract !== false;
        
        // NPC state
        this.mood = options.mood || 'neutral'; // 'friendly', 'neutral', 'hostile', etc.
        this.faction = options.faction || null;
        
        // Talk bubble indicator
        // If explicitly set to false, respect that; otherwise leave undefined to auto-detect
        if (options.showTalkBubble === false) {
            this.showTalkBubble = false;
        } else if (options.showTalkBubble === true) {
            this.showTalkBubble = true;
        } else {
            // Auto-detect based on initial dialogue - will be updated dynamically if script is added later
            this.showTalkBubble = this.script || this.messages.length > 0;
        }
        this.talkBubbleAnimation = 0;
        
        // Store last rendered screen position for UI overlays
        this.lastScreenX = 0;
        this.lastScreenY = 0;
        this.lastSpriteHeight = 0;
    }
    
    /**
     * Check if this NPC has dialogue (script or messages)
     */
    hasDialogue() {
        return this.script || this.messages.length > 0;
    }
    
    /**
     * Update NPC including talk bubble animation
     */
    update(deltaTime, game) {
        // Update behavior
        this.updateBehavior(deltaTime, game);
        
        // Auto-enable talk bubble if NPC has dialogue but bubble was disabled
        // (handles case where script is added after NPC creation)
        if (this.showTalkBubble === false && this.hasDialogue()) {
            this.showTalkBubble = true;
        }
        
        // Update talk bubble animation
        if (this.showTalkBubble && this.hasDialogue()) {
            this.talkBubbleAnimation += deltaTime * 2;
        }
    }
    
    /**
     * Override render to track screen position (talk bubble rendered separately)
     */
    render(ctx, game, webglRenderer = null) {
        // Call parent render first (renders sprite/shadow)
        super.render(ctx, game, webglRenderer);
        
        // Don't track during shadow pass
        if (webglRenderer && webglRenderer.renderingShadows) {
            return;
        }
        
        // Store screen position for talk bubble overlay
        if (this.spriteLoaded && game) {
            const finalScale = this.getFinalScale(game);
            const baseHeight = this.spriteHeight || this.fallbackHeight;
            const spriteHeight = baseHeight * finalScale;
            const scaledX = this.getScaledX(game);
            const scaledY = this.getScaledY(game);
            
            // Calculate screen position from world position
            // Account for perspective if enabled
            if (webglRenderer && webglRenderer.perspectiveStrength > 0) {
                // Get the billboard delta that was applied to the sprite
                const drawX = scaledX - (this.spriteWidth || this.fallbackWidth) * finalScale / 2;
                const drawY = scaledY - spriteHeight / 2;
                const delta = webglRenderer.calculateBillboardDelta(drawX, drawY, 
                    (this.spriteWidth || this.fallbackWidth) * finalScale, spriteHeight);
                
                // Apply same delta to get correct screen position
                this.lastScreenX = scaledX + delta.x;
                this.lastScreenY = scaledY + delta.y;
            } else {
                this.lastScreenX = scaledX;
                this.lastScreenY = scaledY;
            }
            this.lastSpriteHeight = spriteHeight;
        }
    }
    
    /**
     * Render talk bubble as Canvas2D overlay (called AFTER WebGL pass)
     */
    renderTalkBubbleOverlay(ctx, game, webglRenderer = null) {
        if (!this.showTalkBubble || !this.hasDialogue() || !this.spriteLoaded) return;
        
        const camera = game.camera;
        if (!camera) return;
        
        // Get canvas dimensions
        const canvasWidth = game.CANVAS_WIDTH || ctx.canvas.width;
        const canvasHeight = game.CANVAS_HEIGHT || ctx.canvas.height;
        const worldScale = game.resolutionScale || 1;
        const zoom = camera.zoom || 1;
        
        // Get NPC world position (scaled for resolution)
        const worldX = this.x * worldScale;
        const worldY = this.y * worldScale;
        
        // Calculate sprite dimensions
        const finalScale = this.getFinalScale(game);
        const baseWidth = this.spriteWidth || this.fallbackWidth;
        const baseHeight = this.spriteHeight || this.fallbackHeight;
        const spriteWidth = baseWidth * finalScale;
        const spriteHeight = baseHeight * finalScale;
        
        // Calculate where the TOP of the sprite is in world coordinates
        // For centered sprites: top = center - height/2
        let topWorldX = worldX;
        let topWorldY = worldY - spriteHeight / 2;
        let scaledSpriteHeight = spriteHeight;
        
        // In billboard mode with perspective, the sprite is scaled and shifted
        if (webglRenderer && webglRenderer.perspectiveStrength > 0 && webglRenderer.viewMatrix) {
            const vm = webglRenderer.viewMatrix;
            const pm = webglRenderer.projectionMatrix;
            const zoomFactor = vm[0];
            
            // Sprite base position (bottom center - where feet touch ground)
            const baseX = worldX;
            const baseY = worldY + spriteHeight / 2; // Bottom of sprite
            
            // Transform base to clip space
            const viewX = baseX * vm[0] + baseY * vm[4] + vm[12];
            const viewY = baseX * vm[1] + baseY * vm[5] + vm[13];
            const clipX = viewX * pm[0] + viewY * pm[4] + pm[12];
            const clipY = viewX * pm[1] + viewY * pm[5] + pm[13];
            
            // Calculate perspective factor
            const depth = (clipY + 1.0) * 0.5;
            const perspectiveW = 1.0 + (depth * webglRenderer.perspectiveStrength);
            const scale = 1.0 / perspectiveW;
            
            // Scaled sprite height
            scaledSpriteHeight = spriteHeight * scale;
            
            // Calculate base position delta (screen space then to world)
            const screenX_noPerspective = (clipX + 1.0) * 0.5 * canvasWidth;
            const screenY_noPerspective = (1.0 - clipY) * 0.5 * canvasHeight;
            const clipX_persp = clipX / perspectiveW;
            const clipY_persp = clipY / perspectiveW;
            const screenX_withPerspective = (clipX_persp + 1.0) * 0.5 * canvasWidth;
            const screenY_withPerspective = (1.0 - clipY_persp) * 0.5 * canvasHeight;
            
            const deltaScreenX = screenX_withPerspective - screenX_noPerspective;
            const deltaScreenY = screenY_withPerspective - screenY_noPerspective;
            const deltaWorldX = deltaScreenX / zoomFactor;
            const deltaWorldY = deltaScreenY / zoomFactor;
            
            // Corrected base position
            const correctedBaseX = baseX + deltaWorldX;
            const correctedBaseY = baseY + deltaWorldY;
            
            // Top of the scaled sprite (extends upward from corrected base)
            topWorldX = correctedBaseX;
            topWorldY = correctedBaseY - scaledSpriteHeight;
        }
        
        // Convert to screen coordinates
        const screenX = (topWorldX - camera.x) * zoom + canvasWidth / 2 * (1 - zoom);
        const screenY = (topWorldY - camera.y) * zoom + canvasHeight / 2 * (1 - zoom);
        
        // Position bubble above sprite top
        const bubbleY = screenY - 30;
        
        this.renderTalkBubble(ctx, screenX, bubbleY, 0);
    }
    
    /**
     * Render talk bubble indicator above NPC
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenX - Bubble center X position (screen coords)
     * @param {number} screenY - Bubble center Y position (screen coords)
     * @param {number} unused - Kept for compatibility
     */
    renderTalkBubble(ctx, screenX, screenY, unused = 0) {
        if (!this.showTalkBubble || !this.hasDialogue()) return;
        
        // Bobbing animation
        const bobOffset = Math.sin(this.talkBubbleAnimation) * 4;
        const finalY = screenY + bobOffset;
        
        // Draw speech bubble icon
        ctx.save();
        
        // Bubble background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        
        // Main bubble ellipse
        ctx.beginPath();
        ctx.ellipse(screenX, finalY, 22, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Triangle pointer
        ctx.beginPath();
        ctx.moveTo(screenX - 5, finalY + 14);
        ctx.lineTo(screenX + 5, finalY + 14);
        ctx.lineTo(screenX, finalY + 22);
        ctx.closePath();
        ctx.fill();
        
        // Three dots
        ctx.fillStyle = '#555555';
        const dotSpacing = 9;
        
        // Animate dots
        const dotPhase = (this.talkBubbleAnimation * 2) % 3;
        for (let i = 0; i < 3; i++) {
            const dotX = screenX + (i - 1) * dotSpacing;
            const dotScale = (Math.floor(dotPhase) === i) ? 1.6 : 1;
            ctx.beginPath();
            ctx.arc(dotX, finalY, 3 * dotScale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    /**
     * Update NPC behavior
     */
    updateBehavior(deltaTime, game) {
        switch (this.behaviorType) {
            case 'static':
                // No movement
                break;
            case 'roaming':
                this.updateRoaming(deltaTime, game);
                break;
            case 'following':
                this.updateFollowing(deltaTime, game);
                break;
        }
    }
    
    /**
     * Update roaming behavior
     */
    updateRoaming(deltaTime, game) {
        // Simple roaming AI - change direction occasionally
        if (Math.random() < 0.02) { // 2% chance per frame
            const directions = [-1, 0, 1];
            const newDirX = directions[Math.floor(Math.random() * directions.length)];
            const newDirY = directions[Math.floor(Math.random() * directions.length)];
            
            this.applyMovement(newDirX * this.movementSpeed, newDirY * this.movementSpeed, deltaTime);
        }
    }
    
    /**
     * Update following behavior
     */
    updateFollowing(deltaTime, game) {
        if (game.player) {
            const dx = game.player.x - this.x;
            const dy = game.player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Follow if far enough away
            if (distance > 100) {
                const moveX = (dx / distance) * this.movementSpeed;
                const moveY = (dy / distance) * this.movementSpeed;
                this.applyMovement(moveX, moveY, deltaTime);
            }
        }
    }
    
    /**
     * Check if player can interact with this NPC
     */
    canPlayerInteract(player) {
        if (!this.canInteract) return false;
        return this.distanceTo(player) <= this.interactionRadius;
    }
    
    /**
     * Get current dialogue message
     */
    getCurrentMessage() {
        if (this.messages.length === 0) return null;
        return this.messages[this.currentMessageIndex] || null;
    }
    
    /**
     * Advance to next dialogue message
     */
    nextMessage() {
        if (this.currentMessageIndex < this.messages.length - 1) {
            this.currentMessageIndex++;
            return this.getCurrentMessage();
        }
        return null; // End of dialogue
    }
    
    /**
     * Reset dialogue to beginning
     */
    resetDialogue() {
        this.currentMessageIndex = 0;
    }
    
    /**
     * Handle interaction with player
     */
    interact(player, game) {
        switch (this.type) {
            case 'dialogue':
                return this.handleDialogue(player, game);
            case 'merchant':
                return this.handleMerchant(player, game);
            case 'guard':
                return this.handleGuard(player, game);
            case 'quest':
                return this.handleQuest(player, game);
            default:
                return this.handleDialogue(player, game); // Default to dialogue
        }
    }
    
    /**
     * Handle dialogue interaction
     */
    handleDialogue(player, game) {
        const message = this.getCurrentMessage();
        if (message) {
            return {
                type: 'dialogue',
                message: message,
                hasMore: this.currentMessageIndex < this.messages.length - 1
            };
        }
        return { type: 'none' };
    }
    
    /**
     * Handle merchant interaction
     */
    handleMerchant(player, game) {
        return {
            type: 'merchant',
            npc: this,
            message: this.getCurrentMessage() || "Welcome to my shop!"
        };
    }
    
    /**
     * Handle guard interaction
     */
    handleGuard(player, game) {
        const message = this.getCurrentMessage() || "Halt! State your business.";
        return {
            type: 'dialogue',
            message: message,
            hasMore: this.currentMessageIndex < this.messages.length - 1
        };
    }
    
    /**
     * Handle quest interaction
     */
    handleQuest(player, game) {
        const message = this.getCurrentMessage() || "I have a task for you...";
        return {
            type: 'quest',
            message: message,
            npc: this,
            hasMore: this.currentMessageIndex < this.messages.length - 1
        };
    }
    
    /**
     * Get NPC state for saving
     */
    getState() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            direction: this.direction,
            currentMessageIndex: this.currentMessageIndex,
            mood: this.mood,
            faction: this.faction
        };
    }
    
    /**
     * Load NPC state
     */
    loadState(state) {
        this.x = state.x || this.x;
        this.y = state.y || this.y;
        this.direction = state.direction || this.direction;
        this.currentMessageIndex = state.currentMessageIndex || 0;
        this.mood = state.mood || this.mood;
        this.faction = state.faction || this.faction;
    }
}
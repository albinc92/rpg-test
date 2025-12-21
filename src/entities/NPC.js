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
        this.showTalkBubble = options.showTalkBubble !== false && (this.script || this.messages.length > 0);
        this.talkBubbleAnimation = 0;
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
        
        // Update talk bubble animation
        if (this.showTalkBubble && this.hasDialogue()) {
            this.talkBubbleAnimation += deltaTime * 2;
        }
    }
    
    /**
     * Override render to add talk bubble after sprite
     */
    render(ctx, game, webglRenderer = null) {
        // Call parent render first (renders sprite/shadow)
        super.render(ctx, game, webglRenderer);
        
        // Don't render talk bubble during shadow pass
        if (webglRenderer && webglRenderer.renderingShadows) {
            return;
        }
        
        // Render talk bubble on top of sprite
        if (this.showTalkBubble && this.hasDialogue() && this.spriteLoaded) {
            const finalScale = this.getFinalScale(game);
            const baseHeight = this.spriteHeight || this.fallbackHeight;
            const scaledHeight = baseHeight * finalScale;
            const scaledX = this.getScaledX(game);
            const scaledY = this.getScaledY(game);
            
            // Render talk bubble (using Canvas2D for simplicity)
            this.renderTalkBubble(ctx, scaledX, scaledY, scaledHeight);
        }
    }
    
    /**
     * Render talk bubble indicator above NPC
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenX - NPC screen X position
     * @param {number} screenY - NPC screen Y position  
     * @param {number} spriteHeight - Height of NPC sprite
     */
    renderTalkBubble(ctx, screenX, screenY, spriteHeight) {
        if (!this.showTalkBubble || !this.hasDialogue()) return;
        
        // Position above sprite
        const bubbleX = screenX;
        const bubbleY = screenY - spriteHeight - 25;
        
        // Bobbing animation
        const bobOffset = Math.sin(this.talkBubbleAnimation) * 3;
        const finalY = bubbleY + bobOffset;
        
        // Draw speech bubble icon
        ctx.save();
        
        // Bubble background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        
        // Main bubble
        ctx.beginPath();
        ctx.ellipse(bubbleX, finalY, 14, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Small triangle pointer
        ctx.beginPath();
        ctx.moveTo(bubbleX - 3, finalY + 8);
        ctx.lineTo(bubbleX + 3, finalY + 8);
        ctx.lineTo(bubbleX, finalY + 14);
        ctx.closePath();
        ctx.fill();
        
        // Three dots inside bubble
        ctx.fillStyle = '#666666';
        const dotY = finalY;
        const dotSpacing = 6;
        
        // Animate dots
        const dotPhase = (this.talkBubbleAnimation * 2) % 3;
        for (let i = 0; i < 3; i++) {
            const dotX = bubbleX + (i - 1) * dotSpacing;
            const dotScale = (Math.floor(dotPhase) === i) ? 1.5 : 1;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 2 * dotScale, 0, Math.PI * 2);
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
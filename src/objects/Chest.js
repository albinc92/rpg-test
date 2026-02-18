/**
 * Chest class - extends InteractiveObject for treasure chests
 */
class Chest extends InteractiveObject {
    constructor(options = {}) {
        super({
            type: 'chest',
            name: 'Treasure Chest',
            scale: options.scale || 0.75,
            maxUsages: 1, // Can only be looted once
            ...options
        });
        
        // Chest-specific properties
        this.loot = options.loot || [];
        this.gold = options.gold || 0;
        this.isOpen = false;
        this.hasBeenLooted = false;
        this.chestType = options.chestType || 'wooden'; // 'wooden', 'silver', 'golden', etc.
        
        // Animation properties
        this.animationProgress = 0;
        this.isAnimating = false;
    }
    
    /**
     * Update chest animation
     */
    update(deltaTime, game) {
        super.update(deltaTime, game);
        
        // Handle opening animation
        if (this.isAnimating) {
            this.animationProgress += deltaTime * 3; // Animation speed
            if (this.animationProgress >= 1) {
                this.animationProgress = 1;
                this.isAnimating = false;
                this.isOpen = true;
            }
        }
    }
    
    /**
     * Handle chest interaction
     */
    interact(player, game) {
        if (this.hasBeenLooted) {
            return {
                type: 'dialogue',
                message: 'This chest is empty.'
            };
        }
        
        if (!this.canPlayerInteract(player)) {
            if (this.requiresKey) {
                return {
                    type: 'dialogue',
                    message: `This chest is locked. You need a ${this.keyId || 'key'} to open it.`
                };
            }
            return { type: 'none' };
        }
        
        // Start opening animation
        this.isAnimating = true;
        this.hasBeenLooted = true;
        
        // Play chest opening sound
        if (game.audioManager) {
            game.audioManager.playEffect('coin.mp3');
        }
        
        // Give loot to player
        const receivedItems = [];
        this.loot.forEach(lootItem => {
            if (player.inventory) {
                const amount = lootItem.amount || 1;
                for (let i = 0; i < amount; i++) {
                    player.inventory.addItem({ id: lootItem.id });
                }
                receivedItems.push({ ...lootItem, amount });
            }
        });
        
        // Give gold to player
        if (this.gold > 0 && player.addGold) {
            player.addGold(this.gold);
        }
        
        return {
            type: 'loot',
            items: receivedItems,
            gold: this.gold,
            message: this.generateLootMessage(receivedItems, this.gold)
        };
    }
    
    /**
     * Generate loot message
     */
    generateLootMessage(items, gold) {
        let message = 'You opened the chest and found:\n';
        
        if (gold > 0) {
            message += `💰 ${gold} gold\n`;
        }
        
        if (items.length > 0) {
            items.forEach(item => {
                const amount = item.amount || 1;
                const itemName = item.name || item.id;
                if (amount > 1) {
                    message += `📦 ${itemName} x${amount}\n`;
                } else {
                    message += `📦 ${itemName}\n`;
                }
            });
        }
        
        if (gold === 0 && items.length === 0) {
            message = 'The chest was empty...';
        }
        
        return message.trim();
    }
    
    /**
     * Custom rendering for chest states
     */
    render(ctx, game) {
        // TODO: Could switch sprite based on open/closed state
        // For now, use base rendering
        super.render(ctx, game);
        
        // Optional: Draw opening animation effect
        if (this.isAnimating) {
            this.renderOpeningEffect(ctx, game);
        }
    }
    
    /**
     * Render chest opening effect
     */
    renderOpeningEffect(ctx, game) {
        const glowRadius = 30 * this.animationProgress;
        
        ctx.save();
        ctx.globalAlpha = 0.5 * (1 - this.animationProgress);
        ctx.fillStyle = '#FFD700';
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    /**
     * Get chest state for saving
     */
    getState() {
        return {
            ...super.getState(),
            hasBeenLooted: this.hasBeenLooted,
            isOpen: this.isOpen,
            loot: this.loot,
            gold: this.gold
        };
    }
    
    /**
     * Load chest state
     */
    loadState(state) {
        super.loadState(state);
        this.hasBeenLooted = state.hasBeenLooted || false;
        this.isOpen = state.isOpen || false;
        this.loot = state.loot || this.loot;
        this.gold = state.gold !== undefined ? state.gold : this.gold;
    }
}
window.Chest = Chest;
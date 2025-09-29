/**
 * InventoryManager - Manages player inventory
 */
class InventoryManager {
    constructor(itemManager) {
        this.itemManager = itemManager;
        this.inventory = [];
        this.maxSlots = 30;
    }
    
    /**
     * Add item to inventory
     */
    addItem(itemId, quantity = 1) {
        const itemType = this.itemManager.getItemType(itemId);
        if (!itemType) {
            console.warn(`Cannot add unknown item: ${itemId}`);
            return false;
        }
        
        let remainingQuantity = quantity;
        
        // If item is stackable, try to add to existing stacks first
        if (itemType.stackable) {
            for (let slot of this.inventory) {
                if (slot.id === itemId && slot.quantity < itemType.maxStack) {
                    const canAdd = Math.min(remainingQuantity, itemType.maxStack - slot.quantity);
                    slot.quantity += canAdd;
                    remainingQuantity -= canAdd;
                    
                    if (remainingQuantity <= 0) {
                        return true;
                    }
                }
            }
        }
        
        // Add to new slots if needed
        while (remainingQuantity > 0 && this.inventory.length < this.maxSlots) {
            const stackSize = Math.min(remainingQuantity, itemType.maxStack);
            const item = this.itemManager.createItem(itemId, stackSize);
            this.inventory.push(item);
            remainingQuantity -= stackSize;
        }
        
        return remainingQuantity <= 0;
    }
    
    /**
     * Remove item from inventory
     */
    removeItem(itemId, quantity = 1) {
        let remainingQuantity = quantity;
        
        for (let i = this.inventory.length - 1; i >= 0; i--) {
            const slot = this.inventory[i];
            if (slot.id === itemId) {
                const removeFromSlot = Math.min(remainingQuantity, slot.quantity);
                slot.quantity -= removeFromSlot;
                remainingQuantity -= removeFromSlot;
                
                if (slot.quantity <= 0) {
                    this.inventory.splice(i, 1);
                }
                
                if (remainingQuantity <= 0) {
                    return true;
                }
            }
        }
        
        return remainingQuantity <= 0;
    }
    
    /**
     * Get quantity of an item in inventory
     */
    getItemQuantity(itemId) {
        let total = 0;
        for (let slot of this.inventory) {
            if (slot.id === itemId) {
                total += slot.quantity;
            }
        }
        return total;
    }
    
    /**
     * Check if inventory has enough of an item
     */
    hasItem(itemId, quantity = 1) {
        return this.getItemQuantity(itemId) >= quantity;
    }
    
    /**
     * Use an item from inventory
     */
    useItem(slotIndex, target) {
        if (slotIndex < 0 || slotIndex >= this.inventory.length) {
            return false;
        }
        
        const item = this.inventory[slotIndex];
        const used = this.itemManager.useItem(item, target);
        
        if (used) {
            this.removeItem(item.id, 1);
            return true;
        }
        
        return false;
    }
    
    /**
     * Get inventory slot
     */
    getSlot(index) {
        return this.inventory[index] || null;
    }
    
    /**
     * Get all inventory slots
     */
    getAllSlots() {
        return [...this.inventory];
    }
    
    /**
     * Get inventory size
     */
    getSize() {
        return this.inventory.length;
    }
    
    /**
     * Get maximum slots
     */
    getMaxSlots() {
        return this.maxSlots;
    }
    
    /**
     * Check if inventory is full
     */
    isFull() {
        return this.inventory.length >= this.maxSlots;
    }
    
    /**
     * Clear inventory
     */
    clear() {
        this.inventory = [];
    }
    
    /**
     * Sort inventory by item type and rarity
     */
    sort() {
        this.inventory.sort((a, b) => {
            // Sort by type first
            if (a.type !== b.type) {
                const typeOrder = ['currency', 'consumable', 'weapon', 'armor', 'treasure'];
                return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
            }
            
            // Then by rarity
            if (a.rarity !== b.rarity) {
                const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
                return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
            }
            
            // Finally by name
            return a.name.localeCompare(b.name);
        });
    }
    
    /**
     * Get inventory value (total gold value of all items)
     */
    getTotalValue() {
        let total = 0;
        for (let slot of this.inventory) {
            total += this.itemManager.getItemValue(slot.id, slot.quantity);
        }
        return total;
    }
    
    /**
     * Find items by type
     */
    findItemsByType(type) {
        return this.inventory.filter(item => item.type === type);
    }
    
    /**
     * Find items by rarity
     */
    findItemsByRarity(rarity) {
        return this.inventory.filter(item => item.rarity === rarity);
    }
    
    /**
     * Save inventory state
     */
    saveState() {
        return {
            inventory: this.inventory.map(item => ({
                id: item.id,
                quantity: item.quantity
            })),
            maxSlots: this.maxSlots
        };
    }
    
    /**
     * Load inventory state
     */
    loadState(state) {
        this.maxSlots = state.maxSlots || this.maxSlots;
        this.inventory = [];
        
        if (state.inventory) {
            state.inventory.forEach(itemData => {
                const item = this.itemManager.createItem(itemData.id, itemData.quantity);
                if (item) {
                    this.inventory.push(item);
                }
            });
        }
    }
}

// Export for use
window.InventoryManager = InventoryManager;
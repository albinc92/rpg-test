/**
 * Inventory Management System for RPG Game
 */

class InventoryManager {
    constructor(itemManager) {
        this.itemManager = itemManager;
        this.inventory = []; // Array of item instances
        this.maxSlots = 20; // Maximum inventory slots
        this.isOpen = false;
        this.selectedSlot = 0;
    }

    /**
     * Add an item to the inventory
     * @param {string} itemId - The item ID to add
     * @param {number} quantity - The quantity to add
     * @returns {boolean} True if item was added successfully
     */
    addItem(itemId, quantity = 1) {
        const itemTemplate = this.itemManager.getItem(itemId);
        if (!itemTemplate) {
            console.error(`Cannot add unknown item: ${itemId}`);
            return false;
        }

        // If item is stackable, try to stack with existing items
        if (itemTemplate.stackable) {
            const existingItem = this.inventory.find(item => 
                item.id === itemId && item.quantity < item.maxStack
            );

            if (existingItem) {
                const spaceAvailable = existingItem.maxStack - existingItem.quantity;
                const amountToAdd = Math.min(quantity, spaceAvailable);
                existingItem.quantity += amountToAdd;
                quantity -= amountToAdd;

                // If we've added all the quantity, we're done
                if (quantity === 0) {
                    console.log(`Added ${amountToAdd} ${itemTemplate.name} to existing stack`);
                    return true;
                }
            }
        }

        // Add remaining quantity as new items
        while (quantity > 0 && this.inventory.length < this.maxSlots) {
            const maxStackForNewItem = itemTemplate.stackable ? 
                Math.min(quantity, itemTemplate.maxStack || 1) : 1;
            
            const newItem = this.itemManager.createItemInstance(itemId, maxStackForNewItem);
            if (newItem) {
                this.inventory.push(newItem);
                quantity -= maxStackForNewItem;
                console.log(`Added ${maxStackForNewItem} ${itemTemplate.name} to inventory`);
            } else {
                return false;
            }
        }

        if (quantity > 0) {
            console.warn(`Could not add ${quantity} ${itemTemplate.name} - inventory full`);
            return false;
        }

        return true;
    }

    /**
     * Remove an item from the inventory
     * @param {string} itemId - The item ID to remove
     * @param {number} quantity - The quantity to remove
     * @returns {boolean} True if item was removed successfully
     */
    removeItem(itemId, quantity = 1) {
        let remainingToRemove = quantity;

        for (let i = this.inventory.length - 1; i >= 0 && remainingToRemove > 0; i--) {
            const item = this.inventory[i];
            if (item.id === itemId) {
                const amountToRemove = Math.min(remainingToRemove, item.quantity);
                item.quantity -= amountToRemove;
                remainingToRemove -= amountToRemove;

                // If item quantity reaches 0, remove it from inventory
                if (item.quantity <= 0) {
                    this.inventory.splice(i, 1);
                }
            }
        }

        return remainingToRemove === 0;
    }

    /**
     * Get the quantity of a specific item in inventory
     * @param {string} itemId - The item ID to count
     * @returns {number} Total quantity of the item
     */
    getItemQuantity(itemId) {
        return this.inventory
            .filter(item => item.id === itemId)
            .reduce((total, item) => total + item.quantity, 0);
    }

    /**
     * Check if inventory has a specific item
     * @param {string} itemId - The item ID to check
     * @param {number} quantity - The minimum quantity required
     * @returns {boolean} True if inventory has the item
     */
    hasItem(itemId, quantity = 1) {
        return this.getItemQuantity(itemId) >= quantity;
    }

    /**
     * Get all items in inventory
     * @returns {array} Array of inventory items
     */
    getInventory() {
        return [...this.inventory]; // Return a copy
    }

    /**
     * Get inventory by type
     * @param {string} type - The item type to filter by
     * @returns {array} Array of items of the specified type
     */
    getInventoryByType(type) {
        return this.inventory.filter(item => item.type === type);
    }

    /**
     * Use/consume an item
     * @param {number} slotIndex - The inventory slot index
     * @returns {boolean} True if item was used successfully
     */
    useItem(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.inventory.length) {
            return false;
        }

        const item = this.inventory[slotIndex];
        if (!item) return false;

        // Handle different item types
        switch (item.type) {
            case 'consumable':
                if (item.effect) {
                    // Apply item effect (this would integrate with player stats)
                    console.log(`Used ${item.name}: ${item.effect.type} ${item.effect.amount}`);
                    this.removeItem(item.id, 1);
                    return true;
                }
                break;
            case 'weapon':
            case 'armor':
                // Equipment items would be handled differently
                console.log(`Cannot use equipment item ${item.name} directly`);
                return false;
            default:
                console.log(`Cannot use item type: ${item.type}`);
                return false;
        }

        return false;
    }

    /**
     * Drop an item from inventory
     * @param {number} slotIndex - The inventory slot index
     * @param {number} quantity - The quantity to drop (default 1)
     * @returns {object|null} The dropped item data or null
     */
    dropItem(slotIndex, quantity = 1) {
        if (slotIndex < 0 || slotIndex >= this.inventory.length) {
            return null;
        }

        const item = this.inventory[slotIndex];
        if (!item) return null;

        const quantityToDrop = Math.min(quantity, item.quantity);
        const droppedItem = {
            id: item.id,
            name: item.name,
            quantity: quantityToDrop,
            sprite: item.sprite
        };

        this.removeItem(item.id, quantityToDrop);
        return droppedItem;
    }

    /**
     * Sort inventory by item type and name
     */
    sortInventory() {
        this.inventory.sort((a, b) => {
            // First sort by type
            if (a.type !== b.type) {
                const typeOrder = ['weapon', 'armor', 'consumable', 'material', 'currency', 'quest'];
                return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
            }
            // Then sort by name
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Get inventory slot count
     * @returns {object} Object with used and max slots
     */
    getSlotInfo() {
        return {
            used: this.inventory.length,
            max: this.maxSlots,
            free: this.maxSlots - this.inventory.length
        };
    }

    /**
     * Clear entire inventory
     */
    clearInventory() {
        this.inventory = [];
        console.log('Inventory cleared');
    }

    /**
     * Save inventory to localStorage
     * @param {string} saveKey - The localStorage key to use
     */
    saveInventory(saveKey) {
        try {
            const inventoryData = this.inventory.map(item => ({
                id: item.id,
                quantity: item.quantity
            }));
            localStorage.setItem(`${saveKey}-inventory`, JSON.stringify(inventoryData));
        } catch (error) {
            console.error('Failed to save inventory:', error);
        }
    }

    /**
     * Load inventory from localStorage
     * @param {string} saveKey - The localStorage key to use
     */
    loadInventory(saveKey) {
        try {
            const inventoryString = localStorage.getItem(`${saveKey}-inventory`);
            if (inventoryString) {
                const inventoryData = JSON.parse(inventoryString);
                this.inventory = [];
                
                inventoryData.forEach(savedItem => {
                    this.addItem(savedItem.id, savedItem.quantity);
                });
                
                console.log('Inventory loaded from localStorage');
            }
        } catch (error) {
            console.error('Failed to load inventory:', error);
        }
    }

    /**
     * Toggle inventory open/closed
     */
    toggleInventory() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.selectedSlot = 0;
        }
    }

    /**
     * Open inventory
     */
    openInventory() {
        this.isOpen = true;
        this.selectedSlot = 0;
    }

    /**
     * Close inventory
     */
    closeInventory() {
        this.isOpen = false;
    }

    /**
     * Navigate inventory selection
     * @param {number} direction - Direction to move (-1 for up/left, 1 for down/right)
     */
    navigateInventory(direction) {
        if (!this.isOpen || this.inventory.length === 0) return;
        
        this.selectedSlot = Math.max(0, Math.min(this.inventory.length - 1, this.selectedSlot + direction));
    }

    /**
     * Get currently selected item
     * @returns {object|null} The selected item or null
     */
    getSelectedItem() {
        if (!this.isOpen || this.selectedSlot >= this.inventory.length) {
            return null;
        }
        return this.inventory[this.selectedSlot];
    }
}

// Export for use in other files
window.InventoryManager = InventoryManager;

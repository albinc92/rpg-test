/**
 * ItemManager - Manages item definitions and behaviors
 */
class ItemManager {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this.itemTypes = {};
    }
    
    /**
     * Initialize items from data loader
     */
    async initialize() {
        const itemsData = await this.dataLoader.loadItems();
        this.itemTypes = itemsData;
        console.log('[ItemManager] ✅ Initialized with', Object.keys(this.itemTypes).length, 'item types');
    }
    
    /**
     * Load items from cached data (synchronous, must call initialize first)
     */
    loadFromCache() {
        const itemsData = this.dataLoader.getItems();
        if (itemsData) {
            this.itemTypes = itemsData;
            console.log('[ItemManager] Loaded from cache:', Object.keys(this.itemTypes).length, 'item types');
        }
    }
    
    /**
     * Get item type definition
     */
    getItemType(itemId) {
        return this.itemTypes[itemId] || null;
    }
    
    /**
     * Create a new item instance
     */
    createItem(itemId, quantity = 1) {
        const itemType = this.getItemType(itemId);
        if (!itemType) {
            console.warn(`Unknown item type: ${itemId}`);
            return null;
        }
        
        return {
            id: itemType.id,
            quantity: Math.min(quantity, itemType.maxStack),
            ...itemType
        };
    }
    
    /**
     * Check if item is stackable
     */
    isStackable(itemId) {
        const itemType = this.getItemType(itemId);
        return itemType ? itemType.stackable : false;
    }
    
    /**
     * Get maximum stack size
     */
    getMaxStack(itemId) {
        const itemType = this.getItemType(itemId);
        return itemType ? itemType.maxStack : 1;
    }
    
    /**
     * Get item value
     */
    getItemValue(itemId, quantity = 1) {
        const itemType = this.getItemType(itemId);
        return itemType ? itemType.value * quantity : 0;
    }
    
    /**
     * Use an item (for consumables)
     */
    useItem(item, target) {
        const itemType = this.getItemType(item.id);
        if (!itemType || itemType.type !== 'consumable') {
            return false;
        }
        
        // Apply item effects
        if (itemType.effects) {
            if (itemType.effects.heal && target.heal) {
                target.heal(itemType.effects.heal);
            }
            // Add more effects as needed
        }
        
        return true;
    }
    
    /**
     * Get all items of a specific type
     */
    getItemsByType(type) {
        return Object.values(this.itemTypes).filter(item => item.type === type);
    }
    
    /**
     * Get all items of a specific rarity
     */
    getItemsByRarity(rarity) {
        return Object.values(this.itemTypes).filter(item => item.rarity === rarity);
    }
    
    /**
     * Add a new item type
     */
    addItemType(itemData) {
        this.itemTypes[itemData.id] = itemData;
    }
    
    /**
     * Remove an item type
     */
    removeItemType(itemId) {
        delete this.itemTypes[itemId];
    }
}

// Export for use
window.ItemManager = ItemManager;
/**
 * ItemManager - Manages item definitions and behaviors
 */
class ItemManager {
    constructor() {
        this.itemTypes = {};
        this.initializeItems();
    }
    
    /**
     * Initialize all item types
     */
    initializeItems() {
        this.itemTypes = {
            'gold_coin': {
                id: 'gold_coin',
                name: 'Gold Coin',
                description: 'A shiny gold coin',
                stackable: true,
                maxStack: 999,
                value: 1,
                type: 'currency',
                rarity: 'common'
            },
            'health_potion': {
                id: 'health_potion',
                name: 'Health Potion',
                description: 'Restores 50 health points',
                stackable: true,
                maxStack: 10,
                value: 25,
                type: 'consumable',
                rarity: 'common',
                effects: {
                    heal: 50
                }
            },
            'magic_sword': {
                id: 'magic_sword',
                name: 'Magic Sword',
                description: 'A sword imbued with magical power',
                stackable: false,
                maxStack: 1,
                value: 500,
                type: 'weapon',
                rarity: 'rare',
                stats: {
                    attack: 25,
                    magic: 10
                }
            },
            'ancient_gem': {
                id: 'ancient_gem',
                name: 'Ancient Gem',
                description: 'A mysterious gem from ancient times',
                stackable: false,
                maxStack: 1,
                value: 1000,
                type: 'treasure',
                rarity: 'legendary'
            }
        };
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
/**
 * Item System for RPG Game
 * Contains all item definitions and related functionality
 */

class ItemManager {
    constructor() {
        this.itemRegistry = new Map(); // Registry of all items by ID
        
        // Initialize the item registry
        this.initializeItemRegistry();
    }

    /**
     * Initialize the item registry with all item definitions
     */
    initializeItemRegistry() {
        // Consumables
        this.registerItem({
            id: 'health_potion',
            name: 'Health Potion',
            description: 'Restores 50 HP when consumed.',
            type: 'consumable',
            rarity: 'common',
            value: 25,
            stackable: true,
            maxStack: 50,
            spriteSrc: 'assets/icon/Items/HealthPotion-0.png',
            effect: {
                type: 'heal',
                amount: 50
            }
        });

        this.registerItem({
            id: 'mana_potion',
            name: 'Mana Potion',
            description: 'Restores 30 MP when consumed.',
            type: 'consumable',
            rarity: 'common',
            value: 20,
            stackable: true,
            maxStack: 50,
            spriteSrc: 'assets/icon/Items/ManaPotion-0.png',
            effect: {
                type: 'mana',
                amount: 30
            }
        });

        // Equipment
        this.registerItem({
            id: 'iron_sword',
            name: 'Iron Sword',
            description: 'A sturdy iron blade. +10 Attack.',
            type: 'weapon',
            rarity: 'common',
            value: 100,
            stackable: false,
            spriteSrc: 'assets/items/iron_sword.png',
            stats: {
                attack: 10
            }
        });

        this.registerItem({
            id: 'leather_armor',
            name: 'Leather Armor',
            description: 'Basic leather protection. +5 Defense.',
            type: 'armor',
            rarity: 'common',
            value: 80,
            stackable: false,
            spriteSrc: 'assets/items/leather_armor.png',
            stats: {
                defense: 5
            }
        });

        // Materials
        this.registerItem({
            id: 'iron_ore',
            name: 'Iron Ore',
            description: 'Raw iron ore. Can be smelted.',
            type: 'material',
            rarity: 'common',
            value: 15,
            stackable: true,
            maxStack: Infinity,
            spriteSrc: 'assets/items/iron_ore.png'
        });

        // Quest Items
        this.registerItem({
            id: 'mysterious_key',
            name: 'Mysterious Key',
            description: 'An ornate key of unknown origin.',
            type: 'quest',
            rarity: 'rare',
            value: 0,
            stackable: false,
            spriteSrc: 'assets/items/mysterious_key.png'
        });

        this.registerItem({
            id: 'magic_scroll',
            name: 'Magic Scroll',
            description: 'An ancient scroll containing mystical knowledge.',
            type: 'quest',
            rarity: 'uncommon',
            value: 25,
            stackable: true,
            maxStack: 10,
            spriteSrc: 'assets/items/magic_scroll.png'
        });
    }

    /**
     * Register a new item in the registry
     * @param {object} itemData - The item data object
     */
    registerItem(itemData) {
        // Create sprite object if spriteSrc is provided
        if (itemData.spriteSrc) {
            itemData.sprite = new Image();
            itemData.sprite.src = itemData.spriteSrc;
            
            // Add error handling for broken images
            itemData.sprite.onerror = () => {
                console.warn(`Failed to load sprite for ${itemData.name}: ${itemData.spriteSrc}`);
                itemData.sprite = null; // Mark as failed
            };
            
            itemData.sprite.onload = () => {
                console.log(`Successfully loaded sprite for ${itemData.name}`);
            };
        }
        
        this.itemRegistry.set(itemData.id, itemData);
    }

    /**
     * Get an item by ID
     * @param {string} itemId - The item ID to retrieve
     * @returns {object|null} The item object or null if not found
     */
    getItem(itemId) {
        return this.itemRegistry.get(itemId) || null;
    }

    /**
     * Get all items as an array
     * @returns {array} Array of all items
     */
    getAllItems() {
        return Array.from(this.itemRegistry.values());
    }

    /**
     * Get items by type
     * @param {string} type - The item type to filter by
     * @returns {array} Array of items of the specified type
     */
    getItemsByType(type) {
        return this.getAllItems().filter(item => item.type === type);
    }

    /**
     * Get items by rarity
     * @param {string} rarity - The rarity to filter by
     * @returns {array} Array of items of the specified rarity
     */
    getItemsByRarity(rarity) {
        return this.getAllItems().filter(item => item.rarity === rarity);
    }

    /**
     * Create a new item instance
     * @param {string} itemId - The item ID
     * @param {number} quantity - The quantity (default 1)
     * @returns {object|null} Item instance or null if item not found
     */
    createItemInstance(itemId, quantity = 1) {
        const itemTemplate = this.getItem(itemId);
        if (!itemTemplate) {
            console.error(`Item ${itemId} not found in registry`);
            return null;
        }

        return {
            id: itemId,
            name: itemTemplate.name,
            description: itemTemplate.description,
            type: itemTemplate.type,
            rarity: itemTemplate.rarity,
            value: itemTemplate.value,
            stackable: itemTemplate.stackable,
            maxStack: itemTemplate.maxStack || 1,
            quantity: quantity,
            sprite: itemTemplate.sprite,
            stats: itemTemplate.stats || {},
            effect: itemTemplate.effect || null
        };
    }

    /**
     * Check if an item exists
     * @param {string} itemId - The item ID to check
     * @returns {boolean} True if item exists
     */
    hasItem(itemId) {
        return this.itemRegistry.has(itemId);
    }

    /**
     * Get rarity color for UI display
     * @param {string} rarity - The rarity string
     * @returns {string} CSS color string
     */
    getRarityColor(rarity) {
        const colors = {
            'common': '#CCCCCC',
            'uncommon': '#00FF00',
            'rare': '#0080FF',
            'epic': '#8000FF',
            'legendary': '#FF8000'
        };
        return colors[rarity] || colors.common;
    }

    /**
     * Remove an item from the registry
     * @param {string} itemId - The ID of the item to remove
     */
    removeItem(itemId) {
        this.itemRegistry.delete(itemId);
    }

    /**
     * Get item count
     * @returns {number} Number of registered items
     */
    getItemCount() {
        return this.itemRegistry.size;
    }
}

// Export for use in other files
window.ItemManager = ItemManager;

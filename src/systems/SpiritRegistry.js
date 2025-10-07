/**
 * SpiritRegistry - Manages spirit templates from spirits.json
 * Provides lookup and creation of spirit instances from templates
 */
class SpiritRegistry {
    constructor(game) {
        this.game = game;
        this.templates = new Map(); // Map of spirit ID -> template data
        this.loaded = false;
    }

    /**
     * Load spirit templates from spirits.json
     */
    async load() {
        try {
            const response = await fetch('data/spirits.json');
            if (!response.ok) {
                throw new Error(`Failed to load spirits.json: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Store templates in map for quick lookup
            data.spirits.forEach(template => {
                this.templates.set(template.id, template);
            });
            
            this.loaded = true;
            console.log(`[SpiritRegistry] Loaded ${this.templates.size} spirit templates`);
            return true;
        } catch (error) {
            console.error('[SpiritRegistry] Error loading spirit templates:', error);
            return false;
        }
    }

    /**
     * Get a spirit template by ID
     */
    getTemplate(spiritId) {
        return this.templates.get(spiritId);
    }

    /**
     * Get all spirit templates
     */
    getAllTemplates() {
        return Array.from(this.templates.values());
    }

    /**
     * Get all spirit IDs
     */
    getAllIds() {
        return Array.from(this.templates.keys());
    }

    /**
     * Check if a spirit template exists
     */
    hasTemplate(spiritId) {
        return this.templates.has(spiritId);
    }

    /**
     * Create a Spirit NPC instance from a template
     * @param {string} spiritId - The spirit template ID
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {string} mapId - Map ID where spirit will spawn
     * @returns {Spirit} Spirit instance or null if template not found
     */
    createSpirit(spiritId, x, y, mapId) {
        const template = this.getTemplate(spiritId);
        if (!template) {
            console.error(`[SpiritRegistry] Spirit template not found: ${spiritId}`);
            return null;
        }

        // Create spirit with template data using the global Spirit class
        const spirit = new Spirit(this.game, x, y, mapId, {
            name: template.name,
            spriteSrc: template.spriteSrc,
            spriteWidth: template.spriteWidth,
            spriteHeight: template.spriteHeight,
            collisionShape: template.collisionShape,
            collisionPercent: template.collisionPercent,
            stats: template.stats,
            moveSpeed: template.moveSpeed,
            movePattern: template.movePattern || 'wander',
            rarity: template.rarity,
            spiritId: spiritId, // Store template ID for reference
            description: template.description
        });

        console.log(`[SpiritRegistry] Created ${template.name} at (${x}, ${y}) on map ${mapId}`);
        return spirit;
    }

    /**
     * Get spirits by rarity
     */
    getTemplatesByRarity(rarity) {
        return Array.from(this.templates.values()).filter(t => t.rarity === rarity);
    }

    /**
     * Get weighted random spirit ID based on rarity
     * Common: 50%, Uncommon: 30%, Rare: 15%, Legendary: 5%
     */
    getWeightedRandomSpiritId() {
        const rarityWeights = {
            common: 50,
            uncommon: 30,
            rare: 15,
            legendary: 5
        };

        const allTemplates = this.getAllTemplates();
        if (allTemplates.length === 0) return null;

        // Build weighted pool
        const weightedPool = [];
        allTemplates.forEach(template => {
            const weight = rarityWeights[template.rarity] || 10;
            for (let i = 0; i < weight; i++) {
                weightedPool.push(template.id);
            }
        });

        // Pick random from weighted pool
        const randomIndex = Math.floor(Math.random() * weightedPool.length);
        return weightedPool[randomIndex];
    }
}

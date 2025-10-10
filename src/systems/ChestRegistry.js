/**
 * ChestRegistry - Manages templates for chests
 * Allows creating, browsing, and reusing chest configurations
 */
class ChestRegistry {
    constructor() {
        this.templates = new Map();
        this.loaded = false;
        
        // Load built-in templates
        this.loadBuiltInTemplates();
        this.loaded = true;
    }

    /**
     * Load built-in chest templates
     */
    loadBuiltInTemplates() {
        // Wooden Chest
        this.addTemplate('Wooden Chest', {
            chestType: 'wooden',
            spriteSrc: '/assets/npc/chest-0.png',
            scale: 0.15,
            rarity: 'Common',
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            locked: false,
            gold: 0,
            loot: []
        });

        // Iron Chest
        this.addTemplate('Iron Chest', {
            chestType: 'iron',
            spriteSrc: '/assets/npc/chest-0.png',
            scale: 0.15,
            rarity: 'Uncommon',
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            locked: false,
            gold: 0,
            loot: []
        });

        // Golden Chest
        this.addTemplate('Golden Chest', {
            chestType: 'golden',
            spriteSrc: '/assets/npc/chest-0.png',
            scale: 0.15,
            rarity: 'Rare',
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            locked: false,
            gold: 0,
            loot: []
        });

        // Mystical Chest
        this.addTemplate('Mystical Chest', {
            chestType: 'mystical',
            spriteSrc: '/assets/npc/chest-0.png',
            scale: 0.15,
            rarity: 'Epic',
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            locked: true,
            gold: 0,
            loot: []
        });

        console.log(`[ChestRegistry] Loaded ${this.templates.size} built-in templates`);
    }

    /**
     * Add a template to the registry
     */
    addTemplate(name, template) {
        if (!name || name.trim() === '') {
            console.error('[ChestRegistry] Template must have a name');
            return false;
        }

        this.templates.set(name, {
            ...template,
            name: name
        });
        
        console.log(`[ChestRegistry] Added template: ${name}`);
        return true;
    }

    /**
     * Get a template by name
     */
    getTemplate(name) {
        return this.templates.get(name);
    }

    /**
     * Get all templates as array
     */
    getAllTemplates() {
        return Array.from(this.templates.values());
    }

    /**
     * Get templates by rarity
     */
    getTemplatesByRarity(rarity) {
        return Array.from(this.templates.values())
            .filter(t => t.rarity === rarity);
    }

    /**
     * Check if template exists
     */
    hasTemplate(name) {
        return this.templates.has(name);
    }

    /**
     * Remove a template
     */
    removeTemplate(name) {
        const removed = this.templates.delete(name);
        if (removed) {
            console.log(`[ChestRegistry] Removed template: ${name}`);
        }
        return removed;
    }

    /**
     * Update an existing template
     */
    updateTemplate(name, updates) {
        const template = this.templates.get(name);
        if (!template) {
            console.error(`[ChestRegistry] Template not found: ${name}`);
            return false;
        }

        this.templates.set(name, {
            ...template,
            ...updates,
            name: name // Preserve name
        });

        console.log(`[ChestRegistry] Updated template: ${name}`);
        return true;
    }

    /**
     * Get template count
     */
    getCount() {
        return this.templates.size;
    }
}

// Export
window.ChestRegistry = ChestRegistry;

/**
 * NPCRegistry - Manages templates for NPCs
 * Allows creating, browsing, and reusing NPC configurations
 */
class NPCRegistry {
    constructor() {
        this.templates = new Map();
        this.loaded = false;
        
        // Load built-in templates
        this.loadBuiltInTemplates();
        this.loaded = true;
    }

    /**
     * Load built-in NPC templates
     */
    loadBuiltInTemplates() {
        // Merchant
        this.addTemplate('Merchant', {
            npcType: 'merchant',
            spriteSrc: '/assets/npc/merchant-0.png',
            scale: 0.15,
            dialogue: 'Welcome to my shop! Looking to buy or sell?',
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            shop: {
                enabled: true,
                inventory: []
            }
        });

        // Sage
        this.addTemplate('Sage', {
            npcType: 'sage',
            spriteSrc: '/assets/npc/sage-0.png',
            scale: 0.15,
            dialogue: 'Greetings, traveler. I sense great potential in you.',
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            quests: []
        });

        // Guard
        this.addTemplate('Guard', {
            npcType: 'guard',
            spriteSrc: '/assets/npc/main-0.png',
            scale: 0.15,
            dialogue: 'Halt! State your business.',
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            aggressive: false
        });

        // Villager
        this.addTemplate('Villager', {
            npcType: 'villager',
            spriteSrc: '/assets/npc/main-0.png',
            scale: 0.15,
            dialogue: 'Hello there! Beautiful day, isn\'t it?',
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true
        });

        console.log(`[NPCRegistry] Loaded ${this.templates.size} built-in templates`);
    }

    /**
     * Add a template to the registry
     */
    addTemplate(name, template) {
        if (!name || name.trim() === '') {
            console.error('[NPCRegistry] Template must have a name');
            return false;
        }

        this.templates.set(name, {
            ...template,
            name: name
        });
        
        console.log(`[NPCRegistry] Added template: ${name}`);
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
            console.log(`[NPCRegistry] Removed template: ${name}`);
        }
        return removed;
    }

    /**
     * Update an existing template
     */
    updateTemplate(name, updates) {
        const template = this.templates.get(name);
        if (!template) {
            console.error(`[NPCRegistry] Template not found: ${name}`);
            return false;
        }

        this.templates.set(name, {
            ...template,
            ...updates,
            name: name // Preserve name
        });

        console.log(`[NPCRegistry] Updated template: ${name}`);
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
window.NPCRegistry = NPCRegistry;

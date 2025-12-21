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
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            quests: [],
            script: `// Sage - Wise elder who guides the player
if (getvar("sage_quest_complete")) {
    message "You have proven yourself, <b>hero</b>.";
    message "The <color=#9900ff>ancient magic</color> flows strong in you now.";
    message "Go forth and bring <color=#ffcc00>light</color> to the darkness.";
} else if (getvar("sage_quest_started")) {
    if (hasitem("ancient_crystal", 3)) {
        message "Remarkable! You found all three <color=#00ffff>Ancient Crystals</color>!";
        delitem "ancient_crystal", 3;
        message "<i>*The sage's eyes glow with power*</i>";
        message "As promised, I bestow upon you the gift of <color=#9900ff>Arcane Sight</color>.";
        additem "gold", 500;
        setvar "sage_quest_complete", true;
        playsound "quest-complete.mp3";
        message "You've earned <color=#ffcc00>500 gold</color> and my eternal gratitude.";
    } else {
        message "Have you found the <color=#00ffff>Ancient Crystals</color> yet?";
        message "They are hidden in the <b>forest caves</b> to the east.";
        message "Bring me <b>3 crystals</b> and I shall reward you greatly.";
    }
} else {
    message "Greetings, <b>traveler</b>. I sense great potential in you.";
    message "I am the <color=#9900ff>Sage</color> of this village.";
    message "Would you help an old man with a task?";
    choice "What do you need?", "Maybe later";
    
    if (choice == 0) {
        message "Deep in the eastern caves lie <color=#00ffff>Ancient Crystals</color>.";
        message "They hold immense power, but I am too old to retrieve them.";
        message "Bring me <b>3 crystals</b> and I shall teach you <color=#9900ff>ancient magic</color>.";
        setvar "sage_quest_started", true;
        message "<i>*Quest Started: The Sage's Request*</i>";
    } else {
        message "I understand. Return when you are ready.";
        message "The crystals have waited centuries... they can wait a bit longer.";
    }
}
end;`
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

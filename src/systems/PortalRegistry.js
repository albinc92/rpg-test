/**
 * PortalRegistry - Manages templates for portals
 * Allows creating, browsing, and reusing portal configurations
 */
class PortalRegistry {
    constructor() {
        this.templates = new Map();
        this.loaded = false;
        
        // Load built-in templates
        this.loadBuiltInTemplates();
        this.loaded = true;
    }

    /**
     * Load built-in portal templates
     */
    loadBuiltInTemplates() {
        // Door
        this.addTemplate('Door', {
            portalType: 'door',
            spriteSrc: '/assets/npc/door-0.png',
            scale: 0.15,
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            targetMap: '0-0',
            spawnPoint: 'default',
            locked: false,
            requiredKey: null
        });

        // Teleport Pad
        this.addTemplate('Teleport Pad', {
            portalType: 'teleport',
            spriteSrc: '/assets/npc/navigation-0.png',
            scale: 0.15,
            collisionShape: 'circle',
            hasCollision: false,
            canInteract: true,
            targetMap: '0-0',
            spawnPoint: 'default',
            autoTeleport: true,
            locked: false
        });

        // Stairs
        this.addTemplate('Stairs', {
            portalType: 'stairs',
            spriteSrc: '/assets/npc/door-0.png',
            scale: 0.15,
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            targetMap: '0-0',
            spawnPoint: 'default',
            locked: false
        });

        // Cave Entrance
        this.addTemplate('Cave Entrance', {
            portalType: 'cave',
            spriteSrc: '/assets/npc/door-0.png',
            scale: 0.15,
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            targetMap: '0-0',
            spawnPoint: 'default',
            locked: false
        });

        // Warp Gate
        this.addTemplate('Warp Gate', {
            portalType: 'warp',
            spriteSrc: '/assets/npc/navigation-0.png',
            scale: 0.2,
            collisionShape: 'rectangle',
            hasCollision: true,
            canInteract: true,
            targetMap: '0-0',
            spawnPoint: 'default',
            locked: false,
            particles: true
        });

        console.log(`[PortalRegistry] Loaded ${this.templates.size} built-in templates`);
    }

    /**
     * Add a template to the registry
     */
    addTemplate(name, template) {
        if (!name || name.trim() === '') {
            console.error('[PortalRegistry] Template must have a name');
            return false;
        }

        this.templates.set(name, {
            ...template,
            name: name
        });
        
        console.log(`[PortalRegistry] Added template: ${name}`);
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
     * Get templates by portal type
     */
    getTemplatesByType(portalType) {
        return Array.from(this.templates.values())
            .filter(t => t.portalType === portalType);
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
            console.log(`[PortalRegistry] Removed template: ${name}`);
        }
        return removed;
    }

    /**
     * Update an existing template
     */
    updateTemplate(name, updates) {
        const template = this.templates.get(name);
        if (!template) {
            console.error(`[PortalRegistry] Template not found: ${name}`);
            return false;
        }

        this.templates.set(name, {
            ...template,
            ...updates,
            name: name // Preserve name
        });

        console.log(`[PortalRegistry] Updated template: ${name}`);
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
window.PortalRegistry = PortalRegistry;

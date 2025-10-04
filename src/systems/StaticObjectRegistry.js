/**
 * StaticObjectRegistry - Manages templates for static objects
 * Allows creating, browsing, and reusing static object configurations
 */
class StaticObjectRegistry {
    constructor() {
        this.templates = new Map();
        this.categories = [
            'tree',
            'bush', 
            'rock',
            'clutter',
            'decoration',
            'structure',
            'flora',
            'furniture',
            'other'
        ];
        
        // Load built-in templates
        this.loadBuiltInTemplates();
    }

    /**
     * Load built-in static object templates
     */
    loadBuiltInTemplates() {
        // Trees
        this.addTemplate('Oak Tree', {
            objectCategory: 'tree',
            spriteSrc: 'assets/objects/trees/tree-01.png',
            scale: 1.0,
            collisionExpandTopPercent: -0.90,
            collisionExpandBottomPercent: 0,
            collisionExpandRightPercent: -0.25,
            collisionExpandLeftPercent: -0.25,
            castsShadow: false,
            swaysInWind: true
        });

        // Bushes
        this.addTemplate('Green Bush', {
            objectCategory: 'bush',
            spriteSrc: 'assets/objects/bushes/bush-01.png',
            scale: 0.5,
            collisionExpandTopPercent: -0.70,
            collisionExpandBottomPercent: 0,
            collisionExpandRightPercent: -0.05,
            collisionExpandLeftPercent: -0.05,
            castsShadow: false,
            swaysInWind: true
        });

        // Rocks
        this.addTemplate('Boulder', {
            objectCategory: 'rock',
            spriteSrc: 'assets/objects/rocks/rock-01.png',
            scale: 0.3,
            collisionExpandTopPercent: 0,
            collisionExpandBottomPercent: 0,
            collisionExpandRightPercent: 0,
            collisionExpandLeftPercent: 0,
            castsShadow: false,
            swaysInWind: false
        });

        console.log(`[StaticObjectRegistry] Loaded ${this.templates.size} built-in templates`);
    }

    /**
     * Add a template to the registry
     */
    addTemplate(name, template) {
        console.log(`[StaticObjectRegistry] addTemplate called with name="${name}"`, template);
        
        if (!name || name.trim() === '') {
            console.error('[StaticObjectRegistry] Template must have a name');
            return false;
        }

        this.templates.set(name, template);
        console.log(`[StaticObjectRegistry] ✅ Added template: ${name} (total: ${this.templates.size})`);
        return true;
    }

    /**
     * Get a template by name
     */
    getTemplate(name) {
        return this.templates.get(name);
    }

    /**
     * Get all templates as array of {name, template} objects
     */
    getAllTemplates() {
        return Array.from(this.templates.entries()).map(([name, template]) => ({
            name,
            template
        }));
    }

    /**
     * Get templates by category
     */
    getTemplatesByCategory(category) {
        return Array.from(this.templates.values())
            .filter(t => t.objectCategory === category);
    }

    /**
     * Get all categories
     */
    getCategories() {
        return [...this.categories];
    }

    /**
     * Remove a template
     */
    removeTemplate(id) {
        return this.templates.delete(id);
    }

    /**
     * Update an existing template
     */
    updateTemplate(id, updates) {
        const template = this.templates.get(id);
        if (!template) return false;

        Object.assign(template, updates);
        return true;
    }

    /**
     * Create a new template from object data
     */
    createTemplate(name, objectData) {
        const id = `custom_${Date.now()}`;
        const template = {
            id: id,
            name: name,
            ...objectData
        };

        return this.addTemplate(template) ? id : null;
    }

    /**
     * Export templates to JSON
     */
    exportTemplates() {
        const data = Array.from(this.templates.values());
        return JSON.stringify(data, null, 2);
    }

    /**
     * Import templates from JSON
     */
    importTemplates(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            let count = 0;

            data.forEach(template => {
                if (this.addTemplate(template)) {
                    count++;
                }
            });

            console.log(`[StaticObjectRegistry] Imported ${count} templates`);
            return count;
        } catch (error) {
            console.error('[StaticObjectRegistry] Failed to import templates:', error);
            return 0;
        }
    }
}

// Export
window.StaticObjectRegistry = StaticObjectRegistry;

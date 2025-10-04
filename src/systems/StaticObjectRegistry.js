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
        this.addTemplate({
            id: 'tree-01',
            name: 'Oak Tree',
            objectCategory: 'tree',
            spriteSrc: 'assets/objects/trees/tree-01.png',
            scale: 1.0,
            collisionExpandTopPercent: -0.90,
            collisionExpandRightPercent: -0.25,
            collisionExpandLeftPercent: -0.25,
            castsShadow: false,
            swaysInWind: true,
            animationType: 'sway',
            animationSpeed: 0.001,
            animationIntensity: 5.0
        });

        // Bushes
        this.addTemplate({
            id: 'bush-01',
            name: 'Green Bush',
            objectCategory: 'bush',
            spriteSrc: 'assets/objects/bushes/bush-01.png',
            scale: 0.5,
            collisionExpandTopPercent: -0.70,
            collisionExpandRightPercent: -0.05,
            collisionExpandLeftPercent: -0.05,
            castsShadow: false,
            swaysInWind: true,
            animationType: 'sway',
            animationSpeed: 0.002,
            animationIntensity: 3.0
        });

        // Rocks
        this.addTemplate({
            id: 'rock-01',
            name: 'Boulder',
            objectCategory: 'rock',
            spriteSrc: 'assets/objects/rocks/rock-01.png',
            scale: 0.3,
            castsShadow: false,
            swaysInWind: false
        });

        console.log(`[StaticObjectRegistry] Loaded ${this.templates.size} built-in templates`);
    }

    /**
     * Add a template to the registry
     */
    addTemplate(template) {
        if (!template.id) {
            console.error('[StaticObjectRegistry] Template must have an ID');
            return false;
        }

        this.templates.set(template.id, template);
        console.log(`[StaticObjectRegistry] Added template: ${template.name} (${template.id})`);
        return true;
    }

    /**
     * Get a template by ID
     */
    getTemplate(id) {
        return this.templates.get(id);
    }

    /**
     * Get all templates
     */
    getAllTemplates() {
        return Array.from(this.templates.values());
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

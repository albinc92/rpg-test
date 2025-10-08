/**
 * TemplateManager - Manages object templates and propagates changes to instances
 */
class TemplateManager {
    constructor(game) {
        this.game = game;
        this.templates = new Map(); // templateId -> template data
        this.instanceToTemplate = new Map(); // objectId -> templateId
        this.initialized = false;
    }

    /**
     * Initialize templates from default set
     */
    async initialize() {
        console.log('[TemplateManager] Initializing templates...');
        
        // Load default templates
        this.loadDefaultTemplates();
        
        // Try to load custom templates from localStorage
        this.loadCustomTemplates();
        
        this.initialized = true;
        console.log('[TemplateManager] Initialized with', this.templates.size, 'templates');
    }

    /**
     * Load default object templates
     */
    loadDefaultTemplates() {
        const defaults = [
            {
                id: 'tree-01',
                name: 'Oak Tree',
                category: 'StaticObject',
                icon: '🌳',
                spriteSrc: 'assets/objects/trees/tree-01.png',
                scale: 1.0,
                collisionExpandTopPercent: -0.90,
                collisionExpandRightPercent: -0.25,
                collisionExpandLeftPercent: -0.25,
                castsShadow: true,
                animationType: 'sway',
                swaysInWind: true,
                animationSpeed: 0.001,
                animationIntensity: 1.0
            },
            {
                id: 'bush-01',
                name: 'Bush',
                category: 'StaticObject',
                icon: '🌿',
                spriteSrc: 'assets/objects/bushes/bush-01.png',
                scale: 0.5,
                collisionExpandTopPercent: -0.70,
                collisionExpandRightPercent: -0.05,
                collisionExpandLeftPercent: -0.05,
                castsShadow: false,
                animationType: 'sway',
                swaysInWind: true,
                animationSpeed: 0.002,
                animationIntensity: 0.5
            },
            {
                id: 'rock-01',
                name: 'Rock',
                category: 'StaticObject',
                icon: '🪨',
                spriteSrc: 'assets/objects/rocks/rock-01.png',
                scale: 0.3,
                collisionExpandTopPercent: -0.60,
                castsShadow: true,
                animationType: 'none'
            }
        ];

        defaults.forEach(template => {
            this.templates.set(template.id, template);
        });
    }

    /**
     * Load custom templates from localStorage
     */
    loadCustomTemplates() {
        try {
            const saved = localStorage.getItem('customTemplates');
            if (saved) {
                const custom = JSON.parse(saved);
                Object.entries(custom).forEach(([id, template]) => {
                    this.templates.set(id, template);
                });
                console.log('[TemplateManager] Loaded custom templates');
            }
        } catch (e) {
            console.error('[TemplateManager] Failed to load custom templates:', e);
        }
    }

    /**
     * Save custom templates to localStorage
     */
    saveCustomTemplates() {
        try {
            const custom = {};
            this.templates.forEach((template, id) => {
                // Only save if it's been modified (has a 'modified' flag or different from default)
                custom[id] = template;
            });
            localStorage.setItem('customTemplates', JSON.stringify(custom));
            console.log('[TemplateManager] Saved custom templates');
        } catch (e) {
            console.error('[TemplateManager] Failed to save custom templates:', e);
        }
    }

    /**
     * Get template by ID
     */
    getTemplate(templateId) {
        return this.templates.get(templateId);
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
        return this.getAllTemplates().filter(t => t.category === category);
    }

    /**
     * Update template and apply to all instances
     */
    updateTemplate(templateId, updates) {
        const template = this.templates.get(templateId);
        if (!template) {
            console.error('[TemplateManager] Template not found:', templateId);
            return;
        }

        // Merge updates
        Object.assign(template, updates);
        template.modified = true;

        console.log('[TemplateManager] Updated template:', templateId);

        // Apply to all instances
        this.applyTemplateToInstances(templateId);

        // Save to localStorage
        this.saveCustomTemplates();
    }

    /**
     * Apply template changes to all objects using this template
     */
    applyTemplateToInstances(templateId) {
        const template = this.templates.get(templateId);
        if (!template) return;

        let updatedCount = 0;

        // Iterate through all maps
        Object.keys(this.game.objectManager.objects).forEach(mapId => {
            const objects = this.game.objectManager.objects[mapId];
            
            objects.forEach(obj => {
                // Check if object uses this template
                if (obj.templateId === templateId || 
                    (obj.spriteSrc === template.spriteSrc && !obj.templateId)) {
                    
                    // Apply template properties (but keep position, id, etc.)
                    const preserveKeys = ['x', 'y', 'id', 'templateId'];
                    Object.entries(template).forEach(([key, value]) => {
                        if (!preserveKeys.includes(key) && key !== 'id' && key !== 'name' && key !== 'icon') {
                            obj[key] = value;
                        }
                    });
                    
                    updatedCount++;
                }
            });
        });

        console.log(`[TemplateManager] Applied template ${templateId} to ${updatedCount} objects`);
    }

    /**
     * Register an object instance with a template
     */
    registerInstance(objectId, templateId) {
        this.instanceToTemplate.set(objectId, templateId);
    }

    /**
     * Get template ID for an object instance
     */
    getTemplateForInstance(objectId) {
        return this.instanceToTemplate.get(objectId);
    }

    /**
     * Create object from template
     */
    createFromTemplate(templateId, x, y) {
        const template = this.templates.get(templateId);
        if (!template) {
            console.error('[TemplateManager] Template not found:', templateId);
            return null;
        }

        // Clone template data
        const objectData = {
            ...template,
            x,
            y,
            templateId, // Store reference to template
            // Remove template-only properties
            id: undefined,
            name: undefined,
            icon: undefined
        };

        return objectData;
    }
}

window.TemplateManager = TemplateManager;

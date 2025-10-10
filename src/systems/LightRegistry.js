/**
 * LightRegistry - Manages light source templates and instances
 * Similar to SpiritRegistry and StaticObjectRegistry
 */
class LightRegistry {
    constructor() {
        // Light templates (available in editor)
        this.templates = new Map();
        
        // Initialize default light templates
        this.initializeDefaultTemplates();
        
        console.log('[LightRegistry] Initialized with default templates');
    }
    
    /**
     * Initialize default light templates
     */
    initializeDefaultTemplates() {
        // Warm torch light
        this.addTemplate({
            name: 'Torch',
            radius: 150,
            color: { r: 255, g: 200, b: 100, a: 0.8 },
            flicker: {
                enabled: true,
                intensity: 0.3,  // 0-1, how much brightness varies
                speed: 0.1       // How fast it flickers
            }
        });
        
        // Campfire
        this.addTemplate({
            name: 'Campfire',
            radius: 200,
            color: { r: 255, g: 150, b: 50, a: 0.9 },
            flicker: {
                enabled: true,
                intensity: 0.4,
                speed: 0.15
            }
        });
        
        // Lantern - steady light
        this.addTemplate({
            name: 'Lantern',
            radius: 120,
            color: { r: 255, g: 240, b: 200, a: 0.7 },
            flicker: {
                enabled: true,
                intensity: 0.1,
                speed: 0.05
            }
        });
        
        // Magic crystal - blue light
        this.addTemplate({
            name: 'Magic Crystal',
            radius: 180,
            color: { r: 100, g: 150, b: 255, a: 0.8 },
            flicker: {
                enabled: true,
                intensity: 0.2,
                speed: 0.08
            }
        });
        
        // Candle - small, warm
        this.addTemplate({
            name: 'Candle',
            radius: 80,
            color: { r: 255, g: 220, b: 150, a: 0.6 },
            flicker: {
                enabled: true,
                intensity: 0.35,
                speed: 0.12
            }
        });
        
        // Street lamp - cool, steady
        this.addTemplate({
            name: 'Street Lamp',
            radius: 250,
            color: { r: 255, g: 255, b: 230, a: 0.7 },
            flicker: {
                enabled: false,
                intensity: 0,
                speed: 0
            }
        });
        
        // Moonlight - soft, blue-white
        this.addTemplate({
            name: 'Moonlight',
            radius: 300,
            color: { r: 200, g: 220, b: 255, a: 0.4 },
            flicker: {
                enabled: false,
                intensity: 0,
                speed: 0
            }
        });
        
        // Fire pit
        this.addTemplate({
            name: 'Fire Pit',
            radius: 220,
            color: { r: 255, g: 120, b: 30, a: 0.85 },
            flicker: {
                enabled: true,
                intensity: 0.5,
                speed: 0.18
            }
        });
    }
    
    /**
     * Add or update a light template
     */
    addTemplate(template) {
        // Validate template
        if (!template.name) {
            console.error('[LightRegistry] Template must have a name');
            return false;
        }
        
        // Ensure required fields
        const lightTemplate = {
            name: template.name,
            radius: template.radius || 100,
            color: template.color || { r: 255, g: 255, b: 255, a: 0.8 },
            flicker: template.flicker || {
                enabled: false,
                intensity: 0,
                speed: 0
            }
        };
        
        this.templates.set(template.name, lightTemplate);
        console.log(`[LightRegistry] ${this.templates.has(template.name) ? 'Updated' : 'Added'} template: ${template.name}`);
        return true;
    }
    
    /**
     * Get a light template by name
     */
    getTemplate(name) {
        return this.templates.get(name);
    }
    
    /**
     * Get all light templates (for editor dropdown)
     */
    getAllTemplates() {
        return Array.from(this.templates.values());
    }
    
    /**
     * Remove a light template
     */
    removeTemplate(name) {
        if (this.templates.delete(name)) {
            console.log(`[LightRegistry] Removed template: ${name}`);
            return true;
        }
        return false;
    }
    
    /**
     * Create a light instance from a template
     */
    createLightFromTemplate(templateName, x, y, id = null) {
        const template = this.getTemplate(templateName);
        if (!template) {
            console.error(`[LightRegistry] Template not found: ${templateName}`);
            return null;
        }
        
        // Create a unique instance
        const light = {
            id: id || `light_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            templateName: templateName,
            x: x,
            y: y,
            radius: template.radius,
            color: { ...template.color },
            flicker: { ...template.flicker },
            // Runtime flicker state
            _flickerOffset: Math.random() * Math.PI * 2,
            _currentIntensity: 1.0
        };
        
        return light;
    }
    
    /**
     * Export templates for saving
     */
    exportTemplates() {
        const templates = [];
        this.templates.forEach((template) => {
            templates.push({
                name: template.name,
                radius: template.radius,
                color: { ...template.color },
                flicker: { ...template.flicker }
            });
        });
        return templates;
    }
    
    /**
     * Import templates from saved data
     */
    importTemplates(templates) {
        if (!Array.isArray(templates)) return;
        
        // Clear existing non-default templates or just add new ones
        templates.forEach(template => {
            this.addTemplate(template);
        });
    }
}

// Export
window.LightRegistry = LightRegistry;

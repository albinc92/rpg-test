/**
 * LightRegistry - Manages light source templates and instances
 * Similar to SpiritRegistry and StaticObjectRegistry
 */
class LightRegistry {
    constructor() {
        // Light templates (available in editor)
        this.templates = new Map();
        this.dataLoaded = false;
        
        console.log('[LightRegistry] Initialized');
    }
    
    /**
     * Load templates from JSON data
     */
    async loadTemplates() {
        if (this.dataLoaded) return; // Already loaded
        
        try {
            const response = await fetch('/data/lights.json');
            const data = await response.json();
            
            if (data.lights && Array.isArray(data.lights)) {
                // Clear any existing templates first
                this.templates.clear();
                
                data.lights.forEach(template => {
                    this.addTemplate(template);
                });
                console.log(`[LightRegistry] ✅ Loaded ${data.lights.length} templates from lights.json`);
            }
            
            this.dataLoaded = true;
        } catch (error) {
            console.error('[LightRegistry] ❌ Failed to load lights.json:', error);
            console.error('[LightRegistry] Create templates in the Light Template Editor and export them to data/lights.json');
            this.dataLoaded = true; // Mark as loaded even if failed, so we don't retry
        }
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
     * Export templates for saving to lights.json
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
     * Export templates as JSON format (for lights.json file)
     */
    exportToJSON() {
        return {
            lights: this.exportTemplates()
        };
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

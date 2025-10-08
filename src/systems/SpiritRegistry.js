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

        console.log(`[SpiritRegistry] Creating ${template.name} with sprite: ${template.spriteSrc}, scale: ${template.scale || 0.8}`);
        
        // Create spirit with template data using the global Spirit class
        const spirit = new Spirit(this.game, x, y, mapId, {
            name: template.name,
            spriteSrc: template.spriteSrc,
            // Don't pass spriteWidth/spriteHeight - GameObject will auto-detect from image
            // Only pass scale for consistent sizing with other game objects
            scale: template.scale || 0.8,
            hasCollision: template.hasCollision !== false, // Default true
            collisionShape: template.collisionShape,
            collisionPercent: template.collisionPercent,
            collisionExpandTopPercent: template.collisionExpandTopPercent,
            collisionExpandBottomPercent: template.collisionExpandBottomPercent,
            collisionExpandLeftPercent: template.collisionExpandLeftPercent,
            collisionExpandRightPercent: template.collisionExpandRightPercent,
            isFloating: template.isFloating || false, // Default: not floating
            floatingSpeed: template.floatingSpeed,
            floatingRange: template.floatingRange,
            stats: template.stats,
            moveSpeed: template.moveSpeed,
            movePattern: template.movePattern || 'wander',
            spiritId: spiritId, // Store template ID for reference
            description: template.description
        });

        console.log(`[SpiritRegistry] ✅ Created ${template.name} (${spirit.id}) at (${Math.round(x)}, ${Math.round(y)}) with scale ${spirit.scale} - sprite loaded: ${spirit.spriteLoaded}, spriteSrc: ${spirit.spriteSrc}`);
        return spirit;
    }

    /**
     * Update a spirit template (usually from editor)
     * This will propagate changes to all existing spirits using this template
     * @param {string} spiritId - The spirit template ID
     * @param {Object} templateData - Updated template data
     */
    updateTemplate(spiritId, templateData) {
        // Update the template in memory
        this.templates.set(spiritId, templateData);
        console.log(`[SpiritRegistry] 📝 Updated template: ${spiritId}`);
        
        // Find all existing spirits using this template and update them
        const allMaps = this.game.objectManager.objects;
        let updatedCount = 0;
        
        for (const mapId in allMaps) {
            const mapObjects = allMaps[mapId];
            mapObjects.forEach(obj => {
                if (obj instanceof Spirit && obj.spiritId === spiritId) {
                    obj.updateFromTemplate(templateData);
                    updatedCount++;
                }
            });
        }
        
        console.log(`[SpiritRegistry] ✅ Propagated template changes to ${updatedCount} existing spirit(s)`);
        return updatedCount;
    }

    /**
     * Save all templates to spirits.json
     * Returns JSON string that can be downloaded/saved
     */
    exportTemplates() {
        const data = {
            spirits: Array.from(this.templates.values())
        };
        return JSON.stringify(data, null, 2);
    }

}

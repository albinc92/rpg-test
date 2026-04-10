/**
 * SpiritRegistry - Manages spirit templates from spirits.json
 * AND the species database from spirit_registry.json (evolution, fusion, archetypes, type chart)
 * Provides lookup and creation of spirit instances from templates
 */
class SpiritRegistry {
    constructor(game) {
        this.game = game;
        this.templates = new Map(); // Map of spirit ID -> template data (spawn templates)
        this.loaded = false;
        
        // Species registry (from spirit_registry.json)
        this.meta = null;
        this.elements = null;
        this.typeChart = null;
        this.archetypes = null;
        this.abilities = null;
        this.species = null;
        this.fusionTable = null;
        this.speciesMap = new Map();  // speciesId -> species chain
        this.abilityMap = new Map();  // abilityId -> ability data
        this.registryLoaded = false;
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
            
            // Also load the species registry
            await this.loadRegistry();
            
            return true;
        } catch (error) {
            console.error('[SpiritRegistry] Error loading spirit templates:', error);
            return false;
        }
    }

    /**
     * Load the species registry from spirit_registry.json
     */
    async loadRegistry() {
        try {
            const response = await fetch('data/spirit_registry.json');
            if (!response.ok) {
                console.warn(`[SpiritRegistry] spirit_registry.json not found (${response.status}) — evolution/fusion disabled`);
                return false;
            }
            
            const data = await response.json();
            
            this.meta = data.meta || null;
            this.elements = data.elements || null;
            this.typeChart = data.typeChart || null;
            this.archetypes = data.archetypes || null;
            this.species = data.species || [];
            this.fusionTable = data.fusionTable || {};
            
            // Build species lookup map (by speciesId for each stage)
            this.species.forEach(chain => {
                if (chain.stages) {
                    chain.stages.forEach(stage => {
                        this.speciesMap.set(stage.id, { chain, stage });
                    });
                }
                // Also index by chainId
                this.speciesMap.set(chain.chainId, { chain, stage: null });
            });
            
            // Build ability lookup map
            this.abilityMap.clear();
            if (data.abilities) {
                this.abilities = data.abilities;
                data.abilities.forEach(ability => {
                    this.abilityMap.set(ability.id, ability);
                });
            }
            
            this.registryLoaded = true;
            console.log(`[SpiritRegistry] Registry loaded: ${this.species.length} species chains, ${this.abilityMap.size} abilities, ${Object.keys(this.fusionTable).length} fusion recipes`);
            return true;
        } catch (error) {
            console.error('[SpiritRegistry] Error loading species registry:', error);
            return false;
        }
    }
    
    /**
     * Look up a species chain by chainId
     */
    getSpeciesChain(chainId) {
        const entry = this.speciesMap.get(chainId);
        return entry?.chain || null;
    }
    
    /**
     * Look up a species by its speciesId (e.g., 'scorchling')
     */
    getSpecies(speciesId) {
        return this.speciesMap.get(speciesId) || null;
    }
    
    /**
     * Look up an ability by ID
     */
    getAbility(abilityId) {
        return this.abilityMap.get(abilityId) || null;
    }
    
    /**
     * Resolve a learnset for a species chain (replacing ELEMENT_T1..T4 placeholders)
     */
    resolveLearnset(chainId) {
        const chain = this.getSpeciesChain(chainId);
        if (!chain) return [];
        
        const archetype = this.archetypes?.[chain.archetype];
        const element = this.elements?.[chain.element];
        if (!archetype?.learnsetTemplate || !element) return [];
        
        return archetype.learnsetTemplate.map(entry => {
            let abilityId = entry.ability;
            // Replace element tier placeholders
            if (abilityId === 'ELEMENT_T1') abilityId = element.tier1;
            else if (abilityId === 'ELEMENT_T2') abilityId = element.tier2;
            else if (abilityId === 'ELEMENT_T3') abilityId = element.tier3;
            else if (abilityId === 'ELEMENT_T4') abilityId = element.tier4;
            
            return { level: entry.level, abilityId, ability: this.getAbility(abilityId) };
        });
    }
    
    /**
     * Get abilities a spirit should know at a given level
     */
    getAbilitiesForLevel(chainId, level) {
        const learnset = this.resolveLearnset(chainId);
        const maxSlots = this.meta?.maxAbilitySlots || 4;
        
        // Get all abilities learned up to this level
        const learned = learnset
            .filter(entry => entry.level <= level && entry.ability)
            .map(entry => entry.ability);
        
        // Return the most recent maxSlots abilities (like keeping the newest moves)
        return learned.slice(-maxSlots);
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
    createSpirit(spiritId, x, y, mapId, zoneLevel) {
        const template = this.getTemplate(spiritId);
        if (!template) {
            console.error(`[SpiritRegistry] Spirit template not found: ${spiritId}`);
            return null;
        }

        // Zone level overrides template level if provided
        const effectiveLevel = zoneLevel || template.level || 5;

        console.log(`[SpiritRegistry] Creating ${template.name} (Lv.${effectiveLevel}) with sprite: ${template.spriteSrc}, scale: ${template.scale || 0.8}`);
        
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
            // Battle stats
            level: effectiveLevel,
            type1: template.type1 || 'fire',
            type2: template.type2 || null,
            baseStats: template.baseStats || template.stats,
            expYield: template.expYield || 25,
            goldYield: template.goldYield || 10,
            abilities: template.abilities,
            moveSpeed: template.moveSpeed,
            movePattern: template.movePattern || 'wander',
            spiritId: spiritId, // Store template ID for reference
            description: template.description,
            // Spirit registry fields (evolution/fusion)
            chainId: template.chainId || null,
            archetype: template.archetype || null,
            stage: template.stage || 1,
            stageMultiplier: template.stageMultiplier || 1.0,
            speciesId: template.speciesId || null
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

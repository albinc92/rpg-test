/**
 * ObjectManager - Unified manager for ALL game objects across maps
 * 
 * Handles: NPCs, Merchants, Spirits, Trees, Rocks, Chests, Portals, Signs, etc.
 * Philosophy: All objects are GameObjects. Behavior differences are in the classes themselves.
 */
class ObjectManager {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        
        // Map ID -> array of ALL objects on that map
        this.objects = {};
        
        // Track which maps have been initialized
        this.initializedMaps = new Set();
        
        // Object registry by ID for quick lookups
        this.objectRegistry = new Map();
        
        // Object definitions loaded from JSON
        this.objectDefinitions = {};
        
        // Category-based class registry (base classes)
        this.categoryRegistry = {
            'StaticObject': StaticObject,
            'Actor': Actor,
            'InteractiveObject': InteractiveObject
        };
        
        // Subtype factories (for specialized behavior within categories)
        this.subtypeFactories = {
            'Actor': {
                'npc': (data) => new NPC(data),
                'spirit': (data) => new Spirit(data),
                'merchant': (data) => new NPC({ ...data, npcType: 'merchant' })
            },
            'InteractiveObject': {
                'chest': (data) => new Chest(data),
                'portal': (data) => new Portal(data),
                'sign': (data) => new InteractiveObject({ ...data, objectType: 'sign' })
            }
        };
    }

    /**
     * Initialize objects data from JSON
     */
    async initialize() {
        this.objectDefinitions = await this.dataLoader.loadObjects();
        console.log('[ObjectManager] ✅ Initialized with object data for', Object.keys(this.objectDefinitions).length, 'maps');
    }

    /**
     * Load objects from cached data (synchronous)
     */
    loadFromCache() {
        const objectsData = this.dataLoader.getObjects();
        if (objectsData) {
            this.objectDefinitions = objectsData;
            console.log('[ObjectManager] Loaded from cache:', Object.keys(this.objectDefinitions).length, 'maps');
        }
    }

    /**
     * Create an object instance from data definition using category-based system
     */
    createObjectFromData(data) {
        const { category, actorType, objectType, ...objectData } = data;
        
        if (!category) {
            console.error(`[ObjectManager] Missing 'category' field in object data:`, data);
            return null;
        }

        try {
            // Check if there's a subtype factory for this category
            const subtype = actorType || objectType;
            
            if (subtype && this.subtypeFactories[category]) {
                const factory = this.subtypeFactories[category][subtype];
                if (factory) {
                    return factory(objectData);
                } else {
                    console.warn(`[ObjectManager] Unknown ${category} subtype: ${subtype}, using base class`);
                }
            }
            
            // Fall back to base category class
            const BaseClass = this.categoryRegistry[category];
            if (!BaseClass) {
                console.error(`[ObjectManager] Unknown category: ${category}`);
                return null;
            }
            
            return new BaseClass(objectData);
        } catch (error) {
            console.error(`[ObjectManager] Error creating ${category} (${actorType || objectType || 'base'}):`, error);
            return null;
        }
    }

    /**
     * Get all object definitions organized by map (deprecated)
     * Kept for backwards compatibility
     */
    getMapDefinitions() {
        console.warn('[ObjectManager] getMapDefinitions() is deprecated - data now loaded from JSON');
        return this.objectDefinitions;
    }

    /**
     * Initialize/load all objects for a specific map
     */
    loadObjectsForMap(mapId) {
        // Don't load twice
        if (this.initializedMaps.has(mapId)) {
            console.log(`[ObjectManager] Map ${mapId} already loaded, skipping`);
            return;
        }

        console.log(`[ObjectManager] Loading objects for map: ${mapId}`);
        
        const objectsData = this.objectDefinitions[mapId];
        if (!objectsData || objectsData.length === 0) {
            console.log(`[ObjectManager] No objects defined for map: ${mapId}`);
            this.objects[mapId] = [];
            this.initializedMaps.add(mapId);
            return;
        }

        // Initialize array for this map
        this.objects[mapId] = [];

        // Create and add all objects from JSON data
        objectsData.forEach(data => {
            const obj = this.createObjectFromData(data);
            if (obj) {
                obj.mapId = mapId; // Ensure mapId is set
                this.addObject(mapId, obj);
                console.log(`[ObjectManager] Loaded ${obj.constructor.name}: ${obj.id || 'auto-generated'}`);
            }
        });

        this.initializedMaps.add(mapId);
        console.log(`[ObjectManager] ✅ Loaded ${this.objects[mapId].length} objects for map ${mapId}`);
    }

    /**
     * Unload objects for a specific map (free memory when leaving)
     */
    unloadObjectsForMap(mapId) {
        if (!this.initializedMaps.has(mapId)) {
            return;
        }

        console.log(`[ObjectManager] Unloading objects for map: ${mapId}`);
        
        // Remove from registry
        const objects = this.objects[mapId] || [];
        objects.forEach(obj => {
            this.objectRegistry.delete(obj.id);
        });

        // Clear map objects
        delete this.objects[mapId];
        this.initializedMaps.delete(mapId);
        
        console.log(`[ObjectManager] ✅ Unloaded map ${mapId}`);
    }

    /**
     * Add an object to a map and registry
     */
    addObject(mapId, obj) {
        if (!this.objects[mapId]) {
            this.objects[mapId] = [];
        }
        
        this.objects[mapId].push(obj);
        this.objectRegistry.set(obj.id, obj);
    }

    /**
     * Remove an object from a map
     */
    removeObject(mapId, objectId) {
        if (!this.objects[mapId]) return false;
        
        const index = this.objects[mapId].findIndex(obj => obj.id === objectId);
        if (index !== -1) {
            this.objects[mapId].splice(index, 1);
            this.objectRegistry.delete(objectId);
            console.log(`[ObjectManager] Removed object: ${objectId}`);
            return true;
        }
        return false;
    }

    /**
     * Get ALL objects for a specific map
     */
    getObjectsForMap(mapId) {
        return this.objects[mapId] || [];
    }

    /**
     * Get objects by type for a specific map
     */
    getObjectsByType(mapId, type) {
        const objects = this.getObjectsForMap(mapId);
        return objects.filter(obj => obj.type === type);
    }

    /**
     * Get objects by class for a specific map
     */
    getObjectsByClass(mapId, className) {
        const objects = this.getObjectsForMap(mapId);
        return objects.filter(obj => obj instanceof className);
    }

    /**
     * Get NPCs for a specific map (for backwards compatibility)
     */
    getNPCsForMap(mapId) {
        const objects = this.getObjectsForMap(mapId);
        return objects.filter(obj => obj instanceof NPC || obj instanceof Spirit);
    }

    /**
     * Get static objects for a specific map (trees, rocks, etc.)
     */
    getStaticObjectsForMap(mapId) {
        const objects = this.getObjectsForMap(mapId);
        return objects.filter(obj => obj instanceof StaticObject);
    }

    /**
     * Get interactive objects for a specific map (chests, signs)
     */
    getInteractiveObjectsForMap(mapId) {
        const objects = this.getObjectsForMap(mapId);
        return objects.filter(obj => obj instanceof InteractiveObject || obj instanceof Chest || obj instanceof Portal);
    }

    /**
     * Get portals for a specific map
     */
    getPortalsForMap(mapId) {
        const objects = this.getObjectsForMap(mapId);
        return objects.filter(obj => obj instanceof Portal);
    }

    /**
     * Find an object by ID (across all maps)
     */
    findObjectById(objectId) {
        return this.objectRegistry.get(objectId) || null;
    }

    /**
     * Find an object by name (across all maps)
     */
    findObjectByName(name, mapId = null) {
        if (mapId) {
            const objects = this.getObjectsForMap(mapId);
            return objects.find(obj => obj.name === name) || null;
        }
        
        // Search all maps
        return Array.from(this.objectRegistry.values()).find(obj => obj.name === name) || null;
    }

    /**
     * Update all objects on a map
     */
    updateObjects(mapId, deltaTime, game) {
        const objects = this.getObjectsForMap(mapId);
        objects.forEach(obj => {
            if (obj.update) {
                obj.update(deltaTime, game);
            }
        });
    }

    /**
     * Check for nearby interactive objects that player can interact with
     */
    checkNearbyInteractions(player, mapId, interactionDistance = 120) {
        const objects = this.getObjectsForMap(mapId);
        
        for (let obj of objects) {
            // Check if object can be interacted with
            if (obj.canPlayerInteract && obj.canPlayerInteract(player)) {
                return obj;
            }
            
            // Check NPCs with dialogue
            if (obj instanceof NPC && obj.dialogue) {
                const distance = player.distanceTo(obj);
                if (distance <= interactionDistance) {
                    return obj;
                }
            }
        }
        
        return null;
    }

    /**
     * Check for portal collisions
     */
    checkPortalCollisions(player, mapId, game) {
        const portals = this.getPortalsForMap(mapId);
        
        for (let portal of portals) {
            if (player.collidesWith(portal, game)) {
                return portal;
            }
        }
        
        return null;
    }

    /**
     * Handle interaction with an object
     */
    handleInteraction(object, player, game) {
        if (object.interact) {
            return object.interact(player, game);
        }
        return null;
    }

    /**
     * Get object states for saving
     */
    getObjectStates() {
        const states = {};
        
        this.objectRegistry.forEach((obj, id) => {
            if (obj.getState) {
                states[id] = obj.getState();
            }
        });
        
        return states;
    }

    /**
     * Restore object states from saved data
     */
    restoreObjectStates(states) {
        if (!states) return;
        
        Object.entries(states).forEach(([objectId, state]) => {
            const obj = this.objectRegistry.get(objectId);
            if (obj && obj.loadState) {
                obj.loadState(state);
            }
        });
        
        console.log('[ObjectManager] ✅ Object states restored');
    }

    /**
     * Clear all objects on a map
     */
    clearMap(mapId) {
        const objects = this.objects[mapId] || [];
        objects.forEach(obj => {
            this.objectRegistry.delete(obj.id);
        });
        
        this.objects[mapId] = [];
        console.log(`[ObjectManager] Cleared all objects from map ${mapId}`);
    }

    /**
     * Get all objects across all maps (for debugging)
     */
    getAllObjects() {
        return Array.from(this.objectRegistry.values());
    }

    /**
     * Get statistics about loaded objects
     */
    getStats() {
        const stats = {
            totalObjects: this.objectRegistry.size,
            loadedMaps: Array.from(this.initializedMaps),
            objectsByMap: {}
        };

        for (const mapId of this.initializedMaps) {
            const objects = this.getObjectsForMap(mapId);
            stats.objectsByMap[mapId] = {
                total: objects.length,
                npcs: objects.filter(obj => obj instanceof NPC || obj instanceof Spirit).length,
                static: objects.filter(obj => obj instanceof StaticObject).length,
                interactive: objects.filter(obj => obj instanceof InteractiveObject || obj instanceof Chest).length,
                portals: objects.filter(obj => obj instanceof Portal).length
            };
        }

        return stats;
    }
}

// Export for use
window.ObjectManager = ObjectManager;

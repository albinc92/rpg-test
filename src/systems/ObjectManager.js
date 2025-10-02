/**
 * ObjectManager - Unified manager for ALL game objects across maps
 * 
 * Handles: NPCs, Merchants, Spirits, Trees, Rocks, Chests, Portals, Signs, etc.
 * Philosophy: All objects are GameObjects. Behavior differences are in the classes themselves.
 */
class ObjectManager {
    constructor() {
        // Map ID -> array of ALL objects on that map
        this.objects = {};
        
        // Track which maps have been initialized
        this.initializedMaps = new Set();
        
        // Object registry by ID for quick lookups
        this.objectRegistry = new Map();
        
        // Define object templates per map (lazy initialization)
        this.mapDefinitions = this.getMapDefinitions();
    }

    /**
     * Get all object definitions organized by map
     * These are templates - actual objects are created on demand
     */
    getMapDefinitions() {
        return {
            '0-0': {
                // Objects (trees, bushes, rocks, decorations)
                objects: [
                    // Trees scattered around edges with size variation
                    new Tree01({ x: 200, y: 150, scale: 0.95 }),
                    new Tree01({ x: 1750, y: 200, scale: 1.1 }),
                    new Tree01({ x: 300, y: 900, scale: 1.05 }),
                    new Tree01({ x: 1650, y: 950 }),
                    new Tree01({ x: 100, y: 500, scale: 0.9 }),
                    new Tree01({ x: 1850, y: 600, scale: 1.08 }),
                    new Tree01({ x: 950, y: 100, scale: 0.98 }),
                    new Tree01({ x: 1000, y: 1000, scale: 1.03 }),
                    
                    // Bushes scattered in outskirts (between trees and center)
                    new Bush01({ x: 350, y: 280 }),
                    new Bush01({ x: 520, y: 220, scale: 0.42 }),
                    new Bush01({ x: 680, y: 180, scale: 0.48 }),
                    new Bush01({ x: 1450, y: 240, scale: 0.44 }),
                    new Bush01({ x: 1580, y: 320, scale: 0.46 }),
                    new Bush01({ x: 1320, y: 180, scale: 0.41 }),
                    
                    new Bush01({ x: 280, y: 420, scale: 0.43 }),
                    new Bush01({ x: 180, y: 650, scale: 0.47 }),
                    new Bush01({ x: 320, y: 780, scale: 0.42 }),
                    new Bush01({ x: 1520, y: 820, scale: 0.44 }),
                    new Bush01({ x: 1680, y: 720, scale: 0.43 }),
                    new Bush01({ x: 1580, y: 580, scale: 0.49 }),
                    
                    new Bush01({ x: 450, y: 850, scale: 0.42 }),
                    new Bush01({ x: 620, y: 920, scale: 0.46 }),
                    new Bush01({ x: 820, y: 880, scale: 0.44 }),
                    new Bush01({ x: 1120, y: 850, scale: 0.43 }),
                    new Bush01({ x: 1380, y: 900, scale: 0.48 }),
                    new Bush01({ x: 1240, y: 780, scale: 0.41 }),
                    
                    new Bush01({ x: 280, y: 320, scale: 0.44 }),
                    new Bush01({ x: 1650, y: 450, scale: 0.42 }),
                    new Bush01({ x: 750, y: 250, scale: 0.47 }),
                    new Bush01({ x: 540, y: 780, scale: 0.43 }),
                    new Bush01({ x: 1280, y: 320, scale: 0.49 }),
                    new Bush01({ x: 920, y: 820 }),
                ],
                
                // NPCs (characters, merchants, spirits)
                npcs: [
                    // Sage NPC near player spawn (spawn is at 1100, 650)
                    new NPC({ 
                        id: 'elder_sage',
                        x: 1075, 
                        y: 416, 
                        spriteSrc: 'assets/npc/sage-0.png',
                        type: 'sage',
                        name: 'Elder Sage',
                        dialogue: "Welcome, young adventurer! The forest is peaceful, but adventure awaits beyond.",
                        scale: 0.15,
                        collisionExpandTop: -45,
                    }),
                ]
            },
            
            '0-1': {
                objects: [
                    new Tree01({ x: 400, y: 500, scale: 1.1 }),
                    
                    new Chest({
                        id: 'treasure_chest_2',
                        x: 300,
                        y: 700,
                        gold: 150,
                        loot: [
                            { id: 'mana_potion', quantity: 2 },
                            { id: 'leather_armor', quantity: 1 },
                            { id: 'magic_scroll', quantity: 1 },
                            { id: 'iron_ore', quantity: 8 }
                        ],
                        chestType: 'silver'
                    }),
                    new Chest({
                        id: 'treasure_chest_4',
                        x: 800,
                        y: 300,
                        gold: 200,
                        loot: [
                            { id: 'iron_sword', quantity: 1 },
                            { id: 'leather_armor', quantity: 1 },
                            { id: 'iron_ore', quantity: 15 }
                        ],
                        chestType: 'golden'
                    }),
                    
                    new Portal({
                        id: 'portal_to_0-0',
                        x: 475,
                        y: 960,
                        targetMap: '0-0',
                        spawnPoint: 'fromPortal',
                        spriteSrc: 'assets/npc/navigation-0.png',
                        portalType: 'magic',
                        name: 'Forest Clearing Portal'
                    }),
                    new Portal({
                        id: 'portal_to_shop',
                        x: 695,
                        y: 515,
                        targetMap: '0-1-shop',
                        spawnPoint: 'fromDoor',
                        spriteSrc: 'assets/npc/door-0.png',
                        portalType: 'door',
                        name: 'Village Shop Door'
                    })
                ],
                
                npcs: []
            },
            
            '0-1-shop': {
                objects: [
                    new Portal({
                        id: 'portal_from_shop',
                        x: 400,
                        y: 200,
                        targetMap: '0-1',
                        spawnPoint: 'fromDoor',
                        spriteSrc: 'assets/npc/door-0.png',
                        portalType: 'door',
                        name: 'Exit Door'
                    })
                ],
                
                npcs: []
            }
        };
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
        
        const mapDef = this.mapDefinitions[mapId];
        if (!mapDef) {
            console.log(`[ObjectManager] No objects defined for map: ${mapId}`);
            this.objects[mapId] = [];
            this.initializedMaps.add(mapId);
            return;
        }

        // Initialize array for this map
        this.objects[mapId] = [];

        // Add all objects (already instantiated)
        if (mapDef.objects) {
            mapDef.objects.forEach(obj => {
                obj.mapId = mapId; // Ensure mapId is set
                this.addObject(mapId, obj);
                console.log(`[ObjectManager] Loaded ${obj.constructor.name}: ${obj.id}`);
            });
        }

        // Add NPCs (already instantiated)
        if (mapDef.npcs) {
            mapDef.npcs.forEach(obj => {
                obj.mapId = mapId; // Ensure mapId is set
                this.addObject(mapId, obj);
                console.log(`[ObjectManager] Loaded ${obj.constructor.name}: ${obj.id}`);
            });
        }

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

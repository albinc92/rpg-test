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
                // Static objects (trees, rocks, decorations)
                static: [
                    // Trees scattered around edges with size variation
                    { id: 'tree_01', x: 200, y: 150, spriteSrc: 'assets/objects/trees/tree-01.png', scale: 0.95, type: 'tree' },
                    { id: 'tree_02', x: 1750, y: 200, spriteSrc: 'assets/objects/trees/tree-01.png', scale: 1.1, type: 'tree' },
                    { id: 'tree_03', x: 300, y: 900, spriteSrc: 'assets/objects/trees/tree-01.png', scale: 1.05, type: 'tree' },
                    { id: 'tree_04', x: 1650, y: 950, spriteSrc: 'assets/objects/trees/tree-01.png', scale: 1.0, type: 'tree' },
                    { id: 'tree_05', x: 100, y: 500, spriteSrc: 'assets/objects/trees/tree-01.png', scale: 0.9, type: 'tree' },
                    { id: 'tree_06', x: 1850, y: 600, spriteSrc: 'assets/objects/trees/tree-01.png', scale: 1.08, type: 'tree' },
                    { id: 'tree_07', x: 950, y: 100, spriteSrc: 'assets/objects/trees/tree-01.png', scale: 0.98, type: 'tree' },
                    { id: 'tree_08', x: 1000, y: 1000, spriteSrc: 'assets/objects/trees/tree-01.png', scale: 1.03, type: 'tree' },
                    
                    // Bushes scattered in outskirts (between trees and center)
                    { id: 'bush_01', x: 350, y: 280, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.45, type: 'bush' },
                    { id: 'bush_02', x: 520, y: 220, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.42, type: 'bush' },
                    { id: 'bush_03', x: 680, y: 180, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.48, type: 'bush' },
                    { id: 'bush_04', x: 1450, y: 240, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.44, type: 'bush' },
                    { id: 'bush_05', x: 1580, y: 320, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.46, type: 'bush' },
                    { id: 'bush_06', x: 1320, y: 180, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.41, type: 'bush' },
                    
                    { id: 'bush_07', x: 280, y: 420, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.43, type: 'bush' },
                    { id: 'bush_08', x: 180, y: 650, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.47, type: 'bush' },
                    { id: 'bush_09', x: 320, y: 780, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.42, type: 'bush' },
                    { id: 'bush_10', x: 1520, y: 820, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.44, type: 'bush' },
                    { id: 'bush_11', x: 1680, y: 720, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.43, type: 'bush' },
                    { id: 'bush_12', x: 1580, y: 580, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.49, type: 'bush' },
                    
                    { id: 'bush_13', x: 450, y: 850, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.42, type: 'bush' },
                    { id: 'bush_14', x: 620, y: 920, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.46, type: 'bush' },
                    { id: 'bush_15', x: 820, y: 880, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.44, type: 'bush' },
                    { id: 'bush_16', x: 1120, y: 850, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.43, type: 'bush' },
                    { id: 'bush_17', x: 1380, y: 900, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.48, type: 'bush' },
                    { id: 'bush_18', x: 1240, y: 780, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.41, type: 'bush' },
                    
                    { id: 'bush_19', x: 280, y: 320, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.44, type: 'bush' },
                    { id: 'bush_20', x: 1650, y: 450, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.42, type: 'bush' },
                    { id: 'bush_21', x: 750, y: 250, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.47, type: 'bush' },
                    { id: 'bush_22', x: 540, y: 780, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.43, type: 'bush' },
                    { id: 'bush_23', x: 1280, y: 320, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.49, type: 'bush' },
                    { id: 'bush_24', x: 920, y: 820, spriteSrc: 'assets/objects/bushes/bush-01.png', scale: 0.45, type: 'bush' },
                ],
                
                // NPCs (characters, merchants, spirits)
                npcs: [
                    // Sage NPC near player spawn (spawn is at 1100, 650)
                    { 
                        id: 'elder_sage',
                        x: 1075, 
                        y: 416, 
                        spriteSrc: 'assets/npc/sage-0.png',
                        type: 'sage',
                        name: 'Elder Sage',
                        dialogue: "Welcome, young adventurer! The forest is peaceful, but adventure awaits beyond.",
                        scale: 0.15,
                        collisionExpandTop: -45,
                    },
                ],
                
                // Interactive objects (chests, signs, doors)
                interactive: [],
                
                // Portals
                portals: []
            },
            
            '0-1': {
                static: [
                    { id: 'tree_09', x: 400, y: 500, spriteSrc: 'assets/objects/trees/tree-01.png', scale: 1.1, type: 'tree' },
                ],
                
                npcs: [],
                
                interactive: [
                    {
                        id: 'treasure_chest_2',
                        x: 300,
                        y: 700,
                        gold: 150,
                        items: [
                            { id: 'mana_potion', quantity: 2 },
                            { id: 'leather_armor', quantity: 1 },
                            { id: 'magic_scroll', quantity: 1 },
                            { id: 'iron_ore', quantity: 8 }
                        ],
                        chestType: 'silver',
                        type: 'chest'
                    },
                    {
                        id: 'treasure_chest_4',
                        x: 800,
                        y: 300,
                        gold: 200,
                        items: [
                            { id: 'iron_sword', quantity: 1 },
                            { id: 'leather_armor', quantity: 1 },
                            { id: 'iron_ore', quantity: 15 }
                        ],
                        chestType: 'golden',
                        type: 'chest'
                    }
                ],
                
                portals: [
                    {
                        id: 'portal_to_0-0',
                        x: 475,
                        y: 960,
                        targetMap: '0-0',
                        spawnPoint: 'fromPortal',
                        spriteSrc: 'assets/npc/navigation-0.png',
                        portalType: 'magic',
                        name: 'Forest Clearing Portal'
                    },
                    {
                        id: 'portal_to_shop',
                        x: 695,
                        y: 515,
                        targetMap: '0-1-shop',
                        spawnPoint: 'fromDoor',
                        spriteSrc: 'assets/npc/door-0.png',
                        portalType: 'door',
                        name: 'Village Shop Door'
                    }
                ]
            },
            
            '0-1-shop': {
                static: [],
                npcs: [],
                interactive: [],
                portals: [
                    {
                        id: 'portal_from_shop',
                        x: 400,
                        y: 200,
                        targetMap: '0-1',
                        spawnPoint: 'fromDoor',
                        spriteSrc: 'assets/npc/door-0.png',
                        portalType: 'door',
                        name: 'Exit Door'
                    }
                ]
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

        // Create static objects (trees, rocks, decorations)
        if (mapDef.static) {
            mapDef.static.forEach(def => {
                this.createStaticObject(mapId, def);
            });
        }

        // Create NPCs (characters, merchants, spirits)
        if (mapDef.npcs) {
            mapDef.npcs.forEach(def => {
                this.createNPC(mapId, def);
            });
        }

        // Create interactive objects (chests, signs, doors)
        if (mapDef.interactive) {
            mapDef.interactive.forEach(def => {
                this.createInteractiveObject(mapId, def);
            });
        }

        // Create portals
        if (mapDef.portals) {
            mapDef.portals.forEach(def => {
                this.createPortal(mapId, def);
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
     * Create a static object (tree, rock, decoration)
     */
    createStaticObject(mapId, def) {
        const obj = new StaticObject({
            id: def.id,
            mapId: mapId,
            x: def.x,
            y: def.y,
            spriteSrc: def.spriteSrc,
            scale: def.scale || 0.3,
            type: def.type || 'decoration',
            name: def.name || 'Static Object',
            hasCollision: def.hasCollision !== false,
            blocksMovement: def.blocksMovement !== false,
            castsShadow: def.castsShadow !== false,
            animationType: def.animationType || 'sway',
            animationSpeed: def.animationSpeed || 0.001,
            animationIntensity: def.animationIntensity || 1,
            ...def
        });

        this.addObject(mapId, obj);
        console.log(`[ObjectManager] Created static object: ${def.id} (${def.type})`);
        return obj;
    }

    /**
     * Create an NPC (character, merchant, spirit)
     */
    createNPC(mapId, def) {
        let obj;
        
        // Create appropriate NPC type
        if (def.type === 'spirit') {
            obj = new Spirit({
                id: def.id,
                mapId: mapId,
                x: def.x,
                y: def.y,
                spriteSrc: def.spriteSrc,
                name: def.name || 'Spirit',
                scale: def.scale || 0.06,
                altitude: def.altitude || 25,
                floatingSpeed: def.floatingSpeed || 1.5,
                floatingRange: def.floatingRange || 15,
                roamingSpeed: def.roamingSpeed,
                roamingRange: def.roamingRange,
                roamingBounds: def.roamingBounds,
                ...def
            });
        } else {
            // Regular NPC (sage, merchant, guard, etc.)
            obj = new NPC({
                id: def.id,
                mapId: mapId,
                x: def.x,
                y: def.y,
                spriteSrc: def.spriteSrc,
                type: def.type || 'npc',
                name: def.name || 'NPC',
                dialogue: def.dialogue || "...",
                scale: def.scale || 0.08,
                ...def
            });
        }

        this.addObject(mapId, obj);
        console.log(`[ObjectManager] Created NPC: ${def.id} (${def.name})`);
        return obj;
    }

    /**
     * Create an interactive object (chest, sign, door)
     */
    createInteractiveObject(mapId, def) {
        let obj;

        if (def.type === 'chest') {
            obj = new Chest({
                id: def.id,
                mapId: mapId,
                x: def.x,
                y: def.y,
                spriteSrc: def.spriteSrc || 'assets/npc/chest-0.png',
                loot: def.items || [],
                gold: def.gold || 0,
                chestType: def.chestType || 'wooden',
                name: def.name || 'Treasure Chest',
                scale: def.scale || 0.1,
                ...def
            });
        } else {
            // Generic interactive object
            obj = new InteractiveObject({
                id: def.id,
                mapId: mapId,
                x: def.x,
                y: def.y,
                spriteSrc: def.spriteSrc,
                name: def.name || 'Interactive Object',
                scale: def.scale || 0.1,
                ...def
            });
        }

        this.addObject(mapId, obj);
        console.log(`[ObjectManager] Created interactive object: ${def.id} (${def.type})`);
        return obj;
    }

    /**
     * Create a portal
     */
    createPortal(mapId, def) {
        const obj = new Portal({
            id: def.id,
            mapId: mapId,
            x: def.x,
            y: def.y,
            targetMap: def.targetMap,
            spawnPoint: def.spawnPoint || 'default',
            spriteSrc: def.spriteSrc,
            portalType: def.portalType || 'magic',
            name: def.name || 'Portal',
            scale: def.scale || 0.1,
            ...def
        });

        this.addObject(mapId, obj);
        console.log(`[ObjectManager] Created portal: ${def.id} → ${def.targetMap}`);
        return obj;
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

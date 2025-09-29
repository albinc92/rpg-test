/**
 * Interactive Object Manager for RPG Game
 * Manages chests, portals, signs, and other interactive environmental objects
 */

class InteractiveObjectManager {
    constructor() {
        this.objectRegistry = new Map(); // Registry of created interactive objects by ID
        this.loadedMaps = new Set(); // Track which maps have had their objects loaded
        
        // Define object templates per map (don't create objects yet)
        this.mapObjectDefinitions = this.getMapObjectDefinitions();
    }

    /**
     * Get object definitions organized by map (templates, not actual objects)
     */
    getMapObjectDefinitions() {
        return {
            '0-0': {
                portals: [
                    {
                        id: 'portal_to_0-1',
                        x: 867,
                        y: 156,
                        targetMap: '0-1',
                        spawnPoint: 'fromPortal',
                        spriteSrc: 'assets/npc/navigation-0.png',
                        portalType: 'magic',
                        name: 'Mountain Path Portal'
                    }
                ],
                chests: [
                    {
                        id: 'treasure_chest_1',
                        x: 1200,
                        y: 400,
                        gold: 75,
                        items: [
                            { id: 'health_potion', quantity: 3 },
                            { id: 'iron_sword', quantity: 1 },
                            { id: 'iron_ore', quantity: 5 }
                        ],
                        chestType: 'wooden'
                    },
                    {
                        id: 'treasure_chest_3',
                        x: 500,
                        y: 800,
                        gold: 50,
                        items: [
                            { id: 'health_potion', quantity: 2 },
                            { id: 'mana_potion', quantity: 1 }
                        ],
                        chestType: 'wooden'
                    }
                ]
            },
            '0-1': {
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
                ],
                chests: [
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
                        chestType: 'silver'
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
                        chestType: 'golden'
                    }
                ]
            },
            '0-1-shop': {
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
                ],
                chests: []
            }
        };
    }

    /**
     * Load objects for a specific map (called when map loads)
     */
    loadObjectsForMap(mapId) {
        // Don't load twice
        if (this.loadedMaps.has(mapId)) {
            return;
        }

        console.log(`Loading interactive objects for map: ${mapId}`);
        
        const mapDef = this.mapObjectDefinitions[mapId];
        if (!mapDef) {
            console.log(`No objects defined for map: ${mapId}`);
            return;
        }

        // Create portals for this map
        if (mapDef.portals) {
            mapDef.portals.forEach(portalDef => {
                this.createPortal(portalDef.id, mapId, portalDef.x, portalDef.y, portalDef);
            });
        }

        // Create chests for this map  
        if (mapDef.chests) {
            mapDef.chests.forEach(chestDef => {
                this.createChest(chestDef.id, mapId, chestDef.x, chestDef.y, chestDef);
            });
        }

        this.loadedMaps.add(mapId);
    }

    /**
     * Unload objects for a specific map (called when leaving map to free memory)
     */
    unloadObjectsForMap(mapId) {
        console.log(`Unloading interactive objects for map: ${mapId}`);
        
        // Remove all objects for this map
        const objectsToRemove = [];
        this.objectRegistry.forEach((obj, id) => {
            if (obj.mapId === mapId) {
                objectsToRemove.push(id);
            }
        });

        objectsToRemove.forEach(id => {
            this.objectRegistry.delete(id);
        });

        this.loadedMaps.delete(mapId);
    }

    /**
     * Create a new portal
     */
    createPortal(id, mapId, x, y, options = {}) {
        const portal = new Portal({
            id: id,
            mapId: mapId,
            x: x,
            y: y,
            targetMap: options.targetMap,
            spawnPoint: options.spawnPoint || 'default',
            spriteSrc: options.spriteSrc,
            portalType: options.portalType || 'magic',
            name: options.name || 'Portal',
            scale: options.scale || 0.1,
            ...options
        });

        this.objectRegistry.set(id, portal);
        console.log(`Created portal ${id} on map ${mapId} to ${options.targetMap}`);
    }

    /**
     * Create a new chest
     */
    createChest(id, mapId, x, y, options = {}) {
        const chest = new Chest({
            id: id,
            mapId: mapId,
            x: x,
            y: y,
            spriteSrc: options.spriteSrc || 'assets/npc/chest-0.png',
            loot: options.items || [],
            gold: options.gold || 0,
            chestType: options.chestType || 'wooden',
            name: options.name || 'Treasure Chest',
            scale: options.scale || 0.1,
            ...options
        });

        this.objectRegistry.set(id, chest);
        console.log(`Created chest ${id} on map ${mapId} with ${options.gold || 0} gold and ${(options.items || []).length} items`);
    }

    /**
     * Register a new interactive object in the registry
     */
    registerObject(object) {
        this.objectRegistry.set(object.id, object);
    }

    /**
     * Remove an interactive object from the registry
     */
    removeObject(objectId) {
        this.objectRegistry.delete(objectId);
    }

    /**
     * Get all interactive objects for a specific map
     */
    getObjectsForMap(mapId) {
        return Array.from(this.objectRegistry.values()).filter(obj => obj.mapId === mapId);
    }

    /**
     * Find an interactive object by ID
     */
    findObject(objectId) {
        return this.objectRegistry.get(objectId) || null;
    }

    /**
     * Update all interactive objects on the current map
     */
    updateObjects(mapId, deltaTime, game) {
        const mapObjects = this.getObjectsForMap(mapId);
        
        mapObjects.forEach(obj => {
            obj.update(deltaTime, game);
        });
    }

    /**
     * Render all interactive objects on the current map
     */
    renderObjects(ctx, game, mapId) {
        const mapObjects = this.getObjectsForMap(mapId);
        
        mapObjects.forEach(obj => {
            obj.render(ctx, game);
        });
    }

    /**
     * Check for nearby interactive objects that the player can interact with
     */
    checkNearbyInteractions(player, mapId, interactionDistance = 120) {
        const mapObjects = this.getObjectsForMap(mapId);
        
        for (let obj of mapObjects) {
            if (obj.canPlayerInteract && obj.canPlayerInteract(player)) {
                return obj;
            }
        }
        
        return null;
    }

    /**
     * Check for portal collisions (automatic teleportation)
     */
    checkPortalCollisions(player, mapId) {
        const mapObjects = this.getObjectsForMap(mapId);
        
        for (let obj of mapObjects) {
            if (obj instanceof Portal) {
                const distance = obj.distanceTo(player);
                
                // Check if player is touching the portal
                const collisionDistance = (obj.width + player.width) / 4;
                if (distance <= collisionDistance) {
                    return obj;
                }
            }
        }
        
        return null;
    }

    /**
     * Handle interaction with an interactive object
     */
    handleInteraction(object, player, game) {
        return object.interact(player, game);
    }

    /**
     * Get object states for saving
     */
    getObjectStates() {
        const states = {};
        
        this.objectRegistry.forEach((obj, id) => {
            states[id] = obj.getState();
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
            if (obj) {
                obj.loadState(state);
            }
        });
        
        console.log('Interactive object states restored');
    }
}

// Export for use in other files
window.InteractiveObjectManager = InteractiveObjectManager;
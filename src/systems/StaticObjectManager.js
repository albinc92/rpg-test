/**
 * StaticObjectManager - Manages all static environmental objects (trees, rocks, decorations, etc.)
 */
class StaticObjectManager {
    constructor() {
        // Map ID -> array of static objects
        this.staticObjects = {};
        this.initialized = false;
    }
    
    /**
     * Initialize all static objects for all maps
     */
    initializeAllObjects() {
        // Map 0-0 - Forest area with trees
        // Note: Player spawns at (400, 300), so keep trees away from that area
        this.staticObjects['0-0'] = [
            // Trees (scaled down to reasonable size with smaller collision)
            new StaticObject({
                id: 'tree_01',
                name: 'Oak Tree',
                type: 'obstacle',
                x: 700,  // Moved away from spawn point (was 500)
                y: 500,  // Moved down from spawn (was 400)
                spriteSrc: 'assets/objects/trees/tree-01.png',
                scale: 0.3,
                hasCollision: true,
                blocksMovement: true,
                collisionPercent: 0.15, // Much smaller collision (only the very base of trunk)
                collisionOffsetY: 15, // Push collision to very bottom
                castsShadow: true,
                altitude: 0,
                // Optional: Add sway animation for realism
                animationType: 'sway',
                animationSpeed: 0.001,
                animationIntensity: 1,
                // Environmental effects
                providesShade: true,
                makesSound: false
            }),
            
            // Add more trees
            new StaticObject({
                id: 'tree_02',
                name: 'Oak Tree',
                type: 'obstacle',
                x: 1000,
                y: 700,
                spriteSrc: 'assets/objects/trees/tree-01.png',
                scale: 0.35,
                hasCollision: true,
                blocksMovement: true,
                collisionPercent: 0.15, // Smaller collision
                collisionOffsetY: 18,
                castsShadow: true,
                animationType: 'sway',
                animationSpeed: 0.0012,
                animationIntensity: 1
            }),
            
            new StaticObject({
                id: 'tree_03',
                name: 'Oak Tree',
                type: 'obstacle',
                x: 1400,
                y: 400,
                spriteSrc: 'assets/objects/trees/tree-01.png',
                scale: 0.25,
                hasCollision: true,
                blocksMovement: true,
                collisionPercent: 0.15, // Smaller collision
                collisionOffsetY: 12,
                castsShadow: true,
                animationType: 'sway',
                animationSpeed: 0.0009,
                animationIntensity: 1.2
            })
        ];
        
        // Map 0-1 - Another forest area
        this.staticObjects['0-1'] = [
            new StaticObject({
                id: 'tree_04',
                name: 'Oak Tree',
                type: 'obstacle',
                x: 400,
                y: 500,
                spriteSrc: 'assets/objects/trees/tree-01.png',
                scale: 1.1,
                hasCollision: true,
                blocksMovement: true,
                collisionPercent: 0.3,
                collisionOffsetY: 33,
                castsShadow: true,
                animationType: 'sway',
                animationSpeed: 0.0011,
                animationIntensity: 2.8
            })
        ];
        
        this.initialized = true;
        console.log('[StaticObjectManager] Initialized static objects for all maps');
        return this.staticObjects;
    }
    
    /**
     * Get all static objects for a specific map
     */
    getObjectsForMap(mapId) {
        return this.staticObjects[mapId] || [];
    }
    
    /**
     * Update all static objects on a map (for animations)
     */
    updateObjects(mapId, deltaTime, game) {
        const objects = this.getObjectsForMap(mapId);
        objects.forEach(obj => obj.update(deltaTime, game));
    }
    
    /**
     * Add a static object to a map
     */
    addObject(mapId, staticObject) {
        if (!this.staticObjects[mapId]) {
            this.staticObjects[mapId] = [];
        }
        this.staticObjects[mapId].push(staticObject);
        console.log(`[StaticObjectManager] Added static object '${staticObject.id}' to map ${mapId}`);
    }
    
    /**
     * Remove a static object from a map
     */
    removeObject(mapId, objectId) {
        if (!this.staticObjects[mapId]) return false;
        
        const index = this.staticObjects[mapId].findIndex(obj => obj.id === objectId);
        if (index !== -1) {
            this.staticObjects[mapId].splice(index, 1);
            console.log(`[StaticObjectManager] Removed static object '${objectId}' from map ${mapId}`);
            return true;
        }
        return false;
    }
    
    /**
     * Get a specific static object by ID
     */
    getObjectById(mapId, objectId) {
        const objects = this.getObjectsForMap(mapId);
        return objects.find(obj => obj.id === objectId) || null;
    }
    
    /**
     * Get all static objects across all maps
     */
    getAllObjects() {
        return this.staticObjects;
    }
    
    /**
     * Clear all static objects for a map
     */
    clearMap(mapId) {
        this.staticObjects[mapId] = [];
        console.log(`[StaticObjectManager] Cleared all static objects from map ${mapId}`);
    }
    
    /**
     * Get static objects near a position (for optimization/culling)
     */
    getObjectsNearPosition(mapId, x, y, radius) {
        const objects = this.getObjectsForMap(mapId);
        return objects.filter(obj => {
            const dx = obj.x - x;
            const dy = obj.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= radius;
        });
    }
    
    /**
     * Get the state of all static objects (for saving)
     */
    getState() {
        const state = {};
        for (const mapId in this.staticObjects) {
            state[mapId] = this.staticObjects[mapId].map(obj => ({
                id: obj.id,
                x: obj.x,
                y: obj.y,
                // Add any other stateful properties if needed
            }));
        }
        return state;
    }
    
    /**
     * Load state (if static objects ever change position or have dynamic state)
     */
    loadState(state) {
        for (const mapId in state) {
            const savedObjects = state[mapId];
            const currentObjects = this.getObjectsForMap(mapId);
            
            savedObjects.forEach(savedObj => {
                const obj = currentObjects.find(o => o.id === savedObj.id);
                if (obj) {
                    obj.x = savedObj.x;
                    obj.y = savedObj.y;
                }
            });
        }
        console.log('[StaticObjectManager] Loaded state');
    }
}

// Export for use
window.StaticObjectManager = StaticObjectManager;

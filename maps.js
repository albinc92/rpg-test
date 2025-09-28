/**
 * Map System for RPG Game
 * Contains all map definitions and related functionality
 */

class MapManager {
    constructor() {
        this.mapRegistry = new Map(); // Registry of all maps by ID
        
        // Initialize the map registry
        this.initializeMapRegistry();
    }

    /**
     * Initialize the map registry with all map definitions
     */
    initializeMapRegistry() {
        // Forest Clearing - Starting area
        this.registerMap({
            id: '0-0',
            name: 'Forest Clearing',
            imagePath: 'assets/maps/0-0.png',
            description: 'A peaceful clearing in the forest where your journey begins.',
            music: 'assets/bgm/00.mp3',
            ambientSound: 'assets/audio/ambience/forest-0.mp3',
            battleScene: 'Forest-Battlescene-0', // Battle scene for this map
            spawnPoints: {
                default: { x: 400, y: 300 },
                fromPortal: { x: 900, y: 200 }
            }
        });

        // Mountain Path - Second area
        this.registerMap({
            id: '0-1',
            name: 'Mountain Path',
            imagePath: 'assets/maps/0-1.png',
            description: 'A winding path through the mountains.',
            music: 'assets/bgm/00.mp3', // Could be different music later
            ambientSound: 'assets/audio/ambience/forest-0.mp3',
            battleScene: 'Forest-Battlescene-0', // Battle scene for this map
            spawnPoints: {
                default: { x: 469, y: 949 },
                fromPortal: { x: 469, y: 949 }
            }
        });

        // Village Shop - Shopping area
        this.registerMap({
            id: '0-1-shop',
            name: 'Village Shop',
            imagePath: 'assets/maps/0-1-shop.png',
            description: 'A cozy shop where you can buy and sell items.',
            music: 'assets/bgm/01.mp3',
            mapScale: 0.7, // Scale the map background down to 70% size
            battleScene: null, // No battles in shops
            spawnPoints: {
                default: { x: 400, y: 300 },
                fromDoor: { x: 400, y: 300 }
            }
        });

        // Forest Battle Scene - Where spirit battles take place
        this.registerMap({
            id: 'Forest-Battlescene-0',
            name: 'Forest Battle Arena',
            imagePath: 'assets/maps/0-0.png', // Reuse forest map for now
            description: 'A mystical battleground where spirits challenge adventurers.',
            music: 'assets/bgm/01.mp3', // Different battle music
            ambientSound: null, // No ambient sound in battle
            mapScale: 1.0,
            spawnPoints: {
                default: { x: 400, y: 300 },
                battle: { x: 400, y: 300 }
            }
        });
    }

    /**
     * Register a new map in the registry
     * @param {object} mapData - The map data object
     */
    registerMap(mapData) {
        // Create image object for the map
        mapData.image = new Image();
        mapData.image.src = mapData.imagePath;
        mapData.loaded = false;
        
        // Set up image load handler
        mapData.image.onload = () => {
            // Store original dimensions
            mapData.originalWidth = mapData.image.width;
            mapData.originalHeight = mapData.image.height;
            
            // Apply scale factor to effective dimensions if specified
            const mapScale = mapData.mapScale || 1.0;
            mapData.width = mapData.originalWidth * mapScale;
            mapData.height = mapData.originalHeight * mapScale;
            
            mapData.loaded = true;
            console.log(`Map ${mapData.id} loaded: ${mapData.originalWidth}x${mapData.originalHeight} -> ${mapData.width}x${mapData.height} (scale: ${mapScale})`);
        };
        
        this.mapRegistry.set(mapData.id, mapData);
    }

    /**
     * Get all maps as an object (for compatibility with game.js)
     * @returns {object} Maps organized by map ID
     */
    getAllMaps() {
        const mapsObject = {};
        for (const [id, mapData] of this.mapRegistry) {
            mapsObject[id] = mapData;
        }
        return mapsObject;
    }

    /**
     * Get a specific map by ID
     * @param {string} mapId - The map ID to retrieve
     * @returns {object|null} The map object or null if not found
     */
    getMap(mapId) {
        return this.mapRegistry.get(mapId) || null;
    }

    /**
     * Check if a map exists
     * @param {string} mapId - The map ID to check
     * @returns {boolean} True if map exists
     */
    hasMap(mapId) {
        return this.mapRegistry.has(mapId);
    }

    /**
     * Get all map IDs
     * @returns {array} Array of all map IDs
     */
    getMapIds() {
        return Array.from(this.mapRegistry.keys());
    }

    /**
     * Load a map image and return a promise
     * @param {string} mapId - The map ID to load
     * @returns {Promise} Promise that resolves when map is loaded
     */
    async loadMap(mapId) {
        const mapData = this.getMap(mapId);
        if (!mapData) {
            throw new Error(`Map ${mapId} not found`);
        }

        if (mapData.loaded) {
            return mapData;
        }

        return new Promise((resolve, reject) => {
            mapData.image.onload = () => {
                mapData.width = mapData.image.width;
                mapData.height = mapData.image.height;
                mapData.loaded = true;
                resolve(mapData);
            };
            
            mapData.image.onerror = () => {
                reject(new Error(`Failed to load map image: ${mapData.imagePath}`));
            };

            // If image is already loaded but onload hasn't fired
            if (mapData.image.complete) {
                mapData.width = mapData.image.width;
                mapData.height = mapData.image.height;
                mapData.loaded = true;
                resolve(mapData);
            }
        });
    }

    /**
     * Get spawn point for a map
     * @param {string} mapId - The map ID
     * @param {string} spawnType - The spawn point type (default, fromPortal, etc.)
     * @returns {object|null} Spawn point with x, y coordinates
     */
    getSpawnPoint(mapId, spawnType = 'default') {
        const mapData = this.getMap(mapId);
        if (!mapData || !mapData.spawnPoints) {
            return null;
        }
        
        return mapData.spawnPoints[spawnType] || mapData.spawnPoints.default || null;
    }

    /**
     * Remove a map from the registry
     * @param {string} mapId - The ID of the map to remove
     */
    removeMap(mapId) {
        this.mapRegistry.delete(mapId);
    }

    /**
     * Get map count
     * @returns {number} Number of registered maps
     */
    getMapCount() {
        return this.mapRegistry.size;
    }
}

// Export for use in other files
window.MapManager = MapManager;

/**
 * MapManager - Manages map data and loading
 */
class MapManager {
    constructor() {
        this.maps = {};
        this.loadedImages = {};
    }
    
    /**
     * Initialize all map data
     */
    initializeAllMaps() {
        this.maps = {
            '0-0': {
                image: null,
                width: 1920,
                height: 1080,
                scale: 1.0,
                music: 'assets/audio/bgm/01.mp3',
                ambience: 'assets/audio/ambience/forest-0.mp3',
                spawnPoints: {
                    default: { x: 400, y: 300 },
                    fromPortal1: { x: 1800, y: 500 }
                }
            },
            '0-1': {
                image: null,
                width: 1920,
                height: 1080,
                scale: 1.0,
                music: 'assets/audio/bgm/01.mp3',
                ambience: 'assets/audio/ambience/forest-0.mp3',
                spawnPoints: {
                    default: { x: 100, y: 300 },
                    fromPortal2: { x: 200, y: 600 }
                }
            }
        };
        
        return this.maps;
    }
    
    /**
     * Get map data by ID
     */
    getMapData(mapId) {
        return this.maps[mapId] || null;
    }
    
    /**
     * Load a map image
     */
    async loadMap(mapId) {
        return new Promise((resolve, reject) => {
            const mapData = this.maps[mapId];
            if (!mapData) {
                reject(new Error(`Map not found: ${mapId}`));
                return;
            }
            
            // Check if already loaded
            if (this.loadedImages[mapId]) {
                mapData.image = this.loadedImages[mapId];
                resolve();
                return;
            }
            
            // Load the image
            const image = new Image();
            image.onload = () => {
                this.loadedImages[mapId] = image;
                mapData.image = image;
                console.log(`Loaded map image: ${mapId}`);
                resolve();
            };
            image.onerror = () => {
                reject(new Error(`Failed to load map image: ${mapId}`));
            };
            
            image.src = `assets/maps/${mapId}.png`;
        });
    }
    
    /**
     * Get all available map IDs
     */
    getAllMapIds() {
        return Object.keys(this.maps);
    }
    
    /**
     * Check if map exists
     */
    mapExists(mapId) {
        return mapId in this.maps;
    }
    
    /**
     * Add a new map
     */
    addMap(mapId, mapData) {
        this.maps[mapId] = mapData;
    }
    
    /**
     * Remove a map
     */
    removeMap(mapId) {
        delete this.maps[mapId];
        delete this.loadedImages[mapId];
    }
}

// Export for use
window.MapManager = MapManager;